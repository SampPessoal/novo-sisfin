import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as empresaController from './empresa.controller';

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));
router.use(auditLog('Empresa'));

router.get('/', empresaController.list);
router.get('/:id', empresaController.getById);
router.post('/', empresaController.create);
router.put('/:id', empresaController.update);
router.delete('/:id', empresaController.remove);

export const empresaRouter = router;
