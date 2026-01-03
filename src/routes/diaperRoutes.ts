import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getDiapers, createDiaper, updateDiaper, deleteDiaper } from '../controllers/diaperController';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', getDiapers);
router.post('/', createDiaper);
router.put('/:diaperId', updateDiaper);
router.delete('/:diaperId', deleteDiaper);

export default router;

