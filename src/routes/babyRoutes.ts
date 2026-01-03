import { Router } from 'express';
import * as babyController from '../controllers/babyController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// 验证模式
const createBabySchema = Joi.object({
  name: Joi.string().required(),
  gender: Joi.string().valid('male', 'female', 'unknown').required(),
  birthday: Joi.date().iso().required(),
  dueDate: Joi.date().iso().optional(),
  bloodType: Joi.string().optional(),
  birthHeight: Joi.number().optional(),
  birthWeight: Joi.number().optional(),
  birthHeadCirc: Joi.number().optional(),
  avatar: Joi.string().optional(),
});

const updateBabySchema = Joi.object({
  name: Joi.string().optional(),
  gender: Joi.string().valid('male', 'female', 'unknown').optional(),
  birthday: Joi.date().iso().optional(),
  dueDate: Joi.date().iso().optional(),
  bloodType: Joi.string().optional(),
  birthHeight: Joi.number().optional(),
  birthWeight: Joi.number().optional(),
  birthHeadCirc: Joi.number().optional(),
  avatar: Joi.string().optional(),
  isArchived: Joi.boolean().optional(),
});

const babyIdSchema = Joi.object({
  babyId: Joi.string().uuid().required(),
});

// 路由
router.use(authenticate); // 所有路由都需要认证

router.get('/', babyController.getBabies);
router.post('/', validate(createBabySchema), babyController.createBaby);
router.get('/:babyId', validateParams(babyIdSchema), babyController.getBaby);
router.put('/:babyId', validateParams(babyIdSchema), validate(updateBabySchema), babyController.updateBaby);
router.delete('/:babyId', validateParams(babyIdSchema), babyController.deleteBaby);

export default router;

