# TimeCollate (拾光集) 后期架构优化与演化路线图

本文档基于 TimeCollate 现有的系统架构（React 19 + Express + MySQL + Aliyun OSS），结合生产级架构设计规范，探讨项目后期的优化方向。主要聚焦于**高可用性、可扩展性、安全隔离、性能优化**，并进行 10x 数据量与并发量的极限推演与技术方案权衡。

---

## 1. 架构演进核心目标

随着用户量与书籍数量的增长，系统面临的核心挑战将从“功能的快速实现”转变为“资源的高效利用与系统的绝对稳定”。演进目标包括：
*   **计算资源解耦**：将 CPU 密集型的 PDF 生成任务从 Express API 主进程中剥离，防止 OOM 导致服务崩溃。
*   **带宽与存储降本**：通过图像处理与 OSS 动态样式，降低带宽消耗，提高客户端首屏加载速度。
*   **零信任安全加固**：实现行级（Row-Level）数据隔离与防重放、防刷机制。
*   **印刷级排版校验**：提高 Web 渲染在 Playwright 抓取过程中的容错性，保证排版一致性。

---

## 2. 核心优化方向与技术方案权衡

### 2.1 高能耗 PDF 异步导出系统

目前 PDF 导出通过在 Express 路由中直接拉起 Playwright 浏览器实例并同步等待。在 2核 2G 内存的低配服务器下，一旦有并发请求，内存会迅速溢出（OOM），且 HTTP 链接容易因超时断开。

#### 候选方案对比

| 维度 | 方案一：BullMQ + Redis 异步任务队列 (推荐) | 方案二：前端 Web Worker + Canvas + jsPDF (客户端导出) |
| ### 2.2 图像处理与对象存储优化 (R2 / OSS)

用户上传的手机照片通常在 5MB~15MB 之间。如果直接回显原始图片，会导致前端编辑器卡顿、流量带宽费用激增。由于项目当前使用 Cloudflare R2（兼容 S3 协议）且后期有迁移至 Aliyun OSS 的规划，需做好图像处理与多云存储适配。

#### 候选方案对比

| 维度 | 方案一：前端 Canvas 压缩 + 后端 Sharp 转码 | 方案二：多云驱动抽象 + 混合图像处理策略 (推荐) |
| :--- | :--- | :--- |
| **工作原理** | 前端上传前用 Canvas 压缩 WebP；后端接收到后利用 `sharp` 进行元数据抹除并标准化存储。 | 建立存储驱动层抽象。R2 阶段在上传时用后端 `sharp` 生成原图和 `_thumb`（如 300px）并同时上传；OSS 阶段利用云端 CDN 动态裁剪服务。 |
| **CPU/内存占用** | 消耗客户端和后端 API 服务器的计算资源。 | **R2 阶段**：轻微消耗后端 API 的 `sharp` 计算资源。<br>**OSS 阶段**：完全由云厂商边缘节点计算。 |
| **存储成本** | 较低。只存储压缩后的单一尺寸版本。 | **R2 阶段**：存储原图及缩略图双版本，存储费低廉。<br>**OSS 阶段**：仅存储原图，按需动态裁剪生成缓存。 |
| **功能扩展性** | **差**。用户未来下载/印刷“原图”时，由于已在上传端被损耗，无法恢复高解析度。 | **完美**。编辑器内用 300px 缩略图，排版预览用 1080px 适配图，PDF 导出时拉取无损原图，兼顾速度与印刷质量。 |

**架构师推荐意见**：**采用方案二 (多云驱动抽象)**。为了确保后期能从 Cloudflare R2 平滑迁移到 Aliyun OSS，引入存储中间件抽象层，并针对 R2 和 OSS 的动态图片处理特性做兼容性适配。

---

### 2.3 对象存储抽象层 (Storage Driver Pattern) 与 R2-OSS 迁移策略

为了实现存储服务商的无缝切换，避免硬编码 AWS SDK 或 ali-oss SDK 到控制器和业务服务中，必须在后端建立**统一对象存储抽象层**。

#### 2.3.1 统一接口定义 `IStorageService`
在后端定义通用的存储客户端契约，所有存储逻辑只面向此接口编程：
```typescript
#region Description
export interface UploadResult {
    url: string;        // 公网/内部访问 URL
    ossKey: string;     // 存储键名 (e.g. uploads/2026/05/uuid.png)
}

export interface IStorageService {
    uploadFile(buffer: Buffer, originalName: string): Promise<UploadResult>;
    deleteFile(key: string): Promise<void>;
    getSignedUrl(key: string, expires?: number, process?: string): string | Promise<string>;
    getFileStream(key: string): Promise<NodeJS.ReadableStream>;
    getBucketStat(): Promise<{ storage: number; objectCount: number }>;
    extractKey(url: string): string | null;
}
#endregion
```

#### 2.3.2 动态加载与环境切换
1.  **实现具体驱动**：
    -   `R2StorageService.ts`：通过 `@aws-sdk/client-s3` 实现 `IStorageService`，负责与 Cloudflare R2 交互。
    -   `AliyunOssStorageService.ts`：通过 `ali-oss` 实现 `IStorageService`，负责与阿里云对象存储交互。
2.  **工厂模式注入**：
    在 `config/index.ts` 引入 `STORAGE_PROVIDER` 环境变量（值可为 `r2` 或 `oss`），在 `OssService.ts`（暴露给外界的服务入口）中根据该变量动态导出对应实现：
    ```typescript
    #region Description
    import { R2StorageService } from './drivers/R2StorageService.js';
    import { AliyunOssStorageService } from './drivers/AliyunOssStorageService.js';
    import { config } from '../config/index.js';

    export const storageService: IStorageService = config.storageProvider === 'oss'
        ? new AliyunOssStorageService()
        : new R2StorageService();
    #endregion
    ```

#### 2.3.3 图像裁剪跨云适配策略 (R2 vs OSS)
由于 R2 默认不支持阿里云的 `?x-oss-process=image/resize...` 风格的动态裁剪，而在排版回显时缩略图至关重要：
-   **R2 驱动的适配方案**：
    在 R2 驱动的 `uploadFile` 中，拦截图片类型文件，利用 `sharp` 在内存中生成 `w_300` 缩略图并以 `${key}_thumb` 为 Key 上传。当调用 `getSignedUrl(key, expires, 'thumbnail')` 时，R2 驱动内部自动将 Key 映射为 `${key}_thumb`。
-   **Aliyun OSS 驱动的适配方案**：
    无需在上传时处理。在 `getSignedUrl(key, expires, 'thumbnail')` 中，OSS 驱动将 `'thumbnail'` 转换并拼接为云端服务认识的 `?x-oss-process=image/resize,w_300/format,webp` 签名后缀。
-   **优势**：上层业务层（如 `BookService`、`PhotoService`）完全感知不到底层是 R2 还是 OSS，统一调用 `getSignedUrl(photo.key, 3600, 'thumbnail')` 即可。

---

### 2.4 零信任架构与接口安全加固

目前的系统正逐步从 LocalStorage 转向后端 MySQL 存储，安全性必须提升至生产级。

1.  **行级数据隔离 (Row-Level Security)**
    *   **Fail-Fast 原则**：所有书籍、章节、图片的更新与删除接口，禁止仅凭前端传入的 `id` 直接操作。
    *   **防越权校验**：每次数据库更新操作必须强制拼接当前 JWT 解析出的 `user_id`：
        ```typescript
        // 示例安全查询
        const result = await pool.query(
            'UPDATE books SET title = ? WHERE id = ? AND user_id = ?',
            [title, bookId, currentUser.id]
        );
        ```
2.  **文件上传安全性与签名链接**
    *   **防盗链与私有读**：将 R2/OSS 桶设为“私有”，杜绝图片 URL 被直接外链盗刷。
    *   **动态签名 (Signed URLs)**：前端向后端请求带有时效性（如 30 分钟有效）的签名 URL 进行回显，防止存储链接永久暴露。
3.  **敏感操作限流 (Rate Limiting)**
    *   对 `/api/auth/login`、`/api/auth/register` 接口限制单 IP 请求频率，防止暴力破解。
    *   对 `/api/export/*` 接口限制单个用户每分钟只能提交 1 次任务，防止恶意刷 PDF 生成导致队列积压。

---

## 3. 极限推演：10x 数据量与 10x 并发瓶颈分析

如果 TimeCollate 用户量增加 10 倍，书籍总数达到 **10万+**，并发导出 PDF 激增 10 倍，系统潜在的性能瓶颈（Bottlenecks）与防御设计如下：

### 3.1 数据量放大 10 倍 (Data Scale-up)

*   **瓶颈一：数据库慢查询与深分页**
    *   *现象*：大厅页（Lobby）和广场页（Square）查询在数据量变大后，`LIMIT 1000, 10` 会导致 MySQL 扫描大量无用行。
    *   *防御设计*：
        *   对 `books.user_id`、`books.created_at`、`photos.book_id` 建立复合索引。
        *   废弃基于偏移量的分页，改用基于游标的分页（Cursor-based Pagination，如 `WHERE id < ? ORDER BY id DESC LIMIT 10`）。
*   **瓶颈二：软删除数据堆积**
    *   *现象*：`books.deleted_at` 字段标记了软删除，如果长期不清理，表数据量持续虚高。
    *   *防御设计*：在现有的 `CleanupService` 中，添加定时任务（Cron），每天凌晨 3 点自动物理删除 `deleted_at < NOW() - INTERVAL 30 DAY` 的数据，并同步调用 `storageService.deleteFile` 删除对应的云端存储文件。

### 3.2 并发量激增 10 倍 (Concurrency Spike)

*   **瓶颈一：Playwright 无头浏览器引发的内存窒息**
    *   *现象*：如果 10 个 PDF 任务同时在单台服务器运行，至少需要 4GB~8GB 额外内存，直接导致 Node.js 进程被系统内核（OOM Killer）强制杀掉。
    *   *防御设计*：
        *   **熔断器模式**：当服务器系统 CPU 使用率 > 85% 或空闲内存 < 500MB 时，Worker 暂停从 BullMQ 中拉取新任务。
        *   **容器化隔离**：将 Playwright 运行在独立的 Docker 容器中，限制每个容器的最大内存为 1GB。
*   **瓶颈二：数据库连接数耗尽 (Connection Pool Exhaustion)**
    *   *现象*：在高并发 API 请求下，MySQL 连接池最大连接数（Max Connections）被打满，后续请求报 `Queue timeout` 错误。
    *   *防御设计*：
        *   优化连接池配置，设置合理的 `connectionLimit`（如 50~100）。
        *   确保代码中所有查询使用 `try...finally` 结构，并在 `finally` 块中及时释放连接或确保连接自动归还池中。
        *   引入 Redis 缓存“分享页面”的书籍静态元数据，避免每次匿名用户访问都查询 MySQL。

---

## 4. 落地实施路线图

为了稳步实现上述优化，建议分阶段推进：

### 阶段一：对象存储抽象与防腐 (短期 - 1~2 周)
*   [ ] 提炼并定义 `IStorageService` 接口，将 `OssService.ts` 重构为工厂代理。
*   [ ] 实现 `R2StorageService.ts`，利用已有的 AWS S3 兼容代码，测试现有上传与大厅加载正常。
*   [ ] 实现 R2 下的缩略图上传及 Key 映射代理。
*   [ ] 后端引入 `zod` 对所有 API 入参进行强类型校验（Fail-Fast）。

### 阶段二：安全性加固与行级隔离 (中期 - 2~4 周)
*   [ ] 重构所有数据库更新与删除逻辑，强制校验 `user_id`（零信任数据隔离）。
*   [ ] 将 R2/OSS 桶权限切换为私有，后端实现 `signUrlRouter` 的批量签名接口。
*   [ ] 前端图片组件引入 `loading="lazy"` 及 IntersectionObserver 懒加载机制。

### 阶段三：异步导出与 Aliyun OSS 迁移 (长期 - 1~2 个月)
*   [ ] 编写 `AliyunOssStorageService.ts`，配置 OSS 驱动实现。
*   [ ] 配合环境变量将服务迁移至 Aliyun OSS，开启 OSS 动态裁剪支持，废弃 R2 缩略图上传策略。
*   [ ] 引入 Redis 实例，并在后端代码中安装配置 `bullmq`。
*   [ ] 将 `PdfExportStrategy` 重构为 `QueueService` + `Worker` 的分层架构。
*   [ ] 前端重构导出按钮逻辑，开发 `ExportProgressModal` 用于轮询任务状态。vel Security)**
    *   **Fail-Fast 原则**：所有书籍、章节、图片的更新与删除接口，禁止仅凭前端传入的 `id` 直接操作。
    *   **防越权校验**：每次数据库更新操作必须强制拼接当前 JWT 解析出的 `user_id`：
        ```typescript
        // 示例安全查询
        const result = await pool.query(
            'UPDATE books SET title = ? WHERE id = ? AND user_id = ?',
            [title, bookId, currentUser.id]
        );
        ```
2.  **文件上传安全性与签名链接**
    *   **防盗链与私有读**：将 OSS Bucket 设为“私有”，杜绝图片 URL 被直接外链盗刷。
    *   **动态签名 (STS / Signed URLs)**：前端向后端请求带有时效性（如 30 分钟有效）的签名 URL 进行回显，防止存储链接永久暴露。
3.  **敏感操作限流 (Rate Limiting)**
    *   对 `/api/auth/login`、`/api/auth/register` 接口限制单 IP 请求频率，防止暴力破解。
    *   对 `/api/export/*` 接口限制单个用户每分钟只能提交 1 次任务，防止恶意刷 PDF 生成导致队列积压。

---

## 3. 极限推演：10x 数据量与 10x 并发瓶颈分析

如果 TimeCollate 用户量增加 10 倍，书籍总数达到 **10万+**，并发导出 PDF 激增 10 倍，系统潜在的性能瓶颈（Bottlenecks）与防御设计如下：

### 3.1 数据量放大 10 倍 (Data Scale-up)

*   **瓶颈一：数据库慢查询与深分页**
    *   *现象*：大厅页（Lobby）和广场页（Square）查询在数据量变大后，`LIMIT 1000, 10` 会导致 MySQL 扫描大量无用行。
    *   *防御设计*：
        *   对 `books.user_id`、`books.created_at`、`photos.book_id` 建立复合索引。
        *   废弃基于偏移量的分页，改用基于游标的分页（Cursor-based Pagination，如 `WHERE id < ? ORDER BY id DESC LIMIT 10`）。
*   **瓶颈二：软删除数据堆积**
    *   *现象*：`books.deleted_at` 字段标记了软删除，如果长期不清理，表数据量持续虚高。
    *   *防御设计*：在现有的 `CleanupService` 中，添加定时任务（Cron），每天凌晨 3 点自动物理删除 `deleted_at < NOW() - INTERVAL 30 DAY` 的数据，并同步调用 OSS API 删除对应的云端图片。

### 3.2 并发量激增 10 倍 (Concurrency Spike)

*   **瓶颈一：Playwright 无头浏览器引发的内存窒息**
    *   *现象*：如果 10 个 PDF 任务同时在单台服务器运行，至少需要 4GB~8GB 额外内存，直接导致 Node.js 进程被系统内核（OOM Killer）强制杀掉。
    *   *防御设计*：
        *   **熔断器模式**：当服务器系统 CPU 使用率 > 85% 或空闲内存 < 500MB 时，Worker 暂停从 BullMQ 中拉取新任务。
        *   **容器化隔离**：将 Playwright 运行在独立的 Docker 容器中，限制每个容器的最大内存为 1GB。
*   **瓶颈二：数据库连接数耗尽 (Connection Pool Exhaustion)**
    *   *现象*：在高并发 API 请求下，MySQL 连接池最大连接数（Max Connections）被打满，后续请求报 `Queue timeout` 错误。
    *   *防御设计*：
        *   优化连接池配置，设置合理的 `connectionLimit`（如 50~100）。
        *   确保代码中所有查询使用 `try...finally` 结构，并在 `finally` 块中及时释放连接或确保连接自动归还池中。
        *   引入 Redis 缓存“分享页面”的书籍静态元数据，避免每次匿名用户访问都查询 MySQL。

---

## 4. 落地实施路线图

为了稳步实现上述优化，建议分阶段推进：

### 阶段一：安全防护与接口规范 (短期 - 1~2 周)
*   [ ] 引入全局 `express-rate-limit` 中间件，保护高能耗接口。
*   [ ] 后端引入 `zod` 对所有 API 入参进行强类型校验（Fail-Fast）。
*   [ ] 重构所有数据库更新与删除逻辑，强制校验 `user_id`（零信任数据隔离）。

### 阶段二：OSS 样式与性能优化 (中期 - 2~4 周)
*   [ ] 配置 Aliyun OSS 动态图片缩略图规则，修改前端组件中图片 `src` 的拼接逻辑。
*   [ ] 将 OSS Bucket 权限切换为私有，后端实现 `signUrlRouter` 的批量签名接口。
*   [ ] 前端图片组件引入 `loading="lazy"` 及 IntersectionObserver 懒加载机制。

### 阶段三：异步高可用导出引擎 (长期 - 1~2 个月)
*   [ ] 引入 Redis 实例，并在后端代码中安装配置 `bullmq`。
*   [ ] 将 `PdfExportStrategy` 重构为 `QueueService` + `Worker` 的分层架构。
*   [ ] 前端重构导出按钮逻辑，开发 `ExportProgressModal` 用于轮询任务状态。
