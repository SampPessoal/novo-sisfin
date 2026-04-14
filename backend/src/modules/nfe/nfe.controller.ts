import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { NFEService } from './nfe.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataEmissao');
  const filters = {
    status: req.query.status as string | undefined,
    tipo: req.query.tipo as string | undefined,
  };
  const { data, total } = await NFEService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await NFEService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const emitir = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await NFEService.emitir(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const cancelar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await NFEService.cancelar(empresaId, id, req.body);
  return res.json({ success: true, data });
});

export const cartaCorrecao = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await NFEService.cartaCorrecao(empresaId, id, req.body);
  return res.json(data);
});

export const downloadXML = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const { content, contentType } = await NFEService.downloadXML(empresaId, id);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename=nfe-${id}.xml`);
  return res.send(content);
});

export const downloadPDF = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const { content, contentType } = await NFEService.downloadPDF(empresaId, id);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename=nfe-${id}.pdf`);
  return res.send(content);
});
