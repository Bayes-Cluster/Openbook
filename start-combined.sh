#!/bin/bash
# 前后端合并启动脚本

set -e

echo "🚀 启动 OpenBook 合并服务..."

# 确保数据目录存在并有正确权限
mkdir -p /app/data
chown -R app:app /app/data
chmod -R 755 /app/data

echo "📁 数据目录已准备就绪"

# 启动Nginx
echo "🌐 启动 Nginx..."
nginx -t && nginx

# 启动后端服务
echo "🔗 启动 FastAPI 后端..."
su app -c "cd /app && uvicorn main:app --host 0.0.0.0 --port 8000" &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端服务启动..."
for i in {1..30}; do
    if curl -f http://127.0.0.1:8000/health > /dev/null 2>&1; then
        echo "✅ 后端服务已启动"
        break
    fi
    echo "等待后端启动... ($i/30)"
    sleep 2
done

# 启动前端服务
echo "🎨 启动 Next.js 前端..."
su app -c "cd /app/frontend && PORT=3000 HOSTNAME=0.0.0.0 node server.js" &
FRONTEND_PID=$!

# 等待前端启动
echo "⏳ 等待前端服务启动..."
for i in {1..30}; do
    if curl -f http://127.0.0.1:3000 > /dev/null 2>&1; then
        echo "✅ 前端服务已启动"
        break
    fi
    echo "等待前端启动... ($i/30)"
    sleep 2
done

echo "✅ 所有服务已启动"
echo "📡 后端API: http://localhost/api"
echo "🎨 前端界面: http://localhost"
echo "📖 API文档: http://localhost/docs"

# 显示服务状态
echo ""
echo "📊 服务状态检查："

# 检查端口是否被监听
check_port() {
    local port=$1
    local service=$2
    if netstat -tlnp 2>/dev/null | grep ":$port " > /dev/null; then
        echo "✅ $service 端口$port已监听"
    else
        echo "❌ $service 端口$port未监听"
    fi
}

check_port 8000 "后端"
check_port 3000 "前端"  
check_port 80 "Nginx"
echo ""

# 健康检查
check_health() {
    echo "🔍 检查服务健康状态..."
    
    # 检查后端
    if curl -f http://127.0.0.1:8000/health > /dev/null 2>&1; then
        echo "✅ 后端服务正常"
    else
        echo "❌ 后端服务异常"
        return 1
    fi
    
    # 检查前端
    if curl -f http://127.0.0.1:3000 > /dev/null 2>&1; then
        echo "✅ 前端服务正常"
    else
        echo "❌ 前端服务异常"
        return 1
    fi
    
    # 检查Nginx代理到后端
    if curl -f http://127.0.0.1:80/api/health > /dev/null 2>&1; then
        echo "✅ Nginx后端代理正常"
    else
        echo "❌ Nginx后端代理异常"
        return 1
    fi
    
    # 检查Nginx代理到前端
    if curl -f http://127.0.0.1:80 > /dev/null 2>&1; then
        echo "✅ Nginx前端代理正常"
    else
        echo "❌ Nginx前端代理异常"
        return 1
    fi
}

# 清理函数
cleanup() {
    echo "🛑 正在关闭服务..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    nginx -s quit 2>/dev/null || true
    echo "✅ 服务已关闭"
}

# 捕获退出信号
trap cleanup SIGTERM SIGINT

# 定期健康检查
while true; do
    sleep 30
    if ! check_health; then
        echo "❌ 健康检查失败，重启服务..."
        cleanup
        exit 1
    fi
done
