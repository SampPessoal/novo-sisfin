import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { getEmpresaId } from '../../middleware/multiTenant';
import { asyncHandler } from '../../utils/asyncHandler';
import { AIService } from '../../services/ai.service';
import * as clienteController from './cliente.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('Cliente'));

router.get('/', clienteController.list);
router.get('/:id/painel', clienteController.getPainel);
router.get('/:id/analise-ia', asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await AIService.analyzeCliente(empresaId, id);
  return res.json({ success: true, data });
}));
router.get('/:id', clienteController.getById);
router.post('/', clienteController.create);
router.put('/:id', clienteController.update);
router.delete('/:id', clienteController.remove);

export const clienteRouter = router;
