import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import { startOfDay, differenceInDays } from 'date-fns';

interface ContaReceberFilters {
  status?: string;
  clienteId?: number;
  categoriaId?: number;
  dataVencimentoInicio?: string;
  dataVencimentoFim?: string;
}

export class ContasReceberService {
  static async list(
    empresaId: number,
    pagination: PaginationOptions,
    filters: ContaReceberFilters,
  ) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.clienteId) where.clienteId = filters.clienteId;
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

    if (pagination.search) {
      where.OR = [
        { descricao: { contains: pagination.search } },
        { cliente: { razaoSocial: { contains: pagination.search } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.contaReceber.findMany({
        where,
        include: {
          cliente: {
            select: { id: true, razaoSocial: true, cnpjCpf: true },
          },
          categoria: { select: { id: true, nome: true } },
          centroCusto: { select: { id: true, codigo: true, nome: true } },
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.contaReceber.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const cr = await prisma.contaReceber.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        categoria: true,
        centroCusto: true,
        criador: { select: { id: true, nome: true, email: true } },
        notaFiscal: true,
      },
    });

    if (!cr) throw new AppError(404, 'Conta a receber não encontrada');
    return cr;
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

    return prisma.contaReceber.create({
      data: {
        empresaId,
        criadorId,
        descricao: body.descricao as string,
        valor: body.valor as number,
        dataVencimento: new Date(body.dataVencimento as string),
        dataEmissao: body.dataEmissao
          ? new Date(body.dataEmissao as string)
          : new Date(),
        clienteId: body.clienteId as number | undefined,
        categoriaId: body.categoriaId as number | undefined,
        centroCustoId: body.centroCustoId as number | undefined,
        observacoes: body.observacoes as string | undefined,
        notaFiscalId: body.notaFiscalId as number | undefined,
        status: 'PENDENTE',
      },
      include: {
        cliente: { select: { id: true, razaoSocial: true } },
        categoria: { select: { id: true, nome: true } },
      },
    });
  }

  static async update(
    empresaId: number,
    id: number,
    body: Record<string, unknown>,
  ) {
    const existing = await prisma.contaReceber.findFirst({
      where: { id, empresaId },
    });
    if (!existing) throw new AppError(404, 'Conta a receber não encontrada');

    if (['RECEBIDO', 'CANCELADO'].includes(existing.status)) {
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
    delete updateData.dataRecebimento;
    delete updateData.valorRecebido;

    return prisma.contaReceber.update({
      where: { id },
      data: updateData,
      include: {
        cliente: { select: { id: true, razaoSocial: true } },
        categoria: { select: { id: true, nome: true } },
      },
    });
  }

  static async baixar(
    empresaId: number,
    id: number,
    dataRecebimento: string,
    valorRecebido: number,
  ) {
    if (!dataRecebimento)
      throw new AppError(400, 'Data de recebimento é obrigatória');
    if (valorRecebido == null)
      throw new AppError(400, 'Valor recebido é obrigatório');

    const cr = await prisma.contaReceber.findFirst({
      where: { id, empresaId },
    });
    if (!cr) throw new AppError(404, 'Conta a receber não encontrada');
    if (cr.status === 'RECEBIDO')
      throw new AppError(400, 'Conta já foi recebida');
    if (cr.status === 'CANCELADO')
      throw new AppError(400, 'Conta cancelada não pode ser baixada');

    return prisma.contaReceber.update({
      where: { id },
      data: {
        dataRecebimento: new Date(dataRecebimento),
        valorRecebido,
        status: 'RECEBIDO',
      },
    });
  }

  static async cancelar(empresaId: number, id: number) {
    const cr = await prisma.contaReceber.findFirst({
      where: { id, empresaId },
    });
    if (!cr) throw new AppError(404, 'Conta a receber não encontrada');
    if (cr.status === 'RECEBIDO')
      throw new AppError(400, 'Conta já recebida não pode ser cancelada');
    if (cr.status === 'CANCELADO')
      throw new AppError(400, 'Conta já está cancelada');

    return prisma.contaReceber.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
  }

  static async getInadimplencia(empresaId: number) {
    const today = startOfDay(new Date());

    const overdue = await prisma.contaReceber.findMany({
      where: {
        empresaId,
        status: { in: ['PENDENTE', 'VENCIDO'] },
        dataVencimento: { lt: today },
      },
      select: { valor: true, dataVencimento: true },
    });

    const bands = {
      faixa0_30: { count: 0, total: 0 },
      faixa31_60: { count: 0, total: 0 },
      faixa61_90: { count: 0, total: 0 },
      faixaMais90: { count: 0, total: 0 },
    };

    for (const item of overdue) {
      const days = differenceInDays(today, item.dataVencimento);
      const valor = Number(item.valor);

      if (days <= 30) {
        bands.faixa0_30.count++;
        bands.faixa0_30.total += valor;
      } else if (days <= 60) {
        bands.faixa31_60.count++;
        bands.faixa31_60.total += valor;
      } else if (days <= 90) {
        bands.faixa61_90.count++;
        bands.faixa61_90.total += valor;
      } else {
        bands.faixaMais90.count++;
        bands.faixaMais90.total += valor;
      }
    }

    bands.faixa0_30.total = Number(bands.faixa0_30.total.toFixed(2));
    bands.faixa31_60.total = Number(bands.faixa31_60.total.toFixed(2));
    bands.faixa61_90.total = Number(bands.faixa61_90.total.toFixed(2));
    bands.faixaMais90.total = Number(bands.faixaMais90.total.toFixed(2));

    return bands;
  }
}
