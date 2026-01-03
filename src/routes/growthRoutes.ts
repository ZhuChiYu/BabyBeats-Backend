import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getGrowthRecords, createGrowthRecord, updateGrowthRecord, deleteGrowthRecord } from '../controllers/growthController';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

router.get('/', getGrowthRecords);
router.post('/', createGrowthRecord);
router.put('/:growthId', updateGrowthRecord);
router.delete('/:growthId', deleteGrowthRecord);

export default router;

