#!/bin/bash

# 快速修复并重新部署

echo "🔧 快速修复注册功能..."
echo ""

cd /opt/BabyBeats/BabyBeats-Backend

# 1. 拉取最新代码
echo "1️⃣ 拉取最新代码..."
git pull
echo ""

# 2. 重新编译
echo "2️⃣ 编译 TypeScript..."
npm run build
echo ""

# 3. 重启服务
echo "3️⃣ 重启服务..."
pm2 restart babybeats-backend --update-env
sleep 3
echo ""

# 4. 测试注册
echo "4️⃣ 测试注册 API..."
echo "注册测试用户..."
RESPONSE=$(curl -s -X POST http://localhost:4100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user'$(date +%s)'@test.com",
    "password": "test123456",
    "name": "测试用户"
  }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# 检查是否成功
if echo "$RESPONSE" | grep -q '"status":"success"'; then
    echo "✅ 注册成功！"
    echo ""
    
    # 测试登录
    echo "5️⃣ 测试登录 API..."
    EMAIL=$(echo "$RESPONSE" | grep -oP '"email":"[^"]*"' | cut -d'"' -f4)
    
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4100/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "'$EMAIL'",
        "password": "test123456"
      }')
    
    echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
    echo ""
    
    if echo "$LOGIN_RESPONSE" | grep -q '"status":"success"'; then
        echo "✅ 登录成功！"
        echo ""
        echo "🎉 所有功能正常！"
    else
        echo "❌ 登录失败"
    fi
else
    echo "❌ 注册失败，查看日志："
    pm2 logs babybeats-backend --lines 20 --nostream
fi

echo ""
echo "📍 系统状态："
pm2 list

