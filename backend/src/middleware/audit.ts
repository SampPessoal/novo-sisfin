import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export function auditLog(entidade: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    let dadosAntes: string | null = null;

    if (['PUT', 'PATCH', 'DELETE'].includes(req.method) && req.params.id) {
      try {
        const id = parseInt(req.params.id as string);
        if (!isNaN(id)) {
          const modelMap: Record<string, string> = {
            ContaPagar: 'contaPagar',
            ContaReceber: 'contaReceber',
            Fornecedor: 'fornecedor',
            Cliente: 'cliente',
            Contrato: 'contrato',
            Empresa: 'empresa',
            Usuario: 'usuario',
            Perfil: 'perfil',
            CategoriaFinanceira: 'categoriaFinanceira',
            CentroCusto: 'centroCusto',
            ContaBancaria: 'contaBancaria',
            Emprestimo: 'emprestimo',
            ParcelamentoImposto: 'parcelamentoImposto',
            TransferenciaBancaria: 'transferenciaBancaria',
          };
          const modelName = modelMap[entidade];
          if (modelName && (prisma as any)[modelName]) {
            const record = await (prisma as any)[modelName].findUnique({ where: { id } });
            if (record) {
              dadosAntes = JSON.stringify(record);
            }
          }
        }
      } catch {
        // non-critical, proceed without dadosAntes
      }
    }

    const originalJson = _res.json.bind(_res);

    _res.json = function (body: unknown) {
      if (req.user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const acao = req.method === 'POST' ? 'CRIAR'
          : req.method === 'DELETE' ? 'EXCLUIR'
          : 'ATUALIZAR';

        prisma.auditLog.create({
          data: {
            usuarioId: req.user.userId,
            empresaId: req.user.empresaId,
            acao,
            entidade,
            entidadeId: req.params.id ? parseInt(req.params.id as string) : null,
            dadosAntes,
            dadosDepois: typeof body === 'object' ? JSON.stringify(body) : null,
            ip: req.ip || req.socket.remoteAddress || 'unknown',
          },
        }).catch((err) => {
          logger.error('Failed to create audit log', { error: err.message });
        });
      }

      return originalJson(body);
    };

    next();
  };
}
