import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getEmpresaId } from '../../middleware/multiTenant';
import { NotificacaoService } from './notificacao.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const apenasNaoLidas = req.query.naoLidas === 'true';
  const data = await NotificacaoService.list(req.user!.userId, empresaId, apenasNaoLidas);
  return res.json({ success: true, data });
});

export const count = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const total = await NotificacaoService.countNaoLidas(req.user!.userId, empresaId);
  return res.json({ success: true, data: { total } });
});

export const marcarLida = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  await NotificacaoService.marcarComoLida(id, req.user!.userId);
  return res.json({ success: true, data: { message: 'Notificação marcada como lida' } });
});

export const marcarTodasLidas = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  await NotificacaoService.marcarTodasComoLidas(req.user!.userId, empresaId);
  return res.json({ success: true, data: { message: 'Todas notificações marcadas como lidas' } });
});
