import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as boletoController from './boleto.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('Cobranca'));

router.get('/', boletoController.list);
router.get('/relatorio', boletoController.relatorio);
router.post('/', boletoController.create);
router.post('/:id/cancelar', boletoController.cancelar);
router.get('/:id/link', boletoController.getLink);

export const boletoRouter = router;
