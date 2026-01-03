#!/bin/bash

# 数据库配置检查和修复脚本

echo "🔍 检查数据库配置..."
echo ""

# 1. 检查数据库是否运行
echo "1️⃣ 检查 PostgreSQL 服务..."
systemctl status postgresql | grep "active (running)" && echo "✅ PostgreSQL 正在运行" || echo "❌ PostgreSQL 未运行"
echo ""

# 2. 检查数据库是否存在
echo "2️⃣ 检查 babybeats 数据库..."
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw babybeats && echo "✅ babybeats 数据库存在" || echo "❌ babybeats 数据库不存在"
echo ""

# 3. 检查 .env 文件
echo "3️⃣ 检查 .env 文件..."
if [ -f .env ]; then
    echo "✅ .env 文件存在"
    echo "当前配置："
    cat .env | grep -v "PASSWORD" | grep -v "SECRET"
else
    echo "❌ .env 文件不存在"
    echo ""
    echo "创建 .env 文件..."
    cat > .env << 'EOF'
PORT=4100

# 数据库配置（使用独立变量）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=babybeats
DB_USER=babybeats
DB_PASSWORD=babybeats_password

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
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
fi
echo ""

# 4. 创建数据库（如果不存在）
echo "4️⃣ 创建数据库和用户..."
sudo -u postgres psql << EOF
-- 创建用户（如果不存在）
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'babybeats') THEN
        CREATE USER babybeats WITH PASSWORD 'babybeats_password';
    END IF;
END
\$\$;

-- 创建数据库（如果不存在）
SELECT 'CREATE DATABASE babybeats OWNER babybeats'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'babybeats')\gexec

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE babybeats TO babybeats;

\q
EOF
echo "✅ 数据库配置完成"
echo ""

# 5. 初始化数据库表
echo "5️⃣ 初始化数据库表..."
if [ -f src/database/schema.sql ]; then
    PGPASSWORD=babybeats_password psql -U babybeats -d babybeats -f src/database/schema.sql
    echo "✅ 数据库表已创建"
else
    echo "⚠️  schema.sql 文件不存在，跳过表创建"
fi
echo ""

# 6. 重启服务
echo "6️⃣ 重启 BabyBeats 服务..."
pm2 restart babybeats-backend
sleep 3
echo ""

# 7. 测试连接
echo "7️⃣ 测试 API 连接..."
curl -s http://localhost:4100/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4100/health
echo ""
echo ""

echo "✅ 数据库配置完成！"
echo ""
echo "💡 如果还有问题，请检查："
echo "  1. PostgreSQL 是否正在运行: sudo systemctl status postgresql"
echo "  2. 数据库密码是否正确: cat .env | grep DATABASE_URL"
echo "  3. 查看服务日志: pm2 logs babybeats-backend"

