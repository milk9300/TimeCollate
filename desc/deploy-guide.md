# TimeCollate 项目服务器部署手册 (非 Docker)

本文档旨在指导如何将 TimeCollate 项目（Node.js 后端 + Vite/React 前端）手动部署到生产环境服务器。

---

## 1. 环境安装 (宝塔面板版)

如果你的服务器安装了宝塔面板，可以大大简化部署过程。

### 1.1 Node.js 安装 (解决版本找不到的问题)
1. 在宝塔面板左侧菜单点击 **软件商店**。
2. 搜索并安装 **Node.js版本管理器**。
3. 打开管理器，如果列表里没有看到 v18+ 版本：
   - 点击右上角的 **[更新版本列表]** 按钮。这会同步 Node.js 官网最新的版本信息。
   - 刷新后，找到 **v18.x** 或更高版本（如 v20.x），点击 **安装**。
   - 安装完成后，在“命令行版本”下拉框中选择刚安装的版本，确保全局环境生效。

### 1.2 MySQL 安装
1. 在 **软件商店** 安装 **MySQL 8.0**（项目推荐使用 8.0 以获得更好的 JSON 支持）。
2. 在 **数据库** 菜单点击 **添加数据库**，创建名为 `timecollate` 的数据库。

### 1.3 PM2 管理器
建议安装 **PM2项目管理器** 以便通过图形化界面管理后端进程。

### 1.3 Nginx 安装
```bash
sudo apt install nginx
```

### 1.4 PM2 安装
用于管理后端进程，确保服务在后台稳定运行并支持崩溃重启。
```bash
sudo npm install -g pm2
```

---

## 2. 后端部署 (Server)

### 2.1 源码克隆与依赖安装
1. 将 `server` 目录下的代码上传至服务器目录（如 `/home/www/timecollate/server`）。
2. 在该目录下执行：
   ```bash
   npm install
   ```

### 2.2 环境变量配置
在 `server` 目录下创建 `.env` 文件，根据实际情况修改配置：
```ini
# 阿里云 OSS 配置
OSS_ACCESS_KEY_ID=你的AccessKeyID
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET=time-collate
OSS_PREFIX=uploads/

# MySQL 配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的数据库密码
MYSQL_DATABASE=timecollate

# 服务配置
PORT=3001
NODE_ENV=production

# 前端地址
APP_URL=http://你的域名或IP
SHARE_BASE_URL=http://你的域名或IP
```

### 2.3 数据库初始化
```bash
# 自动创建表结构（前提是已手动创建 timecollate 数据库）
npm run db:init
```

### 2.4 编译与启动
```bash
# 编译 TypeScript
npm run build

# 使用 PM2 启动
pm2 start dist/index.js --name "timecollate-api"

# 设置开机自启
pm2 save
pm2 startup
```

---

## 3. 前端部署 (Frontend)

### 3.1 环境变量配置
进入 `time-collate` 目录，检查或修改 `.env` 文件：
```ini
VITE_STORAGE_MODE=cloud
# 此处建议设置为生产环境的 API 基础路径，或使用相对路径（配合 Nginx 反代）
VITE_API_BASE_URL=/api
```

### 3.2 构建生产资源
```bash
npm install
npm run build
```
构建完成后，会生成一个 `dist` 目录。

### 3.3 资源托管
将 `dist` 目录内的所有文件复制到 Nginx 托管目录（如 `/var/www/timecollate`）：
```bash
sudo mkdir -p /var/www/timecollate
sudo cp -r dist/* /var/www/timecollate/
```

---

## 4. Nginx 配置 (宝塔面板简易版)

1. 在宝塔面板 **网站** 菜单，点击 **添加站点**：
   - 域名：填写你的域名或服务器 IP。
   - 根目录：指向前端 `dist` 存放的路径（如 `/www/wwwroot/timecollate/frontend/dist`）。
2. 点击站点设置，选择 **反向代理** -> **添加反向代理**：
   - 代理名称：api
   - 目标 URL：`http://127.0.0.1:3001`
   - 发送域名：`$host`
3. 设置完成后，点击反向代理的 **配置文件**，在对应的 `location /` 块中加入：
   ```nginx
   # 确保末尾有 /api/ 转发
   location /api/ {
       proxy_pass http://127.0.0.1:3001/api/;
       # ... 宝塔会自动生成的其他配置 ...
   }
   ```
4. 为了支持前端路由（防止 F5 刷新 404），在站点设置的 **配置文件** 或 **伪静态** 中加入：
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

---

## 5. Playwright 系统依赖 (导出功能)

由于项目依赖 `playwright` 进行 PDF 导出，服务器需要安装相关的浏览器运行库：
```bash
npx playwright install-deps
# 或者手动安装常用的库
# sudo apt install -y libgbm-dev libnss3 libatk-bridge2.0-0 ...
```

---

---

## 7. 常见问题排查 (FAQ)

### 7.1 npm install 报错 "registry error parsing json" 或 "node v4.x"
**原因**：你的服务器当前运行的 Node.js 版本太旧（如日志中的 v4.2.0），现代项目无法在该版本下运行。

**解决方法**：
1. **切换命令行版本**：
   - 打开宝塔的 **Node.js版本管理器**。
   - 在 **命令行版本** 下拉框中，选择您刚才安装的 **v18.x** 或更高版本。
   - **非常重要**：设置完后，需要**断开当前的 SSH 终端连接并重新连接**，或者运行 `source /etc/profile` 使其生效。
2. **验证版本**：
   - 在终端输入 `node -v`，确保输出是 `v18.x.x`。
   - 输入 `npm -v`，确保输出版本大于 8.x。
3. **重新安装**：
   - 删除 `node_modules` 文件夹和 `package-lock.json`（如果存在）。
   - 重新运行 `npm install`。

### 7.2 npm mirror 镜像站报错 (NoSuchKey)
**原因**：有时候官方镜像同步延迟或 Node.js 版本太旧导致请求路径错误。

**解决方法**：
切换回官方源或尝试腾讯云源：
```bash
# 切换回官方源
npm config set registry https://registry.npmjs.org/
# 或者使用腾讯云镜像
npm config set registry https://mirrors.cloud.tencent.com/npm/
```
