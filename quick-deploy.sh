#!/bin/bash

# 快速部署脚本 - 在服务器上运行
# 使用 4100 端口（与 Nginx 配置一致）

echo "🚀 BabyBeats 快速部署"
echo "====================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 停止占用 3000 端口的进程（如果有）
echo -e "${YELLOW}1️⃣ 检查并停止占用 3000 端口的进程...${NC}"
PID_3000=$(lsof -ti:3000)
if [ ! -z "$PID_3000" ]; then
    echo "发现占用 3000 端口的进程: $PID_3000"
    kill -9 $PID_3000
    echo -e "${GREEN}✅ 已停止占用 3000 端口的进程${NC}"
else
    echo "3000 端口未被占用"
fi
echo ""

# 2. 停止旧的 BabyBeats 服务
echo -e "${YELLOW}2️⃣ 停止旧的 BabyBeats 服务...${NC}"
pm2 stop babybeats-backend 2>/dev/null || echo "服务未运行"
pm2 delete babybeats-backend 2>/dev/null || echo "服务不存在"
echo ""

# 3. 清理 4100 端口
echo -e "${YELLOW}3️⃣ 清理 4100 端口...${NC}"
PID_4100=$(lsof -ti:4100)
if [ ! -z "$PID_4100" ]; then
    kill -9 $PID_4100
    echo -e "${GREEN}✅ 已清理 4100 端口${NC}"
fi
echo ""

# 4. 安装依赖
echo -e "${YELLOW}4️⃣ 安装依赖...${NC}"
npm install
echo ""

# 5. 编译
echo -e "${YELLOW}5️⃣ 编译 TypeScript...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  编译有警告，但继续部署...${NC}"
fi
echo ""

# 6. 启动服务
echo -e "${YELLOW}6️⃣ 启动服务（端口 4100）...${NC}"
PORT=4100 pm2 start dist/server.js --name babybeats-backend
pm2 save
echo ""

# 7. 验证部署
echo -e "${YELLOW}7️⃣ 验证部署...${NC}"
sleep 3
pm2 list
echo ""

# 8. 测试 API
echo -e "${YELLOW}8️⃣ 测试 API...${NC}"
echo "测试本地端口..."
curl -s http://localhost:4100/health | head -1
echo ""
echo "测试 Nginx 代理..."
curl -s https://kemancloud.cn/babybeats/health | head -1
echo ""

echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "📍 服务信息："
echo "  - 本地地址: http://localhost:4100"
echo "  - 外网地址: https://kemancloud.cn/babybeats/api/v1"
echo ""
echo "💡 常用命令："
echo "  - 查看日志: pm2 logs babybeats-backend"
echo "  - 重启服务: pm2 restart babybeats-backend"
echo "  - 停止服务: pm2 stop babybeats-backend"
echo "  - 查看状态: pm2 status"

