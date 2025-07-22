# OpenBook 全栈应用 - 统一部署 Dockerfile
# 包含前端(Next.js) + 后端(FastAPI) + Nginx反向代理

# ===========================================
# 阶段1: 构建前端应用
# ===========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend

# 复制前端依赖文件
COPY frontend/package*.json ./
COPY frontend/next.config.js ./

# 安装前端依赖
RUN npm ci --only=production

# 复制前端源代码
COPY frontend/ ./

# 设置构建环境变量
ENV NEXT_PUBLIC_API_URL=http://localhost/api
ENV NODE_ENV=production

# 构建前端应用
RUN npm run build

# ===========================================
# 阶段2: 主运行时环境（后端 + Nginx）
# ===========================================
FROM python:3.11-slim AS runtime
LABEL maintainer="Bayes Cluster Maintenance Group < bayes@uicstat.com >"
LABEL description="OpenBook 全栈应用 - 前后端统一部署"

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    # 构建依赖
    gcc \
    # 网络工具
    curl \
    wget \
    # Web服务器
    nginx \
    # 清理缓存
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 设置工作目录
WORKDIR /app

# ===========================================
# 后端安装
# ===========================================
# 复制后端依赖文件
COPY backend/requirements.txt ./requirements.txt

# 安装Python依赖
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 复制后端源代码
COPY backend/ ./

# 复制启动脚本
COPY start-combined.sh ./

# ===========================================
# 前端集成
# ===========================================
# 创建前端目录并复制构建产物
RUN mkdir -p /app/frontend

# 复制前端构建产物
COPY --from=frontend-builder /frontend/.next/standalone /app/frontend/
COPY --from=frontend-builder /frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /frontend/public /app/frontend/public

# 注意：standalone 模式下，package.json 和 next.config.js 已包含在 standalone 目录中
# 无需单独安装前端依赖

WORKDIR /app

# ===========================================
# 系统配置
# ===========================================
# 配置Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# 创建应用用户
RUN useradd --create-home --shell /bin/bash --uid 1000 app

# 创建必要目录并设置权限
RUN mkdir -p /app/data /var/log/nginx && \
    chown -R app:app /app && \
    chmod -R 755 /app && \
    chmod +x /app/start-combined.sh

# ===========================================
# 运行时配置
# ===========================================
# 暴露端口
EXPOSE 80

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 启动命令
CMD ["./start-combined.sh"]
