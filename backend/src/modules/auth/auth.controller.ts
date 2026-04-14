import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthService } from './auth.service';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, senha, empresaId, codigoTOTP } = req.body;
  const result = await AuthService.login(email, senha, empresaId, codigoTOTP);

  if ('require2FA' in result && result.require2FA) {
    return res.json({ success: true, data: result });
  }

  return res.json({ success: true, data: result });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const result = await AuthService.refreshToken(token);
  return res.json({ success: true, data: result });
});

export const setup2FA = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await AuthService.setup2FA(userId);
  return res.json({ success: true, data: result });
});

export const verify2FA = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { code } = req.body;
  const result = await AuthService.verify2FA(userId, code);
  return res.json({ success: true, data: result });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const usuario = await AuthService.getMe(userId);
  return res.json(usuario);
});

export const selectEmpresa = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { empresaId } = req.body;
  const result = await AuthService.selectEmpresa(userId, empresaId);
  return res.json({ success: true, data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  await AuthService.logout(refreshToken);
  return res.json({ success: true, data: { message: 'Logout realizado com sucesso' } });
});
