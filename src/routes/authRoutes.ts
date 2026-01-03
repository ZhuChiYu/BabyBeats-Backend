import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { registerLimiter, loginLimiter } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

// 验证模式
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(1).max(100).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
});

const appleLoginSchema = Joi.object({
  appleId: Joi.string().required(),
  email: Joi.string().email().optional().allow(''),
  fullName: Joi.string().optional().allow(''),
});

// 路由
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/apple-login', loginLimiter, validate(appleLoginSchema), authController.appleLogin);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;

