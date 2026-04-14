import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import axios from 'axios';

const plugnotasApi = axios.create({
  baseURL: env.PLUGNOTAS_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': env.PLUGNOTAS_API_KEY || '',
  },
});

export class NFEService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.tipo) where.tipo = filters.tipo;

    if (pagination.search) {
      where.OR = [
        { numero: { contains: pagination.search } },
        { chaveAcesso: { contains: pagination.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.notaFiscal.findMany({
        where,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.notaFiscal.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const nf = await prisma.notaFiscal.findFirst({
      where: { id, empresaId },
    });

    if (!nf) throw new AppError(404, 'Nota fiscal não encontrada');
    return nf;
  }

  static async emitir(empresaId: number, body: Record<string, unknown>) {
    const tipo = (body.tipo as string) || 'NFSE';

    const endpoint = tipo === 'NFE' ? '/nfe' : '/nfse';

    try {
      const response = await plugnotasApi.post(endpoint, body.dadosEmissao || body);
      const plugData = response.data;

      const nf = await prisma.notaFiscal.create({
        data: {
          empresaId,
          plugnotasId: plugData.id || plugData.idIntegracao,
          tipo,
          numero: plugData.numero || null,
          serie: plugData.serie || null,
          dataEmissao: new Date(),
          valorTotal: body.valor as number,
          status: 'PROCESSANDO',
          chaveAcesso: plugData.chaveAcesso || null,
        },
      });

      return nf;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: unknown } };
      logger.error('Erro ao emitir nota fiscal', {
        error: axiosError.response?.data || (error as Error).message,
      });
      throw new AppError(400, 'Erro ao emitir nota fiscal no PlugNotas');
    }
  }

  static async consultar(empresaId: number, id: number) {
    const nf = await prisma.notaFiscal.findFirst({ where: { id, empresaId } });
    if (!nf) throw new AppError(404, 'Nota fiscal não encontrada');
    if (!nf.plugnotasId) throw new AppError(400, 'Nota fiscal sem ID do PlugNotas');

    try {
      const response = await plugnotasApi.get(`/nfse/${nf.plugnotasId}`);
      const plugData = response.data;

      await prisma.notaFiscal.update({
        where: { id },
        data: {
          status: plugData.status || nf.status,
          numero: plugData.numero || nf.numero,
          chaveAcesso: plugData.chaveAcesso || nf.chaveAcesso,
        },
      });

      return plugData;
    } catch (error: unknown) {
      logger.error('Erro ao consultar nota fiscal', { error: (error as Error).message });
      throw new AppError(400, 'Erro ao consultar nota fiscal no PlugNotas');
    }
  }

  static async cancelar(empresaId: number, id: number, body: Record<string, unknown>) {
    const nf = await prisma.notaFiscal.findFirst({ where: { id, empresaId } });
    if (!nf) throw new AppError(404, 'Nota fiscal não encontrada');
    if (!nf.plugnotasId) throw new AppError(400, 'Nota fiscal sem ID do PlugNotas');

    try {
      await plugnotasApi.post(`/nfse/${nf.plugnotasId}/cancelar`, {
        motivo: body.motivo || 'Cancelamento solicitado',
      });

      return prisma.notaFiscal.update({
        where: { id },
        data: { status: 'CANCELADA' },
      });
    } catch (error: unknown) {
      logger.error('Erro ao cancelar nota fiscal', { error: (error as Error).message });
      throw new AppError(400, 'Erro ao cancelar nota fiscal no PlugNotas');
    }
  }

  static async cartaCorrecao(empresaId: number, id: number, body: Record<string, unknown>) {
    const nf = await prisma.notaFiscal.findFirst({ where: { id, empresaId } });
    if (!nf) throw new AppError(404, 'Nota fiscal não encontrada');
    if (!nf.plugnotasId) throw new AppError(400, 'Nota fiscal sem ID do PlugNotas');
    if (!body.correcao) throw new AppError(400, 'Texto da correção é obrigatório');

    try {
      const response = await plugnotasApi.post(`/nfe/${nf.plugnotasId}/carta-correcao`, {
        correcao: body.correcao,
      });

      return { success: true, data: response.data };
    } catch (error: unknown) {
      logger.error('Erro ao enviar carta de correção', { error: (error as Error).message });
      throw new AppError(400, 'Erro ao enviar carta de correção');
    }
  }

  static async downloadXML(empresaId: number, id: number) {
    const nf = await prisma.notaFiscal.findFirst({ where: { id, empresaId } });
    if (!nf) throw new AppError(404, 'Nota fiscal não encontrada');
    if (!nf.plugnotasId) throw new AppError(400, 'Nota fiscal sem ID do PlugNotas');

    try {
      const response = await plugnotasApi.get(`/nfse/${nf.plugnotasId}/xml`, {
        responseType: 'arraybuffer',
      });
      return { content: response.data, contentType: 'application/xml' };
    } catch (error: unknown) {
      logger.error('Erro ao baixar XML', { error: (error as Error).message });
      throw new AppError(400, 'Erro ao baixar XML da nota fiscal');
    }
  }

  static async downloadPDF(empresaId: number, id: number) {
    const nf = await prisma.notaFiscal.findFirst({ where: { id, empresaId } });
    if (!nf) throw new AppError(404, 'Nota fiscal não encontrada');
    if (!nf.plugnotasId) throw new AppError(400, 'Nota fiscal sem ID do PlugNotas');

    try {
      const response = await plugnotasApi.get(`/nfse/${nf.plugnotasId}/pdf`, {
        responseType: 'arraybuffer',
      });
      return { content: response.data, contentType: 'application/pdf' };
    } catch (error: unknown) {
      logger.error('Erro ao baixar PDF', { error: (error as Error).message });
      throw new AppError(400, 'Erro ao baixar PDF da nota fiscal');
    }
  }
}
