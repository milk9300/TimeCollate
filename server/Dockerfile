# 使用最轻量级的 Alpine 镜像，压缩体积仅十几MB
FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖 (不安装 devDependencies 开发包)
RUN npm install

# 复制源码
COPY . .

# 构建项目
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["npm", "start"]
