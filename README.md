# BabyBeats Backend API

宝宝成长记录应用的后端 API 服务。

## 技术栈

- Node.js 20+
- TypeScript
- Express.js
- PostgreSQL
- JWT 认证
- Docker & Docker Compose

## 快速开始

### 本地开发

1. **安装依赖**

```bash
npm install
```

2. **配置环境变量**

创建 `.env` 文件（参考 `ENV_TEMPLATE.md`）：

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

3. **初始化数据库**

确保 PostgreSQL 正在运行，然后执行：

```bash
psql -U postgres -d babybeats -f src/database/schema.sql
```

4. **启动开发服务器**

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

### 使用 pgAdmin（可选）

启动 pgAdmin 进行数据库管理：

```bash
docker-compose --profile tools up -d
```

访问 `http://localhost:5050` 并使用配置的邮箱和密码登录。

## API 文档

### 基础信息

- **Base URL**: `http://localhost:3000/api/v1`
- **认证方式**: Bearer Token (JWT)

### 端点

#### 认证相关

- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
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
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

#### 登录

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### 创建宝宝档案

```bash
curl -X POST http://localhost:3000/api/v1/babies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "宝宝名字",
    "gender": "male",
    "birthday": "2024-01-01T00:00:00.000Z"
  }'
```

## 数据库架构

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

## 开发脚本

- `npm run dev` - 启动开发服务器（带热重载）
- `npm run build` - 构建生产版本
- `npm start` - 运行生产版本
- `npm test` - 运行测试

## 部署

### Docker 部署

1. 克隆仓库到服务器
2. 配置生产环境变量
3. 运行 `docker-compose up -d`

### 传统部署

1. 安装 Node.js 20+ 和 PostgreSQL
2. 克隆仓库并安装依赖
3. 配置环境变量
4. 初始化数据库
5. 构建并启动：`npm run build && npm start`

建议使用 PM2 或 systemd 进行进程管理。

## 安全注意事项

- 修改默认的 `JWT_SECRET`
- 使用强密码作为数据库密码
- 在生产环境中限制 CORS 来源
- 定期更新依赖包
- 启用 HTTPS
- 配置防火墙规则

## 许可证

MIT

