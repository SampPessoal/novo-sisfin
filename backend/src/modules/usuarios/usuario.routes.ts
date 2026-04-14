import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as usuarioController from './usuario.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('Usuario'));

router.get('/', usuarioController.list);
router.get('/:id', usuarioController.getById);
router.post('/', requireRole('ADMIN'), usuarioController.create);
router.put('/:id', usuarioController.update);
router.delete('/:id', usuarioController.remove);

export const usuarioRouter = router;
