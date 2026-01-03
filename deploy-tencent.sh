#!/bin/bash

###############################################################################
# BabyBeats 后端服务 - 腾讯云一键部署脚本
# 使用方法: bash deploy-tencent.sh
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印信息函数
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        warn "建议使用 root 用户运行此脚本"
        read -p "是否继续? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查 Docker
check_docker() {
    info "检查 Docker..."
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
    fi
    info "Docker 版本: $(docker --version)"
}

# 检查 Docker Compose
check_docker_compose() {
    info "检查 Docker Compose..."
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装，请先安装 Docker Compose"
    fi
    info "Docker Compose 版本: $(docker-compose --version)"
}

# 创建项目目录
create_directories() {
    info "创建项目目录..."
    mkdir -p /opt/babybeats/backend
    mkdir -p /opt/babybeats/backups
    mkdir -p /opt/babybeats/logs
    info "目录创建完成"
}

# 生成环境配置文件
generate_env() {
    info "生成环境配置文件..."
    
    if [ -f .env ]; then
        warn ".env 文件已存在"
        read -p "是否覆盖? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "跳过 .env 文件生成"
            return
        fi
    fi

    # 生成随机密码
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -hex 32)
    PGADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

    cat > .env << EOF
# 环境配置
NODE_ENV=production

# 服务端口
PORT=3000

# API 版本
API_VERSION=v1

# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=babybeats
DB_USER=babybeats_user
DB_PASSWORD=${DB_PASSWORD}

# JWT 配置
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# CORS 配置（允许你的前端域名）
# 生产环境请修改为实际的前端地址
CORS_ORIGIN=*

# 限流配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# pgAdmin 配置（可选）
PGADMIN_EMAIL=admin@babybeats.local
PGADMIN_PASSWORD=${PGADMIN_PASSWORD}
PGADMIN_PORT=5050
EOF

    chmod 600 .env
    info "环境配置文件生成完成"
    info "数据库密码: ${DB_PASSWORD}"
    info "pgAdmin 密码: ${PGADMIN_PASSWORD}"
    warn "请妥善保管这些密码！"
}

# 创建备份脚本
create_backup_script() {
    info "创建备份脚本..."
    
    cat > /opt/babybeats/backup.sh << 'BACKUP_SCRIPT'
#!/bin/bash

BACKUP_DIR="/opt/babybeats/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/babybeats/logs/backup.log"

echo "[$(date)] Starting backup..." >> $LOG_FILE

mkdir -p $BACKUP_DIR

# 备份数据库
docker exec babybeats-postgres pg_dump -U babybeats_user babybeats > $BACKUP_DIR/backup_$DATE.sql

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup successful: backup_$DATE.sql" >> $LOG_FILE
    
    # 压缩备份文件
    gzip $BACKUP_DIR/backup_$DATE.sql
    
    # 保留最近 7 天的备份
    find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
    echo "[$(date)] Old backups cleaned up" >> $LOG_FILE
else
    echo "[$(date)] Backup failed!" >> $LOG_FILE
    exit 1
fi
BACKUP_SCRIPT

    chmod +x /opt/babybeats/backup.sh
    info "备份脚本创建完成"
}

# 设置定时备份
setup_cron() {
    info "设置定时备份任务..."
    
    # 检查是否已存在
    if crontab -l 2>/dev/null | grep -q "/opt/babybeats/backup.sh"; then
        info "定时任务已存在，跳过"
        return
    fi
    
    # 添加定时任务（每天凌晨2点）
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/babybeats/backup.sh") | crontab -
    info "定时备份任务设置完成（每天凌晨2点执行）"
}

# 启动服务
start_services() {
    info "启动 Docker 服务..."
    
    # 停止旧服务（如果存在）
    if docker-compose ps | grep -q "Up"; then
        warn "检测到运行中的服务，正在停止..."
        docker-compose down
    fi
    
    # 启动服务
    docker-compose up -d
    
    info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    docker-compose ps
}

# 健康检查
health_check() {
    info "执行健康检查..."
    
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            info "✓ API 服务健康检查通过"
            return 0
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo -n "."
        sleep 2
    done
    
    error "✗ API 服务健康检查失败"
}

# 显示服务信息
show_info() {
    echo ""
    echo "================================================"
    echo -e "${GREEN}BabyBeats 后端服务部署完成！${NC}"
    echo "================================================"
    echo ""
    echo "服务地址:"
    echo "  API: http://localhost:3000"
    echo "  Health: http://localhost:3000/health"
    echo ""
    echo "数据库:"
    echo "  Host: postgres"
    echo "  Port: 5432"
    echo "  Database: babybeats"
    echo "  User: babybeats_user"
    echo ""
    echo "pgAdmin (可选):"
    echo "  启动命令: docker-compose --profile tools up -d pgadmin"
    echo "  访问地址: http://localhost:5050"
    echo "  邮箱: admin@babybeats.local"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker-compose logs -f"
    echo "  重启服务: docker-compose restart"
    echo "  停止服务: docker-compose down"
    echo "  手动备份: /opt/babybeats/backup.sh"
    echo ""
    echo "配置文件位置:"
    echo "  环境变量: $(pwd)/.env"
    echo "  备份目录: /opt/babybeats/backups"
    echo "  日志目录: /opt/babybeats/logs"
    echo ""
    echo "================================================"
}

# 主函数
main() {
    echo ""
    echo "================================================"
    echo "BabyBeats 后端服务 - 腾讯云部署脚本"
    echo "================================================"
    echo ""
    
    # 执行部署步骤
    check_root
    check_docker
    check_docker_compose
    create_directories
    
    # 切换到后端目录
    cd /opt/babybeats/backend || error "无法进入 /opt/babybeats/backend 目录"
    
    generate_env
    create_backup_script
    setup_cron
    start_services
    health_check
    show_info
    
    info "部署完成！"
}

# 运行主函数
main

