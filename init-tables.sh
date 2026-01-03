#!/bin/bash

# 数据库表初始化脚本
# 修复认证问题

echo "🔧 初始化数据库表..."
echo ""

cd /opt/BabyBeats/BabyBeats-Backend

# 从 .env 读取密码
DB_PASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ 未找到数据库密码，请检查 .env 文件"
    exit 1
fi

echo "✅ 从 .env 读取到数据库密码"
echo ""

# 检查 schema.sql 是否存在
if [ ! -f src/database/schema.sql ]; then
    echo "❌ 未找到 src/database/schema.sql 文件"
    exit 1
fi

echo "✅ 找到 schema.sql 文件"
echo ""

# 使用密码初始化数据库表
echo "📝 执行 SQL 脚本..."
PGPASSWORD=$DB_PASSWORD psql -U babybeats -d babybeats -h localhost -f src/database/schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库表初始化成功！"
    echo ""
    
    # 验证表是否创建成功
    echo "📊 验证数据库表..."
    PGPASSWORD=$DB_PASSWORD psql -U babybeats -d babybeats -h localhost -c "\dt" | grep -E "users|babies|feedings|sleeps|diapers"
    echo ""
    
    # 重启服务以应用新的环境变量
    echo "🔄 重启服务..."
    pm2 restart babybeats-backend --update-env
    sleep 3
    
    # 测试 API
    echo ""
    echo "🧪 测试 API..."
    echo "1. 健康检查："
    curl -s http://localhost:4100/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:4100/health
    echo ""
    echo ""
    
    echo "2. 测试注册 API："
    curl -s -X POST http://localhost:4100/api/v1/auth/register \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test@example.com",
        "password": "test123456",
        "name": "测试用户"
      }' | python3 -m json.tool 2>/dev/null || curl -s -X POST http://localhost:4100/api/v1/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"test123456","name":"测试用户"}'
    echo ""
    echo ""
    
    echo "✅ 所有配置完成！"
    echo ""
    echo "📍 系统信息："
    echo "  - API地址: http://localhost:4100/api/v1"
    echo "  - 外网地址: https://kemancloud.cn/babybeats/api/v1"
    echo "  - 数据库: babybeats"
    echo ""
    echo "💡 常用命令："
    echo "  - 查看日志: pm2 logs babybeats-backend"
    echo "  - 查看表: PGPASSWORD=$DB_PASSWORD psql -U babybeats -d babybeats -h localhost -c '\dt'"
    echo "  - 连接数据库: PGPASSWORD=$DB_PASSWORD psql -U babybeats -d babybeats -h localhost"
    
else
    echo ""
    echo "❌ 数据库表初始化失败"
    echo ""
    echo "💡 手动初始化命令："
    echo "  PGPASSWORD=$DB_PASSWORD psql -U babybeats -d babybeats -h localhost -f src/database/schema.sql"
fi

