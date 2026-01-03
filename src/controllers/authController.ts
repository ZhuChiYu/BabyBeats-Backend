import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('无效的邮箱格式', 400);
    }

    // 验证密码强度
    if (password.length < 6) {
      throw new AppError('密码长度至少6位', 400);
    }

    // 检查密码复杂度（至少包含字母和数字）
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      throw new AppError('密码必须包含字母和数字', 400);
    }

    // 检查用户是否已存在
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('该邮箱已被注册，请使用其他邮箱或直接登录', 409);
    }

    // 创建新用户
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email, passwordHash, name]
    );

    const user = result.rows[0];

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const result = await pool.query(
      `SELECT id, email, password_hash, name, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError('Account is inactive', 403);
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // 更新最后登录时间
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const result = await pool.query(
      `SELECT id, email, name, created_at, last_login
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const appleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appleId, email, fullName } = req.body;

    if (!appleId) {
      throw new AppError('Apple ID is required', 400);
    }

    console.log('Apple Login attempt:', { appleId, email, fullName });

    // 检查数据库中是否存在 apple_id 字段
    try {
      // 首先尝试查找已有的 Apple ID 用户
      const existingUser = await pool.query(
        'SELECT id, email, name, apple_id FROM users WHERE apple_id = $1',
        [appleId]
      );

      let user;

      if (existingUser.rows.length > 0) {
        // 已存在的用户，直接登录
        user = existingUser.rows[0];
        
        // 更新最后登录时间
        await pool.query(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
          [user.id]
        );

        console.log('Existing Apple user logged in:', user.id);
      } else {
        // 新用户，创建账号
        const userEmail = email || `${appleId}@privaterelay.appleid.com`;
        const userName = fullName || '用户';

        // 创建新用户
        const result = await pool.query(
          `INSERT INTO users (email, name, apple_id, password_hash)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, name, apple_id, created_at`,
          [userEmail, userName, appleId, 'apple_auth'] // 使用特殊标记代替密码
        );

        user = result.rows[0];
        console.log('New Apple user created:', user.id);
      }

      // 生成 JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        },
      });
    } catch (dbError: any) {
      // 如果数据库错误是因为 apple_id 字段不存在
      if (dbError.message && dbError.message.includes('apple_id')) {
        console.log('apple_id column not found, attempting to add it...');
        
        // 尝试添加 apple_id 字段
        try {
          await pool.query(
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE'
          );
          console.log('apple_id column added successfully');
          
          // 重新执行 Apple 登录逻辑
          return appleLogin(req, res, next);
        } catch (alterError) {
          console.error('Failed to add apple_id column:', alterError);
          throw new AppError('Database schema update failed', 500);
        }
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Apple login error:', error);
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { name } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name)
       WHERE id = $2
       RETURNING id, email, name, created_at`,
      [name, userId]
    );

    res.json({
      status: 'success',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

