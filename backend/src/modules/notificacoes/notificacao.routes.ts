import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as ctrl from './notificacao.controller';

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/count', ctrl.count);
router.put('/:id/lida', ctrl.marcarLida);
router.put('/marcar-todas-lidas', ctrl.marcarTodasLidas);

export const notificacaoRouter = router;
