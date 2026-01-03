#!/bin/bash

# BabyBeats 后端部署脚本
# 端口：4100（与 Nginx 配置一致）

echo "🚀 开始部署 BabyBeats 后端服务..."

# 1. 停止旧的服务
echo "1️⃣ 停止旧服务..."
pm2 stop babybeats-backend || echo "服务未运行"
pm2 delete babybeats-backend || echo "服务不存在"

# 也尝试杀死可能占用端口的进程
echo "检查端口 4100..."
lsof -ti:4100 | xargs kill -9 2>/dev/null || echo "端口 4100 未被占用"

# 2. 安装依赖
echo "2️⃣ 安装依赖..."
npm install

# 3. 编译 TypeScript
echo "3️⃣ 编译 TypeScript..."
npm run build

# 4. 启动服务
echo "4️⃣ 启动服务 (端口 4100)..."
PORT=4100 pm2 start dist/server.js --name babybeats-backend

# 5. 保存 PM2 配置
echo "5️⃣ 保存 PM2 配置..."
pm2 save

# 6. 检查服务状态
echo "6️⃣ 检查服务状态..."
pm2 list

echo "✅ 部署完成！"
echo "📍 服务运行在: http://localhost:4100"
echo "📍 API 地址: http://localhost:4100/api/v1"
echo "📍 通过 Nginx 访问: https://kemancloud.cn/babybeats/api/v1"
echo ""
echo "💡 提示："
echo "  - 查看日志: pm2 logs babybeats-backend"
echo "  - 重启服务: pm2 restart babybeats-backend"
echo "  - 停止服务: pm2 stop babybeats-backend"

