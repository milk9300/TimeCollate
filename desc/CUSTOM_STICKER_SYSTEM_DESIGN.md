# 用户自定义贴纸与复古印章系统设计方案 (Custom Sticker Sync & Upload System)

为了让用户能够引入自己喜欢的贴纸/印章，并在多端设备间同步、编辑和持久化管理这些素材，我们设计了云端自定义素材库的架构方案。该方案将在后期开发中逐步落地。

---

## 1. 业务场景与需求 (User Scenarios)
1. **本地素材引入**：用户可以点击“上传自定义贴纸”，从本地选择透明背景的 PNG/SVG/JPG 图片。
2. **云端持久化同步**：上传的贴纸文件将同步至云存储（OSS/R2），元数据存入 MySQL，保证跨设备访问一致性。
3. **画布无缝集成**：用户上传的自定义贴纸，可以在编辑器中直接拖入页面任意位置，同样享受白色模切白边或印泥噪点滤镜渲染。
4. **资产管理与清理**：用户可以删除自己上传的贴纸，系统同步清理数据库记录与云存储物理文件。

---

## 2. 数据库建模 (MySQL Schema)

在 MySQL 数据库中引入 `user_stickers` 表：

```sql
-- 用户自定义贴纸素材表
CREATE TABLE IF NOT EXISTS user_stickers (
    id VARCHAR(36) PRIMARY KEY COMMENT '贴纸唯一标识',
    user_id VARCHAR(36) NOT NULL COMMENT '所属用户ID',
    name VARCHAR(100) DEFAULT '未命名贴纸' COMMENT '贴纸名称',
    url VARCHAR(500) NOT NULL COMMENT '贴纸图片/SVG 访问URL',
    oss_key VARCHAR(255) DEFAULT NULL COMMENT '云存储存储键',
    category ENUM('sticker', 'stamp') DEFAULT 'sticker' COMMENT '素材类别(sticker:彩色贴纸, stamp:复古印章)',
    created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='用户自定义贴纸素材表';
```

---

## 3. 后端 API 接口设计 (API Specification)

所有接口均强制绑定用户身份（基于 Session/Token 的零信任校验）。

### 3.1 上传自定义贴纸
* **接口路径**：`POST /api/stickers`
* **Content-Type**：`multipart/form-data`
* **请求体**：
  * `file`: 贴纸二进制文件（限 5MB 内，推荐透明背景的 PNG 或 SVG）
  * `category`: `'sticker'` 或 `'stamp'` (可选，默认 `'sticker'`)
  * `name`: 贴纸名称 (可选，默认文件名)
* **后端处理逻辑**：
  1. 校验会话用户是否存在。
  2. 调用底层 `storageService.uploadFile` 将文件上传至云存储中（建议命名规则为 `stickers/:userId/:uuid.:ext`）。
  3. 将生成的访问 `url`、`ossKey`、`userId`、当前毫秒时间戳写入 `user_stickers` 表。
  4. 返回写入后的完整贴纸对象。

### 3.2 拉取用户自定义贴纸列表
* **接口路径**：`GET /api/stickers`
* **响应格式**：
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "sticker-uuid-1",
        "name": "手绘可爱猫咪",
        "url": "https://time-collate.oss-cn-beijing.aliyuncs.com/stickers/...",
        "category": "sticker",
        "createdAt": 1780023200000
      }
    ]
  }
  ```

### 3.3 删除自定义贴纸
* **接口路径**：`DELETE /api/stickers/:id`
* **后端处理逻辑**：
  1. SQL 过滤条件：`WHERE id = :id AND user_id = :current_user_id`（严格防越权）。
  2. 查询该条记录获取 `oss_key`，调用云存储的 `deleteFile` 接口进行物理删除。
  3. 物理删除 MySQL 中的对应记录。

---

## 4. 前端 UI 与交互方案 (Frontend Integration)

### 4.1 材质抽屉上传区域设计
在编辑器左侧面板的“手账贴纸与复古印章”中，新增一个 **“我的上传”** 子选项卡（与“彩色贴纸”、“复古印记”并列）：
1. 界面上方放置一个虚线框的点击上传区（`<input type="file" accept="image/png, image/svg+xml, image/jpeg" />`）。
2. 下方采用与预设素材一致的网格布局渲染当前用户已上传的贴纸。
3. 鼠标悬停在用户自定义贴纸上时，右上角显示红色的“删除”微型图标。

### 4.2 画布渲染引擎适配 (`BookRenderer.tsx`)
对于用户上传的自定义贴纸，渲染逻辑依然高度统一：
1. **彩色贴纸 (Stickers)**：
   如果是普通图片贴纸，在 `BookRenderer.tsx` 中将其包裹在 `<img>` 标签中：
   ```tsx
   <img src={dec.content} className="w-full h-full object-contain pointer-events-none" />
   ```
   它会自动应用外层 `div` 的多重 `drop-shadow` 滤镜，为自定义 PNG 图像生成 **实体切边白框** 和 **三维阴影**！
2. **复古印章 (Stamps)**：
   如果是印章类型，外层 `div` 同样被注入 `mixBlendMode: 'multiply'` 和 `#distress-filter` 滤镜，完美实现盖印的噪点斑驳融合效果。
