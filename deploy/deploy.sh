#!/bin/bash
# ============================================
# VetSphere Docker 部署脚本
# ============================================

set -e

echo "🚀 Starting VetSphere deployment..."

# 检查 .env 文件是否存在
if [ ! -f "deploy/.env" ]; then
    echo "❌ Error: deploy/.env file not found!"
    echo "Please create deploy/.env from deploy/.env.example"
    exit 1
fi

# 加载环境变量
export $(grep -v '^#' deploy/.env | xargs)

# 构建并启动服务
echo "📦 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# 等待服务启动
echo "⏳ Waiting for services to start..."
sleep 10

# 检查健康状态
echo "🏥 Checking service health..."
docker-compose ps

echo "✅ Deployment completed!"
echo ""
echo "服务地址:"
echo "  - 中国站:   http://localhost:3001"
echo "  - 国际站:   http://localhost:3002"
echo "  - 管理后台: http://localhost:3003"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
