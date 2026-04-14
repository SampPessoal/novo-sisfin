import { prisma } from '../../config/database';

interface DREParams {
  empresaId: number;
  periodo: 'mes' | 'trimestre' | 'ano';
  dataInicio: string;
  dataFim: string;
}

interface DRELine {
  grupo: string;
  valor: number;
}

interface DREResult {
  periodo: { inicio: string; fim: string };
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
  resultadoFinanceiro: number;
  resultadoAntesIR: number;
  provisaoIRCSLL: number;
  lucroLiquido: number;
  detalhamento: DRELine[];
}

async function sumByGrupoDRE(
  empresaId: number,
  dataInicio: Date,
  dataFim: Date,
  tipo: 'RECEITA' | 'DESPESA',
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  if (tipo === 'RECEITA') {
    const receitas = await prisma.contaReceber.findMany({
      where: {
        empresaId,
        status: 'RECEBIDO',
        dataRecebimento: { gte: dataInicio, lte: dataFim },
        categoria: { isNot: null },
      },
      select: {
        valorRecebido: true,
        categoria: { select: { grupoDRE: true } },
      },
    });

    for (const r of receitas) {
      const grupo = r.categoria?.grupoDRE || 'RECEITA_BRUTA';
      result[grupo] = (result[grupo] || 0) + Number(r.valorRecebido ?? 0);
    }
  } else {
    const despesas = await prisma.contaPagar.findMany({
      where: {
        empresaId,
        status: 'PAGO',
        dataPagamento: { gte: dataInicio, lte: dataFim },
        categoria: { isNot: null },
      },
      select: {
        valorPago: true,
        categoria: { select: { grupoDRE: true } },
      },
    });

    for (const d of despesas) {
      const grupo = d.categoria?.grupoDRE || 'DESPESAS_OPERACIONAIS';
      result[grupo] = (result[grupo] || 0) + Number(d.valorPago ?? 0);
    }
  }

  return result;
}

function buildDRE(
  receitas: Record<string, number>,
  despesas: Record<string, number>,
  inicio: string,
  fim: string,
): DREResult {
  const receitaBruta = receitas['RECEITA_BRUTA'] || 0;
  const deducoes = receitas['DEDUCOES'] || 0;
  const receitaLiquida = receitaBruta - deducoes;
  const custos = despesas['CUSTOS'] || 0;
  const lucroBruto = receitaLiquida - custos;
  const despesasOperacionais = despesas['DESPESAS_OPERACIONAIS'] || 0;
  const resultadoOperacional = lucroBruto - despesasOperacionais;
  const receitasFinanceiras = receitas['RESULTADO_FINANCEIRO'] || 0;
  const despesasFinanceiras = despesas['RESULTADO_FINANCEIRO'] || 0;
  const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;
  const resultadoAntesIR = resultadoOperacional + resultadoFinanceiro;
  const provisaoIRCSLL = despesas['PROVISAO_IR_CSLL'] || 0;
  const lucroLiquido = resultadoAntesIR - provisaoIRCSLL;

  const detalhamento: DRELine[] = [];
  for (const [grupo, valor] of Object.entries(receitas)) {
    detalhamento.push({ grupo, valor: Number(valor.toFixed(2)) });
  }
  for (const [grupo, valor] of Object.entries(despesas)) {
    detalhamento.push({ grupo, valor: Number((-valor).toFixed(2)) });
  }

  return {
    periodo: { inicio, fim },
    receitaBruta: Number(receitaBruta.toFixed(2)),
    deducoes: Number(deducoes.toFixed(2)),
    receitaLiquida: Number(receitaLiquida.toFixed(2)),
    custos: Number(custos.toFixed(2)),
    lucroBruto: Number(lucroBruto.toFixed(2)),
    despesasOperacionais: Number(despesasOperacionais.toFixed(2)),
    resultadoOperacional: Number(resultadoOperacional.toFixed(2)),
    resultadoFinanceiro: Number(resultadoFinanceiro.toFixed(2)),
    resultadoAntesIR: Number(resultadoAntesIR.toFixed(2)),
    provisaoIRCSLL: Number(provisaoIRCSLL.toFixed(2)),
    lucroLiquido: Number(lucroLiquido.toFixed(2)),
    detalhamento,
  };
}

export class DREService {
  static async getDRE(params: DREParams): Promise<DREResult> {
    const { empresaId, dataInicio, dataFim } = params;
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    const [receitas, despesas] = await Promise.all([
      sumByGrupoDRE(empresaId, inicio, fim, 'RECEITA'),
      sumByGrupoDRE(empresaId, inicio, fim, 'DESPESA'),
    ]);

    return buildDRE(receitas, despesas, dataInicio, dataFim);
  }

  static async getComparativo(
    empresaId: number,
    periodo1Inicio: string,
    periodo1Fim: string,
    periodo2Inicio: string,
    periodo2Fim: string,
  ) {
    const [dre1, dre2] = await Promise.all([
      this.getDRE({ empresaId, periodo: 'mes', dataInicio: periodo1Inicio, dataFim: periodo1Fim }),
      this.getDRE({ empresaId, periodo: 'mes', dataInicio: periodo2Inicio, dataFim: periodo2Fim }),
    ]);

    const calcVariacao = (atual: number, anterior: number) =>
      anterior !== 0 ? Number((((atual - anterior) / Math.abs(anterior)) * 100).toFixed(2)) : null;

    return {
      periodo1: dre1,
      periodo2: dre2,
      variacao: {
        receitaBruta: calcVariacao(dre2.receitaBruta, dre1.receitaBruta),
        receitaLiquida: calcVariacao(dre2.receitaLiquida, dre1.receitaLiquida),
        lucroBruto: calcVariacao(dre2.lucroBruto, dre1.lucroBruto),
        resultadoOperacional: calcVariacao(dre2.resultadoOperacional, dre1.resultadoOperacional),
        lucroLiquido: calcVariacao(dre2.lucroLiquido, dre1.lucroLiquido),
      },
    };
  }
}
