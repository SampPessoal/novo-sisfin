import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as nfeController from './nfe.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('NotaFiscal'));

router.get('/', nfeController.list);
router.get('/:id', nfeController.getById);
router.post('/emitir', nfeController.emitir);
router.post('/:id/cancelar', nfeController.cancelar);
router.post('/:id/carta-correcao', nfeController.cartaCorrecao);
router.get('/:id/xml', nfeController.downloadXML);
router.get('/:id/pdf', nfeController.downloadPDF);

export const nfeRouter = router;
