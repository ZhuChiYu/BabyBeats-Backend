# BabyBeats Backend API

宝宝成长记录应用的后端 API 服务。

## 📋 项目信息

- **仓库地址**: https://github.com/ZhuChiYu/BabyBeats-Backend.git
- **生产服务器**: 106.53.3.42
- **API Base URL**: https://www.englishpartner.cn/babybeats/api/v1

## 🚀 技术栈

- Node.js 20+
- TypeScript
- Express.js
- PostgreSQL
- JWT 认证
- Docker & Docker Compose
- PM2 进程管理
- Nginx 反向代理

## 📦 快速开始

### 本地开发

1. **克隆仓库**

```bash
git clone https://github.com/ZhuChiYu/BabyBeats-Backend.git
cd BabyBeats-Backend
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

创建 `.env` 文件（参考 `.env.template`）：

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=babybeats
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

4. **初始化数据库**

确保 PostgreSQL 正在运行，然后执行：

```bash
psql -U postgres -d babybeats -f src/database/schema.sql
```

5. **启动开发服务器**

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 使用 Docker

1. **配置环境变量**

创建 `.env` 文件或使用默认配置。

2. **启动所有服务**

```bash
docker-compose up -d
```

这将启动：
- PostgreSQL 数据库（端口 5432）
- API 服务器（端口 3000）

3. **查看日志**

```bash
docker-compose logs -f api
```

4. **停止服务**

```bash
docker-compose down
```

## 🌐 生产环境部署

### 部署到服务器 (106.53.3.42)

#### 方式一：使用部署脚本（推荐）

```bash
# SSH 登录到服务器
ssh root@106.53.3.42

# 克隆仓库
git clone https://github.com/ZhuChiYu/BabyBeats-Backend.git
cd BabyBeats-Backend

# 配置环境变量
cp .env.template .env
# 编辑 .env 文件，填写生产环境配置

# 运行部署脚本
./deploy-production.sh
```

#### 方式二：使用 Docker Compose

```bash
docker-compose -f docker-compose.production.yml up -d
```

#### 方式三：手动部署

```bash
# 1. 安装依赖
npm install --production

# 2. 构建项目
npm run build

# 3. 使用 PM2 启动
pm2 start ecosystem.config.js --env production

# 4. 保存 PM2 配置
pm2 save
pm2 startup
```

### 常用运维命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all

# 停止服务
pm2 stop all

# 更新代码并重启
git pull origin main
npm install --production
npm run build
pm2 restart all
```

## 📚 API 文档

### 基础信息

- **生产环境**: `https://www.englishpartner.cn/babybeats/api/v1`
- **开发环境**: `http://localhost:3000/api/v1`
- **认证方式**: Bearer Token (JWT)

### 主要端点

#### 认证相关
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/apple-login` - Apple ID 登录
- `GET /auth/profile` - 获取用户信息 🔒
- `PUT /auth/profile` - 更新用户信息 🔒

#### 宝宝管理
- `GET /babies` - 获取所有宝宝 🔒
- `POST /babies` - 创建宝宝档案 🔒
- `GET /babies/:babyId` - 获取宝宝详情 🔒
- `PUT /babies/:babyId` - 更新宝宝信息 🔒
- `DELETE /babies/:babyId` - 删除宝宝档案 🔒

#### 数据同步
- `GET /sync/pull` - 拉取服务器数据 🔒
- `POST /sync/push` - 推送本地数据 🔒
- `GET /sync/status` - 获取同步状态 🔒

🔒 表示需要认证

### 请求示例

#### 注册用户

```bash
curl -X POST https://www.englishpartner.cn/babybeats/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

#### 登录

```bash
curl -X POST https://www.englishpartner.cn/babybeats/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

## 🗄️ 数据库架构

数据库包含以下主要表：

- `users` - 用户表
- `babies` - 宝宝表
- `feedings` - 喂养记录
- `diapers` - 尿布记录
- `sleeps` - 睡眠记录
- `pumpings` - 挤奶记录
- `growth_records` - 成长记录
- `milestones` - 里程碑
- `medical_visits` - 就诊记录
- `medications` - 用药记录
- `vaccines` - 疫苗记录
- `sync_logs` - 同步日志

详细的数据库架构请查看 `src/database/schema.sql`。

## 🛠️ 开发脚本

- `npm run dev` - 启动开发服务器（带热重载）
- `npm run build` - 构建生产版本
- `npm start` - 运行生产版本
- `npm test` - 运行测试

## 🔒 安全注意事项

- ✅ 已配置 SSL/TLS (HTTPS)
- ✅ 使用强 JWT_SECRET
- ✅ 数据库密码加密存储
- ✅ CORS 配置限制
- ✅ 请求频率限制
- ✅ 输入验证和SQL注入防护
- ⚠️ 定期更新依赖包
- ⚠️ 定期备份数据库

## 🔗 相关项目

- **前端应用**: BabyBeats App (React Native)
- **服务器**: 腾讯云轻量应用服务器

## 📄 许可证

MIT

## 👨‍💻 维护者

- GitHub: [@ZhuChiYu](https://github.com/ZhuChiYu)

---

**注意**: 详细的部署文档和配置指南由于包含敏感信息，仅在本地保留，不包含在此仓库中。
