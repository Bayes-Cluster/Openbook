#!/bin/bash
# OpenBook 分离部署脚本

set -e

echo "🚀 开始部署 OpenBook 分离服务..."

# 检查必要文件
if [ ! -f "docker-compose-separated.yml" ]; then
    echo "❌ docker-compose-separated.yml 文件不存在"
    exit 1
fi

if [ ! -f "nginx-separated.conf" ]; then
    echo "❌ nginx-separated.conf 文件不存在"
    exit 1
fi

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose -f docker-compose-separated.yml down 2>/dev/null || true

# 清理旧镜像（可选）
read -p "是否清理旧的 Docker 镜像? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理旧镜像..."
    docker system prune -f
    docker rmi $(docker images "openbook*" -q) 2>/dev/null || true
fi

# 构建并启动服务
echo "🏗️ 构建和启动服务..."
docker-compose -f docker-compose-separated.yml up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose -f docker-compose-separated.yml ps

# 健康检查
echo "🔍 执行健康检查..."

# 检查后端
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ 后端服务正常 (端口 8000)"
else
    echo "❌ 后端服务异常"
fi

# 检查前端
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务正常 (端口 3000)"
else
    echo "❌ 前端服务异常"
fi

# 检查 Nginx
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Nginx 代理正常 (端口 80)"
else
    echo "❌ Nginx 代理异常"
fi

# 检查 API 代理
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ API 代理正常"
else
    echo "❌ API 代理异常"
fi

echo ""
echo "🎉 部署完成！"
echo "📡 后端直接访问: http://your-server:8000"
echo "🎨 前端直接访问: http://your-server:3000"
echo "🌐 统一入口(推荐): http://your-server"
echo "📖 API文档: http://your-server/docs"
echo ""
echo "📝 查看日志: docker-compose -f docker-compose-separated.yml logs -f"
echo "🛑 停止服务: docker-compose -f docker-compose-separated.yml down"
