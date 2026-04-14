import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { AppError } from '../../middleware/errorHandler';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'codigo');

  const where: Record<string, unknown> = { empresaId, ativo: true };

  if (pagination.search) {
    where.OR = [
      { codigo: { contains: pagination.search } },
      { nome: { contains: pagination.search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.centroCusto.findMany({
      where,
      skip: pagination.skip,
      take: pagination.pageSize,
      orderBy: { [pagination.sortBy]: pagination.sortOrder },
    }),
    prisma.centroCusto.count({ where }),
  ]);

  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const centroCusto = await prisma.centroCusto.findFirst({
    where: { id, empresaId },
  });

  if (!centroCusto) {
    throw new AppError(404, 'Centro de Custo não encontrado');
  }

  return res.json({ success: true, data: centroCusto });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const { codigo, nome } = req.body;

  if (!codigo) {
    throw new AppError(400, 'Código é obrigatório');
  }
  if (!nome) {
    throw new AppError(400, 'Nome é obrigatório');
  }

  const existing = await prisma.centroCusto.findUnique({
    where: { empresaId_codigo: { empresaId, codigo } },
  });

  if (existing) {
    throw new AppError(409, 'Já existe um centro de custo com este código nesta empresa');
  }

  const centroCusto = await prisma.centroCusto.create({
    data: { empresaId, codigo, nome },
  });

  return res.status(201).json({ success: true, data: centroCusto });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.centroCusto.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Centro de Custo não encontrado');
  }

  if (req.body.codigo && req.body.codigo !== existing.codigo) {
    const duplicate = await prisma.centroCusto.findUnique({
      where: { empresaId_codigo: { empresaId, codigo: req.body.codigo } },
    });
    if (duplicate) {
      throw new AppError(409, 'Já existe um centro de custo com este código nesta empresa');
    }
  }

  const centroCusto = await prisma.centroCusto.update({
    where: { id },
    data: req.body,
  });

  return res.json({ success: true, data: centroCusto });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.centroCusto.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Centro de Custo não encontrado');
  }

  await prisma.centroCusto.update({
    where: { id },
    data: { ativo: false },
  });

  return res.json({ success: true, data: { message: 'Centro de Custo desativado com sucesso' } });
});
