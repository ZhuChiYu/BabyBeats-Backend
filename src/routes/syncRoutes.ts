import { Router } from 'express';
import * as syncController from '../controllers/syncController';
import { authenticate } from '../middleware/auth';
import { syncLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate); // 所有路由都需要认证
router.use(syncLimiter); // 所有同步路由都需要限流

router.get('/pull', syncController.syncPull);
router.post('/push', syncController.syncPush);
router.get('/status', syncController.getSyncStatus);

export default router;

