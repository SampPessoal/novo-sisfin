import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { ContasReceberService } from './contas-receber.service';
import { RelatorioService } from '../../services/relatorio.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataVencimento');
  const filters = {
    status: req.query.status as string | undefined,
    clienteId: req.query.clienteId
      ? parseInt(req.query.clienteId as string)
      : undefined,
    categoriaId: req.query.categoriaId
      ? parseInt(req.query.categoriaId as string)
      : undefined,
    dataVencimentoInicio: req.query.dataVencimentoInicio as string | undefined,
    dataVencimentoFim: req.query.dataVencimentoFim as string | undefined,
  };

  const { data, total } = await ContasReceberService.list(
    empresaId,
    pagination,
    filters,
  );
  return res.json(paginatedResponse(data, total, pagination));
});

export const getInadimplencia = asyncHandler(
  async (req: Request, res: Response) => {
    const empresaId = getEmpresaId(req);
    const result = await ContasReceberService.getInadimplencia(empresaId);
    return res.json({ success: true, data: result });
  },
);

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const cr = await ContasReceberService.getById(empresaId, id);
  return res.json({ success: true, data: cr });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const criadorId = req.user!.userId;
  const cr = await ContasReceberService.create(empresaId, criadorId, req.body);
  return res.status(201).json({ success: true, data: cr });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const cr = await ContasReceberService.update(empresaId, id, req.body);
  return res.json({ success: true, data: cr });
});

export const baixar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const { dataRecebimento, valorRecebido } = req.body;
  const cr = await ContasReceberService.baixar(
    empresaId,
    id,
    dataRecebimento,
    valorRecebido,
  );
  return res.json({ success: true, data: cr });
});

export const cancelar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);
  const cr = await ContasReceberService.cancelar(empresaId, id);
  return res.json({
    success: true,
    data: { message: 'Conta a receber cancelada com sucesso', cr },
  });
});

export const exportExcel = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'dataVencimento');
  pagination.pageSize = 10000;
  const filters = {
    status: req.query.status as string | undefined,
    clienteId: req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined,
    categoriaId: req.query.categoriaId ? parseInt(req.query.categoriaId as string) : undefined,
    dataVencimentoInicio: req.query.dataVencimentoInicio as string | undefined,
    dataVencimentoFim: req.query.dataVencimentoFim as string | undefined,
  };

  const { data } = await ContasReceberService.list(empresaId, pagination, filters);

  const rows = data.map((cr: any) => ({
    descricao: cr.descricao,
    cliente: cr.cliente?.razaoSocial ?? '',
    categoria: cr.categoria?.nome ?? '',
    valor: Number(cr.valor),
    dataVencimento: cr.dataVencimento,
    status: cr.status,
  }));

  const totalValor = rows.reduce((sum: number, r: any) => sum + r.valor, 0);

  await RelatorioService.exportExcel(res, {
    titulo: 'Contas a Receber',
    columns: [
      { header: 'Descrição', key: 'descricao', width: 30 },
      { header: 'Cliente', key: 'cliente', width: 25 },
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
    clienteId: req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined,
    categoriaId: req.query.categoriaId ? parseInt(req.query.categoriaId as string) : undefined,
    dataVencimentoInicio: req.query.dataVencimentoInicio as string | undefined,
    dataVencimentoFim: req.query.dataVencimentoFim as string | undefined,
  };

  const { data } = await ContasReceberService.list(empresaId, pagination, filters);

  const rows = data.map((cr: any) => ({
    descricao: cr.descricao,
    cliente: cr.cliente?.razaoSocial ?? '',
    categoria: cr.categoria?.nome ?? '',
    valor: Number(cr.valor),
    dataVencimento: cr.dataVencimento,
    status: cr.status,
  }));

  const totalValor = rows.reduce((sum: number, r: any) => sum + r.valor, 0);

  await RelatorioService.exportPDF(res, {
    titulo: 'Contas a Receber',
    columns: [
      { header: 'Descrição', key: 'descricao', width: 30 },
      { header: 'Cliente', key: 'cliente', width: 25 },
      { header: 'Categoria', key: 'categoria', width: 20 },
      { header: 'Valor', key: 'valor', width: 15, format: 'currency' },
      { header: 'Vencimento', key: 'dataVencimento', width: 15, format: 'date' },
      { header: 'Status', key: 'status', width: 15 },
    ],
    data: rows,
    totals: { valor: totalValor },
  });
});
