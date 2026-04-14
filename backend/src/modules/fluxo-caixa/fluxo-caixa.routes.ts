import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as fluxoCaixaController from './fluxo-caixa.controller';

const router = Router();

router.use(requireAuth);

router.get('/', fluxoCaixaController.getFluxoCaixa);
router.get('/projecao', fluxoCaixaController.getProjecao);

export const fluxoCaixaRouter = router;
