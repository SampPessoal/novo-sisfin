import { useCallback } from 'react';
import { useAuth } from './useAuth';

const LEGACY_PERMISSION_MAP: Record<string, string[]> = {
  ADMIN: ['*'],
  FINANCEIRO: [
    'dashboard:visualizar', 'contas_pagar:*', 'contas_receber:*',
    'fluxo_caixa:visualizar', 'dre:visualizar', 'conciliacao:*', 'transferencias:*',
    'boletos:*', 'nfe:*', 'contratos:*', 'comissoes:*',
    'viagens:visualizar', 'viagens:aprovar_financeiro', 'viagens:liberar_adiantamento', 'viagens:concluir',
    'caixa_entrada:*', 'emprestimos:*', 'parcelamento_impostos:*', 'apuracao_impostos:*',
    'cadastros:*', 'relatorios:*',
  ],
  APROVADOR: [
    'dashboard:visualizar', 'contas_pagar:visualizar', 'contas_pagar:aprovar',
    'contas_receber:visualizar', 'fluxo_caixa:visualizar', 'dre:visualizar',
    'caixa_entrada:visualizar', 'caixa_entrada:aprovar',
    'viagens:visualizar', 'viagens:aprovar_gestor', 'cadastros:visualizar', 'relatorios:visualizar',
  ],
  GESTOR: [
    'dashboard:visualizar', 'contas_pagar:visualizar', 'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar', 'contratos:visualizar',
    'viagens:*', 'cadastros:visualizar', 'relatorios:visualizar', 'comissoes:visualizar',
  ],
  VISUALIZADOR: [
    'dashboard:visualizar', 'contas_pagar:visualizar', 'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar', 'cadastros:visualizar', 'relatorios:visualizar',
  ],
  COLABORADOR: [
    'dashboard:visualizar', 'viagens:visualizar', 'viagens:criar',
    'caixa_entrada:visualizar', 'caixa_entrada:criar',
  ],
};

function matchPermission(userPerms: string[], required: string): boolean {
  if (userPerms.includes('*')) return true;
  if (userPerms.includes(required)) return true;

  const [mod] = required.split(':');
  if (userPerms.includes(`${mod}:*`)) return true;
  return false;
}

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = useCallback(
    (...permissions: string[]): boolean => {
      if (!user) return false;
      const perfil = user.perfil;
      const perms = LEGACY_PERMISSION_MAP[perfil] ?? [];
      return permissions.every((p) => matchPermission(perms, p));
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (...permissions: string[]): boolean => {
      if (!user) return false;
      const perfil = user.perfil;
      const perms = LEGACY_PERMISSION_MAP[perfil] ?? [];
      return permissions.some((p) => matchPermission(perms, p));
    },
    [user],
  );

  const isAdmin = user?.perfil === 'ADMIN';

  return { hasPermission, hasAnyPermission, isAdmin };
}
