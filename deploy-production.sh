#!/bin/bash

# BabyBeats 后端部署脚本（腾讯云服务器）
# 此脚本用于在腾讯云服务器上部署 BabyBeats 后端服务
# 服务器 IP: 111.230.110.95
# 端口分配: API=4100, PostgreSQL=5500（避免与 RoomEase 项目冲突）

set -e

echo "🚀 BabyBeats 后端部署脚本"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在服务器上
if [ ! -f "/etc/os-release" ]; then
    echo -e "${RED}❌ 此脚本需要在 Linux 服务器上运行${NC}"
    exit 1
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 和 Docker Compose 已安装${NC}"
echo ""

# 进入后端目录
cd "$(dirname "$0")"
echo -e "${YELLOW}📁 当前目录: $(pwd)${NC}"
echo ""

# 检查是否存在 .env.production 文件
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env.production 文件，创建默认配置...${NC}"
    cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3000
API_VERSION=v1

DB_HOST=postgres
DB_PORT=5432
DB_NAME=babybeats
DB_USER=babybeats_user
DB_PASSWORD=babybeats_pass_2024_CHANGE_THIS

JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
JWT_EXPIRES_IN=7d

CORS_ORIGIN=*

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

PGADMIN_EMAIL=admin@babybeats.local
PGADMIN_PASSWORD=admin123
EOF
    echo -e "${GREEN}✅ 已创建 .env.production 文件${NC}"
    echo -e "${RED}⚠️  警告：请修改 JWT_SECRET 和数据库密码后再部署！${NC}"
    echo ""
fi

# 加载环境变量
set -a
source .env.production
set +a

echo "📋 部署配置信息"
echo "================================"
echo "环境: $NODE_ENV"
echo "API 版本: $API_VERSION"
echo "数据库名: $DB_NAME"
echo "数据库用户: $DB_USER"
echo "端口映射:"
echo "  - API: 4100:3000"
echo "  - PostgreSQL: 5500:5432"
echo "  - pgAdmin: 5051:80 (可选)"
echo ""

# 询问是否继续
read -p "确认继续部署？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ 部署已取消${NC}"
    exit 1
fi

echo ""
echo "🛑 停止现有容器..."
docker-compose -f docker-compose.production.yml down || true

echo ""
echo "🗑️  清理旧的镜像..."
docker-compose -f docker-compose.production.yml rm -f || true

echo ""
echo "🏗️  构建新的镜像..."
docker-compose -f docker-compose.production.yml build --no-cache

echo ""
echo "🚀 启动服务..."
docker-compose -f docker-compose.production.yml up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 10

echo ""
echo "📊 检查服务状态..."
docker-compose -f docker-compose.production.yml ps

echo ""
echo "🔍 检查健康状态..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:4100/health &> /dev/null; then
        echo -e "${GREEN}✅ API 服务已启动并响应健康检查${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "等待 API 服务启动... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ API 服务启动超时${NC}"
    echo "查看日志:"
    docker-compose -f docker-compose.production.yml logs api
    exit 1
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "================================"
echo ""
echo "📍 服务访问地址："
echo "  - API 服务: http://111.230.110.95:4100"
echo "  - 健康检查: http://111.230.110.95:4100/health"
echo "  - API 文档: http://111.230.110.95:4100/api/v1"
echo "  - pgAdmin: http://111.230.110.95:5051 (如果启动了 tools profile)"
echo ""
echo "📊 查看日志："
echo "  docker-compose -f docker-compose.production.yml logs -f"
echo ""
echo "🛑 停止服务："
echo "  docker-compose -f docker-compose.production.yml down"
echo ""
echo "🔄 重启服务："
echo "  docker-compose -f docker-compose.production.yml restart"
echo ""
echo "⚠️  重要提示："
echo "  1. 请确保已在腾讯云安全组中开放 4100 端口"
echo "  2. 请修改 .env.production 中的密码和密钥"
echo "  3. 生产环境建议配置 HTTPS 和域名"
echo ""

