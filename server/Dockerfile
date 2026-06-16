# 使用轻量级 Node.js 20 镜像 (压缩包仅约 70MB，使用国内加速代理)
FROM docker.m.daocloud.io/library/node:20-slim

WORKDIR /app

# 换源并安装 Playwright 运行 Chromium 所需的极简系统依赖 (过滤掉 Firefox/WebKit 依赖)
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update && apt-get install -y --no-install-recommends \
       ca-certificates \
    && npx playwright install-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 确保且仅安装 Chromium 浏览器 (避免下载 Firefox 和 WebKit 浏览器，节省数百MB下载量)
RUN npx playwright install chromium

# 复制源码
COPY . .

# 构建项目
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["npm", "start"]
