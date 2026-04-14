import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { ConciliacaoService } from './conciliacao.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataImportacao');
  const { data, total } = await ConciliacaoService.list(empresaId, pagination);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ConciliacaoService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const importar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contaBancariaId = parseInt(req.body.contaBancariaId);

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Arquivo é obrigatório' });
  }

  if (!contaBancariaId) {
    return res.status(400).json({ success: false, error: 'Conta bancária é obrigatória' });
  }

  const data = await ConciliacaoService.importar(
    {
      filename: req.file.filename,
      path: req.file.path,
      originalname: req.file.originalname,
    },
    contaBancariaId,
    empresaId,
  );

  return res.status(201).json({ success: true, data });
});

export const conciliarItem = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const itemId = parseInt(req.body.itemId);
  const data = await ConciliacaoService.conciliarItem(empresaId, itemId, {
    contaPagarId: req.body.contaPagarId,
    contaReceberId: req.body.contaReceberId,
  });
  return res.json({ success: true, data });
});

export const autoConciliar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ConciliacaoService.autoConciliar(empresaId, id);
  return res.json({ success: true, data });
});

export const pendentes = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ConciliacaoService.getPendentes(empresaId, id);
  return res.json({ success: true, data });
});
