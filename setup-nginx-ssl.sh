#!/bin/bash

# BabyBeats Nginx + SSL 配置脚本
# 此脚本用于在腾讯云服务器上配置 Nginx 和 Let's Encrypt SSL 证书

set -e

echo "🔧 BabyBeats Nginx + SSL 配置"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DOMAIN="englishpartner.cn"
EMAIL="your-email@example.com"  # 请修改为您的邮箱
NGINX_CONF="/etc/nginx/sites-available/babybeats"
NGINX_ENABLED="/etc/nginx/sites-enabled/babybeats"

echo -e "${BLUE}📋 配置信息${NC}"
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ 请使用 root 用户运行此脚本${NC}"
    echo "使用: sudo ./setup-nginx-ssl.sh"
    exit 1
fi

# 1. 安装 Nginx
echo -e "${YELLOW}📦 步骤 1/6: 检查并安装 Nginx${NC}"
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt update
    apt install -y nginx
    echo -e "${GREEN}✅ Nginx 已安装${NC}"
else
    echo -e "${GREEN}✅ Nginx 已存在${NC}"
fi
echo ""

# 2. 安装 Certbot (Let's Encrypt)
echo -e "${YELLOW}📦 步骤 2/6: 检查并安装 Certbot${NC}"
if ! command -v certbot &> /dev/null; then
    echo "安装 Certbot..."
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot 已安装${NC}"
else
    echo -e "${GREEN}✅ Certbot 已存在${NC}"
fi
echo ""

# 3. 创建 Nginx 配置
echo -e "${YELLOW}📝 步骤 3/6: 创建 Nginx 配置${NC}"

# 先创建临时的 HTTP only 配置（用于 Let's Encrypt 验证）
cat > $NGINX_CONF << 'EOF'
# BabyBeats 临时配置（用于 SSL 证书获取）
server {
    listen 80;
    server_name englishpartner.cn www.englishpartner.cn;
    
    # Let's Encrypt 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # 临时允许访问健康检查
    location /babybeats/health {
        proxy_pass http://localhost:4100/health;
        proxy_set_header Host $host;
    }
    
    # 其他请求返回提示
    location / {
        return 200 'SSL certificate setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

echo -e "${GREEN}✅ 临时 Nginx 配置已创建${NC}"
echo ""

# 4. 启用配置并重启 Nginx
echo -e "${YELLOW}🔄 步骤 4/6: 启用配置并重启 Nginx${NC}"
ln -sf $NGINX_CONF $NGINX_ENABLED
nginx -t
systemctl restart nginx
systemctl enable nginx
echo -e "${GREEN}✅ Nginx 已启动${NC}"
echo ""

# 5. 创建 certbot 目录
mkdir -p /var/www/certbot

# 6. 获取 SSL 证书
echo -e "${YELLOW}🔒 步骤 5/6: 获取 SSL 证书${NC}"
echo -e "${BLUE}提示：如果域名已有证书，可以跳过此步骤${NC}"
read -p "是否获取/更新 SSL 证书？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 检查邮箱是否已修改
    if [ "$EMAIL" = "your-email@example.com" ]; then
        echo -e "${RED}❌ 请先修改脚本中的 EMAIL 变量为您的邮箱${NC}"
        exit 1
    fi
    
    echo "正在获取 SSL 证书..."
    certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL 证书获取成功${NC}"
    else
        echo -e "${RED}❌ SSL 证书获取失败${NC}"
        echo "请检查："
        echo "1. 域名 DNS 是否已正确解析到此服务器"
        echo "2. 防火墙是否开放 80 和 443 端口"
        echo "3. 邮箱地址是否有效"
        exit 1
    fi
fi
echo ""

# 7. 更新为完整的 HTTPS 配置
echo -e "${YELLOW}📝 步骤 6/6: 更新为完整的 HTTPS 配置${NC}"

# 复制项目中的完整配置
if [ -f "/opt/BabyBeats/backend/nginx-babybeats.conf" ]; then
    cp /opt/BabyBeats/backend/nginx-babybeats.conf $NGINX_CONF
    echo -e "${GREEN}✅ 已使用项目配置文件${NC}"
else
    echo -e "${YELLOW}⚠️  未找到项目配置文件，使用脚本生成的配置${NC}"
    
    # 生成完整配置
    cat > $NGINX_CONF << 'EOFCONF'
# BabyBeats Nginx 配置
server {
    listen 80;
    server_name englishpartner.cn www.englishpartner.cn;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name englishpartner.cn www.englishpartner.cn;
    
    ssl_certificate /etc/letsencrypt/live/englishpartner.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/englishpartner.cn/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    access_log /var/log/nginx/babybeats_access.log;
    error_log /var/log/nginx/babybeats_error.log;
    
    client_max_body_size 50M;
    
    location /babybeats/api/ {
        rewrite ^/babybeats(/api/.*)$ $1 break;
        proxy_pass http://localhost:4100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /babybeats/health {
        proxy_pass http://localhost:4100/health;
        proxy_set_header Host $host;
        access_log off;
    }
}
EOFCONF
fi

# 测试并重启 Nginx
echo "测试 Nginx 配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "重启 Nginx..."
    systemctl restart nginx
    echo -e "${GREEN}✅ Nginx 配置已更新并重启${NC}"
else
    echo -e "${RED}❌ Nginx 配置测试失败${NC}"
    exit 1
fi
echo ""

# 8. 设置证书自动续期
echo -e "${YELLOW}🔄 设置证书自动续期${NC}"
if ! crontab -l | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo -e "${GREEN}✅ 已添加证书自动续期任务${NC}"
else
    echo -e "${GREEN}✅ 证书自动续期任务已存在${NC}"
fi
echo ""

echo "================================"
echo -e "${GREEN}✅ 配置完成！${NC}"
echo "================================"
echo ""
echo "📍 服务地址："
echo -e "  ${BLUE}API:${NC} https://englishpartner.cn/babybeats/api/v1"
echo -e "  ${BLUE}健康检查:${NC} https://englishpartner.cn/babybeats/health"
echo ""
echo "🔍 测试命令："
echo "  curl https://englishpartner.cn/babybeats/health"
echo "  curl https://englishpartner.cn/babybeats/api/v1/auth/login"
echo ""
echo "📝 查看日志："
echo "  tail -f /var/log/nginx/babybeats_access.log"
echo "  tail -f /var/log/nginx/babybeats_error.log"
echo ""
echo "🔄 Nginx 管理："
echo "  sudo nginx -t          # 测试配置"
echo "  sudo systemctl restart nginx  # 重启"
echo "  sudo systemctl status nginx   # 状态"
echo ""
echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo "1. 确保防火墙已开放 80 和 443 端口"
echo "2. 确保 DNS 已正确解析到此服务器"
echo "3. 证书会在每天凌晨 3 点自动续期"
echo ""

