import { prisma } from '../../config/database';
import { subMonths, startOfMonth, endOfMonth, format, addDays } from 'date-fns';

export class DashboardService {
  static async getSummary(empresaId: number) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = addDays(hoje, 1);

    const [totalPagar, totalReceber, atrasadosCP, atrasadosCR] = await Promise.all([
      prisma.contaPagar.aggregate({
        where: {
          empresaId,
          status: 'PENDENTE',
          dataVencimento: { gte: hoje, lt: amanha },
        },
        _sum: { valor: true },
      }),
      prisma.contaReceber.aggregate({
        where: {
          empresaId,
          status: 'PENDENTE',
          dataVencimento: { gte: hoje, lt: amanha },
        },
        _sum: { valor: true },
      }),
      prisma.contaPagar.count({
        where: {
          empresaId,
          status: 'PENDENTE',
          dataVencimento: { lt: hoje },
        },
      }),
      prisma.contaReceber.count({
        where: {
          empresaId,
          status: 'PENDENTE',
          dataVencimento: { lt: hoje },
        },
      }),
    ]);

    const totalPagarHoje = Number(totalPagar._sum.valor ?? 0);
    const totalReceberHoje = Number(totalReceber._sum.valor ?? 0);

    return {
      totalPagarHoje,
      totalReceberHoje,
      saldoProjetado: totalReceberHoje - totalPagarHoje,
      atrasados: atrasadosCP + atrasadosCR,
    };
  }

  static async getFluxoMensal(empresaId: number) {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const ref = subMonths(new Date(), i);
      const inicio = startOfMonth(ref);
      const fim = endOfMonth(ref);

      const [pagar, receber] = await Promise.all([
        prisma.contaPagar.aggregate({
          where: {
            empresaId,
            dataVencimento: { gte: inicio, lte: fim },
            status: { not: 'CANCELADO' },
          },
          _sum: { valor: true },
        }),
        prisma.contaReceber.aggregate({
          where: {
            empresaId,
            dataVencimento: { gte: inicio, lte: fim },
            status: { not: 'CANCELADO' },
          },
          _sum: { valor: true },
        }),
      ]);

      meses.push({
        mes: format(ref, 'MMM/yy'),
        pagar: Number(pagar._sum.valor ?? 0),
        receber: Number(receber._sum.valor ?? 0),
      });
    }
    return meses;
  }

  static async getDespesasCategoria(empresaId: number) {
    const inicio = startOfMonth(new Date());
    const fim = endOfMonth(new Date());

    const despesas = await prisma.contaPagar.groupBy({
      by: ['categoriaId'],
      where: {
        empresaId,
        dataVencimento: { gte: inicio, lte: fim },
        status: { not: 'CANCELADO' },
        categoriaId: { not: null },
      },
      _sum: { valor: true },
      orderBy: { _sum: { valor: 'desc' } },
      take: 7,
    });

    const categoriaIds = despesas.map((d) => d.categoriaId!).filter(Boolean);
    const categorias = await prisma.categoriaFinanceira.findMany({
      where: { id: { in: categoriaIds } },
      select: { id: true, nome: true },
    });
    const catMap = new Map(categorias.map((c) => [c.id, c.nome]));

    return despesas.map((d) => ({
      categoria: catMap.get(d.categoriaId!) ?? 'Sem categoria',
      valor: Number(d._sum.valor ?? 0),
    }));
  }

  static async getProximosVencimentos(empresaId: number) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = addDays(hoje, 15);

    const [cp, cr] = await Promise.all([
      prisma.contaPagar.findMany({
        where: {
          empresaId,
          status: 'PENDENTE',
          dataVencimento: { gte: hoje, lte: limite },
        },
        orderBy: { dataVencimento: 'asc' },
        take: 10,
        select: { id: true, descricao: true, valor: true, dataVencimento: true, status: true },
      }),
      prisma.contaReceber.findMany({
        where: {
          empresaId,
          status: 'PENDENTE',
          dataVencimento: { gte: hoje, lte: limite },
        },
        orderBy: { dataVencimento: 'asc' },
        take: 10,
        select: { id: true, descricao: true, valor: true, dataVencimento: true, status: true },
      }),
    ]);

    const items = [
      ...cp.map((c) => ({ ...c, tipo: 'CP', valor: Number(c.valor), dataVencimento: c.dataVencimento.toISOString() })),
      ...cr.map((c) => ({ ...c, tipo: 'CR', valor: Number(c.valor), dataVencimento: c.dataVencimento.toISOString() })),
    ].sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

    return items.slice(0, 10);
  }
}
