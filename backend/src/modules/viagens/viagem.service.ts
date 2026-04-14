import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';

export class ViagemService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.colaboradorId) where.colaboradorId = filters.colaboradorId;

    if (pagination.search) {
      where.OR = [
        { destino: { contains: pagination.search } },
        { objetivo: { contains: pagination.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.solicitacaoViagem.findMany({
        where,
        include: {
          colaborador: { select: { id: true, nome: true } },
          clientes: { include: { cliente: { select: { id: true, razaoSocial: true } } } },
          despesas: true,
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { criadoEm: 'desc' },
      }),
      prisma.solicitacaoViagem.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const viagem = await prisma.solicitacaoViagem.findFirst({
      where: { id, empresaId },
      include: {
        colaborador: { select: { id: true, nome: true, email: true } },
        clientes: { include: { cliente: true } },
        despesas: { orderBy: { data: 'asc' } },
      },
    });

    if (!viagem) throw new AppError(404, 'Viagem não encontrada');
    return viagem;
  }

  static async create(empresaId: number, colaboradorId: number, body: Record<string, unknown>) {
    if (!body.destino) throw new AppError(400, 'Destino é obrigatório');
    if (!body.dataInicio) throw new AppError(400, 'Data de início é obrigatória');
    if (!body.dataFim) throw new AppError(400, 'Data de fim é obrigatória');

    return prisma.solicitacaoViagem.create({
      data: {
        empresaId,
        colaboradorId,
        destino: body.destino as string,
        objetivo: (body.objetivo as string) || '',
        dataInicio: new Date(body.dataInicio as string),
        dataFim: new Date(body.dataFim as string),
        estimativaDespesas: (body.estimativaDespesas as number) || 0,
        valorAdiantamento: body.valorAdiantamento as number | undefined,
        chavePix: body.chavePix as string | undefined,
        dadosBancarios: body.dadosBancarios as string | undefined,
        observacoes: body.observacoes as string | undefined,
        status: 'SOLICITADA',
      },
      include: {
        colaborador: { select: { id: true, nome: true } },
      },
    });
  }

  static async aprovarGestor(empresaId: number, id: number, _aprovadorId: number) {
    const viagem = await prisma.solicitacaoViagem.findFirst({ where: { id, empresaId } });
    if (!viagem) throw new AppError(404, 'Viagem não encontrada');
    if (viagem.status !== 'SOLICITADA') {
      throw new AppError(400, 'Viagem precisa estar com status SOLICITADA');
    }

    return prisma.solicitacaoViagem.update({
      where: { id },
      data: { status: 'APROVADA_GESTOR' },
    });
  }

  static async aprovarFinanceiro(empresaId: number, id: number, _aprovadorId: number) {
    const viagem = await prisma.solicitacaoViagem.findFirst({ where: { id, empresaId } });
    if (!viagem) throw new AppError(404, 'Viagem não encontrada');
    if (viagem.status !== 'APROVADA_GESTOR') {
      throw new AppError(400, 'Viagem precisa estar aprovada pelo gestor');
    }

    return prisma.solicitacaoViagem.update({
      where: { id },
      data: { status: 'APROVADA_FINANCEIRO' },
    });
  }

  static async liberarAdiantamento(empresaId: number, id: number) {
    const viagem = await prisma.solicitacaoViagem.findFirst({ where: { id, empresaId } });
    if (!viagem) throw new AppError(404, 'Viagem não encontrada');
    if (viagem.status !== 'APROVADA_FINANCEIRO') {
      throw new AppError(400, 'Viagem precisa estar aprovada pelo financeiro');
    }

    return prisma.solicitacaoViagem.update({
      where: { id },
      data: { status: 'ADIANTAMENTO_LIBERADO' },
    });
  }

  static async addDespesa(empresaId: number, viagemId: number, body: Record<string, unknown>) {
    const viagem = await prisma.solicitacaoViagem.findFirst({ where: { id: viagemId, empresaId } });
    if (!viagem) throw new AppError(404, 'Viagem não encontrada');

    if (!body.descricao) throw new AppError(400, 'Descrição da despesa é obrigatória');
    if (body.valor == null) throw new AppError(400, 'Valor da despesa é obrigatório');

    return prisma.despesaViagem.create({
      data: {
        viagemId,
        descricao: body.descricao as string,
        valor: body.valor as number,
        data: body.data ? new Date(body.data as string) : new Date(),
        tipoDespesa: (body.tipoDespesa as string) || 'OUTROS',
        comprovanteUrl: body.comprovanteUrl as string | undefined,
        preLancamentoId: body.preLancamentoId as number | undefined,
      },
    });
  }

  static async prestacaoContas(empresaId: number, id: number, body: Record<string, unknown>) {
    const viagem = await prisma.solicitacaoViagem.findFirst({
      where: { id, empresaId },
      include: { despesas: true },
    });
    if (!viagem) throw new AppError(404, 'Viagem não encontrada');

    const statusPermitidos = ['ADIANTAMENTO_LIBERADO', 'APROVADA_FINANCEIRO', 'EM_VIAGEM'];
    if (!statusPermitidos.includes(viagem.status)) {
      throw new AppError(400, 'Status da viagem não permite prestação de contas');
    }

    return prisma.solicitacaoViagem.update({
      where: { id },
      data: {
        status: 'PRESTACAO_ENVIADA',
        observacoes: body.observacoes as string | undefined,
      },
    });
  }

  static async concluir(empresaId: number, id: number) {
    const viagem = await prisma.solicitacaoViagem.findFirst({
      where: { id, empresaId },
      include: { despesas: true },
    });
    if (!viagem) throw new AppError(404, 'Viagem não encontrada');
    if (viagem.status !== 'PRESTACAO_ENVIADA') {
      throw new AppError(400, 'Viagem precisa ter prestação de contas submetida');
    }

    const totalDespesas = viagem.despesas.reduce((sum: number, d: any) => sum + Number(d.valor), 0);
    const adiantamento = Number(viagem.valorAdiantamento ?? 0);
    const saldo = adiantamento - totalDespesas;

    await prisma.solicitacaoViagem.update({
      where: { id },
      data: { status: 'CONCLUIDA' },
    });

    if (saldo < 0) {
      await prisma.contaPagar.create({
        data: {
          empresaId,
          descricao: `Reembolso viagem #${id} - ${viagem.destino}`,
          valor: Math.abs(saldo),
          dataVencimento: new Date(),
          status: 'PENDENTE',
          origemLancamento: 'VIAGEM',
          criadorId: viagem.colaboradorId,
        },
      });
    } else if (saldo > 0) {
      await prisma.contaReceber.create({
        data: {
          empresaId,
          descricao: `Devolução adiantamento viagem #${id} - ${viagem.destino}`,
          valor: saldo,
          dataVencimento: new Date(),
          status: 'PENDENTE',
          origemLancamento: 'VIAGEM',
          criadorId: viagem.colaboradorId,
        },
      });
    }

    return { viagemId: id, totalDespesas, adiantamento, saldo };
  }

  static async delete(empresaId: number, id: number) {
    const viagem = await prisma.solicitacaoViagem.findFirst({ where: { id, empresaId } });
    if (!viagem) throw new AppError(404, 'Viagem não encontrada');
    await prisma.solicitacaoViagem.delete({ where: { id } });
  }

  static async getPendentes(empresaId: number) {
    return prisma.solicitacaoViagem.findMany({
      where: {
        empresaId,
        status: { in: ['ADIANTAMENTO_LIBERADO', 'EM_VIAGEM'] },
      },
      include: {
        colaborador: { select: { id: true, nome: true } },
      },
      orderBy: { dataFim: 'asc' },
    });
  }
}
