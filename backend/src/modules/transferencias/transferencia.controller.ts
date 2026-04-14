import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { TransferenciaService } from './transferencia.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'data');
  const filters = {
    status: req.query.status as string | undefined,
    dataInicio: req.query.dataInicio as string | undefined,
    dataFim: req.query.dataFim as string | undefined,
  };
  const { data, total } = await TransferenciaService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await TransferenciaService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await TransferenciaService.create(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const confirmar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await TransferenciaService.confirmar(empresaId, id);
  return res.json({ success: true, data });
});

export const cancelar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await TransferenciaService.cancelar(empresaId, id);
  return res.json({ success: true, data });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  await TransferenciaService.delete(empresaId, id);
  return res.json({ success: true });
});
