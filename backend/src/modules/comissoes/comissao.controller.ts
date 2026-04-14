import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { ComissaoService } from './comissao.service';

export const listRegras = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'nome');
  const { data, total } = await ComissaoService.listRegras(empresaId, pagination);
  return res.json(paginatedResponse(data, total, pagination));
});

export const createRegra = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ComissaoService.createRegra(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const updateRegra = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ComissaoService.updateRegra(empresaId, id, req.body);
  return res.json({ success: true, data });
});

export const listMetas = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataInicio');
  const { data, total } = await ComissaoService.listMetas(empresaId, pagination);
  return res.json(paginatedResponse(data, total, pagination));
});

export const createMeta = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ComissaoService.createMeta(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const listComissoes = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'criadoEm');
  const filters = {
    colaboradorId: req.query.colaboradorId ? parseInt(req.query.colaboradorId as string) : undefined,
    periodo: req.query.periodo as string | undefined,
  };
  const { data, total } = await ComissaoService.listComissoes(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getPainel = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ComissaoService.getPainel(empresaId);
  return res.json({ success: true, data });
});

export const calcular = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ComissaoService.calcularComissoes(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});
