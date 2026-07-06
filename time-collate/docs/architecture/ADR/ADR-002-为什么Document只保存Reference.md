# ADR-002: 为什么在 Document Model 中只保存资源引用 (Reference) 而不是直接嵌入实体或硬编码名称

## 上下文与背景

在原先的排版插槽与 Canvas 元素中，文字的 `fontFamily` 样式、背景的 `backgroundImage` 属性等，都是在 JSON 数据中直接以真实的物理名称或 URL 进行硬编码保存的（例如保存 `"fontFamily": "Noto Serif SC"` 或直接存储 OSS 图片 URL）。

这种“数据与资源强耦合”的设计模式在编辑器长期运行中引发了以下两个严重的工程瓶颈：
1. **数据破坏与迁移阵痛**：如果云端字体更名、或是 CDN 静态文件存储服务器域名发生迁移、或是素材被管理员下架，所有已落库的历史回忆册 JSON 里面的 fontFamily / imageUrl 将全部失效。我们需要去数据库批量跑迁移脚本，这对于已经落库的巨量回忆册是极其不可逆且高风险的。
2. **文档序列化臃肿**：回忆书的 Document JSON 需要在前端、后端、以及数据库之间频繁网络传输。如果把庞大的贴纸 SVG 文本、复杂字体的源元数据直接嵌入到 Element 数据结构中，会导致持久化文件体积几何级爆溢。

## 决策依据与架构对比

我们围绕“Document 中如何存储资源信息”进行了如下两个核心选型方案的分析与权衡：

- **方案 A：直接嵌入物理字段（旧方案，如 fontFamily / fileUrl）**
  - *Pros*：渲染器极其简单，拿到 `element.style.fontFamily` 就可以直接传给 CSS 样式，不需要任何异步解析和 Provider 机制。
  - *Cons*：一损俱损。一旦底层 CDN 路径、文件名发生变化，历史书数据完全损坏。另外，无法在渲染前准确获知资源就绪情况，极易造成印前 PDF 导出缺失字体等不合格产品。

- **方案 B：解耦存储引用 ID (Reference ID，Runtime v1)**
  - *Pros*：数据永不损坏。Document 只存 `{ "font": { "resourceId": "system-serif" } }`，物理 URL 随时随地由 Repository 动态映射。即便底层字体文件更换了 OSS Bucket，Document 也不用变动任何一个字节。
  - *Cons*：增加了一层解析环节。渲染器在 Paint 前必须通过 `RenderPipeline` 和 `ResourceResolver` 异步将 ID 解析并加载为 Ready 的物理资源实例。

## 架构决定

我们决定在 **Editor Runtime v1** 中，全面推行 **“零资源依赖的纯数据 Document (Zero-Resource Document)”** 规范：

1. 数据库和 Document 状态树中，样式属性严禁直接存储真实的字体名或贴图 SVG 代码，统一保存 `ResourceReference`（包含唯一的 `resourceId`）。
2. 在渲染图管线中建立前置解析层 `ResourceResolver`，由它去 Repository 查找当前就绪的物理 `Resource`。如果未就绪，则将 `resourceId` 派发给统一的 `ResourceLoader` 触发按需异步下载。
3. **数据升迁（Migration Pipeline）**：对于历史回忆书数据中残存的旧格式（直接存储 Noto Serif SC 等字符串），数据流在 Deserialize 时必须流经通用的 `MigrationPipeline`，将其自动映射并转换升迁为新版 Reference 引用 ID，从而保证业务组件代码的绝对纯净，防止出现版本兼容的垃圾逻辑。

## 后续影响

- **对渲染逻辑**：Canvas 元素组件在挂载时必须处理异步 `resolve` 生命周期。
- **对扩展性**：支持了印前 PDF 导出时的强同步阻塞等待，并且由于 Document 只有纯数据引用，回忆书数据的序列化大小缩减了 80% 以上，极大降低了存储与网络传输压力。
