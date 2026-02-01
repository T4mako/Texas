# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# 复制包配置文件
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

# 安装依赖（包括dev依赖，用于构建）
RUN npm ci

# 复制源代码
COPY src ./src
COPY api ./api
COPY public ./public
COPY index.html ./

# 构建应用
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# 安装仅生产依赖
COPY package*.json ./

RUN npm ci --omit=dev && \
    npm cache clean --force

# 从 builder 阶段复制构建文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "import('http').then(({default:http})=>http.get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)))"

# 启动服务器
CMD ["node", "--loader", "tsx", "api/server.ts"]
