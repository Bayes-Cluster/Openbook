# OpenBook 后端 Dockerfile
# FastAPI + Python 3.11

FROM python:3.11-slim

LABEL maintainer="Bayes Cluster Maintenance Group <bayes@uicstat.com>"
LABEL description="OpenBook 后端服务 - FastAPI"

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    # 构建依赖
    gcc \
    # 网络工具
    curl \
    # 清理缓存
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY requirements.txt ./

# 安装Python依赖
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 复制后端源代码
COPY . ./

# 创建应用用户
RUN useradd --create-home --shell /bin/bash --uid 1000 app && \
    mkdir -p /app/data && \
    chown -R app:app /app && \
    chmod -R 755 /app

# 暴露端口
EXPOSE 8000

# 设置环境变量
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 切换到应用用户
USER app

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
