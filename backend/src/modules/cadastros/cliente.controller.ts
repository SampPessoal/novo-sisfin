import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { AppError } from '../../middleware/errorHandler';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'razaoSocial');

  const where: Record<string, unknown> = { empresaId, ativo: true };

  if (pagination.search) {
    where.OR = [
      { razaoSocial: { contains: pagination.search } },
      { cnpjCpf: { contains: pagination.search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      skip: pagination.skip,
      take: pagination.pageSize,
      orderBy: { [pagination.sortBy]: pagination.sortOrder },
    }),
    prisma.cliente.count({ where }),
  ]);

  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const cliente = await prisma.cliente.findFirst({
    where: { id, empresaId },
  });

  if (!cliente) {
    throw new AppError(404, 'Cliente não encontrado');
  }

  return res.json({ success: true, data: cliente });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const { razaoSocial, cnpjCpf, ...rest } = req.body;

  if (!razaoSocial) {
    throw new AppError(400, 'Razão Social é obrigatória');
  }
  if (!cnpjCpf) {
    throw new AppError(400, 'CNPJ/CPF é obrigatório');
  }

  const existing = await prisma.cliente.findUnique({
    where: { empresaId_cnpjCpf: { empresaId, cnpjCpf } },
  });

  if (existing) {
    throw new AppError(409, 'Já existe um cliente com este CNPJ/CPF nesta empresa');
  }

  const cliente = await prisma.cliente.create({
    data: { empresaId, razaoSocial, cnpjCpf, ...rest },
  });

  return res.status(201).json({ success: true, data: cliente });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.cliente.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Cliente não encontrado');
  }

  if (req.body.cnpjCpf && req.body.cnpjCpf !== existing.cnpjCpf) {
    const duplicate = await prisma.cliente.findUnique({
      where: { empresaId_cnpjCpf: { empresaId, cnpjCpf: req.body.cnpjCpf } },
    });
    if (duplicate) {
      throw new AppError(409, 'Já existe um cliente com este CNPJ/CPF nesta empresa');
    }
  }

  const cliente = await prisma.cliente.update({
    where: { id },
    data: req.body,
  });

  return res.json({ success: true, data: cliente });
});

export const getPainel = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const cliente = await prisma.cliente.findFirst({
    where: { id, empresaId },
  });

  if (!cliente) {
    throw new AppError(404, 'Cliente não encontrado');
  }

  const [contasReceber, contratos, totalFaturado, totalRecebido, totalAberto, totalVencido] = await Promise.all([
    prisma.contaReceber.findMany({
      where: { empresaId, clienteId: id },
      orderBy: { dataVencimento: 'desc' },
      take: 50,
      select: {
        id: true, descricao: true, valor: true, dataVencimento: true,
        status: true, dataRecebimento: true, valorRecebido: true,
      },
    }),
    prisma.contrato.findMany({
      where: { empresaId, clienteId: id },
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true, numero: true, descricao: true, valor: true,
        vigenciaInicio: true, vigenciaFim: true, status: true,
      },
    }),
    prisma.contaReceber.aggregate({
      where: { empresaId, clienteId: id, status: { not: 'CANCELADO' } },
      _sum: { valor: true },
    }),
    prisma.contaReceber.aggregate({
      where: { empresaId, clienteId: id, status: 'RECEBIDO' },
      _sum: { valorRecebido: true },
    }),
    prisma.contaReceber.aggregate({
      where: { empresaId, clienteId: id, status: 'PENDENTE' },
      _sum: { valor: true },
    }),
    prisma.contaReceber.aggregate({
      where: {
        empresaId, clienteId: id,
        status: { in: ['PENDENTE', 'VENCIDO'] },
        dataVencimento: { lt: new Date() },
      },
      _sum: { valor: true },
      _count: true,
    }),
  ]);

  const hoje = new Date();
  const receitaMensal = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const agg = await prisma.contaReceber.aggregate({
      where: {
        empresaId, clienteId: id,
        dataVencimento: { gte: inicio, lte: fim },
        status: { not: 'CANCELADO' },
      },
      _sum: { valor: true },
    });
    receitaMensal.push({
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      valor: Number(agg._sum.valor ?? 0),
    });
  }

  const faturado = Number(totalFaturado._sum.valor ?? 0);
  const vencido = Number(totalVencido._sum.valor ?? 0);

  return res.json({
    success: true,
    data: {
      cliente,
      indicadores: {
        totalFaturado: faturado,
        totalRecebido: Number(totalRecebido._sum.valorRecebido ?? 0),
        totalAberto: Number(totalAberto._sum.valor ?? 0),
        inadimplencia: faturado > 0 ? Math.round((vencido / faturado) * 10000) / 100 : 0,
        totalContratos: contratos.length,
      },
      contasReceber: contasReceber.map(cr => ({
        ...cr,
        valor: Number(cr.valor),
        valorRecebido: cr.valorRecebido ? Number(cr.valorRecebido) : null,
      })),
      contratos: contratos.map(c => ({ ...c, valor: Number(c.valor) })),
      receitaMensal,
    },
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.cliente.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Cliente não encontrado');
  }

  await prisma.cliente.update({
    where: { id },
    data: { ativo: false },
  });

  return res.json({ success: true, data: { message: 'Cliente desativado com sucesso' } });
});
