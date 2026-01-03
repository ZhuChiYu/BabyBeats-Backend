import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPumpings, createPumping, updatePumping, deletePumping } from '../controllers/pumpingController';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', getPumpings);
router.post('/', createPumping);
router.put('/:pumpingId', updatePumping);
router.delete('/:pumpingId', deletePumping);

export default router;

