#!/bin/bash

# 账号设置和数据导入脚本

set -e

echo "🚀 BabyBeats 账号设置和数据导入"
echo "================================"
echo ""

# 配置
EMAIL="zhujinxi@qq.com"
PASSWORD="123456"
NAME="朱锦汐"
JSON_FILE="BabyBeats_朱锦汐_1767427094259.json"

# 检查 JSON 文件是否存在
if [ ! -f "$JSON_FILE" ]; then
    echo "❌ 错误: 找不到 JSON 文件: $JSON_FILE"
    exit 1
fi

echo "1️⃣ 创建用户账号..."
echo "   邮箱: $EMAIL"
echo "   姓名: $NAME"
echo ""

# 注册账号
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:4100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\"
  }")

echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# 检查注册是否成功
if echo "$REGISTER_RESPONSE" | grep -q '"status":"success"'; then
    echo "✅ 账号创建成功！"
    echo ""
    
    # 提取 token
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -oP '"token":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 Token: ${TOKEN:0:50}..."
    echo ""
    
elif echo "$REGISTER_RESPONSE" | grep -q "Email already exists"; then
    echo "ℹ️  账号已存在，尝试登录..."
    echo ""
    
    # 登录
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4100/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$EMAIL\",
        \"password\": \"$PASSWORD\"
      }")
    
    echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
    echo ""
    
    if echo "$LOGIN_RESPONSE" | grep -q '"status":"success"'; then
        echo "✅ 登录成功！"
        echo ""
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oP '"token":"[^"]*"' | cut -d'"' -f4)
    else
        echo "❌ 登录失败"
        exit 1
    fi
else
    echo "❌ 账号创建失败"
    exit 1
fi

echo "2️⃣ 导入数据..."
echo ""

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "   安装依赖..."
    npm install pg dotenv
    echo ""
fi

# 执行数据导入
node import-data.js "$JSON_FILE" "$EMAIL"

echo ""
echo "🎉 全部完成！"
echo ""
echo "📍 账号信息："
echo "   邮箱: $EMAIL"
echo "   密码: $PASSWORD"
echo ""
echo "💡 现在可以使用这个账号登录 App 了！"

