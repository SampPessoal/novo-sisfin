import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { ViagemService } from './viagem.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataIda');
  const filters = {
    status: req.query.status as string | undefined,
    solicitanteId: req.query.solicitanteId ? parseInt(req.query.solicitanteId as string) : undefined,
  };
  const { data, total } = await ViagemService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ViagemService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const solicitanteId = req.user!.userId;
  const data = await ViagemService.create(empresaId, solicitanteId, req.body);
  return res.status(201).json({ success: true, data });
});

export const aprovarGestor = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const aprovadorId = req.user!.userId;
  const data = await ViagemService.aprovarGestor(empresaId, id, aprovadorId);
  return res.json({ success: true, data });
});

export const aprovarFinanceiro = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const aprovadorId = req.user!.userId;
  const data = await ViagemService.aprovarFinanceiro(empresaId, id, aprovadorId);
  return res.json({ success: true, data });
});

export const liberarAdiantamento = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ViagemService.liberarAdiantamento(empresaId, id);
  return res.json({ success: true, data });
});

export const addDespesa = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const viagemId = parseInt(req.params.id as string);
  const data = await ViagemService.addDespesa(empresaId, viagemId, req.body);
  return res.status(201).json({ success: true, data });
});

export const prestacaoContas = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ViagemService.prestacaoContas(empresaId, id, req.body);
  return res.json({ success: true, data });
});

export const concluir = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ViagemService.concluir(empresaId, id);
  return res.json({ success: true, data });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  await ViagemService.delete(empresaId, id);
  return res.json({ success: true });
});

export const pendentes = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ViagemService.getPendentes(empresaId);
  return res.json({ success: true, data });
});
