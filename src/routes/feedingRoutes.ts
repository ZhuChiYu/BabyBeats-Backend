import { Router } from 'express';
import * as feedingController from '../controllers/feedingController';
import { authenticate } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

const createFeedingSchema = Joi.object({
  babyId: Joi.string().uuid().required(),
  type: Joi.string().valid('breast', 'bottle', 'solid').required(),
  time: Joi.date().iso().required(),
  amount: Joi.number().optional(),
  duration: Joi.number().optional(),
  leftDuration: Joi.number().optional(),
  rightDuration: Joi.number().optional(),
  note: Joi.string().optional(),
});

const updateFeedingSchema = Joi.object({
  type: Joi.string().valid('breast', 'bottle', 'solid').optional(),
  time: Joi.date().iso().optional(),
  amount: Joi.number().optional(),
  duration: Joi.number().optional(),
  leftDuration: Joi.number().optional(),
  rightDuration: Joi.number().optional(),
  note: Joi.string().optional(),
});

const feedingIdSchema = Joi.object({
  feedingId: Joi.string().uuid().required(),
});

router.use(authenticate);

router.get('/', feedingController.getFeedings);
router.post('/', validate(createFeedingSchema), feedingController.createFeeding);
router.put('/:feedingId', validateParams(feedingIdSchema), validate(updateFeedingSchema), feedingController.updateFeeding);
router.delete('/:feedingId', validateParams(feedingIdSchema), feedingController.deleteFeeding);

export default router;

