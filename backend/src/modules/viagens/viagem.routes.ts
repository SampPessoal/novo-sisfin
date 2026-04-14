import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as viagemController from './viagem.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('Viagem'));

router.get('/', viagemController.list);
router.get('/pendentes', viagemController.pendentes);
router.get('/:id', viagemController.getById);
router.post('/', viagemController.create);
router.post('/:id/aprovar-gestor', requireRole('GESTOR', 'ADMIN'), viagemController.aprovarGestor);
router.post('/:id/aprovar-financeiro', requireRole('FINANCEIRO', 'ADMIN'), viagemController.aprovarFinanceiro);
router.post('/:id/liberar-adiantamento', requireRole('FINANCEIRO', 'ADMIN'), viagemController.liberarAdiantamento);
router.post('/:id/despesas', viagemController.addDespesa);
router.post('/:id/prestacao-contas', viagemController.prestacaoContas);
router.post('/:id/concluir', requireRole('FINANCEIRO', 'ADMIN'), viagemController.concluir);
router.delete('/:id', viagemController.remove);

export const viagemRouter = router;
