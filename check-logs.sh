#!/bin/bash

# 查看最近的错误日志并诊断问题

echo "🔍 查看最近的服务日志..."
echo "=================================="
echo ""

pm2 logs babybeats-backend --lines 50 --nostream

echo ""
echo "=================================="
echo ""
echo "💡 常见问题诊断："
echo ""
echo "1️⃣ 如果看到 'id' 相关错误："
echo "   - 可能是用户 ID 生成问题"
echo "   - 需要检查 authController.ts 中的 register 函数"
echo ""
echo "2️⃣ 如果看到字段缺失错误："
echo "   - 检查 users 表结构"
echo "   - 运行: PGPASSWORD=babybeats_password_2026 psql -U babybeats -d babybeats -h localhost -c '\d users'"
echo ""
echo "3️⃣ 查看完整实时日志："
echo "   pm2 logs babybeats-backend"
echo ""
echo "4️⃣ 测试数据库连接："
echo "   PGPASSWORD=babybeats_password_2026 psql -U babybeats -d babybeats -h localhost -c 'SELECT * FROM users;'"

