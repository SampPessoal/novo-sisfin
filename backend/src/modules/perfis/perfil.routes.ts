import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { auditLog } from '../../middleware/audit';
import * as perfilController from './perfil.controller';

const router = Router();

router.use(requireAuth);

router.get('/permissoes', perfilController.listPermissions);
router.get('/', perfilController.list);
router.get('/:id', perfilController.getById);
router.post('/', requirePermission('admin:perfis'), auditLog('Perfil'), perfilController.create);
router.put('/:id', requirePermission('admin:perfis'), auditLog('Perfil'), perfilController.update);
router.delete('/:id', requirePermission('admin:perfis'), auditLog('Perfil'), perfilController.remove);

export const perfilRouter = router;
