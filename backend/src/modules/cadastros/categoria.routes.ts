import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as categoriaController from './categoria.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('CategoriaFinanceira'));

router.get('/', categoriaController.list);
router.get('/:id', categoriaController.getById);
router.post('/', categoriaController.create);
router.put('/:id', categoriaController.update);
router.delete('/:id', categoriaController.remove);

export const categoriaRouter = router;
