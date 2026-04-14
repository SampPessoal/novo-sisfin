import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

const mockFindMany = jest.fn() as jest.Mock<any>;
const mockFindFirst = jest.fn() as jest.Mock<any>;

jest.mock('../config/database', () => ({
  prisma: {
    perfilPermissao: { findMany: mockFindMany },
    usuarioEmpresa: { findFirst: mockFindFirst },
  },
}));

import { requirePermission, clearPermissionsCache } from '../middleware/permissions';

function createMockRequest(user?: Record<string, unknown>): Request {
  return { user } as unknown as Request;
}

function createMockResponse(): Response {
  return {} as Response;
}

describe('Permissions Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPermissionsCache();
  });

  it('should reject unauthenticated requests', async () => {
    const middleware = requirePermission('contas_pagar:visualizar');
    const req = createMockRequest();
    const next = jest.fn() as unknown as NextFunction;

    await expect(
      middleware(req, createMockResponse(), next),
    ).rejects.toThrow('Não autenticado');
  });

  it('should allow ADMIN through legacy fallback', async () => {
    const middleware = requirePermission('contas_pagar:visualizar');
    const req = createMockRequest({ userId: 1, empresaId: 1, perfil: 'ADMIN' });
    const next = jest.fn() as unknown as NextFunction;

    mockFindFirst.mockResolvedValue(null);

    await middleware(req, createMockResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow when perfilId has matching permissions', async () => {
    const middleware = requirePermission('contas_pagar:visualizar');
    const req = createMockRequest({ userId: 1, empresaId: 1, perfil: 'FINANCEIRO', perfilId: 2 });
    const next = jest.fn() as unknown as NextFunction;

    mockFindMany.mockResolvedValue([
      { permissao: { modulo: 'contas_pagar', acao: 'visualizar' } },
    ]);

    await middleware(req, createMockResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject when permission is missing', async () => {
    const middleware = requirePermission('admin:empresas');
    const req = createMockRequest({ userId: 1, empresaId: 1, perfil: 'VISUALIZADOR' });
    const next = jest.fn() as unknown as NextFunction;

    mockFindFirst.mockResolvedValue(null);

    await expect(
      middleware(req, createMockResponse(), next),
    ).rejects.toThrow('Sem permissão');
  });
});
