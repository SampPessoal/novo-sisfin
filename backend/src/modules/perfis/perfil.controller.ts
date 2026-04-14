import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { PerfilService } from './perfil.service';

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await PerfilService.listPermissions();
  return res.json({ success: true, data });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = req.user?.empresaId;
  const data = await PerfilService.list(empresaId);
  return res.json({ success: true, data });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const data = await PerfilService.getById(id);
  return res.json({ success: true, data });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await PerfilService.create({
    empresaId: req.body.empresaId ?? req.user?.empresaId,
    nome: req.body.nome,
    descricao: req.body.descricao,
    permissaoIds: req.body.permissaoIds ?? [],
  });
  return res.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const data = await PerfilService.update(id, {
    nome: req.body.nome,
    descricao: req.body.descricao,
    permissaoIds: req.body.permissaoIds,
  });
  return res.json({ success: true, data });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await PerfilService.remove(id);
  return res.json({ success: true, data: { message: 'Perfil removido' } });
});
