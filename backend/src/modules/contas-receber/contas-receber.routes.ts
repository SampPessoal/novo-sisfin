import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as contasReceberController from './contas-receber.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('ContaReceber'));

router.get('/', contasReceberController.list);
router.get('/inadimplencia', contasReceberController.getInadimplencia);
router.get('/export/excel', contasReceberController.exportExcel);
router.get('/export/pdf', contasReceberController.exportPDF);
router.get('/:id', contasReceberController.getById);
router.post('/', contasReceberController.create);
router.put('/:id', contasReceberController.update);
router.post('/:id/baixar', contasReceberController.baixar);
router.post('/:id/receber', contasReceberController.baixar);
router.post('/:id/cancelar', contasReceberController.cancelar);
router.delete('/:id', contasReceberController.cancelar);

export const contasReceberRouter = router;
