import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as apuracaoController from './apuracao-imposto.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('ApuracaoImposto'));

router.get('/', apuracaoController.list);
router.get('/relatorios/balancete', apuracaoController.balancete);
router.get('/relatorios/razao-auxiliar', apuracaoController.razaoAuxiliar);
router.get('/:id', apuracaoController.getById);
router.post('/calcular', apuracaoController.calcular);

export const apuracaoImpostoRouter = router;
