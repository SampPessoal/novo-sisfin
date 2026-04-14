import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getEmpresaId } from '../../middleware/multiTenant';
import { DREService } from './dre.service';

export const getDRE = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const periodo = (req.query.periodo as string) || 'mes';
  let dataInicio = req.query.dataInicio as string;
  let dataFim = req.query.dataFim as string;

  if (!dataInicio && req.query.competencia) {
    const comp = req.query.competencia as string;
    const [year, month] = comp.split('-').map(Number);
    dataInicio = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    dataFim = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  }

  if (!dataInicio || !dataFim) {
    const now = new Date();
    dataInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    dataFim = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;
  }

  const data = await DREService.getDRE({
    empresaId,
    periodo: periodo as 'mes' | 'trimestre' | 'ano',
    dataInicio,
    dataFim,
  });

  return res.json(data);
});

export const getComparativo = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const periodo1Inicio = req.query.periodo1Inicio as string;
  const periodo1Fim = req.query.periodo1Fim as string;
  const periodo2Inicio = req.query.periodo2Inicio as string;
  const periodo2Fim = req.query.periodo2Fim as string;

  const data = await DREService.getComparativo(
    empresaId,
    periodo1Inicio,
    periodo1Fim,
    periodo2Inicio,
    periodo2Fim,
  );

  return res.json({ success: true, data });
});
