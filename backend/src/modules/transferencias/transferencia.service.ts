import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';

export class TransferenciaService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.dataInicio || filters.dataFim) {
      where.data = {
        ...(filters.dataInicio ? { gte: new Date(filters.dataInicio as string) } : {}),
        ...(filters.dataFim ? { lte: new Date(filters.dataFim as string) } : {}),
      };
    }

    if (pagination.search) {
      where.OR = [
        { descricao: { contains: pagination.search } },
        { contaOrigem: { nomeBanco: { contains: pagination.search } } },
        { contaDestino: { nomeBanco: { contains: pagination.search } } },
      ];
    }

    const include = {
      contaOrigem: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
      contaDestino: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
    };

    const [data, total] = await Promise.all([
      prisma.transferenciaBancaria.findMany({
        where,
        include,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.transferenciaBancaria.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const transferencia = await prisma.transferenciaBancaria.findFirst({
      where: { id, empresaId },
      include: {
        contaOrigem: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
        contaDestino: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
      },
    });

    if (!transferencia) throw new AppError(404, 'Transferência não encontrada');
    return transferencia;
  }

  static async create(empresaId: number, body: Record<string, unknown>) {
    const contaOrigemId = body.contaOrigemId as number;
    const contaDestinoId = body.contaDestinoId as number;
    const valor = body.valor as number;

    if (!contaOrigemId) throw new AppError(400, 'Conta de origem é obrigatória');
    if (!contaDestinoId) throw new AppError(400, 'Conta de destino é obrigatória');
    if (!valor || valor <= 0) throw new AppError(400, 'Valor deve ser maior que zero');
    if (contaOrigemId === contaDestinoId) throw new AppError(400, 'Conta de origem e destino devem ser diferentes');

    const [contaOrigem, contaDestino] = await Promise.all([
      prisma.contaBancaria.findFirst({ where: { id: contaOrigemId, empresaId } }),
      prisma.contaBancaria.findFirst({ where: { id: contaDestinoId, empresaId } }),
    ]);

    if (!contaOrigem) throw new AppError(404, 'Conta de origem não encontrada');
    if (!contaDestino) throw new AppError(404, 'Conta de destino não encontrada');

    return prisma.transferenciaBancaria.create({
      data: {
        empresaId,
        contaOrigemId,
        contaDestinoId,
        valor,
        data: body.data ? new Date(body.data as string) : new Date(),
        descricao: (body.descricao as string) || null,
        status: 'PENDENTE',
      },
      include: {
        contaOrigem: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
        contaDestino: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
      },
    });
  }

  static async confirmar(empresaId: number, id: number) {
    const transferencia = await prisma.transferenciaBancaria.findFirst({
      where: { id, empresaId },
    });

    if (!transferencia) throw new AppError(404, 'Transferência não encontrada');
    if (transferencia.status !== 'PENDENTE') throw new AppError(400, 'Apenas transferências pendentes podem ser confirmadas');

    return prisma.transferenciaBancaria.update({
      where: { id },
      data: { status: 'CONFIRMADA' },
      include: {
        contaOrigem: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
        contaDestino: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
      },
    });
  }

  static async cancelar(empresaId: number, id: number) {
    const transferencia = await prisma.transferenciaBancaria.findFirst({
      where: { id, empresaId },
    });

    if (!transferencia) throw new AppError(404, 'Transferência não encontrada');
    if (transferencia.status !== 'PENDENTE') throw new AppError(400, 'Apenas transferências pendentes podem ser canceladas');

    return prisma.transferenciaBancaria.update({
      where: { id },
      data: { status: 'CANCELADA' },
      include: {
        contaOrigem: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
        contaDestino: { select: { id: true, nomeBanco: true, agencia: true, conta: true } },
      },
    });
  }

  static async delete(empresaId: number, id: number) {
    const transferencia = await prisma.transferenciaBancaria.findFirst({
      where: { id, empresaId },
    });

    if (!transferencia) throw new AppError(404, 'Transferência não encontrada');
    if (transferencia.status !== 'PENDENTE') throw new AppError(400, 'Apenas transferências pendentes podem ser excluídas');

    await prisma.transferenciaBancaria.delete({ where: { id } });
  }
}
