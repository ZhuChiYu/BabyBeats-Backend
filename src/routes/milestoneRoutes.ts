import { Router } from 'express';
import * as milestoneController from '../controllers/milestoneController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // 所有里程碑路由都需要认证

router.get('/', milestoneController.getMilestones);
router.post('/', milestoneController.createMilestone);
router.put('/:milestoneId', milestoneController.updateMilestone);
router.delete('/:milestoneId', milestoneController.deleteMilestone);

export default router;

