import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';

export class ComissaoService {
  private static async getColaboradorIdsByEmpresa(empresaId: number): Promise<number[]> {
    const ues = await prisma.usuarioEmpresa.findMany({
      where: { empresaId },
      select: { usuarioId: true },
    });
    return ues.map((ue) => ue.usuarioId);
  }

  static async listRegras(empresaId: number, pagination: PaginationOptions) {
    const where = { empresaId };

    const [data, total] = await Promise.all([
      prisma.comissaoRegra.findMany({
        where,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.comissaoRegra.count({ where }),
    ]);

    return { data, total };
  }

  static async createRegra(empresaId: number, body: Record<string, unknown>) {
    if (!body.nome) throw new AppError(400, 'Nome é obrigatório');
    if (body.percentual == null) throw new AppError(400, 'Percentual é obrigatório');

    return prisma.comissaoRegra.create({
      data: {
        empresaId,
        nome: body.nome as string,
        percentual: body.percentual as number,
        tipo: (body.tipo as string) || 'PERCENTUAL',
        ativo: true,
      },
    });
  }

  static async updateRegra(empresaId: number, id: number, body: Record<string, unknown>) {
    const existing = await prisma.comissaoRegra.findFirst({ where: { id, empresaId } });
    if (!existing) throw new AppError(404, 'Regra de comissão não encontrada');

    const updateData: Record<string, unknown> = { ...body };
    delete updateData.empresaId;

    return prisma.comissaoRegra.update({ where: { id }, data: updateData });
  }

  static async listMetas(empresaId: number, pagination: PaginationOptions) {
    const colaboradorIds = await this.getColaboradorIdsByEmpresa(empresaId);
    const where = { colaboradorId: { in: colaboradorIds } };

    const [data, total] = await Promise.all([
      prisma.metaVendedor.findMany({
        where,
        include: {
          colaborador: { select: { id: true, nome: true } },
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.metaVendedor.count({ where }),
    ]);

    return { data, total };
  }

  static async createMeta(_empresaId: number, body: Record<string, unknown>) {
    if (!body.colaboradorId) throw new AppError(400, 'Colaborador é obrigatório');
    if (body.valorMeta == null) throw new AppError(400, 'Valor da meta é obrigatório');

    return prisma.metaVendedor.create({
      data: {
        colaboradorId: body.colaboradorId as number,
        valorMeta: body.valorMeta as number,
        periodo: body.periodo as string,
      },
    });
  }

  static async listComissoes(
    empresaId: number,
    pagination: PaginationOptions,
    filters: { colaboradorId?: number; periodo?: string },
  ) {
    const where: Record<string, unknown> = {};
    if (filters.colaboradorId) {
      where.colaboradorId = filters.colaboradorId;
    } else {
      const colaboradorIds = await this.getColaboradorIdsByEmpresa(empresaId);
      where.colaboradorId = { in: colaboradorIds };
    }
    if (filters.periodo) where.referencia = filters.periodo;

    const [data, total] = await Promise.all([
      prisma.comissao.findMany({
        where,
        include: {
          colaborador: { select: { id: true, nome: true } },
          regra: { select: { id: true, nome: true, percentual: true } },
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.comissao.count({ where }),
    ]);

    return { data, total };
  }

  static async getPainel(empresaId: number) {
    const colaboradorIds = await this.getColaboradorIdsByEmpresa(empresaId);

    const metas = await prisma.metaVendedor.findMany({
      where: { colaboradorId: { in: colaboradorIds } },
      include: {
        colaborador: { select: { id: true, nome: true } },
      },
    });

    const result = [];

    for (const meta of metas) {
      const realizado = await prisma.comissao.aggregate({
        where: {
          colaboradorId: meta.colaboradorId,
          referencia: meta.periodo,
        },
        _sum: { valor: true },
      });

      const valorRealizado = Number(realizado._sum?.valor ?? 0);
      const percentualAtingido = meta.valorMeta
        ? Number(((valorRealizado / Number(meta.valorMeta)) * 100).toFixed(2))
        : 0;

      result.push({
        meta,
        colaborador: meta.colaborador,
        valorMeta: Number(meta.valorMeta),
        valorRealizado,
        percentualAtingido,
        atingiuMeta: percentualAtingido >= 100,
      });
    }

    return result;
  }

  static async calcularComissoes(empresaId: number, body: Record<string, unknown>) {
    const referencia = body.periodo as string;
    const dataInicio = new Date(body.dataInicio as string);
    const dataFim = new Date(body.dataFim as string);

    if (!referencia) throw new AppError(400, 'Período é obrigatório');

    const regras = await prisma.comissaoRegra.findMany({
      where: { empresaId, ativo: true },
    });

    if (regras.length === 0) throw new AppError(400, 'Nenhuma regra de comissão ativa encontrada');

    const recebidos = await prisma.contaReceber.findMany({
      where: {
        empresaId,
        status: 'RECEBIDO',
        dataRecebimento: { gte: dataInicio, lte: dataFim },
      },
      select: {
        id: true,
        valorRecebido: true,
        criadorId: true,
      },
    });

    const comissoesCriadas = [];

    for (const cr of recebidos) {
      const regra = regras[0];
      if (!regra) continue;

      const valorBase = Number(cr.valorRecebido ?? 0);
      const valorComissao = Number(((valorBase * Number(regra.percentual)) / 100).toFixed(2));

      const comissao = await prisma.comissao.create({
        data: {
          colaboradorId: cr.criadorId,
          regraId: regra.id,
          referencia,
          valor: valorComissao,
          percentual: Number(regra.percentual),
          status: 'CALCULADA',
        },
      });

      comissoesCriadas.push(comissao);
    }

    return {
      totalCalculadas: comissoesCriadas.length,
      valorTotal: comissoesCriadas.reduce((sum, c) => sum + Number(c.valor), 0),
      comissoes: comissoesCriadas,
    };
  }
}
