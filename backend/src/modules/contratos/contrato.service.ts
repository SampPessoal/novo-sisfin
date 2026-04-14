import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { PaginationOptions } from '../../utils/pagination';
import { StorageService } from '../../services/storage.service';
import { addMonths, addWeeks, addDays } from 'date-fns';

function getNextDateByRecorrencia(current: Date, recorrencia: string): Date {
  switch (recorrencia) {
    case 'SEMANAL': return addWeeks(current, 1);
    case 'QUINZENAL': return addDays(current, 15);
    case 'MENSAL': return addMonths(current, 1);
    case 'BIMESTRAL': return addMonths(current, 2);
    case 'TRIMESTRAL': return addMonths(current, 3);
    case 'SEMESTRAL': return addMonths(current, 6);
    case 'ANUAL': return addMonths(current, 12);
    default: return addMonths(current, 1);
  }
}

export class ContratoService {
  static async list(empresaId: number, pagination: PaginationOptions, filters: Record<string, unknown>) {
    const where: Record<string, unknown> = { empresaId };

    if (filters.status) where.status = filters.status;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.fornecedorId) where.fornecedorId = filters.fornecedorId;
    if (filters.clienteId) where.clienteId = filters.clienteId;

    if (pagination.search) {
      where.OR = [
        { descricao: { contains: pagination.search } },
        { numero: { contains: pagination.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.contrato.findMany({
        where,
        include: {
          fornecedor: { select: { id: true, razaoSocial: true } },
          cliente: { select: { id: true, razaoSocial: true } },
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.contrato.count({ where }),
    ]);

    return { data, total };
  }

  static async getById(empresaId: number, id: number) {
    const contrato = await prisma.contrato.findFirst({
      where: { id, empresaId },
      include: {
        fornecedor: true,
        cliente: true,
        parcelas: { orderBy: { numero: 'asc' } },
        aditivos: { orderBy: { criadoEm: 'desc' } },
        arquivos: { orderBy: { criadoEm: 'desc' } },
      },
    });

    if (!contrato) throw new AppError(404, 'Contrato não encontrado');
    return contrato;
  }

  static async create(empresaId: number, body: Record<string, unknown>) {
    if (!body.descricao) throw new AppError(400, 'Descrição é obrigatória');
    if (body.valor == null) throw new AppError(400, 'Valor é obrigatório');

    return prisma.contrato.create({
      data: {
        empresaId,
        numero: body.numero as string,
        descricao: body.descricao as string,
        tipo: (body.tipo as string) || 'SERVICO',
        valor: body.valor as number,
        vigenciaInicio: new Date(body.vigenciaInicio as string),
        vigenciaFim: new Date(body.vigenciaFim as string),
        fornecedorId: body.fornecedorId as number | undefined,
        clienteId: body.clienteId as number | undefined,
        status: 'ATIVO',
      },
    });
  }

  static async update(empresaId: number, id: number, body: Record<string, unknown>) {
    const existing = await prisma.contrato.findFirst({ where: { id, empresaId } });
    if (!existing) throw new AppError(404, 'Contrato não encontrado');

    const updateData: Record<string, unknown> = { ...body };
    if (body.vigenciaInicio) updateData.vigenciaInicio = new Date(body.vigenciaInicio as string);
    if (body.vigenciaFim) updateData.vigenciaFim = new Date(body.vigenciaFim as string);
    delete updateData.empresaId;

    return prisma.contrato.update({ where: { id }, data: updateData });
  }

  static async delete(empresaId: number, id: number) {
    const existing = await prisma.contrato.findFirst({ where: { id, empresaId } });
    if (!existing) throw new AppError(404, 'Contrato não encontrado');

    return prisma.contrato.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
  }

  static async generateParcelas(empresaId: number, contratoId: number, body: Record<string, unknown>) {
    const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, empresaId } });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');

    const numeroParcelas = (body.numeroParcelas as number) || 12;
    const valorTotal = Number(contrato.valor);
    const valorParcela = Number((valorTotal / numeroParcelas).toFixed(2));
    const dataBase = contrato.vigenciaInicio;

    await prisma.parcelaContrato.deleteMany({ where: { contratoId } });

    const parcelas = [];
    for (let i = 0; i < numeroParcelas; i++) {
      parcelas.push(
        prisma.parcelaContrato.create({
          data: {
            contratoId,
            numero: i + 1,
            valor: i === numeroParcelas - 1
              ? Number((valorTotal - valorParcela * (numeroParcelas - 1)).toFixed(2))
              : valorParcela,
            dataVencimento: addMonths(dataBase, i + 1),
            status: 'PENDENTE',
          },
        }),
      );
    }

    return Promise.all(parcelas);
  }

  static async addAditivo(empresaId: number, contratoId: number, body: Record<string, unknown>) {
    const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, empresaId } });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');
    if (!body.descricao) throw new AppError(400, 'Descrição do aditivo é obrigatória');

    const aditivo = await prisma.aditivoContrato.create({
      data: {
        contratoId,
        descricao: body.descricao as string,
        novoValor: body.novoValor as number | undefined,
        novaVigencia: body.novaVigencia ? new Date(body.novaVigencia as string) : undefined,
      },
    });

    const updateData: Record<string, unknown> = {};
    if (body.novoValor) updateData.valor = body.novoValor;
    if (body.novaVigencia) updateData.vigenciaFim = new Date(body.novaVigencia as string);

    if (Object.keys(updateData).length > 0) {
      await prisma.contrato.update({ where: { id: contratoId }, data: updateData });
    }

    return aditivo;
  }

  static async listArquivos(empresaId: number, contratoId: number) {
    const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, empresaId } });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');

    return prisma.arquivoContrato.findMany({
      where: { contratoId },
      orderBy: { criadoEm: 'desc' },
    });
  }

  static async uploadArquivo(
    empresaId: number,
    contratoId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string }
  ) {
    const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, empresaId } });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');

    const url = await StorageService.upload(file.buffer, file.originalname, file.mimetype, 'contratos');

    return prisma.arquivoContrato.create({
      data: {
        contratoId,
        nome: file.originalname,
        url,
      },
    });
  }

  static async downloadArquivo(empresaId: number, contratoId: number, arquivoId: number) {
    const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, empresaId } });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');

    const arquivo = await prisma.arquivoContrato.findFirst({ where: { id: arquivoId, contratoId } });
    if (!arquivo) throw new AppError(404, 'Arquivo não encontrado');

    const signedUrl = await StorageService.getSignedUrl(arquivo.url);
    return { ...arquivo, signedUrl };
  }

  static async deleteArquivo(empresaId: number, contratoId: number, arquivoId: number) {
    const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, empresaId } });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');

    const arquivo = await prisma.arquivoContrato.findFirst({ where: { id: arquivoId, contratoId } });
    if (!arquivo) throw new AppError(404, 'Arquivo não encontrado');

    await StorageService.delete(arquivo.url);
    await prisma.arquivoContrato.delete({ where: { id: arquivoId } });

    return { message: 'Arquivo excluído com sucesso' };
  }

  static async provisionar(
    empresaId: number,
    contratoId: number,
    criadorId: number,
    body: {
      recorrencia?: string;
      valorMensal?: number;
      categoriaId?: number;
      centroCustoId?: number;
      diaVencimento?: number;
    }
  ) {
    const contrato = await prisma.contrato.findFirst({
      where: { id: contratoId, empresaId },
      include: { fornecedor: true, cliente: true },
    });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');
    if (!['ATIVO', 'ABERTO'].includes(contrato.status)) {
      throw new AppError(400, 'Somente contratos ativos podem ser provisionados');
    }

    const existentes = await prisma.contaPagar.count({
      where: { contratoId, status: { not: 'CANCELADO' } },
    });
    if (existentes > 0) {
      throw new AppError(400, 'Este contrato já possui contas a pagar provisionadas. Cancele as existentes antes de gerar novas.');
    }

    const recorrencia = body.recorrencia || 'MENSAL';
    const valorParcela = body.valorMensal ?? Number(contrato.valor);
    const diaVencimento = body.diaVencimento ?? contrato.vigenciaInicio.getDate();

    const inicio = contrato.vigenciaInicio;
    const fim = contrato.vigenciaFim;

    const dates: Date[] = [];
    let current = new Date(inicio.getFullYear(), inicio.getMonth(), diaVencimento);
    if (current < inicio) {
      current = getNextDateByRecorrencia(current, recorrencia);
    }

    while (current <= fim) {
      dates.push(new Date(current));
      current = getNextDateByRecorrencia(current, recorrencia);
    }

    if (dates.length === 0) {
      throw new AppError(400, 'Não foi possível gerar parcelas para o período de vigência');
    }

    const totalParcelas = dates.length;
    const nomeFornecedor = contrato.fornecedor?.razaoSocial || contrato.cliente?.razaoSocial || '';
    const descBase = `${contrato.descricao}${nomeFornecedor ? ` - ${nomeFornecedor}` : ''}`;

    const records = await prisma.$transaction(async (tx) => {
      const created = [];
      for (let i = 0; i < dates.length; i++) {
        const data: Record<string, unknown> = {
          empresa: { connect: { id: empresaId } },
          criador: { connect: { id: criadorId } },
          contrato: { connect: { id: contratoId } },
          descricao: `${descBase} (${i + 1}/${totalParcelas})`,
          valor: valorParcela,
          dataVencimento: dates[i],
          dataEmissao: new Date(),
          status: 'PENDENTE',
          origemLancamento: 'CONTRATO',
          recorrencia,
          parcelaAtual: i + 1,
          totalParcelas,
        };
        if (contrato.fornecedorId) data.fornecedor = { connect: { id: contrato.fornecedorId } };
        if (body.categoriaId) data.categoria = { connect: { id: body.categoriaId } };
        if (body.centroCustoId) data.centroCusto = { connect: { id: body.centroCustoId } };

        const record = await tx.contaPagar.create({ data: data as never });
        created.push(record);
      }
      return created;
    });

    return {
      totalGerado: records.length,
      valorTotal: records.length * valorParcela,
      primeiraParcela: dates[0],
      ultimaParcela: dates[dates.length - 1],
      registros: records,
    };
  }

  static async getContasPagar(empresaId: number, contratoId: number) {
    const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, empresaId } });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');

    const contas = await prisma.contaPagar.findMany({
      where: { contratoId },
      include: {
        fornecedor: { select: { id: true, razaoSocial: true } },
        categoria: { select: { id: true, nome: true } },
      },
      orderBy: { dataVencimento: 'asc' },
    });

    const resumo = {
      total: contas.length,
      pagas: contas.filter(c => c.status === 'PAGO').length,
      pendentes: contas.filter(c => ['PENDENTE', 'APROVADO'].includes(c.status)).length,
      canceladas: contas.filter(c => c.status === 'CANCELADO').length,
      valorTotal: contas.reduce((sum, c) => sum + Number(c.valor), 0),
      valorPago: contas.filter(c => c.status === 'PAGO').reduce((sum, c) => sum + Number(c.valorPago ?? c.valor), 0),
      valorPendente: contas.filter(c => ['PENDENTE', 'APROVADO'].includes(c.status)).reduce((sum, c) => sum + Number(c.valor), 0),
    };

    return { contas, resumo };
  }

  static async cancelarProvisionamento(empresaId: number, contratoId: number) {
    const contrato = await prisma.contrato.findFirst({ where: { id: contratoId, empresaId } });
    if (!contrato) throw new AppError(404, 'Contrato não encontrado');

    const result = await prisma.contaPagar.updateMany({
      where: {
        contratoId,
        status: { in: ['PENDENTE', 'APROVADO'] },
      },
      data: { status: 'CANCELADO' },
    });

    return { canceladas: result.count };
  }

  static async getAlertas(empresaId: number) {
    const now = new Date();
    const em30dias = addDays(now, 30);
    const em60dias = addDays(now, 60);
    const em90dias = addDays(now, 90);

    const [vencendo30, vencendo60, vencendo90] = await Promise.all([
      prisma.contrato.findMany({
        where: {
          empresaId,
          status: 'ATIVO',
          vigenciaFim: { gte: now, lte: em30dias },
        },
        include: {
          fornecedor: { select: { id: true, razaoSocial: true } },
          cliente: { select: { id: true, razaoSocial: true } },
        },
        orderBy: { vigenciaFim: 'asc' },
      }),
      prisma.contrato.findMany({
        where: {
          empresaId,
          status: 'ATIVO',
          vigenciaFim: { gt: em30dias, lte: em60dias },
        },
        include: {
          fornecedor: { select: { id: true, razaoSocial: true } },
          cliente: { select: { id: true, razaoSocial: true } },
        },
        orderBy: { vigenciaFim: 'asc' },
      }),
      prisma.contrato.findMany({
        where: {
          empresaId,
          status: 'ATIVO',
          vigenciaFim: { gt: em60dias, lte: em90dias },
        },
        include: {
          fornecedor: { select: { id: true, razaoSocial: true } },
          cliente: { select: { id: true, razaoSocial: true } },
        },
        orderBy: { vigenciaFim: 'asc' },
      }),
    ]);

    return {
      em30dias: vencendo30,
      em60dias: vencendo60,
      em90dias: vencendo90,
    };
  }
}
