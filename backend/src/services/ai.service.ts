import { prisma } from '../config/database';
import { env } from '../config/env';
import axios from 'axios';

export class AIService {
  private static async callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
    if (!env.OPENAI_API_KEY) {
      return '';
    }
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }, {
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    });
    return response.data.choices[0].message.content;
  }

  static async analyzeCliente(empresaId: number, clienteId: number) {
    const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, empresaId } });
    if (!cliente) throw new Error('Cliente não encontrado');

    const contasReceber = await prisma.contaReceber.findMany({
      where: { empresaId, clienteId },
      orderBy: { dataVencimento: 'desc' },
      take: 100,
    });

    const hoje = new Date();
    const totalFaturado = contasReceber.filter(cr => cr.status !== 'CANCELADO').reduce((s, cr) => s + Number(cr.valor), 0);
    const totalRecebido = contasReceber.filter(cr => cr.status === 'RECEBIDO').reduce((s, cr) => s + Number(cr.valorRecebido ?? cr.valor), 0);
    const totalAberto = contasReceber.filter(cr => cr.status === 'PENDENTE').reduce((s, cr) => s + Number(cr.valor), 0);
    const atrasados = contasReceber.filter(cr => cr.status === 'PENDENTE' && cr.dataVencimento < hoje);
    const totalAtrasado = atrasados.reduce((s, cr) => s + Number(cr.valor), 0);

    const pagos = contasReceber.filter(cr => cr.dataRecebimento && cr.dataVencimento);
    const diasPagamento = pagos.map(cr => {
      const diff = (cr.dataRecebimento!.getTime() - cr.dataVencimento.getTime()) / (1000 * 60 * 60 * 24);
      return Math.round(diff);
    });
    const mediaDias = diasPagamento.length > 0 ? diasPagamento.reduce((a, b) => a + b, 0) / diasPagamento.length : 0;

    const data = {
      totalTransacoes: contasReceber.length,
      totalFaturado,
      totalRecebido,
      totalAberto,
      totalAtrasado,
      contasAtrasadas: atrasados.length,
      mediaDiasPagamento: Math.round(mediaDias),
      inadimplencia: totalFaturado > 0 ? Number(((totalAtrasado / totalFaturado) * 100).toFixed(1)) : 0,
    };

    const aiText = await this.callOpenAI(
      `Analise o perfil financeiro deste cliente:\n${JSON.stringify(data, null, 2)}\n\nGere um JSON com: { score (0-100, risco de inadimplência), comportamento (string), limiteCreditoSugerido (number), previsaoChurn (string), acoes (array of strings) }`,
      'Você é um analista financeiro. Responda APENAS com JSON válido, sem markdown.'
    );

    if (aiText) {
      try {
        const parsed = JSON.parse(aiText);
        return { ...data, analiseIA: parsed, fonte: 'ai' };
      } catch { /* fallback */ }
    }

    const score = Math.max(0, Math.min(100,
      100 - data.inadimplencia * 2 - Math.max(0, data.mediaDiasPagamento - 5) * 2 - data.contasAtrasadas * 5
    ));

    const comportamento = mediaDias <= 0 ? 'Pagamento antecipado/pontual' :
      mediaDias <= 5 ? 'Pagamento pontual com pequena variação' :
      mediaDias <= 15 ? 'Atraso moderado (média ' + Math.round(mediaDias) + ' dias)' :
      'Atraso frequente (média ' + Math.round(mediaDias) + ' dias)';

    const acoes: string[] = [];
    if (data.contasAtrasadas > 0) acoes.push(`Cobrar ${data.contasAtrasadas} faturas em atraso (R$ ${totalAtrasado.toFixed(2)})`);
    if (score < 50) acoes.push('Exigir pagamento antecipado para novos pedidos');
    if (score >= 70) acoes.push('Cliente elegível para aumento de crédito');
    if (data.totalFaturado > 50000 && score >= 60) acoes.push('Oferecer desconto para pagamento à vista');

    return {
      ...data,
      analiseIA: {
        score: Math.round(score),
        comportamento,
        limiteCreditoSugerido: Math.round(totalFaturado * 0.3 * (score / 100)),
        previsaoChurn: data.totalTransacoes < 3 ? 'Risco alto - cliente novo' : score > 70 ? 'Baixo risco' : 'Monitorar',
        acoes,
      },
      fonte: 'regras',
    };
  }

  static async analyzeFornecedor(empresaId: number, fornecedorId: number) {
    const fornecedor = await prisma.fornecedor.findFirst({ where: { id: fornecedorId, empresaId } });
    if (!fornecedor) throw new Error('Fornecedor não encontrado');

    const contasPagar = await prisma.contaPagar.findMany({
      where: { empresaId, fornecedorId },
      orderBy: { dataVencimento: 'desc' },
      take: 100,
      include: { categoria: { select: { nome: true } } },
    });

    const totalComprado = contasPagar.filter(cp => cp.status !== 'CANCELADO').reduce((s, cp) => s + Number(cp.valor), 0);
    const totalPago = contasPagar.filter(cp => cp.status === 'PAGO').reduce((s, cp) => s + Number(cp.valorPago ?? cp.valor), 0);
    const totalAberto = contasPagar.filter(cp => cp.status === 'PENDENTE').reduce((s, cp) => s + Number(cp.valor), 0);

    const totalGeralCP = await prisma.contaPagar.aggregate({
      where: { empresaId, status: { not: 'CANCELADO' } },
      _sum: { valor: true },
    });
    const dependencia = Number(totalGeralCP._sum.valor ?? 0) > 0
      ? Number(((totalComprado / Number(totalGeralCP._sum.valor!)) * 100).toFixed(1)) : 0;

    const categorias: Record<string, number> = {};
    contasPagar.forEach(cp => {
      const cat = cp.categoria?.nome || 'Sem categoria';
      categorias[cat] = (categorias[cat] || 0) + Number(cp.valor);
    });

    const data = {
      totalTransacoes: contasPagar.length,
      totalComprado,
      totalPago,
      totalAberto,
      dependencia,
      categoriasPrincipais: Object.entries(categorias).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };

    const aiText = await this.callOpenAI(
      `Analise o perfil deste fornecedor:\n${JSON.stringify(data, null, 2)}\n\nGere JSON com: { confiabilidade (string), analisePreco (string), nivelDependencia (string), sugestaoRenegociacao (string), acoes (array of strings) }`,
      'Você é um analista de compras. Responda APENAS com JSON válido, sem markdown.'
    );

    if (aiText) {
      try {
        const parsed = JSON.parse(aiText);
        return { ...data, analiseIA: parsed, fonte: 'ai' };
      } catch { /* fallback */ }
    }

    const confiabilidade = data.totalTransacoes > 10 ? 'Alta (histórico consistente)' :
      data.totalTransacoes > 3 ? 'Moderada' : 'Baixa (poucas transações)';
    const nivelDependencia = dependencia > 30 ? 'ALTO - Diversificar fornecedores' :
      dependencia > 15 ? 'Moderado' : 'Baixo';

    const acoes: string[] = [];
    if (dependencia > 30) acoes.push('Buscar fornecedores alternativos para reduzir dependência');
    if (totalComprado > 10000) acoes.push('Negociar desconto por volume');
    if (data.totalAberto > 0) acoes.push(`Agendar pagamento de R$ ${totalAberto.toFixed(2)} em aberto`);

    return {
      ...data,
      analiseIA: {
        confiabilidade,
        analisePreco: 'Sem dados suficientes para análise de variação de preço',
        nivelDependencia,
        sugestaoRenegociacao: totalComprado > 50000 ? 'Negociar melhores condições (volume alto)' : 'Manter condições atuais',
        acoes,
      },
      fonte: 'regras',
    };
  }

  static async getDashboardInsights(empresaId: number) {
    const hoje = new Date();
    const em7dias = new Date(hoje);
    em7dias.setDate(em7dias.getDate() + 7);

    const [cpProximos, crProximos, cpAtrasados, crAtrasados] = await Promise.all([
      prisma.contaPagar.aggregate({
        where: { empresaId, status: 'PENDENTE', dataVencimento: { gte: hoje, lte: em7dias } },
        _sum: { valor: true }, _count: true,
      }),
      prisma.contaReceber.aggregate({
        where: { empresaId, status: 'PENDENTE', dataVencimento: { gte: hoje, lte: em7dias } },
        _sum: { valor: true }, _count: true,
      }),
      prisma.contaPagar.aggregate({
        where: { empresaId, status: 'PENDENTE', dataVencimento: { lt: hoje } },
        _sum: { valor: true }, _count: true,
      }),
      prisma.contaReceber.aggregate({
        where: { empresaId, status: 'PENDENTE', dataVencimento: { lt: hoje } },
        _sum: { valor: true }, _count: true,
      }),
    ]);

    const insights: Array<{ tipo: string; prioridade: string; mensagem: string }> = [];

    const totalPagar7d = Number(cpProximos._sum.valor ?? 0);
    const totalReceber7d = Number(crProximos._sum.valor ?? 0);
    if (totalPagar7d > totalReceber7d && totalPagar7d > 0) {
      insights.push({
        tipo: 'alerta',
        prioridade: 'alta',
        mensagem: `Nos próximos 7 dias: R$ ${totalPagar7d.toFixed(2)} a pagar vs R$ ${totalReceber7d.toFixed(2)} a receber. Gap de R$ ${(totalPagar7d - totalReceber7d).toFixed(2)}.`,
      });
    }

    if (cpAtrasados._count > 0) {
      insights.push({
        tipo: 'critico',
        prioridade: 'urgente',
        mensagem: `${cpAtrasados._count} contas a pagar em atraso totalizando R$ ${Number(cpAtrasados._sum.valor ?? 0).toFixed(2)}.`,
      });
    }

    if (crAtrasados._count > 0) {
      insights.push({
        tipo: 'cobranca',
        prioridade: 'alta',
        mensagem: `${crAtrasados._count} contas a receber vencidas. Cobrar R$ ${Number(crAtrasados._sum.valor ?? 0).toFixed(2)}.`,
      });
    }

    if (totalReceber7d > totalPagar7d * 1.5) {
      insights.push({
        tipo: 'positivo',
        prioridade: 'info',
        mensagem: `Fluxo positivo previsto: recebimentos excedem pagamentos em R$ ${(totalReceber7d - totalPagar7d).toFixed(2)} nos próximos 7 dias.`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        tipo: 'info',
        prioridade: 'info',
        mensagem: 'Situação financeira estável. Sem alertas no momento.',
      });
    }

    return { insights, geradoEm: new Date().toISOString() };
  }
}
