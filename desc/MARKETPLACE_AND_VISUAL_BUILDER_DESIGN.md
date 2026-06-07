# TimeCollate (拾光集) 模板与主题市场及管理端可视化设计器架构规范

为了实现管理员在可视化工具中编辑排版/主题，并发布至市场供用户选择并收藏至个人库的核心需求，我们需要设计一套**“设计器 (Builder) -> 市场 (Market) -> 个人收藏 (Library)”** 的闭环体系。

---

## 1. 业务流程与架构概览

```
[ 管理员可视化设计器 ]
        │ (保存/发布)
        ▼
   [ 模板/主题市场 ] <─────── (浏览/搜索) ───────> [ 用户 ]
        │                                         │
        └───────────────── (添加至库) ─────────────┘
                                                  ▼
                                          [ 用户个人资源库 ]
                                                  │ (编辑器中调用)
                                                  ▼
                                         [ 相册页面排版/渲染 ]
```

该架构包含三大核心模块：
1. **管理端可视化画布设计器 (Admin Visual Builder)**：管理员无需写 JSON 坐标，通过可视化拖拽生成排版 Schema 和配置主题。
2. **模板与主题市场 (Marketplace)**：展示所有公开发布的布局与主题，处理用户收藏/订阅逻辑。
3. **用户收藏关联系统 (Library & Subscription)**：控制编辑器中加载的排版与主题仅显示“系统预置” + “用户已从市场收藏”的内容。

---

## 2. 数据库设计 (Zero-Trust & Scalable Schema)

为了支持市场机制和用户收藏逻辑，我们需要在数据库中增加两张关系表，并对原有的模板/主题表进行扩展。

### 2.1 基础表字段扩展 (`book_templates` & `book_themes`)
在这两张表中增加可见性范围与创作者标识，用以支撑“系统内置”、“个人私有设计”与“市场公共分享”三级权限体系：
```sql
-- 针对模板表与主题表分别扩展以下字段
ALTER TABLE book_templates ADD COLUMN visibility ENUM('private', 'public') DEFAULT 'private' COMMENT '可见性：private(仅创作者自己可见)，public(市场公开可供他人订阅)';
ALTER TABLE book_templates ADD COLUMN creator_id VARCHAR(36) DEFAULT 'system' COMMENT '创作者ID(system为官方公共，用户UUID为私人/设计师设计)';

ALTER TABLE book_themes ADD COLUMN visibility ENUM('private', 'public') DEFAULT 'private' COMMENT '可见性：private(仅创作者自己可见)，public(市场公开可供他人订阅)';
ALTER TABLE book_themes ADD COLUMN creator_id VARCHAR(36) DEFAULT 'system' COMMENT '创作者ID(system为官方公共，用户UUID为私人/设计师设计)';
```

### 2.2 用户收藏关联表 (`user_collected_templates` & `user_collected_themes`)
使用“多对多”关联表，跟踪用户从市场中添加了哪些资产到自己的个人库：

```sql
-- 用户模板收藏表
CREATE TABLE IF NOT EXISTS user_collected_templates (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    template_id VARCHAR(36) NOT NULL COMMENT '模板ID',
    collected_at BIGINT NOT NULL COMMENT '收藏时间戳',
    PRIMARY KEY (user_id, template_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES book_templates(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB COMMENT='用户收藏模板表';

-- 用户主题收藏表
CREATE TABLE IF NOT EXISTS user_collected_themes (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    theme_id VARCHAR(36) NOT NULL COMMENT '主题ID',
    collected_at BIGINT NOT NULL COMMENT '收藏时间戳',
    PRIMARY KEY (user_id, theme_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (theme_id) REFERENCES book_themes(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB COMMENT='用户收藏主题表';
```

---

## 3. 管理端可视化设计器设计 (Admin Visual Builder)

管理端设计器是一个专用的“画布发生器”，其目标是生成 `layoutSchema` JSON 对象。它直接复用客户端的拖拽排版库（例如 `@hello-pangea/dnd` 或 `interactjs`）来实现可视化设计。

### 3.1 排版设计器核心工作原理
1. **添加插槽 (Add Slots)**：管理员在空白设计画布上，点击“添加图片插槽”或“添加文字输入框”。
2. **拖动与缩放 (Drag & Resize)**：
   * 使用拖拽组件（如 `react-resizable` 或原生控制手柄），管理员可以通过鼠标拖动改变插槽大小（Width / Height）和位置（Left / Top）。
   * 前端设计器自动将这些像素像素值换算为**百分比数值**（例如：`left: "15%"`, `width: "40%"`）。
3. **配置参数 (Attributes Setting)**：
   * 给文字插槽指定 `role`（如正文、小标题、日期）和默认字体大小、行高。
   * 给图片插槽分配 `slotIndex`。
4. **生成 Schema 并发布**：
   管理员点击“发布到市场”，设计器自动将画布上的状态整理成 `layoutSchema` JSON：
   ```json
   {
     "photoCount": 2,
     "layoutSchema": {
       "background": { "color": "#FFFFFF" },
       "elements": [
         { "id": "img-1", "type": "photo", "slotIndex": 0, "style": { "left": "10%", "top": "15%", "width": "40%", "height": "70%" } },
         { "id": "text-1", "type": "text", "role": "page-content", "style": { "left": "55%", "top": "15%", "width": "35%", "height": "70%", "fontSize": "16px" } }
       ]
     }
   }
   ```
   发送 `POST /api/admin/templates` 写入数据库，并标记 `is_market_published = 1`。

---

## 4. 市场与个人库加载机制 (Market & Library APIs)

为了实现从市场订阅和个人库调用的逻辑，我们需要调整 API 提取数据的查询逻辑，确保实现“私人设计”、“系统内置”与“他人共享订阅”的正确权限隔离。

### 4.1 市场浏览 API
用户进入“模板市场 / 主题市场”时，拉取所有**发布到公共市场的他人设计**（过滤掉系统预置以及自己设计的内容）：
* **接口**：`GET /api/market/templates`
* **SQL 逻辑**：
  ```sql
  SELECT * FROM book_templates 
  WHERE visibility = 'public' 
    AND creator_id != 'system' 
    AND creator_id != ?; -- 传入当前登录用户的 user_id
  ```

### 4.2 用户收藏/订阅与取消订阅 API
当用户在市场点击“订阅/收藏到我的库”时：
* **订阅接口**：`POST /api/market/templates/:id/collect`
  * 校验用户身份（Token）。
  * 校验该模板的 `visibility` 必须为 `public`（安全防御防线，防止非授权用户直接通过 UUID 订阅他人 `private` 模板）。
  * 往 `user_collected_templates` 表中插入 `{ user_id, template_id, collected_at }`。
* **取消订阅接口**：`DELETE /api/market/templates/:id/collect`

### 4.3 编辑器中个人库数据的加载
在用户打开书籍编辑器时，Zustand store 调用 `loadTemplates()`，此时 API 查询条件升级为：**系统默认公共模板 + 自己设计的专属模板（不论私人或公共） + 订阅他人的模板**。
* **接口**：`GET /api/my/templates`
* **SQL 逻辑**：
  ```sql
  SELECT t.* FROM book_templates t
  LEFT JOIN user_collected_templates uct ON t.id = uct.template_id AND uct.user_id = ?
  WHERE 
    (t.creator_id = 'system' AND t.visibility = 'public') -- 1. 系统内置公共模板
    OR t.creator_id = ?                                   -- 2. 自己设计的专属模板（包含自己设计的私有和公开发布的）
    OR uct.user_id IS NOT NULL;                           -- 3. 订阅他人公开发布的模板
  ```
  这样，用户在市场中订阅的内容，以及在设计器中保存的私有版式，就会完美汇总在编辑器排版抽屉中；若他人删除了共享模板或用户退订，列表会自动同步剔除。

---

## 5. 架构权衡 (Architectural Trade-offs)

* **方案优点**：
  * **所见即所得的闭环**：管理员设计排版时看到的样式，和用户拿去编辑、最终印刷出来的效果 100% 一致。
  * **市场生态化**：未来可支持“普通用户/签约设计师”上传自己设计的排版到市场中（只需将 `creator_id` 设为用户 ID，并实现审核流即可）。
  * **网络开销极小**：传输和收藏只是在关系型数据库中记录了一行映射关系（几百字节），极快且极其节省资源。
* **开发难点**：
  * **设计器的缩放适配**：管理端可视化编辑器需要具备与客户端相同的 A4 物理纵横比约束（例如 210mm x 297mm），设计时需锁死编辑画布比例，确保换算后的百分比绝对定位不失真。
