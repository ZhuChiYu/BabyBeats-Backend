import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getSleeps, createSleep, updateSleep, deleteSleep } from '../controllers/sleepController';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', getSleeps);
router.post('/', createSleep);
router.put('/:sleepId', updateSleep);
router.delete('/:sleepId', deleteSleep);

export default router;

