import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { AppError } from '../../middleware/errorHandler';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'nomeBanco');

  const where: Record<string, unknown> = { empresaId, ativo: true };

  if (pagination.search) {
    where.OR = [
      { nomeBanco: { contains: pagination.search } },
      { banco: { contains: pagination.search } },
      { conta: { contains: pagination.search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.contaBancaria.findMany({
      where,
      skip: pagination.skip,
      take: pagination.pageSize,
      orderBy: { [pagination.sortBy]: pagination.sortOrder },
    }),
    prisma.contaBancaria.count({ where }),
  ]);

  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const contaBancaria = await prisma.contaBancaria.findFirst({
    where: { id, empresaId },
  });

  if (!contaBancaria) {
    throw new AppError(404, 'Conta Bancária não encontrada');
  }

  return res.json({ success: true, data: contaBancaria });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const { banco, nomeBanco, agencia, conta, tipoConta, saldoInicial } = req.body;

  if (!banco) {
    throw new AppError(400, 'Código do banco é obrigatório');
  }
  if (!nomeBanco) {
    throw new AppError(400, 'Nome do banco é obrigatório');
  }
  if (!agencia) {
    throw new AppError(400, 'Agência é obrigatória');
  }
  if (!conta) {
    throw new AppError(400, 'Conta é obrigatória');
  }
  if (!tipoConta) {
    throw new AppError(400, 'Tipo de conta é obrigatório');
  }

  const contaBancaria = await prisma.contaBancaria.create({
    data: {
      empresaId,
      banco,
      nomeBanco,
      agencia,
      conta,
      tipoConta,
      saldoInicial: saldoInicial ?? 0,
    },
  });

  return res.status(201).json({ success: true, data: contaBancaria });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.contaBancaria.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Conta Bancária não encontrada');
  }

  const contaBancaria = await prisma.contaBancaria.update({
    where: { id },
    data: req.body,
  });

  return res.json({ success: true, data: contaBancaria });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.contaBancaria.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Conta Bancária não encontrada');
  }

  await prisma.contaBancaria.update({
    where: { id },
    data: { ativo: false },
  });

  return res.json({ success: true, data: { message: 'Conta Bancária desativada com sucesso' } });
});
