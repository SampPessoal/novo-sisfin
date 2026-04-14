import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { multiTenant, getEmpresaId } from '../../middleware/multiTenant';
import { asyncHandler } from '../../utils/asyncHandler';
import { AIService } from '../../services/ai.service';
import * as ctrl from './dashboard.controller';

const router = Router();
router.use(requireAuth, multiTenant);

router.get('/summary', ctrl.getSummary);
router.get('/fluxo-mensal', ctrl.getFluxoMensal);
router.get('/despesas-categoria', ctrl.getDespesasCategoria);
router.get('/proximos-vencimentos', ctrl.getProximosVencimentos);
router.get('/insights-ia', asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await AIService.getDashboardInsights(empresaId);
  return res.json({ success: true, data });
}));

export { router as dashboardRouter };
