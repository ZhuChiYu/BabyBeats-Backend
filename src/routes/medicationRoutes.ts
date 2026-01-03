import { Router } from 'express';
import * as medicationController from '../controllers/medicationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // 所有用药路由都需要认证

router.get('/', medicationController.getMedications);
router.post('/', medicationController.createMedication);
router.put('/:medicationId', medicationController.updateMedication);
router.delete('/:medicationId', medicationController.deleteMedication);

export default router;

