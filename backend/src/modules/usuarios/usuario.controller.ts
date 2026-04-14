import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { UsuarioService } from './usuario.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'nome');
  const { data, total } = await UsuarioService.list(empresaId, pagination);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const empresaId = getEmpresaId(req);
  const usuario = await UsuarioService.findById(id, empresaId);
  return res.json({ success: true, data: usuario });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const usuario = await UsuarioService.create(req.body);
  return res.status(201).json({ success: true, data: usuario });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const usuario = await UsuarioService.update(id, req.body);
  return res.json({ success: true, data: usuario });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await UsuarioService.delete(id);
  return res.json({ success: true, data: { message: 'Usuário desativado com sucesso' } });
});
