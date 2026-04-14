import { prisma } from '../../config/database';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  format,
} from 'date-fns';

interface FluxoCaixaParams {
  periodo: 'diario' | 'semanal' | 'mensal';
  dataInicio: string;
  dataFim: string;
  empresaIds: number[];
}

interface FluxoCaixaItem {
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

function getDateRanges(
  periodo: string,
  dataInicio: Date,
  dataFim: Date,
): { inicio: Date; fim: Date; label: string }[] {
  const ranges: { inicio: Date; fim: Date; label: string }[] = [];
  let current = dataInicio;

  while (current <= dataFim) {
    let inicio: Date;
    let fim: Date;
    let label: string;

    switch (periodo) {
      case 'semanal':
        inicio = startOfWeek(current, { weekStartsOn: 1 });
        fim = endOfWeek(current, { weekStartsOn: 1 });
        label = format(inicio, 'yyyy-MM-dd');
        current = addWeeks(current, 1);
        break;
      case 'mensal':
        inicio = startOfMonth(current);
        fim = endOfMonth(current);
        label = format(inicio, 'yyyy-MM');
        current = addMonths(current, 1);
        break;
      default:
        inicio = startOfDay(current);
        fim = endOfDay(current);
        label = format(current, 'yyyy-MM-dd');
        current = addDays(current, 1);
        break;
    }

    if (fim > dataFim) fim = endOfDay(dataFim);
    ranges.push({ inicio, fim, label });
  }

  return ranges;
}

export class FluxoCaixaService {
  static async getFluxoCaixa(params: FluxoCaixaParams): Promise<FluxoCaixaItem[]> {
    const { periodo, dataInicio, dataFim, empresaIds } = params;
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const ranges = getDateRanges(periodo, inicio, fim);

    const empresaFilter = empresaIds.length > 0 ? { empresaId: { in: empresaIds } } : {};

    const result: FluxoCaixaItem[] = [];

    for (const range of ranges) {
      const [entradas, saidas] = await Promise.all([
        prisma.contaReceber.aggregate({
          where: {
            ...empresaFilter,
            status: 'RECEBIDO',
            dataRecebimento: { gte: range.inicio, lte: range.fim },
          },
          _sum: { valorRecebido: true },
        }),
        prisma.contaPagar.aggregate({
          where: {
            ...empresaFilter,
            status: 'PAGO',
            dataPagamento: { gte: range.inicio, lte: range.fim },
          },
          _sum: { valorPago: true },
        }),
      ]);

      const entradasVal = Number(entradas._sum.valorRecebido ?? 0);
      const saidasVal = Number(saidas._sum.valorPago ?? 0);

      result.push({
        data: range.label,
        entradas: entradasVal,
        saidas: saidasVal,
        saldo: Number((entradasVal - saidasVal).toFixed(2)),
      });
    }

    return result;
  }

  static async getProjecao(params: FluxoCaixaParams & { cenario: string }): Promise<FluxoCaixaItem[]> {
    const fluxo = await this.getFluxoCaixa(params);

    const ajuste = params.cenario === 'pessimista' ? -0.20
      : params.cenario === 'otimista' ? 0.15
      : 0;

    return fluxo.map((item) => {
      const entradas = Number((item.entradas * (1 + ajuste)).toFixed(2));
      const saidas = Number((item.saidas * (1 - ajuste)).toFixed(2));
      return {
        data: item.data,
        entradas,
        saidas,
        saldo: Number((entradas - saidas).toFixed(2)),
      };
    });
  }
}
