import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as contasPagarController from './contas-pagar.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('ContaPagar'));

router.get('/', contasPagarController.list);
router.get('/vencimentos', contasPagarController.getVencimentos);
router.get('/export/excel', contasPagarController.exportExcel);
router.get('/export/pdf', contasPagarController.exportPDF);
router.get('/:id', contasPagarController.getById);
router.post('/', contasPagarController.create);
router.post('/recorrente', contasPagarController.createRecorrente);
router.put('/:id', contasPagarController.update);
router.post(
  '/:id/aprovar',
  requireRole('APROVADOR', 'FINANCEIRO', 'ADMIN'),
  contasPagarController.approve,
);
router.post('/:id/rejeitar', contasPagarController.reject);
router.post('/:id/baixar', contasPagarController.baixar);
router.post('/:id/pagar', contasPagarController.baixar);
router.post('/:id/rateio', contasPagarController.setRateio);
router.delete('/:id', contasPagarController.cancel);

export const contasPagarRouter = router;
