# 前端独立部署 Dockerfile (Next.js)

# 阶段1: 构建应用
FROM node:18-alpine AS builder
WORKDIR /app

# 复制package文件并安装依赖
COPY package*.json ./
RUN npm ci

# 复制源代码并构建
COPY . .
ENV NEXT_PUBLIC_API_URL=/api
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 阶段2: 运行时
FROM node:18-alpine AS runner
WORKDIR /app

# 安装wget用于健康检查
RUN apk add --no-cache wget

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 启动命令
CMD ["node", "server.js"]
