import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import { logger } from '../../config/logger';

interface OFXTransaction {
  tipo: string;
  data: Date;
  valor: number;
  descricao: string;
  fitId: string;
}

function parseOFX(content: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];

    const getTag = (tag: string): string => {
      const tagMatch = new RegExp(`<${tag}>([^<\\n]+)`, 'i').exec(block);
      return tagMatch ? tagMatch[1].trim() : '';
    };

    const dtPosted = getTag('DTPOSTED');
    const year = parseInt(dtPosted.substring(0, 4));
    const month = parseInt(dtPosted.substring(4, 6)) - 1;
    const day = parseInt(dtPosted.substring(6, 8));

    transactions.push({
      tipo: getTag('TRNTYPE'),
      data: new Date(year, month, day),
      valor: parseFloat(getTag('TRNAMT')),
      descricao: getTag('MEMO') || getTag('NAME'),
      fitId: getTag('FITID'),
    });
  }

  return transactions;
}

function parseCSV(content: string): OFXTransaction[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const separator = header.includes(';') ? ';' : ',';

  return lines.slice(1).map((line, index) => {
    const cols = line.split(separator).map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      tipo: Number(cols[2]) >= 0 ? 'CREDIT' : 'DEBIT',
      data: new Date(cols[0]),
      valor: parseFloat(cols[2]?.replace(',', '.') || '0'),
      descricao: cols[1] || '',
      fitId: `CSV-${index}`,
    };
  });
}

export class ConciliacaoService {
  static async list(empresaId: number, pagination: PaginationOptions) {
    const where = { empresaId };

    const [data, total] = await Promise.all([
      prisma.conciliacaoBancaria.findMany({
        where,
        include: {
          contaBancaria: { select: { id: true, nomeBanco: true, banco: true } },
          _count: { select: { itens: true } },
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.conciliacaoBancaria.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const conciliacao = await prisma.conciliacaoBancaria.findFirst({
      where: { id, empresaId },
      include: {
        contaBancaria: true,
        itens: {
          orderBy: { data: 'asc' },
          include: {
            contaPagar: { select: { id: true, descricao: true, valor: true } },
            contaReceber: { select: { id: true, descricao: true, valor: true } },
          },
        },
      },
    });

    if (!conciliacao) throw new AppError(404, 'Conciliação não encontrada');
    return conciliacao;
  }

  static async importar(
    file: { filename: string; path: string; originalname: string },
    contaBancariaId: number,
    empresaId: number,
  ) {
    const fs = await import('fs');
    const content = fs.readFileSync(file.path, 'utf-8');
    const isOFX = file.originalname.toLowerCase().endsWith('.ofx');

    const transactions = isOFX ? parseOFX(content) : parseCSV(content);

    if (transactions.length === 0) {
      throw new AppError(400, 'Nenhuma transação encontrada no arquivo');
    }

    const conciliacao = await prisma.conciliacaoBancaria.create({
      data: {
        empresaId,
        contaBancariaId,
        arquivo: file.originalname,
        formato: isOFX ? 'OFX' : 'CSV',
        dataImportacao: new Date(),
        totalItens: transactions.length,
        itensConciliados: 0,
        status: 'PENDENTE',
      },
    });

    const itens = await prisma.$transaction(
      transactions.map((t) =>
        prisma.conciliacaoItem.create({
          data: {
            conciliacaoId: conciliacao.id,
            data: t.data,
            valor: t.valor,
            descricao: t.descricao,
            tipo: t.valor >= 0 ? 'CREDITO' : 'DEBITO',
            conciliado: false,
          },
        }),
      ),
    );

    return { conciliacao, totalImportados: itens.length };
  }

  static async conciliarItem(
    empresaId: number,
    itemId: number,
    body: { contaPagarId?: number; contaReceberId?: number },
  ) {
    const item = await prisma.conciliacaoItem.findFirst({
      where: { id: itemId },
      include: { conciliacao: true },
    });
    if (!item) throw new AppError(404, 'Item de conciliação não encontrado');
    if (item.conciliacao.empresaId !== empresaId) throw new AppError(403, 'Sem permissão');

    const updateData: Record<string, unknown> = { conciliado: true, conciliadoEm: new Date() };
    if (body.contaPagarId) updateData.contaPagarId = body.contaPagarId;
    if (body.contaReceberId) updateData.contaReceberId = body.contaReceberId;

    await prisma.conciliacaoItem.update({ where: { id: itemId }, data: updateData });

    const conciliadosCount = await prisma.conciliacaoItem.count({
      where: { conciliacaoId: item.conciliacaoId, conciliado: true },
    });

    await prisma.conciliacaoBancaria.update({
      where: { id: item.conciliacaoId },
      data: { itensConciliados: conciliadosCount },
    });

    return { itemId, status: 'CONCILIADO' };
  }

  static async autoConciliar(empresaId: number, conciliacaoId: number) {
    const conciliacao = await prisma.conciliacaoBancaria.findFirst({
      where: { id: conciliacaoId, empresaId },
      include: { itens: { where: { conciliado: false } } },
    });
    if (!conciliacao) throw new AppError(404, 'Conciliação não encontrada');

    let matched = 0;

    for (const item of conciliacao.itens) {
      const valorAbs = Math.abs(Number(item.valor));
      const toleranciaDias = 3;

      if (Number(item.valor) < 0) {
        const cp = await prisma.contaPagar.findFirst({
          where: {
            empresaId,
            status: 'PAGO',
            valorPago: { gte: valorAbs - 0.01, lte: valorAbs + 0.01 },
            dataPagamento: {
              gte: new Date(item.data.getTime() - toleranciaDias * 86400000),
              lte: new Date(item.data.getTime() + toleranciaDias * 86400000),
            },
          },
        });

        if (cp) {
          await prisma.conciliacaoItem.update({
            where: { id: item.id },
            data: { contaPagarId: cp.id, conciliado: true, conciliadoEm: new Date() },
          });
          matched++;
        }
      } else {
        const cr = await prisma.contaReceber.findFirst({
          where: {
            empresaId,
            status: 'RECEBIDO',
            valorRecebido: { gte: valorAbs - 0.01, lte: valorAbs + 0.01 },
            dataRecebimento: {
              gte: new Date(item.data.getTime() - toleranciaDias * 86400000),
              lte: new Date(item.data.getTime() + toleranciaDias * 86400000),
            },
          },
        });

        if (cr) {
          await prisma.conciliacaoItem.update({
            where: { id: item.id },
            data: { contaReceberId: cr.id, conciliado: true, conciliadoEm: new Date() },
          });
          matched++;
        }
      }
    }

    const conciliadosCount = await prisma.conciliacaoItem.count({
      where: { conciliacaoId, conciliado: true },
    });

    await prisma.conciliacaoBancaria.update({
      where: { id: conciliacaoId },
      data: { itensConciliados: conciliadosCount },
    });

    return {
      totalItens: conciliacao.itens.length,
      conciliados: matched,
      pendentes: conciliacao.itens.length - matched,
    };
  }

  static async getPendentes(empresaId: number, conciliacaoId: number) {
    const conciliacao = await prisma.conciliacaoBancaria.findFirst({
      where: { id: conciliacaoId, empresaId },
    });
    if (!conciliacao) throw new AppError(404, 'Conciliação não encontrada');

    return prisma.conciliacaoItem.findMany({
      where: { conciliacaoId, conciliado: false },
      orderBy: { data: 'asc' },
    });
  }
}
