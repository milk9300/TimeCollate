# 管理端监控面板 (Telemetry) 真实数据接入开发指南

本指南旨在指导后续如何将管理端右侧数据分析仪（Telemetry 面板）中的模拟数据替换为由后端 Express 服务提供的真实物理机硬件负载、服务日志流以及 OSS/CDN 指标。

---

## 一、 系统现状与数据划分评估

目前管理后台的数据架构采取了“真假分流”的设计：

*   **已接入真实数据（无需改动）**：
    *   作品管理表格、作者、数据统计指标（章节/页面/照片数，直接从 `books`、`pages`、`photos` 等表联合 COUNT 查询）。
    *   用户管理表格、封禁/角色修改操作、DAU/WAU 计算。
    *   反馈广场的匿名反馈列表及截图。
*   **当前为模拟数据（本指南对接目标）**：
    *   **物理宿主机负载**：CPU 与内存占用的秒级波动折线图。
    *   **系统日志流**：模拟输出的 `[SYS]` 进程与事务滚动日志。
    *   **Chromium 进程池状态**：Worker #1、#2、#3 的空闲/繁忙状态。
    *   **OSS 存储占比 & CDN 成本**：写死的占用量及 CDN 缓存命中比率。

---

## 二、 后端 Express API 接口设计规范

您需要在 Node.js 后端服务中实现以下几个监控 API，并在相应的管理路由文件 `server/src/routes/admin.ts` 中注册（需经过 `adminMiddleware` 越权防护）：

### 1. 物理宿主机负载监控
*   **接口**：`GET /api/admin/system/metrics`
*   **作用**：获取服务器真实的 CPU 及内存使用率。
*   **Node.js 实现建议**：
    可以使用 Node.js 原生的 `os` 模块，或者安装 `systeminformation` 库以防获取多核占用时计算复杂。
    ```typescript
    import os from 'os';

    // 原生 CPU 使用率估算方法（计算时间差）
    function getCpuUsage() {
        const cpus = os.cpus();
        let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
        for (const cpu of cpus) {
            user += cpu.times.user;
            nice += cpu.times.nice;
            sys += cpu.times.sys;
            idle += cpu.times.idle;
            irq += cpu.times.irq;
        }
        const total = user + nice + sys + idle + irq;
        return { idle, total };
    }

    // 在接口响应中返回百分比
    // 内存：(1 - os.freemem() / os.totalmem()) * 100
    ```

### 2. 渲染队列与 Worker 进程状态
*   **接口**：`GET /api/admin/system/workers`
*   **作用**：展示底层 PDF 渲染引擎与并发任务的处理状态。
*   **数据源建议**：
    *   由于任务队列基于 BullMQ 实现，可以通过读取 `exportQueue` 的活跃状态，以及检测 Puppeteer 实例进程池的状态来动态返回。
    *   返回格式：
        ```json
        {
          "workers": [
            { "name": "Worker #1 (PDF Renderer)", "status": "idle" },
            { "name": "Worker #2 (Preview Core)", "status": "active" },
            { "name": "Worker #3 (Bulk Exporter)", "status": "blocked" }
          ]
        }
        ```

### 3. OSS 存储及 CDN 用量明细
*   **接口**：`GET /api/admin/system/storage-stats`
*   **作用**：统计用户图、导出的 PDF 物理体积和 CDN 指标。
*   **数据源建议**：
    *   **OSS 统计**：如果在数据库的 `photos` 表和 `export_tasks` 表中记录了文件大小（`file_size` 字节），可以通过执行 SQL 快速获取空间占比：
        ```sql
        SELECT SUM(file_size) FROM photos;
        SELECT SUM(file_size) FROM export_tasks WHERE status = 'completed';
        ```
    *   **CDN 统计**：建议定时轮询云厂商的 CDN 账单与监控 API，拉取缓存命中率（Cache Hit Rate），或者在网关层通过 nginx 统计请求命中。

### 4. 实时日志流接入（双重方案选择）
*   **接口**：`GET /api/admin/system/logs/stream`
*   **方案 A（WebSocket / SSE 实时推送）**：
    *   当后端执行核心任务（如：创建用户、书籍被删除、导出任务开始/结束、安全异常触发）时，将日志同时写入文件，并通过服务器发送事件 (SSE) 或 WebSocket 将结构化日志发送给所有连接的管理端浏览器。
*   **方案 B（轮询短连接）**：
    *   后端接口读取本地运行日志文件（如 `logs/app.log`）的最后 50 行并返回：
        ```typescript
        import fs from 'fs';
        // 读取日志文件的后 N 行返回
        ```

---

## 三、 前端页面状态替换指南

前端展示逻辑位于：
[AdminTelemetryPanel.tsx](file:///e:/AI%20Projects%20/Antigravity%20Project/TimeCollate/time-collate/src/features/admin/components/AdminTelemetryPanel.tsx)

替换步骤如下：

### 1. 替换硬件监控曲线数据
定位到 `cpuData` 与 `memData` 的 `useState`（第 29-30 行）：
```typescript
// 替换前：
const [cpuData, setCpuData] = useState<number[]>([...]);
```
**替换后**：
在组件内使用 Axios 轮询定时（例如每 3 秒一次）请求 `/api/admin/system/metrics`，并将返回的 CPU 和内存比率 append 到数组末尾，保持曲线平滑移动：
```typescript
const fetchMetrics = async () => {
    try {
        const res = await axios.get('/api/admin/system/metrics');
        const { cpu, memory } = res.data.data;
        setCpuData(prev => [...prev.slice(1), cpu]);
        setMemData(prev => [...prev.slice(1), memory]);
    } catch (e) {
        console.error(e);
    }
};
```

### 2. 替换实时日志流
定位到 `useEffect` 的模拟日志生成逻辑（第 41-80 行），将定时生成模拟日志的逻辑移除。

**替换后 (以 SSE 为例)**：
```typescript
useEffect(() => {
    const eventSource = new EventSource('/api/admin/system/logs/stream', {
        withCredentials: true
    });
    eventSource.onmessage = (event) => {
        const newLog = JSON.parse(event.data); // { time: '12:00', text: '...', type: 'info' }
        setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    };
    return () => eventSource.close();
}, []);
```

### 3. 替换 Worker 状态及云存储占比
在 Telemetry 面板加载时，统一通过 API 获取 `storage-stats` 和 `workers` 数据：
*   绑定至 React `useState` 状态中。
*   在 `case '/admin/render-flow'` 和 `case '/admin/storage'` 中渲染对应的真实状态数组和百分比进度条。

---

## 四、 安全防范（零信任原则）

在实现上述监控 API 时，后端必须遵循**零信任原则**：
1.  **权限校验**：所有 `/api/admin/system/*` 接口必须在路由级前置引入 `authMiddleware` 和 `adminMiddleware`，非管理员角色越权访问必须立即抛出 `403 Forbidden` 并记录审计日志。
2.  **日志安全过滤**：输出给前端的实时日志流中，**严禁包含**任何明文密码哈希、用户真实邮箱/手机号等敏感 PII 信息，防止数据泄漏。
3.  **限流 (Rate Limiting)**：监控接口（尤其是读取文件或计算 CPU 的物理负载接口）应添加严格的防刷限流机制，避免恶意并发请求直接压垮监控接口导致拒绝服务 (DoS)。
