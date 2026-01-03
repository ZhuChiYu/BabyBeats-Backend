import { Router } from 'express';
import * as medicalVisitController from '../controllers/medicalVisitController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // 所有就诊路由都需要认证

router.get('/', medicalVisitController.getMedicalVisits);
router.post('/', medicalVisitController.createMedicalVisit);
router.put('/:visitId', medicalVisitController.updateMedicalVisit);
router.delete('/:visitId', medicalVisitController.deleteMedicalVisit);

export default router;

