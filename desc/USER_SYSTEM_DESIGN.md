# TimeCollate 用户系统设计说明书

## 1. 背景与目标
TimeCollate 目前已实现书籍创建、云端存储及在线分享等核心功能，但所有数据均处于公开或全局状态，缺乏用户归属感和数据安全性。
本设计的目的是引入一套生产级的用户系统，实现：
*   **数据隔离**：确保用户只能管理和编辑自己的时光书。
*   **身份识别**：通过微信、手机号等方式快速登录。
*   **资产管理**：用户可查看自己的存储使用情况和分享历史。

---

## 2. 数据库设计 (Schema)

### 2.1 新增用户表 `users`
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户唯一标识',
    nickname VARCHAR(50) NOT NULL COMMENT '用户昵称',
    avatar_url VARCHAR(500) COMMENT '用户头像',
    openid VARCHAR(100) UNIQUE COMMENT '第三方登录标识(如微信)',
    phone VARCHAR(20) UNIQUE COMMENT '手机号',
    password_hash VARCHAR(255) COMMENT '密码哈希(非必选)',
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='用户主表';
```

### 2.2 现有表关联升级
所有顶层资产（如书籍）必须关联 `user_id`：
*   **books 表**：新增 `user_id` 字段，建立索引。
*   **shared_links 表**：可通过 `book_id` 间接关联用户，或新增 `creator_id` 记录分享者。

---

## 3. 认证架构 (Authentication)

### 3.1 登录策略
1.  **第一阶段 (当前)：账户密码登录/注册**
    *   用户通过自定义用户名/邮箱和密码进行操作。
    *   后端使用 `bcrypt` 对密码进行安全哈希加密。
2.  **第二阶段 (预留)：微信/手机号登录**
    *   符合 TimeCollate “在线分享链接”的传播调性。
    *   前端保留切换页签或图标，点击提示：“功能正在快马加鞭准备中...”。

### 3.2 鉴权流程
*   **JWT (JSON Web Token)**：后端验证通过后颁发 Token，前端存入 `localStorage`。
*   **Middleware**：后端所有 `/api/books/*`、`/api/upload/*` 接口需经过 `authMiddleware` 校验 Token。

---

## 4. 后端功能模块

### 4.1 AuthService
*   `register()`: 接收账户、密码，进行哈希存储。
*   `login()`: 校验哈希，颁发 JWT。
*   `getMe()`: 获取当前登录用户信息。

### 4.2 业务逻辑调整 (Key Changes)
*   **查询过滤**：`SELECT * FROM books WHERE user_id = ?`。
*   **权限校验**：在删除、修改书籍前，校验该书籍的 `user_id` 是否等于当前登录用户。

---

## 5. 前端功能模块

### 5.1 页面调整
*   **登录页 (Login)**：清新极简设计，支持微信/手机切换。
*   **大厅页 (Lobby)**：
    *   侧边栏显示当前用户信息（头像、昵称）。
    *   增加“我的作品”与“回收站”切换。
*   **设置页 (Profile)**：修改个人信息、退出登录。

### 5.2 路由保护
*   使用 React `Route Guard`。未登录用户访问 `/editor` 或 `/` 时自动重定向到 `/login`。
*   `/s/:slug` (分享页) 保持公开访问，但底部“我也要制作”引导用户去登录。

---

## 6. 安全与隐私 (Security)
*   **零信任原则**：API 永远不信任前端传入的 `user_id`，必须从解析后的 Token 中获取。
*   **数据隔离**：确保用户 A 无法通过拼接 `bookId` 访问到用户 B 的书籍。
*   **HTTPS 强制**：生产环境下所有传输必须经过加密。

---

## 7. 实施路线图
1.  **第一阶段**：数据库 `users` 表创建及 `books` 表关联迁移。
2.  **第二阶段**：后端 `AuthService` 与 `JWT` 认证中间件逻辑实现。
3.  **第三阶段**：前端登录/注册页面实现及全局状态管理。
4.  **第四阶段**：全站数据隔离与鉴权中间件加固。
