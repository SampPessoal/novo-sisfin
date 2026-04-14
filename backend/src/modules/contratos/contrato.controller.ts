import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { ContratoService } from './contrato.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'vigenciaFim');
  const filters = {
    status: req.query.status as string | undefined,
    tipo: req.query.tipo as string | undefined,
    fornecedorId: req.query.fornecedorId ? parseInt(req.query.fornecedorId as string) : undefined,
    clienteId: req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined,
  };

  const { data, total } = await ContratoService.list(empresaId, pagination, filters);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ContratoService.getById(empresaId, id);
  return res.json({ success: true, data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ContratoService.create(empresaId, req.body);
  return res.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ContratoService.update(empresaId, id, req.body);
  return res.json({ success: true, data });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = await ContratoService.delete(empresaId, id);
  return res.json({ success: true, data: { message: 'Contrato cancelado com sucesso', data } });
});

export const generateParcelas = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const data = await ContratoService.generateParcelas(empresaId, contratoId, req.body);
  return res.status(201).json({ success: true, data });
});

export const addAditivo = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const data = await ContratoService.addAditivo(empresaId, contratoId, req.body);
  return res.status(201).json({ success: true, data });
});

export const getAlertas = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = await ContratoService.getAlertas(empresaId);
  return res.json({ success: true, data });
});

export const provisionar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const criadorId = req.user!.userId;
  const data = await ContratoService.provisionar(empresaId, contratoId, criadorId, req.body);
  return res.status(201).json({ success: true, data });
});

export const getContasPagar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const data = await ContratoService.getContasPagar(empresaId, contratoId);
  return res.json({ success: true, data });
});

export const cancelarProvisionamento = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const data = await ContratoService.cancelarProvisionamento(empresaId, contratoId);
  return res.json({ success: true, data });
});

export const listArquivos = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const data = await ContratoService.listArquivos(empresaId, contratoId);
  return res.json({ success: true, data });
});

export const uploadArquivo = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
  }
  const data = await ContratoService.uploadArquivo(empresaId, contratoId, {
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
  });
  return res.status(201).json({ success: true, data });
});

export const downloadArquivo = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const arquivoId = parseInt(req.params.arquivoId as string);
  const data = await ContratoService.downloadArquivo(empresaId, contratoId, arquivoId);
  return res.json({ success: true, data });
});

export const deleteArquivo = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contratoId = parseInt(req.params.id as string);
  const arquivoId = parseInt(req.params.arquivoId as string);
  const data = await ContratoService.deleteArquivo(empresaId, contratoId, arquivoId);
  return res.json({ success: true, data });
});
