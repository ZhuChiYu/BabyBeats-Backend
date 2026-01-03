import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/config';
import { pool } from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';

// 路由
import authRoutes from './routes/authRoutes';
import babyRoutes from './routes/babyRoutes';
import syncRoutes from './routes/syncRoutes';
import feedingRoutes from './routes/feedingRoutes';
import diaperRoutes from './routes/diaperRoutes';
import sleepRoutes from './routes/sleepRoutes';
import pumpingRoutes from './routes/pumpingRoutes';
import growthRoutes from './routes/growthRoutes';
import vaccineRoutes from './routes/vaccineRoutes';
import milestoneRoutes from './routes/milestoneRoutes';
import medicationRoutes from './routes/medicationRoutes';
import medicalVisitRoutes from './routes/medicalVisitRoutes';

const app = express();

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// 速率限制
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body 解析 - 增大限制以支持大量同步数据
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

// API 路由
const apiVersion = `/api/${config.apiVersion}`;

app.use(`${apiVersion}/auth`, authRoutes);
app.use(`${apiVersion}/babies`, babyRoutes);
app.use(`${apiVersion}/sync`, syncRoutes);
app.use(`${apiVersion}/feedings`, feedingRoutes);
app.use(`${apiVersion}/diapers`, diaperRoutes);
app.use(`${apiVersion}/sleeps`, sleepRoutes);
app.use(`${apiVersion}/pumpings`, pumpingRoutes);
app.use(`${apiVersion}/growth`, growthRoutes);
app.use(`${apiVersion}/vaccines`, vaccineRoutes);
app.use(`${apiVersion}/milestones`, milestoneRoutes);
app.use(`${apiVersion}/medications`, medicationRoutes);
app.use(`${apiVersion}/medical-visits`, medicalVisitRoutes);

// 添加路由调试日志
console.log('📍 Registered routes:');
console.log(`  - ${apiVersion}/auth`);
console.log(`  - ${apiVersion}/babies`);
console.log(`  - ${apiVersion}/sync`);
console.log(`  - ${apiVersion}/feedings`);
console.log(`  - ${apiVersion}/diapers`);
console.log(`  - ${apiVersion}/sleeps`);
console.log(`  - ${apiVersion}/pumpings`);
console.log(`  - ${apiVersion}/growth`);
console.log(`  - ${apiVersion}/vaccines`);
console.log(`  - ${apiVersion}/milestones`);
console.log(`  - ${apiVersion}/medications`);
console.log(`  - ${apiVersion}/medical-visits`);

// 404 处理
app.use(notFound);

// 错误处理
app.use(errorHandler);

// 启动服务器
const PORT = config.port;
const HOST = '0.0.0.0'; // 监听所有网络接口，允许局域网访问

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running in ${config.env} mode on ${HOST}:${PORT}`);
  console.log(`📝 API Version: ${config.apiVersion}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Local API: http://localhost:${PORT}${apiVersion}`);
  console.log(`🔗 Network API: http://192.168.31.221:${PORT}${apiVersion}`);
  console.log(`📱 Mobile/Real Device: Use http://192.168.31.221:${PORT}${apiVersion}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('🛑 HTTP server closed');
    await pool.end();
    console.log('🛑 Database connections closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('🛑 HTTP server closed');
    await pool.end();
    console.log('🛑 Database connections closed');
    process.exit(0);
  });
});

export default app;

