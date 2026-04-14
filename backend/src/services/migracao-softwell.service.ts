import { prisma } from '../config/database';
import { logger } from '../config/logger';
import fs from 'fs';
import path from 'path';

interface MigracaoResult {
  entidade: string;
  total: number;
  importados: number;
  erros: number;
  duplicatas: number;
  detalhesErros: string[];
}

export class MigracaoSoftwellService {
  static async importarFornecedores(
    csvPath: string,
    empresaId: number
  ): Promise<MigracaoResult> {
    const result: MigracaoResult = {
      entidade: 'Fornecedor',
      total: 0,
      importados: 0,
      erros: 0,
      duplicatas: 0,
      detalhesErros: [],
    };

    try {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(';').map((h) => h.trim());

      for (let i = 1; i < lines.length; i++) {
        result.total++;
        const values = lines[i].split(';').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => (row[h] = values[idx] || ''));

        try {
          const existing = await prisma.fornecedor.findUnique({
            where: { empresaId_cnpjCpf: { empresaId, cnpjCpf: row['CNPJ_CPF'] || '' } },
          });

          if (existing) {
            result.duplicatas++;
            continue;
          }

          await prisma.fornecedor.create({
            data: {
              empresaId,
              razaoSocial: row['RAZAO_SOCIAL'] || row['NOME'] || 'N/A',
              cnpjCpf: row['CNPJ_CPF'] || '',
              tipo: (row['CNPJ_CPF'] || '').length > 14 ? 'PJ' : 'PF',
              endereco: row['ENDERECO'],
              cidade: row['CIDADE'],
              estado: row['UF'],
              telefone: row['TELEFONE'],
              email: row['EMAIL'],
            },
          });
          result.importados++;
        } catch (err) {
          result.erros++;
          result.detalhesErros.push(`Linha ${i + 1}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      logger.error('Migration error', { error: err });
      throw err;
    }

    logger.info('Fornecedores migration completed', result);
    return result;
  }

  static async importarClientes(
    csvPath: string,
    empresaId: number
  ): Promise<MigracaoResult> {
    const result: MigracaoResult = {
      entidade: 'Cliente',
      total: 0,
      importados: 0,
      erros: 0,
      duplicatas: 0,
      detalhesErros: [],
    };

    try {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(';').map((h) => h.trim());

      for (let i = 1; i < lines.length; i++) {
        result.total++;
        const values = lines[i].split(';').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => (row[h] = values[idx] || ''));

        try {
          const existing = await prisma.cliente.findUnique({
            where: { empresaId_cnpjCpf: { empresaId, cnpjCpf: row['CNPJ_CPF'] || '' } },
          });

          if (existing) {
            result.duplicatas++;
            continue;
          }

          await prisma.cliente.create({
            data: {
              empresaId,
              razaoSocial: row['RAZAO_SOCIAL'] || row['NOME'] || 'N/A',
              cnpjCpf: row['CNPJ_CPF'] || '',
              tipo: (row['CNPJ_CPF'] || '').length > 14 ? 'PJ' : 'PF',
              endereco: row['ENDERECO'],
              cidade: row['CIDADE'],
              estado: row['UF'],
              telefone: row['TELEFONE'],
              email: row['EMAIL'],
            },
          });
          result.importados++;
        } catch (err) {
          result.erros++;
          result.detalhesErros.push(`Linha ${i + 1}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      logger.error('Migration error', { error: err });
      throw err;
    }

    logger.info('Clientes migration completed', result);
    return result;
  }

  static async importarContasPagar(
    csvPath: string,
    empresaId: number,
    criadorId: number
  ): Promise<MigracaoResult> {
    const result: MigracaoResult = {
      entidade: 'ContaPagar',
      total: 0,
      importados: 0,
      erros: 0,
      duplicatas: 0,
      detalhesErros: [],
    };

    try {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(';').map((h) => h.trim());

      for (let i = 1; i < lines.length; i++) {
        result.total++;
        const values = lines[i].split(';').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => (row[h] = values[idx] || ''));

        try {
          const valor = parseFloat(row['VALOR']?.replace(',', '.') || '0');
          const dataVencimento = this.parseDate(row['DATA_VENCIMENTO']);
          const dataPagamento = row['DATA_PAGAMENTO'] ? this.parseDate(row['DATA_PAGAMENTO']) : null;

          await prisma.contaPagar.create({
            data: {
              empresaId,
              criadorId,
              descricao: row['DESCRICAO'] || row['HISTORICO'] || 'Migração Softwell',
              valor,
              dataVencimento,
              dataPagamento,
              valorPago: dataPagamento ? valor : null,
              status: dataPagamento ? 'PAGO' : 'PENDENTE',
              origemLancamento: 'MANUAL',
            },
          });
          result.importados++;
        } catch (err) {
          result.erros++;
          result.detalhesErros.push(`Linha ${i + 1}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      logger.error('Migration error', { error: err });
      throw err;
    }

    logger.info('ContasPagar migration completed', result);
    return result;
  }

  static async importarContasReceber(
    csvPath: string,
    empresaId: number,
    criadorId: number
  ): Promise<MigracaoResult> {
    const result: MigracaoResult = {
      entidade: 'ContaReceber',
      total: 0,
      importados: 0,
      erros: 0,
      duplicatas: 0,
      detalhesErros: [],
    };

    try {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(';').map((h) => h.trim());

      for (let i = 1; i < lines.length; i++) {
        result.total++;
        const values = lines[i].split(';').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => (row[h] = values[idx] || ''));

        try {
          const valor = parseFloat(row['VALOR']?.replace(',', '.') || '0');
          const dataVencimento = this.parseDate(row['DATA_VENCIMENTO']);
          const dataRecebimento = row['DATA_RECEBIMENTO'] ? this.parseDate(row['DATA_RECEBIMENTO']) : null;

          await prisma.contaReceber.create({
            data: {
              empresaId,
              criadorId,
              descricao: row['DESCRICAO'] || row['HISTORICO'] || 'Migração Softwell',
              valor,
              dataVencimento,
              dataRecebimento,
              valorRecebido: dataRecebimento ? valor : null,
              status: dataRecebimento ? 'RECEBIDO' : 'PENDENTE',
              origemLancamento: 'MANUAL',
            },
          });
          result.importados++;
        } catch (err) {
          result.erros++;
          result.detalhesErros.push(`Linha ${i + 1}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      logger.error('Migration error', { error: err });
      throw err;
    }

    logger.info('ContasReceber migration completed', result);
    return result;
  }

  static async gerarRelatorio(results: MigracaoResult[]): Promise<string> {
    const lines: string[] = [
      '=== RELATÓRIO DE MIGRAÇÃO SOFTWELL ===',
      `Data: ${new Date().toISOString()}`,
      '',
    ];

    for (const r of results) {
      lines.push(`--- ${r.entidade} ---`);
      lines.push(`Total de registros: ${r.total}`);
      lines.push(`Importados com sucesso: ${r.importados}`);
      lines.push(`Duplicatas ignoradas: ${r.duplicatas}`);
      lines.push(`Erros: ${r.erros}`);
      if (r.detalhesErros.length > 0) {
        lines.push('Detalhes dos erros:');
        r.detalhesErros.forEach((e) => lines.push(`  - ${e}`));
      }
      lines.push('');
    }

    const totalImportados = results.reduce((s, r) => s + r.importados, 0);
    const totalErros = results.reduce((s, r) => s + r.erros, 0);
    lines.push(`=== TOTAL: ${totalImportados} importados, ${totalErros} erros ===`);

    const report = lines.join('\n');
    const reportPath = path.join(process.cwd(), 'logs', `migracao_${Date.now()}.txt`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);

    return report;
  }

  private static parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    // DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    // YYYY-MM-DD
    return new Date(dateStr);
  }
}
