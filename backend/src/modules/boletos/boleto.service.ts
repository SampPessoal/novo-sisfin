import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import axios from 'axios';

const asaasApi = axios.create({
  baseURL: env.ASAAS_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    access_token: env.ASAAS_API_KEY || '',
  },
});

export class BoletoService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = {
      empresaId,
      asaasId: { not: null },
    };

    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      prisma.contaReceber.findMany({
        where,
        include: {
          cliente: { select: { id: true, razaoSocial: true } },
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.contaReceber.count({ where }),
    ]);

    return { data, total };
  }

  static async createCobranca(empresaId: number, body: Record<string, unknown>) {
    if (!body.clienteAsaasId) throw new AppError(400, 'ID do cliente no Asaas é obrigatório');
    if (!body.contaReceberId) throw new AppError(400, 'ID da conta a receber é obrigatório');

    const contaReceber = await prisma.contaReceber.findFirst({
      where: { id: body.contaReceberId as number, empresaId },
    });

    if (!contaReceber) throw new AppError(404, 'Conta a receber não encontrada');
    if (contaReceber.asaasId) throw new AppError(400, 'Esta conta a receber já possui uma cobrança no Asaas');

    try {
      const asaasPayload = {
        customer: body.clienteAsaasId,
        billingType: (body.tipo as string) || 'BOLETO',
        value: Number(contaReceber.valor),
        dueDate: contaReceber.dataVencimento.toISOString().split('T')[0],
        description: contaReceber.descricao || '',
        externalReference: String(contaReceber.id),
      };

      const response = await asaasApi.post('/payments', asaasPayload);
      const asaasData = response.data;

      const updated = await prisma.contaReceber.update({
        where: { id: contaReceber.id },
        data: {
          asaasId: asaasData.id,
          linkPagamento: asaasData.invoiceUrl || null,
          status: 'AGUARDANDO_PAGAMENTO',
        },
      });

      return updated;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { errors?: Array<{ description: string }> } } };
      logger.error('Erro ao criar cobrança no Asaas', {
        error: axiosError.response?.data || (error as Error).message,
      });
      throw new AppError(
        400,
        axiosError.response?.data?.errors?.[0]?.description || 'Erro ao criar cobrança no Asaas',
      );
    }
  }

  static async cancelCobranca(empresaId: number, id: number) {
    const contaReceber = await prisma.contaReceber.findFirst({
      where: { id, empresaId, asaasId: { not: null } },
    });
    if (!contaReceber) throw new AppError(404, 'Cobrança não encontrada');

    try {
      await asaasApi.delete(`/payments/${contaReceber.asaasId}`);
    } catch (error: unknown) {
      logger.error('Erro ao cancelar cobrança no Asaas', { error: (error as Error).message });
      throw new AppError(400, 'Erro ao cancelar cobrança no Asaas');
    }

    return prisma.contaReceber.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
  }

  static async getPaymentLink(empresaId: number, id: number) {
    const contaReceber = await prisma.contaReceber.findFirst({
      where: { id, empresaId, asaasId: { not: null } },
    });
    if (!contaReceber) throw new AppError(404, 'Cobrança não encontrada');

    if (contaReceber.linkPagamento) {
      return { invoiceUrl: contaReceber.linkPagamento };
    }

    try {
      const response = await asaasApi.get(`/payments/${contaReceber.asaasId}`);
      const invoiceUrl = response.data.invoiceUrl;

      if (invoiceUrl) {
        await prisma.contaReceber.update({
          where: { id },
          data: { linkPagamento: invoiceUrl },
        });
      }

      return { invoiceUrl };
    } catch (error: unknown) {
      logger.error('Erro ao buscar link de pagamento', { error: (error as Error).message });
      throw new AppError(400, 'Erro ao buscar link de pagamento');
    }
  }

  static async processWebhook(payload: Record<string, unknown>) {
    const event = payload.event as string;
    const payment = payload.payment as Record<string, unknown>;

    if (!payment?.id) return { processed: false, reason: 'No payment ID' };

    const contaReceber = await prisma.contaReceber.findFirst({
      where: { asaasId: payment.id as string },
    });

    if (!contaReceber) return { processed: false, reason: 'Conta a receber não encontrada' };

    const statusMap: Record<string, string> = {
      PAYMENT_CONFIRMED: 'RECEBIDO',
      PAYMENT_RECEIVED: 'RECEBIDO',
      PAYMENT_OVERDUE: 'VENCIDO',
      PAYMENT_REFUNDED: 'ESTORNADO',
      PAYMENT_DELETED: 'CANCELADO',
    };

    const newStatus = statusMap[event];
    if (!newStatus) return { processed: false, reason: `Evento não mapeado: ${event}` };

    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'RECEBIDO') {
      updateData.dataRecebimento = new Date();
      updateData.valorRecebido = Number(payment.value || contaReceber.valor);
    }

    await prisma.contaReceber.update({
      where: { id: contaReceber.id },
      data: updateData,
    });

    return { processed: true, contaReceberId: contaReceber.id, newStatus };
  }

  static async getRelatorio(empresaId: number) {
    const baseWhere = { empresaId, asaasId: { not: null } };

    const [emitidas, recebidas, canceladas] = await Promise.all([
      prisma.contaReceber.aggregate({
        where: { ...baseWhere, status: { notIn: ['CANCELADO'] } },
        _count: true,
        _sum: { valor: true },
      }),
      prisma.contaReceber.aggregate({
        where: { ...baseWhere, status: 'RECEBIDO' },
        _count: true,
        _sum: { valor: true },
      }),
      prisma.contaReceber.aggregate({
        where: { ...baseWhere, status: 'CANCELADO' },
        _count: true,
        _sum: { valor: true },
      }),
    ]);

    return {
      emitidas: { count: emitidas._count, total: Number(emitidas._sum.valor ?? 0) },
      recebidas: { count: recebidas._count, total: Number(recebidas._sum.valor ?? 0) },
      canceladas: { count: canceladas._count, total: Number(canceladas._sum.valor ?? 0) },
    };
  }
}
