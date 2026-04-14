import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { ParcelamentoImpostoService } from './parcelamento-imposto.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataInicio');
  const filters = {
    status: req.query.status as string | undefined,
    tipoImposto: req.query.tipoImposto as string | undefined,
  };
  const { data, total } = await ParcelamentoImpostoService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ParcelamentoImpostoService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ParcelamentoImpostoService.create(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ParcelamentoImpostoService.update(empresaId, id, req.body);
  return res.json({ success: true, data });
});

export const gerarParcelas = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ParcelamentoImpostoService.gerarParcelas(empresaId, id);
  return res.status(201).json({ success: true, data });
});

export const baixarParcela = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const parcelaId = parseInt(req.params.parcelaId as string);
  const data = await ParcelamentoImpostoService.baixarParcela(empresaId, id, parcelaId);
  return res.json({ success: true, data });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  await ParcelamentoImpostoService.delete(empresaId, id);
  return res.json({ success: true });
});

export const painel = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ParcelamentoImpostoService.getPainel(empresaId);
  return res.json({ success: true, data });
});
