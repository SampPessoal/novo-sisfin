import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { EmpresaService } from './empresa.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const pagination = getPagination(req, 'razaoSocial');
  const { data, total } = await EmpresaService.list(pagination);
  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const empresa = await EmpresaService.findById(id);
  return res.json({ success: true, data: empresa });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresa = await EmpresaService.create(req.body);
  return res.status(201).json({ success: true, data: empresa });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const empresa = await EmpresaService.update(id, req.body);
  return res.json({ success: true, data: empresa });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await EmpresaService.delete(id);
  return res.json({ success: true, data: { message: 'Empresa desativada com sucesso' } });
});
