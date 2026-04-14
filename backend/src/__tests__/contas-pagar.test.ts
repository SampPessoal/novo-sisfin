import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockFindMany = jest.fn() as jest.Mock<any>;
const mockCount = jest.fn() as jest.Mock<any>;
const mockCreate = jest.fn() as jest.Mock<any>;

jest.mock('../config/database', () => ({
  prisma: {
    contaPagar: {
      findMany: mockFindMany,
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: mockCreate,
      update: jest.fn(),
      count: mockCount,
    },
    aprovacaoCP: {
      create: jest.fn(),
    },
  },
}));

describe('ContasPagar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return data and total', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const { ContasPagarService } = await import('../modules/contas-pagar/contas-pagar.service');
      const result = await ContasPagarService.list(
        1,
        { page: 1, pageSize: 10, sortBy: 'dataVencimento', sortOrder: 'asc' as const, skip: 0 },
        {},
      );

      expect(mockFindMany).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
    });
  });

  describe('create', () => {
    it('should create a conta a pagar', async () => {
      const mockCP = {
        id: 1,
        empresaId: 1,
        descricao: 'Test CP',
        valor: 1000,
        dataVencimento: new Date(),
        status: 'PENDENTE',
      };

      mockCreate.mockResolvedValue(mockCP);

      const { ContasPagarService } = await import('../modules/contas-pagar/contas-pagar.service');
      const result = await ContasPagarService.create(1, 1, {
        descricao: 'Test CP',
        valor: 1000,
        dataVencimento: new Date().toISOString(),
      });

      expect(result).toHaveProperty('id');
      expect(result.descricao).toBe('Test CP');
    });
  });
});
