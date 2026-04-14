import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { getEmpresaId } from '../../middleware/multiTenant';
import { asyncHandler } from '../../utils/asyncHandler';
import { AIService } from '../../services/ai.service';
import * as fornecedorController from './fornecedor.controller';
import * as contatoController from './fornecedor-contato.controller';
import * as enderecoController from './fornecedor-endereco.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('Fornecedor'));

router.get('/', fornecedorController.list);
router.get('/:id/painel', fornecedorController.getPainel);
router.get('/:id/analise-ia', asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await AIService.analyzeFornecedor(empresaId, id);
  return res.json({ success: true, data });
}));
router.get('/:id', fornecedorController.getById);
router.post('/', fornecedorController.create);
router.put('/:id', fornecedorController.update);
router.delete('/:id', fornecedorController.remove);

// Contatos do fornecedor
router.get('/:fornecedorId/contatos', contatoController.list);
router.post('/:fornecedorId/contatos', contatoController.create);
router.put('/:fornecedorId/contatos/:id', contatoController.update);
router.delete('/:fornecedorId/contatos/:id', contatoController.remove);

// Endereços do fornecedor
router.get('/:fornecedorId/enderecos', enderecoController.list);
router.post('/:fornecedorId/enderecos', enderecoController.create);
router.put('/:fornecedorId/enderecos/:id', enderecoController.update);
router.delete('/:fornecedorId/enderecos/:id', enderecoController.remove);

export const fornecedorRouter = router;
