import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { asyncHandler } from '../../utils/asyncHandler';
import { getEmpresaId } from '../../middleware/multiTenant';
import { AppError } from '../../middleware/errorHandler';

const ENDERECO_FIELDS = [
  'tipo', 'cep', 'logradouro', 'numero', 'complemento',
  'bairro', 'cidade', 'estado', 'principal', 'observacoes',
] as const;

function pickData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of ENDERECO_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
}

async function verifyFornecedor(fornecedorId: number, empresaId: number) {
  const f = await prisma.fornecedor.findFirst({ where: { id: fornecedorId, empresaId } });
  if (!f) throw new AppError(404, 'Fornecedor não encontrado');
  return f;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const fornecedorId = parseInt(req.params.fornecedorId as string);
  await verifyFornecedor(fornecedorId, empresaId);

  const enderecos = await prisma.fornecedorEndereco.findMany({
    where: { fornecedorId, ativo: true },
    orderBy: [{ principal: 'desc' }, { tipo: 'asc' }],
  });

  return res.json({ success: true, data: enderecos });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const fornecedorId = parseInt(req.params.fornecedorId as string);
  await verifyFornecedor(fornecedorId, empresaId);

  const data = pickData(req.body);
  if (!data.tipo) throw new AppError(400, 'Tipo do endereço é obrigatório');

  if (data.principal) {
    await prisma.fornecedorEndereco.updateMany({
      where: { fornecedorId, principal: true },
      data: { principal: false },
    });
  }

  const endereco = await prisma.fornecedorEndereco.create({
    data: { fornecedorId, ...data } as never,
  });

  return res.status(201).json({ success: true, data: endereco });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const fornecedorId = parseInt(req.params.fornecedorId as string);
  const id = parseInt(req.params.id as string);
  await verifyFornecedor(fornecedorId, empresaId);

  const existing = await prisma.fornecedorEndereco.findFirst({ where: { id, fornecedorId } });
  if (!existing) throw new AppError(404, 'Endereço não encontrado');

  const data = pickData(req.body);

  if (data.principal) {
    await prisma.fornecedorEndereco.updateMany({
      where: { fornecedorId, principal: true, id: { not: id } },
      data: { principal: false },
    });
  }

  const endereco = await prisma.fornecedorEndereco.update({
    where: { id },
    data: data as never,
  });

  return res.json({ success: true, data: endereco });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const fornecedorId = parseInt(req.params.fornecedorId as string);
  const id = parseInt(req.params.id as string);
  await verifyFornecedor(fornecedorId, empresaId);

  const existing = await prisma.fornecedorEndereco.findFirst({ where: { id, fornecedorId } });
  if (!existing) throw new AppError(404, 'Endereço não encontrado');

  await prisma.fornecedorEndereco.update({ where: { id }, data: { ativo: false } });
  return res.json({ success: true, data: { message: 'Endereço removido' } });
});
