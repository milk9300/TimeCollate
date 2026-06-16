# 使用与 package.json 严格一致的 Playwright 官方镜像 (采用微软中国专用官方镜像端点)
FROM mcr.azure.cn/playwright:v1.58.1-jammy

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 确保安装了正确的浏览器二进制文件
RUN npx playwright install chromium

# 复制源码
COPY . .

# 构建项目
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["npm", "start"]
