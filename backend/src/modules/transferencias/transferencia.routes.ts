import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as transferenciaController from './transferencia.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('TransferenciaBancaria'));

router.get('/', transferenciaController.list);
router.get('/:id', transferenciaController.getById);
router.post('/', transferenciaController.create);
router.post('/:id/confirmar', transferenciaController.confirmar);
router.post('/:id/cancelar', transferenciaController.cancelar);
router.delete('/:id', transferenciaController.remove);

export const transferenciaRouter = router;
