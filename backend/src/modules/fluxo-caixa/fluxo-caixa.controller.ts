import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getEmpresaId } from '../../middleware/multiTenant';
import { FluxoCaixaService } from './fluxo-caixa.service';

export const getFluxoCaixa = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const periodo = (req.query.periodo as string) || 'diario';
  const dataInicio = req.query.dataInicio as string;
  const dataFim = req.query.dataFim as string;
  const empresaIdsRaw = req.query.empresaIds as string | undefined;

  const empresaIds = empresaIdsRaw
    ? empresaIdsRaw.split(',').map((id) => parseInt(id.trim()))
    : [empresaId];

  const data = await FluxoCaixaService.getFluxoCaixa({
    periodo: periodo as 'diario' | 'semanal' | 'mensal',
    dataInicio,
    dataFim,
    empresaIds,
  });

  return res.json({ success: true, data });
});

export const getProjecao = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const periodo = (req.query.periodo as string) || 'mensal';
  const dataInicio = req.query.dataInicio as string;
  const dataFim = req.query.dataFim as string;
  const cenario = (req.query.cenario as string) || 'realista';
  const empresaIdsRaw = req.query.empresaIds as string | undefined;

  const empresaIds = empresaIdsRaw
    ? empresaIdsRaw.split(',').map((id) => parseInt(id.trim()))
    : [empresaId];

  const data = await FluxoCaixaService.getProjecao({
    periodo: periodo as 'diario' | 'semanal' | 'mensal',
    dataInicio,
    dataFim,
    empresaIds,
    cenario,
  });

  return res.json({ success: true, data });
});
