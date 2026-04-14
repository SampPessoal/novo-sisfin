import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { ContasPagarService } from './contas-pagar.service';
import { RelatorioService } from '../../services/relatorio.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataVencimento');
  const filters = {
    status: req.query.status as string | undefined,
    fornecedorId: req.query.fornecedorId
      ? parseInt(req.query.fornecedorId as string)
      : undefined,
    categoriaId: req.query.categoriaId
      ? parseInt(req.query.categoriaId as string)
      : undefined,
    dataVencimentoInicio: req.query.dataVencimentoInicio as string | undefined,
    dataVencimentoFim: req.query.dataVencimentoFim as string | undefined,
    vencidos: req.query.vencidos === 'true',
  };

  const { data, total } = await ContasPagarService.list(
    empresaId,
    pagination,
    filters,
  );
  return res.json(paginatedResponse(data, total, pagination));
});

export const getVencimentos = asyncHandler(
  async (req: Request, res: Response) => {
    const empresaId = getEmpresaId(req);
    const result = await ContasPagarService.getVencimentos(empresaId);
    return res.json({ success: true, data: result });
  },
);

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const cp = await ContasPagarService.getById(empresaId, id);
  return res.json({ success: true, data: cp });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const criadorId = req.user!.userId;
  const cp = await ContasPagarService.create(empresaId, criadorId, req.body);
  return res.status(201).json({ success: true, data: cp });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const cp = await ContasPagarService.update(empresaId, id, req.body);
  return res.json({ success: true, data: cp });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contaPagarId = parseInt(req.params.id as string);
  const aprovadorId = req.user!.userId;
  const { observacao } = req.body;
  const aprovacao = await ContasPagarService.approve(
    empresaId,
    contaPagarId,
    aprovadorId,
    observacao,
  );
  return res.json({ success: true, data: aprovacao });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const contaPagarId = parseInt(req.params.id as string);
  const aprovadorId = req.user!.userId;
  const { motivo } = req.body;
  const aprovacao = await ContasPagarService.reject(
    empresaId,
    contaPagarId,
    aprovadorId,
    motivo,
  );
  return res.json({ success: true, data: aprovacao });
});

export const baixar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const { dataPagamento, valorPago } = req.body;
  const cp = await ContasPagarService.baixar(
    empresaId,
    id,
    dataPagamento,
    valorPago,
  );
  return res.json({ success: true, data: cp });
});

export const setRateio = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const { rateios } = req.body;
  const result = await ContasPagarService.setRateio(empresaId, id, rateios);
  return res.json({ success: true, data: result });
});

export const createRecorrente = asyncHandler(
  async (req: Request, res: Response) => {
    const empresaId = getEmpresaId(req);
    const criadorId = req.user!.userId;
    const records = await ContasPagarService.createRecorrente(
      empresaId,
      criadorId,
      req.body,
    );
    return res.status(201).json({ success: true, data: records });
  },
);

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const cp = await ContasPagarService.cancel(empresaId, id);
  return res.json({
    success: true,
    data: { message: 'Conta a pagar cancelada com sucesso', cp },
  });
});

export const exportExcel = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataVencimento');
  pagination.pageSize = 10000;
  const filters = {
    status: req.query.status as string | undefined,
    fornecedorId: req.query.fornecedorId ? parseInt(req.query.fornecedorId as string) : undefined,
    categoriaId: req.query.categoriaId ? parseInt(req.query.categoriaId as string) : undefined,
    dataVencimentoInicio: req.query.dataVencimentoInicio as string | undefined,
    dataVencimentoFim: req.query.dataVencimentoFim as string | undefined,
    vencidos: req.query.vencidos === 'true',
  };

  const { data } = await ContasPagarService.list(empresaId, pagination, filters);

  const rows = data.map((cp: any) => ({
    descricao: cp.descricao,
    fornecedor: cp.fornecedor?.razaoSocial ?? '',
    categoria: cp.categoria?.nome ?? '',
    valor: Number(cp.valor),
    dataVencimento: cp.dataVencimento,
    status: cp.status,
  }));

  const totalValor = rows.reduce((sum: number, r: any) => sum + r.valor, 0);

  await RelatorioService.exportExcel(res, {
    titulo: 'Contas a Pagar',
    columns: [
      { header: 'Descrição', key: 'descricao', width: 30 },
      { header: 'Fornecedor', key: 'fornecedor', width: 25 },
      { header: 'Categoria', key: 'categoria', width: 20 },
      { header: 'Valor', key: 'valor', width: 15, format: 'currency' },
      { header: 'Vencimento', key: 'dataVencimento', width: 15, format: 'date' },
      { header: 'Status', key: 'status', width: 15 },
    ],
    data: rows,
    totals: { valor: totalValor },
  });
});

export const exportPDF = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataVencimento');
  pagination.pageSize = 10000;
  const filters = {
    status: req.query.status as string | undefined,
    fornecedorId: req.query.fornecedorId ? parseInt(req.query.fornecedorId as string) : undefined,
    categoriaId: req.query.categoriaId ? parseInt(req.query.categoriaId as string) : undefined,
    dataVencimentoInicio: req.query.dataVencimentoInicio as string | undefined,
    dataVencimentoFim: req.query.dataVencimentoFim as string | undefined,
    vencidos: req.query.vencidos === 'true',
  };

  const { data } = await ContasPagarService.list(empresaId, pagination, filters);

  const rows = data.map((cp: any) => ({
    descricao: cp.descricao,
    fornecedor: cp.fornecedor?.razaoSocial ?? '',
    categoria: cp.categoria?.nome ?? '',
    valor: Number(cp.valor),
    dataVencimento: cp.dataVencimento,
    status: cp.status,
  }));

  const totalValor = rows.reduce((sum: number, r: any) => sum + r.valor, 0);

  await RelatorioService.exportPDF(res, {
    titulo: 'Contas a Pagar',
    columns: [
      { header: 'Descrição', key: 'descricao', width: 30 },
      { header: 'Fornecedor', key: 'fornecedor', width: 25 },
      { header: 'Categoria', key: 'categoria', width: 20 },
      { header: 'Valor', key: 'valor', width: 15, format: 'currency' },
      { header: 'Vencimento', key: 'dataVencimento', width: 15, format: 'date' },
      { header: 'Status', key: 'status', width: 15 },
    ],
    data: rows,
    totals: { valor: totalValor },
  });
});
