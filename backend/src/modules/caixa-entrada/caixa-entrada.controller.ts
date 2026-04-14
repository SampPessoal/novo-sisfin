import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { CaixaEntradaService } from './caixa-entrada.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'criadoEm');
  const filters = {
    status: req.query.status as string | undefined,
    origem: req.query.origem as string | undefined,
    colaboradorId: req.query.colaboradorId ? parseInt(req.query.colaboradorId as string) : undefined,
    dataInicio: req.query.dataInicio as string | undefined,
    dataFim: req.query.dataFim as string | undefined,
  };
  const { data, total } = await CaixaEntradaService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await CaixaEntradaService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const upload = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const userId = req.user!.userId;
  const origem = (req.body.origem as string) || 'UPLOAD';

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Arquivo é obrigatório' });
  }

  const data = await CaixaEntradaService.upload(
    {
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
    },
    userId,
    empresaId,
    origem,
  );

  return res.status(201).json({ success: true, data });
});

export const classificar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await CaixaEntradaService.classificar(empresaId, id, req.body);
  return res.json({ success: true, data });
});

export const aprovar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const aprovadorId = req.user!.userId;
  const data = await CaixaEntradaService.aprovar(empresaId, id, aprovadorId);
  return res.json({ success: true, data });
});

export const rejeitar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const { motivo } = req.body;
  const data = await CaixaEntradaService.rejeitar(empresaId, id, motivo);
  return res.json({ success: true, data });
});

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await CaixaEntradaService.getDashboard(empresaId);
  return res.json({ success: true, data });
});
