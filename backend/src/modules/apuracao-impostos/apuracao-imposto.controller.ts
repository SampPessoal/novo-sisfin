import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { ApuracaoImpostoService } from './apuracao-imposto.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'competencia');
  const filters = {
    competencia: req.query.competencia as string | undefined,
    tipoImposto: req.query.tipoImposto as string | undefined,
    status: req.query.status as string | undefined,
  };
  const { data, total } = await ApuracaoImpostoService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ApuracaoImpostoService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const calcular = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ApuracaoImpostoService.calcular(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const balancete = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const competencia = req.query.competencia as string;
  const data = await ApuracaoImpostoService.getBalancete(empresaId, competencia);
  return res.json({ success: true, data });
});

export const razaoAuxiliar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const competencia = req.query.competencia as string;
  const categoriaId = req.query.categoriaId ? parseInt(req.query.categoriaId as string) : undefined;
  const data = await ApuracaoImpostoService.getRazaoAuxiliar(empresaId, competencia, categoriaId);
  return res.json({ success: true, data });
});
