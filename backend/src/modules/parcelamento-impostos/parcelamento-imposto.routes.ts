import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as parcelamentoController from './parcelamento-imposto.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('ParcelamentoImposto'));

router.get('/', parcelamentoController.list);
router.get('/painel', parcelamentoController.painel);
router.get('/:id', parcelamentoController.getById);
router.post('/', parcelamentoController.create);
router.put('/:id', parcelamentoController.update);
router.post('/:id/gerar-parcelas', parcelamentoController.gerarParcelas);
router.post('/:id/parcelas/:parcelaId/baixar', parcelamentoController.baixarParcela);
router.delete('/:id', parcelamentoController.remove);

export const parcelamentoImpostoRouter = router;
