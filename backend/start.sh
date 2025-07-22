#!/bin/bash
# 后端启动脚本

set -e

echo "🚀 启动 OpenBook 后端服务..."

# 确保数据目录存在并有正确权限
mkdir -p /app/data
chown -R app:app /app/data
chmod -R 755 /app/data

# 调试信息
echo "📁 当前用户: $(whoami)"
echo "📁 数据目录权限: $(ls -la /app/data)"
echo "📁 数据目录路径: /app/data"
echo "📁 DATABASE_URL: $DATABASE_URL"

# 测试数据库文件创建权限
su app -c "touch /app/data/test.db" && echo "✅ 可以创建文件" || echo "❌ 无法创建文件"
rm -f /app/data/test.db

echo "📁 数据目录已准备就绪"

# 启动应用 - 切换到app用户
echo "🔗 启动 FastAPI 应用..."
echo "📡 Host: ${HOST:-0.0.0.0}"
echo "📡 Port: ${PORT:-8000}"
exec su app -c "uvicorn main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}"
