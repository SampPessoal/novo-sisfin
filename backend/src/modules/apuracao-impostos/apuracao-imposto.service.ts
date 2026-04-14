import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';

export class ApuracaoImpostoService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.competencia) where.competencia = filters.competencia;
    if (filters.tipoImposto) where.tipoImposto = filters.tipoImposto;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      prisma.apuracaoImposto.findMany({
        where,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.apuracaoImposto.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const apuracao = await prisma.apuracaoImposto.findFirst({
      where: { id, empresaId },
    });

    if (!apuracao) throw new AppError(404, 'Apuração não encontrada');
    return apuracao;
  }

  static async calcular(empresaId: number, body: Record<string, unknown>) {
    const competencia = body.competencia as string;
    const tipoImposto = body.tipoImposto as string;

    if (!competencia) throw new AppError(400, 'Competência é obrigatória (ex: 2026-01)');
    if (!tipoImposto) throw new AppError(400, 'Tipo do imposto é obrigatório');

    const [ano, mes] = competencia.split('-').map(Number);
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);

    const [totalReceitas, totalDespesas] = await Promise.all([
      prisma.contaReceber.aggregate({
        where: {
          empresaId,
          status: 'RECEBIDO',
          dataRecebimento: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valorRecebido: true },
      }),
      prisma.contaPagar.aggregate({
        where: {
          empresaId,
          status: 'PAGO',
          dataPagamento: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valorPago: true },
      }),
    ]);

    const receitas = Number(totalReceitas._sum.valorRecebido ?? 0);
    const despesas = Number(totalDespesas._sum.valorPago ?? 0);
    const baseCalculo = receitas - despesas;

    const aliquotas: Record<string, number> = {
      IRPJ: 0.15,
      CSLL: 0.09,
      PIS: 0.0065,
      COFINS: 0.03,
      ISS: 0.05,
      ICMS: 0.18,
    };

    const aliquota = aliquotas[tipoImposto] || 0;
    const valorDevido = Number((baseCalculo * aliquota).toFixed(2));
    const valorPagar = Math.max(0, valorDevido);

    const detalhes = JSON.stringify({ totalReceitas: receitas, totalDespesas: despesas });

    const apuracao = await prisma.apuracaoImposto.upsert({
      where: {
        empresaId_competencia_tipoImposto: { empresaId, competencia, tipoImposto },
      },
      create: {
        empresaId,
        competencia,
        tipoImposto,
        baseCalculo,
        aliquota: aliquota * 100,
        valorDevido,
        deducoes: 0,
        valorPagar,
        status: 'CALCULADO',
        detalhes,
      },
      update: {
        baseCalculo,
        aliquota: aliquota * 100,
        valorDevido,
        deducoes: 0,
        valorPagar,
        status: 'CALCULADO',
        detalhes,
      },
    });

    return apuracao;
  }

  static async getBalancete(empresaId: number, competencia: string) {
    const [ano, mes] = competencia.split('-').map(Number);
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);

    const [receitas, despesas, impostos] = await Promise.all([
      prisma.contaReceber.groupBy({
        by: ['categoriaId'],
        where: {
          empresaId,
          status: 'RECEBIDO',
          dataRecebimento: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valorRecebido: true },
      }),
      prisma.contaPagar.groupBy({
        by: ['categoriaId'],
        where: {
          empresaId,
          status: 'PAGO',
          dataPagamento: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valorPago: true },
      }),
      prisma.apuracaoImposto.findMany({
        where: { empresaId, competencia },
      }),
    ]);

    return { competencia, receitas, despesas, impostos };
  }

  static async getRazaoAuxiliar(empresaId: number, competencia: string, categoriaId?: number) {
    const [ano, mes] = competencia.split('-').map(Number);
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);

    const categoriaFilter = categoriaId ? { categoriaId } : {};

    const [receitas, despesas] = await Promise.all([
      prisma.contaReceber.findMany({
        where: {
          empresaId,
          ...categoriaFilter,
          status: 'RECEBIDO',
          dataRecebimento: { gte: dataInicio, lte: dataFim },
        },
        include: { categoria: { select: { id: true, nome: true } } },
        orderBy: { dataRecebimento: 'asc' },
      }),
      prisma.contaPagar.findMany({
        where: {
          empresaId,
          ...categoriaFilter,
          status: 'PAGO',
          dataPagamento: { gte: dataInicio, lte: dataFim },
        },
        include: { categoria: { select: { id: true, nome: true } } },
        orderBy: { dataPagamento: 'asc' },
      }),
    ]);

    return { competencia, categoriaId, receitas, despesas };
  }
}
