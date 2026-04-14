import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as centroCustoController from './centro-custo.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('CentroCusto'));

router.get('/', centroCustoController.list);
router.get('/:id', centroCustoController.getById);
router.post('/', centroCustoController.create);
router.put('/:id', centroCustoController.update);
router.delete('/:id', centroCustoController.remove);

export const centroCustoRouter = router;
