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
    prisma.fornecedor.findMany({
      where,
      skip: pagination.skip,
      take: pagination.pageSize,
      orderBy: { [pagination.sortBy]: pagination.sortOrder },
    }),
    prisma.fornecedor.count({ where }),
  ]);

  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const fornecedor = await prisma.fornecedor.findFirst({
    where: { id, empresaId },
    include: {
      contatos: { where: { ativo: true }, orderBy: [{ principal: 'desc' }, { nome: 'asc' }] },
      enderecos: { where: { ativo: true }, orderBy: [{ principal: 'desc' }, { tipo: 'asc' }] },
    },
  });

  if (!fornecedor) {
    throw new AppError(404, 'Fornecedor não encontrado');
  }

  return res.json({ success: true, data: fornecedor });
});

const FORNECEDOR_FIELDS = [
  // Cadastrais
  'tipo', 'razaoSocial', 'nomeFantasia', 'cnpjCpf', 'inscricaoEstadual',
  'inscricaoMunicipal', 'regimeTributario', 'contribuinteIcms', 'segmento',
  // Endereço
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'endereco',
  // Contatos
  'telefone', 'celular', 'whatsapp', 'email', 'emailFinanceiro',
  'contatoPrincipal', 'website',
  // Bancário
  'banco', 'nomeBanco', 'agencia', 'contaBancaria', 'tipoConta',
  'chavePix', 'tipoChavePix', 'titularConta',
  // Fiscal
  'retIss', 'retIrrf', 'retPis', 'retCofins', 'retCsll', 'retInss',
  // Comercial
  'condicaoPagamento',
  // Outros
  'observacoes',
] as const;

function pickFornecedorData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of FORNECEDOR_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const data = pickFornecedorData(req.body);

  if (!data.razaoSocial) {
    throw new AppError(400, 'Razão Social é obrigatória');
  }
  if (!data.cnpjCpf) {
    throw new AppError(400, 'CNPJ/CPF é obrigatório');
  }

  const existing = await prisma.fornecedor.findUnique({
    where: { empresaId_cnpjCpf: { empresaId, cnpjCpf: data.cnpjCpf as string } },
  });

  if (existing) {
    throw new AppError(409, 'Já existe um fornecedor com este CNPJ/CPF nesta empresa');
  }

  const fornecedor = await prisma.fornecedor.create({
    data: { empresaId, ...data } as never,
  });

  return res.status(201).json({ success: true, data: fornecedor });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const data = pickFornecedorData(req.body);

  const existing = await prisma.fornecedor.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Fornecedor não encontrado');
  }

  if (data.cnpjCpf && data.cnpjCpf !== existing.cnpjCpf) {
    const duplicate = await prisma.fornecedor.findUnique({
      where: { empresaId_cnpjCpf: { empresaId, cnpjCpf: data.cnpjCpf as string } },
    });
    if (duplicate) {
      throw new AppError(409, 'Já existe um fornecedor com este CNPJ/CPF nesta empresa');
    }
  }

  const fornecedor = await prisma.fornecedor.update({
    where: { id },
    data: data as never,
  });

  return res.json({ success: true, data: fornecedor });
});

export const getPainel = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const fornecedor = await prisma.fornecedor.findFirst({
    where: { id, empresaId },
  });

  if (!fornecedor) {
    throw new AppError(404, 'Fornecedor não encontrado');
  }

  const [contasPagar, contratos, totalComprado, totalPago, totalAberto, totalAtrasos] = await Promise.all([
    prisma.contaPagar.findMany({
      where: { empresaId, fornecedorId: id },
      orderBy: { dataVencimento: 'desc' },
      take: 50,
      select: {
        id: true, descricao: true, valor: true, dataVencimento: true,
        status: true, dataPagamento: true, valorPago: true,
      },
    }),
    prisma.contrato.findMany({
      where: { empresaId, fornecedorId: id },
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true, numero: true, descricao: true, valor: true,
        vigenciaInicio: true, vigenciaFim: true, status: true,
      },
    }),
    prisma.contaPagar.aggregate({
      where: { empresaId, fornecedorId: id, status: { not: 'CANCELADO' } },
      _sum: { valor: true },
    }),
    prisma.contaPagar.aggregate({
      where: { empresaId, fornecedorId: id, status: 'PAGO' },
      _sum: { valorPago: true },
    }),
    prisma.contaPagar.aggregate({
      where: { empresaId, fornecedorId: id, status: 'PENDENTE' },
      _sum: { valor: true },
    }),
    prisma.contaPagar.aggregate({
      where: {
        empresaId, fornecedorId: id,
        status: { in: ['PENDENTE', 'VENCIDO'] },
        dataVencimento: { lt: new Date() },
      },
      _sum: { valor: true },
      _count: true,
    }),
  ]);

  const hoje = new Date();
  const despesaMensal = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const agg = await prisma.contaPagar.aggregate({
      where: {
        empresaId, fornecedorId: id,
        dataVencimento: { gte: inicio, lte: fim },
        status: { not: 'CANCELADO' },
      },
      _sum: { valor: true },
    });
    despesaMensal.push({
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      valor: Number(agg._sum.valor ?? 0),
    });
  }

  return res.json({
    success: true,
    data: {
      fornecedor,
      indicadores: {
        totalComprado: Number(totalComprado._sum.valor ?? 0),
        totalPago: Number(totalPago._sum.valorPago ?? 0),
        totalAberto: Number(totalAberto._sum.valor ?? 0),
        totalAtrasos: Number(totalAtrasos._sum.valor ?? 0),
        contasAtrasadas: totalAtrasos._count ?? 0,
        totalContratos: contratos.length,
      },
      contasPagar: contasPagar.map(cp => ({
        ...cp,
        valor: Number(cp.valor),
        valorPago: cp.valorPago ? Number(cp.valorPago) : null,
      })),
      contratos: contratos.map(c => ({ ...c, valor: Number(c.valor) })),
      despesaMensal,
    },
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.fornecedor.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Fornecedor não encontrado');
  }

  await prisma.fornecedor.update({
    where: { id },
    data: { ativo: false },
  });

  return res.json({ success: true, data: { message: 'Fornecedor desativado com sucesso' } });
});
