import { Router } from 'express';
import * as vaccineController from '../controllers/vaccineController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // 所有疫苗路由都需要认证

router.get('/', vaccineController.getVaccines);
router.post('/', vaccineController.createVaccine);
router.put('/:vaccineId', vaccineController.updateVaccine);
router.delete('/:vaccineId', vaccineController.deleteVaccine);

export default router;

