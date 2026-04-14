import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as emprestimoController from './emprestimo.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('Emprestimo'));

router.get('/', emprestimoController.list);
router.get('/painel', emprestimoController.painel);
router.get('/:id', emprestimoController.getById);
router.post('/', emprestimoController.create);
router.put('/:id', emprestimoController.update);
router.post('/:id/gerar-parcelas', emprestimoController.gerarParcelas);
router.post('/:id/parcelas/:parcelaId/baixar', emprestimoController.baixarParcela);
router.post('/:id/liquidar', emprestimoController.liquidar);
router.delete('/:id', emprestimoController.remove);

export const emprestimoRouter = router;
