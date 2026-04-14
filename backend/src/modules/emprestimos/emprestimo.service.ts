import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import { addMonths } from 'date-fns';

export class EmprestimoService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.tipo) where.tipo = filters.tipo;

    if (pagination.search) {
      where.OR = [
        { credorDevedor: { contains: pagination.search } },
        { contratoReferencia: { contains: pagination.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.emprestimo.findMany({
        where,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.emprestimo.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const emprestimo = await prisma.emprestimo.findFirst({
      where: { id, empresaId },
      include: {
        parcelas: { orderBy: { numero: 'asc' } },
      },
    });

    if (!emprestimo) throw new AppError(404, 'Empréstimo não encontrado');
    return emprestimo;
  }

  static async create(empresaId: number, body: Record<string, unknown>) {
    if (body.valorPrincipal == null) throw new AppError(400, 'Valor principal é obrigatório');

    const valorPrincipal = body.valorPrincipal as number;

    return prisma.emprestimo.create({
      data: {
        empresaId,
        tipo: (body.tipo as string) || 'EMPRESTIMO',
        credorDevedor: (body.credorDevedor as string) || '',
        cnpjCpfCredorDevedor: body.cnpjCpfCredorDevedor as string | undefined,
        valorPrincipal,
        taxaJuros: (body.taxaJuros as number) || 0,
        tipoTaxa: (body.tipoTaxa as string) || 'MENSAL',
        indexador: body.indexador as string | undefined,
        sistemaAmortizacao: (body.sistemaAmortizacao as string) || 'PRICE',
        numeroParcelas: (body.numeroParcelas as number) || 12,
        periodicidade: (body.periodicidade as string) || 'MENSAL',
        dataContratacao: body.dataContratacao ? new Date(body.dataContratacao as string) : new Date(),
        dataVencimentoFinal: body.dataVencimentoFinal ? new Date(body.dataVencimentoFinal as string) : new Date(),
        saldoDevedor: valorPrincipal || 0,
        contratoReferencia: body.contratoReferencia as string | undefined,
        centroCustoId: body.centroCustoId as number | undefined,
        status: 'ATIVO',
      },
    });
  }

  static async update(empresaId: number, id: number, body: Record<string, unknown>) {
    const existing = await prisma.emprestimo.findFirst({ where: { id, empresaId } });
    if (!existing) throw new AppError(404, 'Empréstimo não encontrado');

    const updateData: Record<string, unknown> = { ...body };
    if (body.dataContratacao) updateData.dataContratacao = new Date(body.dataContratacao as string);
    if (body.dataVencimentoFinal) updateData.dataVencimentoFinal = new Date(body.dataVencimentoFinal as string);
    delete updateData.empresaId;
    delete updateData.saldoDevedor;

    return prisma.emprestimo.update({ where: { id }, data: updateData });
  }

  static async gerarParcelas(empresaId: number, id: number) {
    const emprestimo = await prisma.emprestimo.findFirst({ where: { id, empresaId } });
    if (!emprestimo) throw new AppError(404, 'Empréstimo não encontrado');

    const n = emprestimo.numeroParcelas || 12;
    const valorTotal = Number(emprestimo.valorPrincipal || 0);
    const taxaMensal = Number(emprestimo.taxaJuros || 0) / 100;
    const dataBase = addMonths(emprestimo.dataContratacao || new Date(), 1);
    const tipo = emprestimo.sistemaAmortizacao || 'PRICE';

    await prisma.parcelaEmprestimo.deleteMany({ where: { emprestimoId: id } });

    const parcelas = [];

    if (tipo === 'PRICE') {
      const pmt = taxaMensal > 0
        ? valorTotal * (taxaMensal * Math.pow(1 + taxaMensal, n)) / (Math.pow(1 + taxaMensal, n) - 1)
        : valorTotal / n;

      let saldo = valorTotal;
      for (let i = 0; i < n; i++) {
        const juros = saldo * taxaMensal;
        const amortizacao = pmt - juros;
        saldo -= amortizacao;

        parcelas.push({
          emprestimoId: id,
          numero: i + 1,
          valorParcela: Number(pmt.toFixed(2)),
          valorAmortizacao: Number(amortizacao.toFixed(2)),
          valorJuros: Number(juros.toFixed(2)),
          saldoDevedor: Number(Math.max(0, saldo).toFixed(2)),
          dataVencimento: addMonths(dataBase, i),
          status: 'PENDENTE',
        });
      }
    } else {
      const amortizacaoFixa = valorTotal / n;
      let saldo = valorTotal;

      for (let i = 0; i < n; i++) {
        const juros = saldo * taxaMensal;
        const prestacao = amortizacaoFixa + juros;
        saldo -= amortizacaoFixa;

        parcelas.push({
          emprestimoId: id,
          numero: i + 1,
          valorParcela: Number(prestacao.toFixed(2)),
          valorAmortizacao: Number(amortizacaoFixa.toFixed(2)),
          valorJuros: Number(juros.toFixed(2)),
          saldoDevedor: Number(Math.max(0, saldo).toFixed(2)),
          dataVencimento: addMonths(dataBase, i),
          status: 'PENDENTE',
        });
      }
    }

    const created = await prisma.$transaction(
      parcelas.map((p) => prisma.parcelaEmprestimo.create({ data: p })),
    );

    return created;
  }

  static async baixarParcela(empresaId: number, id: number, parcelaId: number) {
    const emprestimo = await prisma.emprestimo.findFirst({ where: { id, empresaId } });
    if (!emprestimo) throw new AppError(404, 'Empréstimo não encontrado');

    const parcela = await prisma.parcelaEmprestimo.findFirst({
      where: { id: parcelaId, emprestimoId: id },
    });
    if (!parcela) throw new AppError(404, 'Parcela não encontrada');
    if (parcela.status === 'PAGO') throw new AppError(400, 'Parcela já foi paga');

    const novoSaldo = Number(emprestimo.saldoDevedor || 0) - Number(parcela.valorAmortizacao || 0);

    await prisma.$transaction([
      prisma.parcelaEmprestimo.update({
        where: { id: parcelaId },
        data: { status: 'PAGO', dataPagamento: new Date() },
      }),
      prisma.emprestimo.update({
        where: { id },
        data: { saldoDevedor: Math.max(0, novoSaldo) },
      }),
    ]);

    return { parcelaId, novoSaldoDevedor: Math.max(0, novoSaldo) };
  }

  static async liquidarAntecipado(empresaId: number, id: number, body: Record<string, unknown>) {
    const emprestimo = await prisma.emprestimo.findFirst({
      where: { id, empresaId },
      include: { parcelas: { where: { status: 'PENDENTE' }, orderBy: { numero: 'asc' } } },
    });
    if (!emprestimo) throw new AppError(404, 'Empréstimo não encontrado');

    const percentualDesconto = (body.percentualDesconto as number) || 0;
    const saldoAtual = Number(emprestimo.saldoDevedor);
    const desconto = Number((saldoAtual * percentualDesconto / 100).toFixed(2));
    const valorLiquidacao = Number((saldoAtual - desconto).toFixed(2));

    await prisma.$transaction([
      ...emprestimo.parcelas.map((p) =>
        prisma.parcelaEmprestimo.update({
          where: { id: p.id },
          data: { status: 'LIQUIDADO', dataPagamento: new Date() },
        }),
      ),
      prisma.emprestimo.update({
        where: { id },
        data: {
          saldoDevedor: 0,
          status: 'LIQUIDADO',
        },
      }),
    ]);

    return {
      saldoAnterior: saldoAtual,
      desconto,
      valorLiquidacao,
      parcelasLiquidadas: emprestimo.parcelas.length,
    };
  }

  static async delete(empresaId: number, id: number) {
    const emprestimo = await prisma.emprestimo.findFirst({ where: { id, empresaId } });
    if (!emprestimo) throw new AppError(404, 'Empréstimo não encontrado');
    await prisma.emprestimo.delete({ where: { id } });
  }

  static async getPainel(empresaId: number) {
    const [ativos, totalDivida, proximasParcelas] = await Promise.all([
      prisma.emprestimo.count({ where: { empresaId, status: 'ATIVO' } }),
      prisma.emprestimo.aggregate({
        where: { empresaId, status: 'ATIVO' },
        _sum: { saldoDevedor: true },
      }),
      prisma.parcelaEmprestimo.findMany({
        where: {
          emprestimo: { empresaId, status: 'ATIVO' },
          status: 'PENDENTE',
        },
        include: {
          emprestimo: { select: { id: true, credorDevedor: true, contratoReferencia: true } },
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
