import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { DashboardService } from './dashboard.service';
import { getEmpresaId } from '../../middleware/multiTenant';

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await DashboardService.getSummary(empresaId);
  return res.json(data);
});

export const getFluxoMensal = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await DashboardService.getFluxoMensal(empresaId);
  return res.json(data);
});

export const getDespesasCategoria = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await DashboardService.getDespesasCategoria(empresaId);
  return res.json(data);
});

export const getProximosVencimentos = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await DashboardService.getProximosVencimentos(empresaId);
  return res.json(data);
});
