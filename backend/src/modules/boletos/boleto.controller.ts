import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { BoletoService } from './boleto.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataVencimento');
  const filters = {
    status: req.query.status as string | undefined,
    tipo: req.query.tipo as string | undefined,
  };
  const { data, total } = await BoletoService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await BoletoService.createCobranca(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const cancelar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await BoletoService.cancelCobranca(empresaId, id);
  return res.json({ success: true, data });
});

export const getLink = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await BoletoService.getPaymentLink(empresaId, id);
  return res.json({ success: true, data });
});

export const relatorio = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await BoletoService.getRelatorio(empresaId);
  return res.json({ success: true, data });
});
