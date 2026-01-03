#!/bin/bash

# 服务器端完整部署脚本

set -e

echo "🚀 BabyBeats 完整部署（包含账号创建和数据导入）"
echo "================================================"
echo ""

cd /opt/BabyBeats/BabyBeats-Backend

# 1. 拉取最新代码
echo "1️⃣ 拉取最新代码..."
git pull
echo ""

# 2. 安装依赖
echo "2️⃣ 安装依赖..."
npm install
echo ""

# 3. 编译
echo "3️⃣ 编译 TypeScript..."
npm run build
echo ""

# 4. 重启服务
echo "4️⃣ 重启服务..."
pm2 restart babybeats-backend --update-env
sleep 3
echo ""

# 5. 测试 API
echo "5️⃣ 测试 API..."
curl -s http://localhost:4100/health | python3 -m json.tool
echo ""
echo ""

# 6. 创建账号
echo "6️⃣ 创建账号..."
EMAIL="zhujinxi@qq.com"
PASSWORD="123456"
NAME="朱锦汐"

REGISTER_RESPONSE=$(curl -s -X POST http://localhost:4100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\"
  }")

echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# 检查注册是否成功或账号已存在
if echo "$REGISTER_RESPONSE" | grep -q '"status":"success"'; then
    echo "✅ 账号创建成功！"
elif echo "$REGISTER_RESPONSE" | grep -q "Email already exists"; then
    echo "ℹ️  账号已存在"
    
    # 尝试登录
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4100/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$EMAIL\",
        \"password\": \"$PASSWORD\"
      }")
    
    if echo "$LOGIN_RESPONSE" | grep -q '"status":"success"'; then
        echo "✅ 登录验证成功"
    else
        echo "❌ 登录失败，密码可能已更改"
    fi
else
    echo "❌ 账号创建失败"
    echo "查看详细日志："
    pm2 logs babybeats-backend --lines 30 --nostream
    exit 1
fi

echo ""
echo "7️⃣ 等待导入数据文件..."
echo ""
echo "📝 请在本地执行以下命令上传 JSON 文件："
echo ""
echo "   scp backend/BabyBeats_朱锦汐_1767427094259.json root@kemancloud.cn:/opt/BabyBeats/BabyBeats-Backend/"
echo ""
echo "   然后在服务器上执行："
echo "   cd /opt/BabyBeats/BabyBeats-Backend"
echo "   node import-data.js BabyBeats_朱锦汐_1767427094259.json zhujinxi@qq.com"
echo ""
echo "✅ 部署完成！"
echo ""
echo "📍 账号信息："
echo "   邮箱: $EMAIL"
echo "   密码: $PASSWORD"
echo ""
echo "🔗 API 地址："
echo "   本地: http://localhost:4100/api/v1"
echo "   外网: https://kemancloud.cn/babybeats/api/v1"

