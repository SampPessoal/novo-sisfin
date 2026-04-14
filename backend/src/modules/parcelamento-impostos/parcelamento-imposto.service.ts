import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import { addMonths } from 'date-fns';

export class ParcelamentoImpostoService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.tipoImposto) where.tipoImposto = filters.tipoImposto;

    if (pagination.search) {
      where.OR = [
        { observacoes: { contains: pagination.search } },
        { numeroProcesso: { contains: pagination.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.parcelamentoImposto.findMany({
        where,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.parcelamentoImposto.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const parcelamento = await prisma.parcelamentoImposto.findFirst({
      where: { id, empresaId },
      include: {
        parcelas: { orderBy: { numero: 'asc' } },
      },
    });

    if (!parcelamento) throw new AppError(404, 'Parcelamento não encontrado');
    return parcelamento;
  }

  static async create(empresaId: number, body: Record<string, unknown>) {
    if (body.valorTotal == null) throw new AppError(400, 'Valor total é obrigatório');
    if (!body.tipoImposto) throw new AppError(400, 'Tipo do imposto é obrigatório');

    return prisma.parcelamentoImposto.create({
      data: {
        empresaId,
        tipoImposto: (body.tipoImposto as string) || 'OUTRO',
        orgaoCredor: (body.orgaoCredor as string) || '',
        modalidade: (body.modalidade as string) || 'ORDINARIO',
        numeroProcesso: body.numeroProcesso as string | undefined,
        valorTotal: body.valorTotal as number,
        numeroParcelas: (body.numeroParcelas as number) || 12,
        indiceCorrecao: body.indiceCorrecao as string | undefined,
        dataInicio: body.dataInicio ? new Date(body.dataInicio as string) : new Date(),
        saldoDevedor: body.valorTotal as number,
        observacoes: body.observacoes as string | undefined,
        status: 'ATIVO',
      },
    });
  }

  static async update(empresaId: number, id: number, body: Record<string, unknown>) {
    const existing = await prisma.parcelamentoImposto.findFirst({ where: { id, empresaId } });
    if (!existing) throw new AppError(404, 'Parcelamento não encontrado');

    const updateData: Record<string, unknown> = { ...body };
    if (body.dataInicio) updateData.dataInicio = new Date(body.dataInicio as string);
    delete updateData.empresaId;
    delete updateData.saldoDevedor;

    return prisma.parcelamentoImposto.update({ where: { id }, data: updateData });
  }

  static async gerarParcelas(empresaId: number, id: number) {
    const parcelamento = await prisma.parcelamentoImposto.findFirst({ where: { id, empresaId } });
    if (!parcelamento) throw new AppError(404, 'Parcelamento não encontrado');

    const n = parcelamento.numeroParcelas || 12;
    const valorTotal = Number(parcelamento.valorTotal);
    const valorParcela = Number((valorTotal / n).toFixed(2));
    const dataBase = parcelamento.dataInicio || new Date();

    await prisma.parcelaParcelamentoImposto.deleteMany({ where: { parcelamentoImpostoId: id } });

    const parcelas = [];
    for (let i = 0; i < n; i++) {
      parcelas.push({
        parcelamentoImpostoId: id,
        numero: i + 1,
        valor: i === n - 1
          ? Number((valorTotal - valorParcela * (n - 1)).toFixed(2))
          : valorParcela,
        dataVencimento: addMonths(dataBase, i),
        status: 'PENDENTE',
      });
    }

    const created = await prisma.$transaction(
      parcelas.map((p) => prisma.parcelaParcelamentoImposto.create({ data: p })),
    );

    return created;
  }

  static async baixarParcela(empresaId: number, id: number, parcelaId: number) {
    const parcelamento = await prisma.parcelamentoImposto.findFirst({ where: { id, empresaId } });
    if (!parcelamento) throw new AppError(404, 'Parcelamento não encontrado');

    const parcela = await prisma.parcelaParcelamentoImposto.findFirst({
      where: { id: parcelaId, parcelamentoImpostoId: id },
    });
    if (!parcela) throw new AppError(404, 'Parcela não encontrada');
    if (parcela.status === 'PAGO') throw new AppError(400, 'Parcela já foi paga');

    const novoSaldo = Number(parcelamento.saldoDevedor) - Number(parcela.valor);

    await prisma.$transaction([
      prisma.parcelaParcelamentoImposto.update({
        where: { id: parcelaId },
        data: { status: 'PAGO', dataPagamento: new Date() },
      }),
      prisma.parcelamentoImposto.update({
        where: { id },
        data: { saldoDevedor: Math.max(0, novoSaldo) },
      }),
    ]);

    return { parcelaId, novoSaldoDevedor: Math.max(0, novoSaldo) };
  }

  static async delete(empresaId: number, id: number) {
    const parcelamento = await prisma.parcelamentoImposto.findFirst({ where: { id, empresaId } });
    if (!parcelamento) throw new AppError(404, 'Parcelamento não encontrado');
    await prisma.parcelamentoImposto.delete({ where: { id } });
  }

  static async getPainel(empresaId: number) {
    const [ativos, totalDivida, proximasParcelas] = await Promise.all([
      prisma.parcelamentoImposto.count({ where: { empresaId, status: 'ATIVO' } }),
      prisma.parcelamentoImposto.aggregate({
        where: { empresaId, status: 'ATIVO' },
        _sum: { saldoDevedor: true },
      }),
      prisma.parcelaParcelamentoImposto.findMany({
        where: {
          parcelamento: { empresaId, status: 'ATIVO' },
          status: 'PENDENTE',
        },
        include: {
          parcelamento: { select: { id: true, tipoImposto: true, orgaoCredor: true } },
        },
        orderBy: { dataVencimento: 'asc' },
        take: 10,
      }),
    ]);

    return {
      ativos,
      totalDivida: Number(totalDivida._sum.saldoDevedor ?? 0),
      proximasParcelas,
    };
  }
}
