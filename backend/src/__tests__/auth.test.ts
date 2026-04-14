import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindUnique = jest.fn() as jest.Mock<any>;
const mockUpdate = jest.fn() as jest.Mock<any>;
const mockTransaction = jest.fn() as jest.Mock<any>;

jest.mock('../config/database', () => ({
  prisma: {
    usuario: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    usuarioEmpresa: { findFirst: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: mockTransaction,
  },
}));

const mockCompare = jest.fn() as jest.Mock<any>;
jest.mock('bcryptjs', () => ({
  compare: mockCompare,
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ userId: 1, email: 'test@test.com', empresaId: 1, perfil: 'ADMIN' })),
}));

import { AuthService } from '../modules/auth/auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should reject invalid email format', async () => {
      await expect(AuthService.login('invalid', 'password')).rejects.toThrow();
    });

    it('should reject when user is not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(AuthService.login('user@test.com', 'password')).rejects.toThrow('Credenciais inválidas');
    });

    it('should reject when password is wrong', async () => {
      mockFindUnique.mockResolvedValue({
        id: 1, email: 'user@test.com', senha: 'hashed', ativo: true, twoFactorAtivo: false,
        empresas: [{ empresaId: 1, perfil: 'ADMIN', perfilId: null, empresa: { id: 1, razaoSocial: 'Test' } }],
      });
      mockCompare.mockResolvedValue(false);
      await expect(AuthService.login('user@test.com', 'wrong')).rejects.toThrow('Credenciais inválidas');
    });

    it('should return tokens on successful login', async () => {
      mockFindUnique.mockResolvedValue({
        id: 1, nome: 'Admin', email: 'user@test.com', senha: 'hashed', ativo: true, twoFactorAtivo: false,
        empresas: [{ empresaId: 1, perfil: 'ADMIN', perfilId: 1, empresa: { id: 1, razaoSocial: 'Test Corp' } }],
      });
      mockCompare.mockResolvedValue(true);
      mockTransaction.mockResolvedValue([]);
      mockUpdate.mockResolvedValue({});

      const result = await AuthService.login('user@test.com', 'password');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('usuario');
    });

    it('should request 2FA when enabled', async () => {
      mockFindUnique.mockResolvedValue({
        id: 1, nome: 'Admin', email: 'user@test.com', senha: 'hashed', ativo: true,
        twoFactorAtivo: true, twoFactorSecret: 'secret',
        empresas: [{ empresaId: 1, perfil: 'ADMIN', perfilId: null, empresa: { id: 1, razaoSocial: 'Test' } }],
      });
      mockCompare.mockResolvedValue(true);

      const result = await AuthService.login('user@test.com', 'password');
      expect(result).toHaveProperty('require2FA', true);
    });
  });

  describe('getMe', () => {
    it('should return user data', async () => {
      mockFindUnique.mockResolvedValue({
        id: 1, nome: 'Test User', email: 'test@test.com', telefone: null, twoFactorAtivo: false,
        empresas: [{ perfil: 'ADMIN', perfilId: 1, empresa: { id: 1, razaoSocial: 'Test', nomeFantasia: 'Test' } }],
      });

      const result = await AuthService.getMe(1);
      expect(result.nome).toBe('Test User');
      expect(result.empresas).toHaveLength(1);
    });

    it('should throw when user not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(AuthService.getMe(999)).rejects.toThrow('Usuário não encontrado');
    });
  });
});
