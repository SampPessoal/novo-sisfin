import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { EmprestimoService } from './emprestimo.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataContratacao');
  const filters = {
    status: req.query.status as string | undefined,
    tipo: req.query.tipo as string | undefined,
  };
  const { data, total } = await EmprestimoService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await EmprestimoService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await EmprestimoService.create(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await EmprestimoService.update(empresaId, id, req.body);
  return res.json({ success: true, data });
});

export const gerarParcelas = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await EmprestimoService.gerarParcelas(empresaId, id);
  return res.status(201).json({ success: true, data });
});

export const baixarParcela = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const parcelaId = parseInt(req.params.parcelaId as string);
  const data = await EmprestimoService.baixarParcela(empresaId, id, parcelaId);
  return res.json({ success: true, data });
});

export const liquidar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await EmprestimoService.liquidarAntecipado(empresaId, id, req.body);
  return res.json({ success: true, data });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  await EmprestimoService.delete(empresaId, id);
  return res.json({ success: true });
});

export const painel = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await EmprestimoService.getPainel(empresaId);
  return res.json({ success: true, data });
});
