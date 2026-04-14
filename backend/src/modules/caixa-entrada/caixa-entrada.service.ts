import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import { logger } from '../../config/logger';

export class CaixaEntradaService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.origem) where.origem = filters.origem;
    if (filters.usuarioId) where.usuarioId = filters.usuarioId;

    if (filters.dataInicio || filters.dataFim) {
      const criadoEm: Record<string, Date> = {};
      if (filters.dataInicio) criadoEm.gte = new Date(filters.dataInicio as string);
      if (filters.dataFim) criadoEm.lte = new Date(filters.dataFim as string);
      where.criadoEm = criadoEm;
    }

    if (pagination.search) {
      where.OR = [
        { descricao: { contains: pagination.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.preLancamento.findMany({
        where,
        include: {
          usuario: { select: { id: true, nome: true } },
          comprovante: true,
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.preLancamento.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const preLancamento = await prisma.preLancamento.findFirst({
      where: { id, empresaId },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        comprovante: true,
      },
    });

    if (!preLancamento) throw new AppError(404, 'Pré-lançamento não encontrado');
    return preLancamento;
  }

  static async upload(
    file: { filename: string; path: string; mimetype: string; size: number },
    userId: number,
    empresaId: number,
    origem: string,
  ) {
    const comprovante = await prisma.comprovante.create({
      data: {
        nomeOriginal: file.filename,
        pathStorage: file.path,
        mimeType: file.mimetype,
        tamanho: file.size,
        dataRecebimento: new Date(),
      },
    });

    const preLancamento = await prisma.preLancamento.create({
      data: {
        empresaId,
        usuarioId: userId,
        comprovanteId: comprovante.id,
        origem: origem || 'UPLOAD',
        status: 'PENDENTE_OCR',
      },
    });

    logger.info(`OCR enqueued for comprovante ${comprovante.id}, preLancamento ${preLancamento.id}`);

    return { comprovante, preLancamento };
  }

  static async classificar(empresaId: number, id: number, dados: Record<string, unknown>) {
    const preLancamento = await prisma.preLancamento.findFirst({ where: { id, empresaId } });
    if (!preLancamento) throw new AppError(404, 'Pré-lançamento não encontrado');

    return prisma.preLancamento.update({
      where: { id },
      data: {
        descricao: dados.descricao as string | undefined,
        valor: dados.valor as number | undefined,
        dataDocumento: dados.dataDocumento ? new Date(dados.dataDocumento as string) : undefined,
        categoriaId: dados.categoriaId as number | undefined,
        centroCustoId: dados.centroCustoId as number | undefined,
        clienteId: dados.clienteId as number | undefined,
        status: 'CLASSIFICADO',
      },
    });
  }

  static async aprovar(empresaId: number, id: number, aprovadorId: number) {
    const preLancamento = await prisma.preLancamento.findFirst({
      where: { id, empresaId },
    });
    if (!preLancamento) throw new AppError(404, 'Pré-lançamento não encontrado');

    if (!['CLASSIFICADO', 'PENDENTE_APROVACAO'].includes(preLancamento.status)) {
      throw new AppError(400, 'Pré-lançamento precisa estar classificado para aprovação');
    }

    if (!preLancamento.descricao || preLancamento.valor == null) {
      throw new AppError(400, 'Pré-lançamento precisa ter descrição e valor para gerar conta a pagar');
    }

    const cp = await prisma.contaPagar.create({
      data: {
        empresaId,
        criadorId: aprovadorId,
        descricao: preLancamento.descricao,
        valor: preLancamento.valor,
        dataVencimento: preLancamento.dataDocumento || new Date(),
        dataEmissao: new Date(),
        categoriaId: preLancamento.categoriaId || undefined,
        centroCustoId: preLancamento.centroCustoId || undefined,
        status: 'PENDENTE',
      },
    });

    await prisma.preLancamento.update({
      where: { id },
      data: {
        status: 'APROVADO',
        aprovadoPor: aprovadorId,
        aprovadoEm: new Date(),
      },
    });

    return { preLancamentoId: id, contaPagarId: cp.id };
  }

  static async rejeitar(empresaId: number, id: number, motivo: string) {
    const preLancamento = await prisma.preLancamento.findFirst({ where: { id, empresaId } });
    if (!preLancamento) throw new AppError(404, 'Pré-lançamento não encontrado');
    if (!motivo) throw new AppError(400, 'Motivo da rejeição é obrigatório');

    return prisma.preLancamento.update({
      where: { id },
      data: {
        status: 'REJEITADO',
        motivoRejeicao: motivo,
      },
    });
  }

  static async getDashboard(empresaId: number) {
    const [pendentes, classificados, aprovados, rejeitados, total] = await Promise.all([
      prisma.preLancamento.count({ where: { empresaId, status: { in: ['PENDENTE_OCR', 'PENDENTE_CLASSIFICACAO'] } } }),
      prisma.preLancamento.count({ where: { empresaId, status: 'CLASSIFICADO' } }),
      prisma.preLancamento.count({ where: { empresaId, status: 'APROVADO' } }),
      prisma.preLancamento.count({ where: { empresaId, status: 'REJEITADO' } }),
      prisma.preLancamento.count({ where: { empresaId } }),
    ]);

    const porOrigem = await prisma.preLancamento.groupBy({
      by: ['origem'],
      where: { empresaId },
      _count: true,
    });

    return {
      total,
      pendentes,
      classificados,
      aprovados,
      rejeitados,
      porOrigem: porOrigem.map((o) => ({ origem: o.origem, count: o._count })),
    };
  }
}
