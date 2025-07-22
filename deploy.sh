#!/bin/bash
# OpenBook Docker 统一部署脚本

set -e

echo "🚀 OpenBook Docker 统一部署脚本"
echo "================================"

# 检查部署模式
echo "请选择部署模式:"
echo "1) 统一部署 (推荐) - 单容器包含前后端"
echo "2) 单容器部署 - 使用 docker-compose-single.yml"
read -p "请输入选择 (1-2): " choice

case $choice in
    1)
        COMPOSE_FILE="docker-compose.yml"
        echo "🎯 使用统一部署模式"
        ;;
    2)
        COMPOSE_FILE="docker-compose-single.yml"
        echo "🎯 使用单容器部署模式"
        ;;
    *)
        echo "❌ 无效选择，使用默认统一部署模式"
        COMPOSE_FILE="docker-compose.yml"
        ;;
esac

# 检查是否存在后端 .env 文件
if [ ! -f backend/.env ]; then
    echo "📝 创建后端环境变量文件..."
    cp backend/.env.example backend/.env
    echo "⚠️  请编辑 backend/.env 文件并设置正确的环境变量"
    echo "   特别是 SECRET_KEY 和 OAuth 配置"
    read -p "编辑完成后按 Enter 继续..."
fi

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose -f $COMPOSE_FILE down

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose -f $COMPOSE_FILE build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker-compose -f $COMPOSE_FILE up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "✅ 部署完成！"
echo "🌐 访问地址: http://localhost"
echo "🔗 API地址: http://localhost/api"
echo "📊 API文档: http://localhost/docs"
echo ""
echo "📝 有用的命令:"
echo "   查看日志: docker-compose -f $COMPOSE_FILE logs -f"
echo "   停止服务: docker-compose -f $COMPOSE_FILE down"
echo "   重启服务: docker-compose -f $COMPOSE_FILE restart"
