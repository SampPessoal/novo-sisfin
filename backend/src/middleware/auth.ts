import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

export interface JWTPayload {
  userId: number;
  email: string;
  empresaId: number;
  perfil: string;
  perfilId?: number;
  permissoes?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Token de autenticação não fornecido');
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'Token inválido ou expirado');
  }
}

export function requireRole(...perfis: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Não autenticado');
    }
    if (!perfis.includes(req.user.perfil)) {
      throw new AppError(403, 'Sem permissão para esta operação');
    }
    next();
  };
}
