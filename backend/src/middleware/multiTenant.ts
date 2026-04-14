import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export function multiTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.empresaId) {
    throw new AppError(400, 'Empresa não selecionada');
  }
  next();
}

export function getEmpresaId(req: Request): number {
  if (!req.user?.empresaId) {
    throw new AppError(400, 'Empresa não selecionada');
  }
  return req.user.empresaId;
}
