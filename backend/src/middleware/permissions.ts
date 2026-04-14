import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

const permissionsCache = new Map<string, { permissions: string[]; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function loadPermissions(perfilId: number): Promise<string[]> {
  const cacheKey = `perfil:${perfilId}`;
  const cached = permissionsCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.permissions;
  }

  const perfilPermissoes = await prisma.perfilPermissao.findMany({
    where: { perfilId },
    include: { permissao: true },
  });

  const permissions = perfilPermissoes.map(
    (pp) => `${pp.permissao.modulo}:${pp.permissao.acao}`,
  );

  permissionsCache.set(cacheKey, { permissions, expiry: Date.now() + CACHE_TTL });
  return permissions;
}

async function resolvePerfilId(userId: number, empresaId: number): Promise<number | null> {
  const ue = await prisma.usuarioEmpresa.findFirst({
    where: { usuarioId: userId, empresaId },
  });
  return ue?.perfilId ?? null;
}

const LEGACY_PERMISSION_MAP: Record<string, string[]> = {
  ADMIN: ['*'],
  FINANCEIRO: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_pagar:criar', 'contas_pagar:editar', 'contas_pagar:aprovar', 'contas_pagar:baixar',
    'contas_receber:visualizar', 'contas_receber:criar', 'contas_receber:editar', 'contas_receber:baixar',
    'fluxo_caixa:visualizar', 'dre:visualizar', 'conciliacao:visualizar', 'conciliacao:criar',
    'transferencias:visualizar', 'transferencias:criar',
    'boletos:visualizar', 'boletos:criar', 'nfe:visualizar', 'nfe:criar',
    'contratos:visualizar', 'contratos:criar', 'contratos:editar',
    'comissoes:visualizar', 'comissoes:criar',
    'viagens:visualizar', 'viagens:aprovar_financeiro', 'viagens:liberar_adiantamento', 'viagens:concluir',
    'caixa_entrada:visualizar', 'caixa_entrada:aprovar',
    'emprestimos:visualizar', 'emprestimos:criar', 'emprestimos:editar',
    'parcelamento_impostos:visualizar', 'parcelamento_impostos:criar',
    'apuracao_impostos:visualizar', 'apuracao_impostos:criar',
    'cadastros:visualizar', 'cadastros:criar', 'cadastros:editar',
    'relatorios:visualizar', 'relatorios:exportar',
  ],
  APROVADOR: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_pagar:aprovar',
    'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar',
    'caixa_entrada:visualizar', 'caixa_entrada:aprovar',
    'viagens:visualizar', 'viagens:aprovar_gestor',
    'cadastros:visualizar',
    'relatorios:visualizar',
  ],
  GESTOR: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar',
    'contratos:visualizar',
    'viagens:visualizar', 'viagens:criar', 'viagens:aprovar_gestor',
    'cadastros:visualizar',
    'relatorios:visualizar',
    'comissoes:visualizar',
  ],
  VISUALIZADOR: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar',
    'cadastros:visualizar',
    'relatorios:visualizar',
  ],
  COLABORADOR: [
    'dashboard:visualizar',
    'viagens:visualizar', 'viagens:criar',
    'caixa_entrada:visualizar', 'caixa_entrada:criar',
  ],
};

function hasLegacyPermission(perfil: string, permission: string): boolean {
  const perms = LEGACY_PERMISSION_MAP[perfil];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function requirePermission(...permissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Não autenticado');
    }

    const { userId, empresaId, perfil } = req.user;

    const perfilId = req.user.perfilId;
    if (perfilId) {
      const userPerms = await loadPermissions(perfilId);
      const hasAll = userPerms.includes('*') ||
        permissions.every((p) => userPerms.includes(p));
      if (hasAll) return next();
      throw new AppError(403, 'Sem permissão para esta operação');
    }

    const resolved = await resolvePerfilId(userId, empresaId);
    if (resolved) {
      const userPerms = await loadPermissions(resolved);
      const hasAll = userPerms.includes('*') ||
        permissions.every((p) => userPerms.includes(p));
      if (hasAll) return next();
      throw new AppError(403, 'Sem permissão para esta operação');
    }

    const hasLegacy = permissions.every((p) => hasLegacyPermission(perfil, p));
    if (hasLegacy) return next();

    throw new AppError(403, 'Sem permissão para esta operação');
  };
}

export function clearPermissionsCache(perfilId?: number) {
  if (perfilId) {
    permissionsCache.delete(`perfil:${perfilId}`);
  } else {
    permissionsCache.clear();
  }
}
