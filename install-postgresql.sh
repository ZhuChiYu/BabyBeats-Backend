#!/bin/bash

# PostgreSQL 安装和配置脚本
# 适用于 Ubuntu/Debian 系统

echo "🚀 开始安装和配置 PostgreSQL..."
echo "=================================="
echo ""

# 1. 更新软件包列表
echo "1️⃣ 更新软件包列表..."
apt update
echo ""

# 2. 安装 PostgreSQL
echo "2️⃣ 安装 PostgreSQL..."
apt install -y postgresql postgresql-contrib
echo ""

# 3. 启动 PostgreSQL 服务
echo "3️⃣ 启动 PostgreSQL 服务..."
systemctl start postgresql
systemctl enable postgresql
echo ""

# 4. 检查服务状态
echo "4️⃣ 检查 PostgreSQL 服务状态..."
systemctl status postgresql | head -5
echo ""

# 5. 创建数据库和用户
echo "5️⃣ 创建数据库和用户..."
sudo -u postgres psql << EOF
-- 创建用户
CREATE USER babybeats WITH PASSWORD 'babybeats_password_2026';

-- 创建数据库
CREATE DATABASE babybeats OWNER babybeats;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE babybeats TO babybeats;

-- 显示结果
\l babybeats
\du babybeats

\q
EOF
echo ""

# 6. 配置 PostgreSQL 允许密码认证
echo "6️⃣ 配置 PostgreSQL 认证..."

# 找到 pg_hba.conf 文件
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -1)

if [ -n "$PG_HBA" ]; then
    echo "找到配置文件: $PG_HBA"
    
    # 备份原文件
    cp "$PG_HBA" "$PG_HBA.backup"
    
    # 添加本地认证配置（如果不存在）
    if ! grep -q "host.*babybeats.*babybeats.*127.0.0.1/32.*md5" "$PG_HBA"; then
        echo "host    babybeats       babybeats       127.0.0.1/32            md5" >> "$PG_HBA"
        echo "✅ 已添加 babybeats 数据库认证配置"
    fi
    
    # 重启 PostgreSQL
    systemctl restart postgresql
    echo "✅ PostgreSQL 已重启"
else
    echo "⚠️  未找到 pg_hba.conf 文件"
fi
echo ""

# 7. 创建 .env 文件
echo "7️⃣ 创建 .env 配置文件..."
cd /opt/BabyBeats/BabyBeats-Backend

cat > .env << 'EOF'
PORT=4100

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=babybeats
DB_USER=babybeats
DB_PASSWORD=babybeats_password_2026

# JWT 配置
JWT_SECRET=babybeats-super-secret-key-2026-change-this
JWT_EXPIRES_IN=90d

# 环境
NODE_ENV=production

# CORS
CORS_ORIGIN=*

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

echo "✅ .env 文件已创建"
cat .env
echo ""

# 8. 测试数据库连接
echo "8️⃣ 测试数据库连接..."
PGPASSWORD=babybeats_password_2026 psql -U babybeats -d babybeats -h localhost -c "SELECT version();" && echo "✅ 数据库连接成功！" || echo "❌ 数据库连接失败"
echo ""

# 9. 初始化数据库表
echo "9️⃣ 初始化数据库表..."
if [ -f src/database/schema.sql ]; then
    PGPASSWORD=babybeats_password_2026 psql -U babybeats -d babybeats -h localhost -f src/database/schema.sql
    echo "✅ 数据库表已创建"
else
    echo "⚠️  schema.sql 文件不存在"
fi
echo ""

# 10. 重启 BabyBeats 服务
echo "🔟 重启 BabyBeats 服务..."
pm2 restart babybeats-backend --update-env
sleep 3
echo ""

# 11. 测试 API
echo "1️⃣1️⃣ 测试 API..."
echo "测试健康检查端点..."
curl -s http://localhost:4100/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4100/health
echo ""
echo ""

echo "=================================="
echo "✅ PostgreSQL 安装和配置完成！"
echo "=================================="
echo ""
echo "📊 PostgreSQL 信息："
echo "  - 版本: $(psql --version)"
echo "  - 状态: $(systemctl is-active postgresql)"
echo "  - 数据库: babybeats"
echo "  - 用户: babybeats"
echo ""
echo "🔐 数据库密码: babybeats_password_2026"
echo "⚠️  建议修改为更安全的密码！"
echo ""
echo "📍 服务信息："
echo "  - 端口: 4100"
echo "  - 本地: http://localhost:4100"
echo "  - 外网: https://kemancloud.cn/babybeats/api/v1"
echo ""
echo "💡 有用的命令："
echo "  - 查看日志: pm2 logs babybeats-backend"
echo "  - 重启服务: pm2 restart babybeats-backend"
echo "  - 连接数据库: PGPASSWORD=babybeats_password_2026 psql -U babybeats -d babybeats -h localhost"
echo "  - 检查 PostgreSQL: sudo systemctl status postgresql"
echo ""

