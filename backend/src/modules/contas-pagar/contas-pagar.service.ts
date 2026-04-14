import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import {
  addMonths,
  addWeeks,
  addDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isBefore,
} from 'date-fns';

interface ContaPagarFilters {
  status?: string;
  fornecedorId?: number;
  categoriaId?: number;
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
  vencidos?: boolean;
}

interface RateioItem {
  centroCustoId: number;
  percentual: number;
}

interface RecorrenteData {
  descricao: string;
  valor: number;
  dataVencimento: string;
  recorrencia: string;
  recorrenciaFim: string;
  fornecedorId?: number;
  categoriaId?: number;
  centroCustoId?: number;
  observacoes?: string;
}

function getNextDate(current: Date, recorrencia: string): Date {
  switch (recorrencia) {
    case 'SEMANAL':
      return addWeeks(current, 1);
    case 'QUINZENAL':
      return addDays(current, 15);
    case 'MENSAL':
      return addMonths(current, 1);
    case 'BIMESTRAL':
      return addMonths(current, 2);
    case 'TRIMESTRAL':
      return addMonths(current, 3);
    case 'SEMESTRAL':
      return addMonths(current, 6);
    case 'ANUAL':
      return addMonths(current, 12);
    default:
      throw new AppError(400, `Tipo de recorrência inválido: ${recorrencia}`);
  }
}

export class ContasPagarService {
  static async list(
    empresaId: number,
    pagination: PaginationOptions,
    filters: ContaPagarFilters,
  ) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.fornecedorId) where.fornecedorId = filters.fornecedorId;
    if (filters.categoriaId) where.categoriaId = filters.categoriaId;

    if (filters.dataVencimentoInicio || filters.dataVencimentoFim) {
      where.dataVencimento = {
        ...(filters.dataVencimentoInicio && {
          gte: new Date(filters.dataVencimentoInicio),
        }),
        ...(filters.dataVencimentoFim && {
          lte: new Date(filters.dataVencimentoFim),
        }),
      };
    }

    if (filters.vencidos) {
      where.dataVencimento = { lt: startOfDay(new Date()) };
      where.status = { in: ['PENDENTE', 'APROVADO'] };
    }

    if (pagination.search) {
      where.OR = [
        { descricao: { contains: pagination.search } },
        { fornecedor: { razaoSocial: { contains: pagination.search } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.contaPagar.findMany({
        where,
        include: {
          fornecedor: { select: { id: true, razaoSocial: true, cnpjCpf: true } },
          categoria: { select: { id: true, nome: true } },
          centroCusto: { select: { id: true, codigo: true, nome: true } },
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.contaPagar.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const cp = await prisma.contaPagar.findFirst({
      where: { id, empresaId },
      include: {
        fornecedor: true,
        categoria: true,
        centroCusto: true,
        criador: { select: { id: true, nome: true, email: true } },
        aprovacoes: {
          include: { aprovador: { select: { id: true, nome: true } } },
          orderBy: { criadoEm: 'desc' },
        },
        rateios: {
          include: {
            centroCusto: { select: { id: true, codigo: true, nome: true } },
          },
        },
      },
    });

    if (!cp) throw new AppError(404, 'Conta a pagar não encontrada');
    return cp;
  }

  static async create(
    empresaId: number,
    criadorId: number,
    body: Record<string, unknown>,
  ) {
    if (!body.descricao) throw new AppError(400, 'Descrição é obrigatória');
    if (body.valor == null) throw new AppError(400, 'Valor é obrigatório');
    if (!body.dataVencimento)
      throw new AppError(400, 'Data de vencimento é obrigatória');

    return prisma.contaPagar.create({
      data: {
        empresaId,
        criadorId,
        descricao: body.descricao as string,
        valor: body.valor as number,
        dataVencimento: new Date(body.dataVencimento as string),
        dataEmissao: body.dataEmissao
          ? new Date(body.dataEmissao as string)
          : new Date(),
        fornecedorId: body.fornecedorId as number | undefined,
        categoriaId: body.categoriaId as number | undefined,
        centroCustoId: body.centroCustoId as number | undefined,
        observacoes: body.observacoes as string | undefined,
        codigoBarras: body.codigoBarras as string | undefined,
        status: 'PENDENTE',
      },
      include: {
        fornecedor: { select: { id: true, razaoSocial: true } },
        categoria: { select: { id: true, nome: true } },
      },
    });
  }

  static async update(
    empresaId: number,
    id: number,
    body: Record<string, unknown>,
  ) {
    const existing = await prisma.contaPagar.findFirst({
      where: { id, empresaId },
    });
    if (!existing) throw new AppError(404, 'Conta a pagar não encontrada');

    if (['PAGO', 'CANCELADO'].includes(existing.status)) {
      throw new AppError(
        400,
        `Não é possível alterar uma conta com status ${existing.status}`,
      );
    }

    const updateData: Record<string, unknown> = { ...body };
    if (body.dataVencimento)
      updateData.dataVencimento = new Date(body.dataVencimento as string);
    if (body.dataEmissao)
      updateData.dataEmissao = new Date(body.dataEmissao as string);

    delete updateData.empresaId;
    delete updateData.criadorId;
    delete updateData.status;
    delete updateData.dataPagamento;
    delete updateData.valorPago;

    return prisma.contaPagar.update({
      where: { id },
      data: updateData,
      include: {
        fornecedor: { select: { id: true, razaoSocial: true } },
        categoria: { select: { id: true, nome: true } },
      },
    });
  }

  static async approve(
    empresaId: number,
    contaPagarId: number,
    aprovadorId: number,
    observacao?: string,
  ) {
    const cp = await prisma.contaPagar.findFirst({
      where: { id: contaPagarId, empresaId },
    });
    if (!cp) throw new AppError(404, 'Conta a pagar não encontrada');
    if (cp.status !== 'PENDENTE')
      throw new AppError(400, 'Somente contas pendentes podem ser aprovadas');

    const [aprovacao] = await prisma.$transaction([
      prisma.aprovacaoCP.create({
        data: {
          contaPagarId,
          aprovadorId,
          acao: 'APROVADO',
          observacao,
        },
        include: { aprovador: { select: { id: true, nome: true } } },
      }),
      prisma.contaPagar.update({
        where: { id: contaPagarId },
        data: { status: 'APROVADO' },
      }),
    ]);

    return aprovacao;
  }

  static async reject(
    empresaId: number,
    contaPagarId: number,
    aprovadorId: number,
    motivo: string,
  ) {
    if (!motivo) throw new AppError(400, 'Motivo da rejeição é obrigatório');

    const cp = await prisma.contaPagar.findFirst({
      where: { id: contaPagarId, empresaId },
    });
    if (!cp) throw new AppError(404, 'Conta a pagar não encontrada');
    if (cp.status !== 'PENDENTE')
      throw new AppError(400, 'Somente contas pendentes podem ser rejeitadas');

    const [aprovacao] = await prisma.$transaction([
      prisma.aprovacaoCP.create({
        data: {
          contaPagarId,
          aprovadorId,
          acao: 'REJEITADO',
          observacao: motivo,
        },
        include: { aprovador: { select: { id: true, nome: true } } },
      }),
      prisma.contaPagar.update({
        where: { id: contaPagarId },
        data: { status: 'REJEITADO' },
      }),
    ]);

    return aprovacao;
  }

  static async baixar(
    empresaId: number,
    id: number,
    dataPagamento: string,
    valorPago: number,
  ) {
    if (!dataPagamento)
      throw new AppError(400, 'Data de pagamento é obrigatória');
    if (valorPago == null) throw new AppError(400, 'Valor pago é obrigatório');

    const cp = await prisma.contaPagar.findFirst({ where: { id, empresaId } });
    if (!cp) throw new AppError(404, 'Conta a pagar não encontrada');
    if (cp.status === 'PAGO') throw new AppError(400, 'Conta já foi paga');
    if (cp.status === 'CANCELADO')
      throw new AppError(400, 'Conta cancelada não pode ser baixada');

    return prisma.contaPagar.update({
      where: { id },
      data: {
        dataPagamento: new Date(dataPagamento),
        valorPago,
        status: 'PAGO',
      },
    });
  }

  static async setRateio(
    empresaId: number,
    id: number,
    rateios: RateioItem[],
  ) {
    const cp = await prisma.contaPagar.findFirst({ where: { id, empresaId } });
    if (!cp) throw new AppError(404, 'Conta a pagar não encontrada');

    if (!rateios?.length) {
      throw new AppError(400, 'Informe ao menos um item de rateio');
    }

    const totalPercentual = rateios.reduce((sum, r) => sum + r.percentual, 0);
    if (Math.abs(totalPercentual - 100) > 0.01) {
      throw new AppError(400, 'A soma dos percentuais deve ser igual a 100%');
    }

    const valorTotal = Number(cp.valor);

    await prisma.$transaction(async (tx) => {
      await tx.rateioCentroCusto.deleteMany({ where: { contaPagarId: id } });
      for (const r of rateios) {
        await tx.rateioCentroCusto.create({
          data: {
            contaPagarId: id,
            centroCustoId: r.centroCustoId,
            percentual: r.percentual,
            valor: Number(((valorTotal * r.percentual) / 100).toFixed(2)),
          },
        });
      }
    });

    return prisma.rateioCentroCusto.findMany({
      where: { contaPagarId: id },
      include: {
        centroCusto: { select: { id: true, codigo: true, nome: true } },
      },
    });
  }

  static async createRecorrente(
    empresaId: number,
    criadorId: number,
    body: RecorrenteData,
  ) {
    if (!body.descricao) throw new AppError(400, 'Descrição é obrigatória');
    if (!body.valor) throw new AppError(400, 'Valor é obrigatório');
    if (!body.dataVencimento)
      throw new AppError(400, 'Data de vencimento é obrigatória');
    if (!body.recorrencia || body.recorrencia === 'UNICA') {
      throw new AppError(
        400,
        'Tipo de recorrência é obrigatório e não pode ser UNICA',
      );
    }
    if (!body.recorrenciaFim)
      throw new AppError(400, 'Data fim da recorrência é obrigatória');

    const startDate = new Date(body.dataVencimento);
    const endDate = new Date(body.recorrenciaFim);

    if (!isBefore(startDate, endDate)) {
      throw new AppError(
        400,
        'Data fim deve ser posterior à data de vencimento',
      );
    }

    const dates: Date[] = [startDate];
    let current = startDate;
    while (true) {
      current = getNextDate(current, body.recorrencia);
      if (isBefore(endDate, current)) break;
      dates.push(current);
    }

    const totalParcelas = dates.length;

    const records = await prisma.$transaction(async (tx) => {
      const created: Awaited<ReturnType<typeof tx.contaPagar.create>>[] = [];
      let parentId: number | undefined;

      for (let i = 0; i < dates.length; i++) {
        const record = await tx.contaPagar.create({
          data: {
            empresaId,
            criadorId,
            descricao: `${body.descricao} (${i + 1}/${totalParcelas})`,
            valor: body.valor,
            dataVencimento: dates[i],
            dataEmissao: new Date(),
            fornecedorId: body.fornecedorId,
            categoriaId: body.categoriaId,
            centroCustoId: body.centroCustoId,
            observacoes: body.observacoes,
            status: 'PENDENTE',
            recorrencia: body.recorrencia,
            recorrenciaFim: endDate,
            parcelaAtual: i + 1,
            totalParcelas,
            cpPaiId: i > 0 ? parentId : undefined,
          },
        });

        if (i === 0) parentId = record.id;
        created.push(record);
      }

      return created;
    });

    return records;
  }

  static async cancel(empresaId: number, id: number) {
    const cp = await prisma.contaPagar.findFirst({ where: { id, empresaId } });
    if (!cp) throw new AppError(404, 'Conta a pagar não encontrada');
    if (cp.status === 'PAGO')
      throw new AppError(400, 'Conta já paga não pode ser cancelada');
    if (cp.status === 'CANCELADO')
      throw new AppError(400, 'Conta já está cancelada');

    return prisma.contaPagar.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
  }

  static async getVencimentos(empresaId: number) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const activeFilter = { in: ['PENDENTE', 'APROVADO'] };

    const [hoje, semana, mes, atrasados] = await Promise.all([
      prisma.contaPagar.aggregate({
        where: {
          empresaId,
          status: activeFilter,
          dataVencimento: { gte: todayStart, lte: todayEnd },
        },
        _count: true,
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: {
          empresaId,
          status: activeFilter,
          dataVencimento: { gte: weekStart, lte: weekEnd },
        },
        _count: true,
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: {
          empresaId,
          status: activeFilter,
          dataVencimento: { gte: monthStart, lte: monthEnd },
        },
        _count: true,
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: {
          empresaId,
          status: activeFilter,
          dataVencimento: { lt: todayStart },
        },
        _count: true,
        _sum: { valor: true },
      }),
    ]);

    return {
      hoje: {
        count: hoje._count,
        total: Number(hoje._sum.valor ?? 0),
      },
      semana: {
        count: semana._count,
        total: Number(semana._sum.valor ?? 0),
      },
      mes: {
        count: mes._count,
        total: Number(mes._sum.valor ?? 0),
      },
      atrasados: {
        count: atrasados._count,
        total: Number(atrasados._sum.valor ?? 0),
      },
    };
  }
}
