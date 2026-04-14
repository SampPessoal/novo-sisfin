import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/database';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { getEmpresaId } from '../../middleware/multiTenant';
import { AppError } from '../../middleware/errorHandler';

const TIPOS_VALIDOS = ['RECEITA', 'DESPESA', 'ATIVO', 'PASSIVO'];

export const list = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const tree = req.query.tree === 'true';

  if (tree) {
    const data = await prisma.planoContas.findMany({
      where: { empresaId, ativo: true, paiId: null },
      include: {
        filhos: {
          where: { ativo: true },
          include: {
            filhos: {
              where: { ativo: true },
              include: {
                filhos: { where: { ativo: true } },
              },
            },
          },
        },
      },
      orderBy: { codigo: 'asc' },
    });

    return res.json({ success: true, data });
  }

  const pagination = getPagination(req, 'codigo');
  const tipo = req.query.tipo as string | undefined;

  const where: Record<string, unknown> = { empresaId, ativo: true };

  if (tipo) {
    where.tipo = tipo;
  }

  if (pagination.search) {
    where.OR = [
      { codigo: { contains: pagination.search } },
      { descricao: { contains: pagination.search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.planoContas.findMany({
      where,
      skip: pagination.skip,
      take: pagination.pageSize,
      orderBy: { [pagination.sortBy]: pagination.sortOrder },
      include: { filhos: { where: { ativo: true }, select: { id: true, codigo: true, descricao: true } } },
    }),
    prisma.planoContas.count({ where }),
  ]);

  return res.json(paginatedResponse(data, total, pagination));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const plano = await prisma.planoContas.findFirst({
    where: { id, empresaId },
    include: {
      pai: { select: { id: true, codigo: true, descricao: true } },
      filhos: { where: { ativo: true } },
    },
  });

  if (!plano) {
    throw new AppError(404, 'Plano de Contas não encontrado');
  }

  return res.json({ success: true, data: plano });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const { codigo, descricao, nivel, paiId, tipo } = req.body;

  if (!codigo) {
    throw new AppError(400, 'Código é obrigatório');
  }
  if (!descricao) {
    throw new AppError(400, 'Descrição é obrigatória');
  }
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    throw new AppError(400, 'Tipo deve ser RECEITA, DESPESA, ATIVO ou PASSIVO');
  }

  const existing = await prisma.planoContas.findUnique({
    where: { empresaId_codigo: { empresaId, codigo } },
  });

  if (existing) {
    throw new AppError(409, 'Já existe um plano de contas com este código nesta empresa');
  }

  if (paiId) {
    const pai = await prisma.planoContas.findFirst({
      where: { id: paiId, empresaId },
    });
    if (!pai) {
      throw new AppError(404, 'Conta pai não encontrada');
    }
  }

  const plano = await prisma.planoContas.create({
    data: { empresaId, codigo, descricao, nivel: nivel ?? 1, paiId, tipo },
  });

  return res.status(201).json({ success: true, data: plano });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.planoContas.findFirst({
    where: { id, empresaId },
  });

  if (!existing) {
    throw new AppError(404, 'Plano de Contas não encontrado');
  }

  if (req.body.codigo && req.body.codigo !== existing.codigo) {
    const duplicate = await prisma.planoContas.findUnique({
      where: { empresaId_codigo: { empresaId, codigo: req.body.codigo } },
    });
    if (duplicate) {
      throw new AppError(409, 'Já existe um plano de contas com este código nesta empresa');
    }
  }

  if (req.body.tipo && !TIPOS_VALIDOS.includes(req.body.tipo)) {
    throw new AppError(400, 'Tipo deve ser RECEITA, DESPESA, ATIVO ou PASSIVO');
  }

  if (req.body.paiId) {
    if (req.body.paiId === id) {
      throw new AppError(400, 'Uma conta não pode ser pai de si mesma');
    }
    const pai = await prisma.planoContas.findFirst({
      where: { id: req.body.paiId, empresaId },
    });
    if (!pai) {
      throw new AppError(404, 'Conta pai não encontrada');
    }
  }

  const plano = await prisma.planoContas.update({
    where: { id },
    data: req.body,
  });

  return res.json({ success: true, data: plano });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const id = parseInt(req.params.id as string);

  const existing = await prisma.planoContas.findFirst({
    where: { id, empresaId },
    include: { filhos: { where: { ativo: true } } },
  });

  if (!existing) {
    throw new AppError(404, 'Plano de Contas não encontrado');
  }

  if (existing.filhos.length > 0) {
    throw new AppError(400, 'Não é possível desativar uma conta que possui subcontas ativas');
  }

  await prisma.planoContas.update({
    where: { id },
    data: { ativo: false },
  });

  return res.json({ success: true, data: { message: 'Plano de Contas desativado com sucesso' } });
});

// ---------------------------------------------------------------------------
// Importar Plano de Contas (Excel / PDF)
// ---------------------------------------------------------------------------

interface ParsedConta {
  codigo: string;
  descricao: string;
  tipo?: string;
}

const CODIGO_PATTERN = /^(\d+)(\.(\d+))*$/;

function calcNivel(codigo: string): number {
  return codigo.split('.').length;
}

function parentCodigo(codigo: string): string | null {
  const parts = codigo.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

function normalizeHeaderName(raw: string): string {
  return raw
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

async function parseExcel(buffer: Buffer): Promise<ParsedConta[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer).buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new AppError(400, 'Planilha vazia');

  const headerRow = sheet.getRow(1);
  const colMap: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const name = normalizeHeaderName(String(cell.value ?? ''));
    if (name.includes('codigo') || name === 'cod') colMap.codigo = colNumber;
    else if (name.includes('nome') || name.includes('descricao') || name.includes('conta')) colMap.descricao = colNumber;
    else if (name === 'tipo') colMap.tipo = colNumber;
  });

  if (!colMap.codigo) throw new AppError(400, 'Coluna "Código" não encontrada na planilha');
  if (!colMap.descricao) throw new AppError(400, 'Coluna "Nome" (ou "Descrição") não encontrada na planilha');

  const entries: ParsedConta[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rawCodigo = String(row.getCell(colMap.codigo).value ?? '').trim();
    const rawDescricao = String(row.getCell(colMap.descricao).value ?? '').trim();
    if (!rawCodigo || !rawDescricao) return;

    const tipo = colMap.tipo ? String(row.getCell(colMap.tipo).value ?? '').trim().toUpperCase() : undefined;

    entries.push({ codigo: rawCodigo, descricao: rawDescricao, tipo: tipo || undefined });
  });

  return entries;
}

async function parsePdf(buffer: Buffer): Promise<ParsedConta[]> {
  let text: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    text = result.text;
  } catch {
    text = buffer.toString('utf-8');
  }

  const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
  const entries: ParsedConta[] = [];

  const linePattern = /^(\d+(?:\.\d+)*)\s+(.+)$/;

  for (const line of lines) {
    const match = line.match(linePattern);
    if (match) {
      const codigo = match[1];
      const descricao = match[2].trim();
      if (CODIGO_PATTERN.test(codigo) && descricao.length > 0) {
        entries.push({ codigo, descricao });
      }
    }
  }

  return entries;
}

function inferTipo(codigo: string, descricaoUpper: string, tipo?: string): string {
  if (tipo && TIPOS_VALIDOS.includes(tipo)) return tipo;

  const firstDigit = codigo.charAt(0);
  if (firstDigit === '1') return 'ATIVO';
  if (firstDigit === '2') return 'PASSIVO';
  if (firstDigit === '3') return 'RECEITA';
  if (firstDigit === '4') return 'DESPESA';

  if (descricaoUpper.includes('ATIVO')) return 'ATIVO';
  if (descricaoUpper.includes('PASSIVO')) return 'PASSIVO';
  if (descricaoUpper.includes('RECEITA')) return 'RECEITA';
  if (descricaoUpper.includes('DESPESA')) return 'DESPESA';

  return 'DESPESA';
}

export const importar = asyncHandler(async (req: Request, res: Response) => {
  const empresaId = getEmpresaId(req);
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    throw new AppError(400, 'Nenhum arquivo enviado');
  }

  const ext = (file.originalname || '').toLowerCase().split('.').pop();
  let entries: ParsedConta[];

  if (ext === 'xlsx' || ext === 'xls') {
    entries = await parseExcel(file.buffer);
  } else if (ext === 'pdf') {
    entries = await parsePdf(file.buffer);
  } else {
    throw new AppError(400, 'Formato de arquivo não suportado. Envie .xlsx, .xls ou .pdf');
  }

  if (entries.length === 0) {
    throw new AppError(400, 'Nenhuma conta encontrada no arquivo');
  }

  const existing = await prisma.planoContas.findMany({
    where: { empresaId },
    select: { codigo: true, id: true },
  });
  const existingMap = new Map(existing.map((e) => [e.codigo, e.id]));

  let importados = 0;
  let ignorados = 0;
  const erros: string[] = [];

  const sortedEntries = entries.sort((a, b) => {
    const aParts = a.codigo.split('.').length;
    const bParts = b.codigo.split('.').length;
    return aParts - bParts || a.codigo.localeCompare(b.codigo);
  });

  for (const entry of sortedEntries) {
    try {
      if (existingMap.has(entry.codigo)) {
        ignorados++;
        continue;
      }

      const nivel = calcNivel(entry.codigo);
      const paiCodigo = parentCodigo(entry.codigo);
      let paiId: number | null = null;
      if (paiCodigo) {
        paiId = existingMap.get(paiCodigo) ?? null;
      }

      const tipo = inferTipo(entry.codigo, entry.descricao.toUpperCase(), entry.tipo);

      const created = await prisma.planoContas.create({
        data: {
          empresaId,
          codigo: entry.codigo,
          descricao: entry.descricao,
          nivel,
          paiId,
          tipo,
          ativo: true,
        },
      });

      existingMap.set(entry.codigo, created.id);
      importados++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      erros.push(`Código ${entry.codigo}: ${msg}`);
    }
  }

  return res.json({
    success: true,
    data: { importados, ignorados, erros },
  });
});
