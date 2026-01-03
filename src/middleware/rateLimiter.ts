import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// 内存存储，生产环境建议使用 Redis
const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs: number;  // 时间窗口（毫秒）
  max: number;       // 最大请求次数
  message?: string;  // 超限提示消息
  statusCode?: number; // HTTP 状态码
  keyGenerator?: (req: Request) => string; // 生成限流键的函数
}

/**
 * 创建限流中间件
 * @param options 配置选项
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    keyGenerator = (req) => req.ip || 'unknown',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // 清理过期记录
    if (store[key] && store[key].resetTime < now) {
      delete store[key];
    }

    // 初始化或更新记录
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    // 检查是否超限
    if (store[key].count >= max) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());
      
      throw new AppError(message, statusCode);
    }

    // 增加计数
    store[key].count++;
    
    // 设置响应头
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', (max - store[key].count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    next();
  };
};

/**
 * 注册接口限流：每小时最多5次注册请求
 */
export const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5,
  message: '注册请求过于频繁，请1小时后再试',
  keyGenerator: (req) => {
    // 使用 IP 地址作为限流键
    return `register_${req.ip || 'unknown'}`;
  },
});

/**
 * 登录接口限流：每15分钟最多10次登录尝试
 */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10,
  message: '登录尝试次数过多，请15分钟后再试',
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    const ip = req.ip || 'unknown';
    // 同时限制 IP 和邮箱
    return `login_${ip}_${email}`;
  },
});

/**
 * 通用 API 限流：每分钟最多100个请求
 */
export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 100,
  message: 'API 请求过于频繁，请稍后再试',
});

/**
 * 同步接口限流：每分钟最多20次同步请求
 */
export const syncLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 20,
  message: '同步请求过于频繁，请稍后再试',
  keyGenerator: (req) => {
    const userId = (req as any).userId || 'unknown';
    const ip = req.ip || 'unknown';
    return `sync_${ip}_${userId}`;
  },
});

/**
 * 定期清理过期记录（可选，防止内存泄漏）
 */
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60 * 60 * 1000); // 每小时清理一次

