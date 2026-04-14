import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { AppError } from '../../middleware/errorHandler';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'nome');
  const tipo = req.query.tipo as string | undefined;

  const where: Record<string, unknown> = { empresaId, ativo: true };

  if (tipo) {
    where.tipo = tipo;
  }

  if (pagination.search) {
    where.nome = { contains: pagination.search };
  }

  const [data, total] = await Promise.all([
    prisma.categoriaFinanceira.findMany({
      where,
      skip: pagination.skip,
      take: pagination.pageSize,
      orderBy: { [pagination.sortBy]: pagination.sortOrder },
    }),
    prisma.categoriaFinanceira.count({ where }),
  ]);

  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const categoria = await prisma.categoriaFinanceira.findFirst({
    where: { id, empresaId },
  });

  if (!categoria) {
    throw new AppError(404, 'Categoria não encontrada');
  }

  return res.json({ success: true, data: categoria });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const { nome, tipo, grupoDRE } = req.body;

  if (!nome) {
    throw new AppError(400, 'Nome é obrigatório');
  }
  if (!tipo || !['CP', 'CR', 'AMBOS'].includes(tipo)) {
    throw new AppError(400, 'Tipo deve ser CP, CR ou AMBOS');
  }

  const categoria = await prisma.categoriaFinanceira.create({
    data: { empresaId, nome, tipo, grupoDRE },
  });

  return res.status(201).json({ success: true, data: categoria });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.categoriaFinanceira.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Categoria não encontrada');
  }

  if (req.body.tipo && !['CP', 'CR', 'AMBOS'].includes(req.body.tipo)) {
    throw new AppError(400, 'Tipo deve ser CP, CR ou AMBOS');
  }

  const categoria = await prisma.categoriaFinanceira.update({
    where: { id },
    data: req.body,
  });

  return res.json({ success: true, data: categoria });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.categoriaFinanceira.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Categoria não encontrada');
  }

  await prisma.categoriaFinanceira.update({
    where: { id },
    data: { ativo: false },
  });

  return res.json({ success: true, data: { message: 'Categoria desativada com sucesso' } });
});
