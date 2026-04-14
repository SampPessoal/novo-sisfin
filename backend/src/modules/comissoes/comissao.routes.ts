import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as comissaoController from './comissao.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('Comissao'));

router.get('/', comissaoController.listComissoes);
router.get('/painel', comissaoController.getPainel);
router.post('/calcular', comissaoController.calcular);

router.get('/regras', comissaoController.listRegras);
router.post('/regras', comissaoController.createRegra);
router.put('/regras/:id', comissaoController.updateRegra);

router.get('/metas', comissaoController.listMetas);
router.post('/metas', comissaoController.createMeta);

export const comissaoRouter = router;
