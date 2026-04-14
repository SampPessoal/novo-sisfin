import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { clearPermissionsCache } from '../../middleware/permissions';

const ALL_PERMISSIONS = [
  { modulo: 'dashboard', acao: 'visualizar', descricao: 'Visualizar dashboard' },
  { modulo: 'contas_pagar', acao: 'visualizar', descricao: 'Visualizar contas a pagar' },
  { modulo: 'contas_pagar', acao: 'criar', descricao: 'Criar contas a pagar' },
  { modulo: 'contas_pagar', acao: 'editar', descricao: 'Editar contas a pagar' },
  { modulo: 'contas_pagar', acao: 'excluir', descricao: 'Excluir contas a pagar' },
  { modulo: 'contas_pagar', acao: 'aprovar', descricao: 'Aprovar contas a pagar' },
  { modulo: 'contas_pagar', acao: 'baixar', descricao: 'Baixar/pagar contas a pagar' },
  { modulo: 'contas_receber', acao: 'visualizar', descricao: 'Visualizar contas a receber' },
  { modulo: 'contas_receber', acao: 'criar', descricao: 'Criar contas a receber' },
  { modulo: 'contas_receber', acao: 'editar', descricao: 'Editar contas a receber' },
  { modulo: 'contas_receber', acao: 'excluir', descricao: 'Excluir contas a receber' },
  { modulo: 'contas_receber', acao: 'baixar', descricao: 'Baixar contas a receber' },
  { modulo: 'fluxo_caixa', acao: 'visualizar', descricao: 'Visualizar fluxo de caixa' },
  { modulo: 'dre', acao: 'visualizar', descricao: 'Visualizar DRE' },
  { modulo: 'conciliacao', acao: 'visualizar', descricao: 'Visualizar conciliação' },
  { modulo: 'conciliacao', acao: 'criar', descricao: 'Importar extrato / conciliar' },
  { modulo: 'transferencias', acao: 'visualizar', descricao: 'Visualizar transferências' },
  { modulo: 'transferencias', acao: 'criar', descricao: 'Criar transferências' },
  { modulo: 'boletos', acao: 'visualizar', descricao: 'Visualizar boletos/PIX' },
  { modulo: 'boletos', acao: 'criar', descricao: 'Emitir boletos/PIX' },
  { modulo: 'nfe', acao: 'visualizar', descricao: 'Visualizar notas fiscais' },
  { modulo: 'nfe', acao: 'criar', descricao: 'Emitir notas fiscais' },
  { modulo: 'contratos', acao: 'visualizar', descricao: 'Visualizar contratos' },
  { modulo: 'contratos', acao: 'criar', descricao: 'Criar contratos' },
  { modulo: 'contratos', acao: 'editar', descricao: 'Editar contratos' },
  { modulo: 'comissoes', acao: 'visualizar', descricao: 'Visualizar comissões' },
  { modulo: 'comissoes', acao: 'criar', descricao: 'Gerenciar comissões' },
  { modulo: 'viagens', acao: 'visualizar', descricao: 'Visualizar viagens' },
  { modulo: 'viagens', acao: 'criar', descricao: 'Solicitar viagens' },
  { modulo: 'viagens', acao: 'aprovar_gestor', descricao: 'Aprovar viagens (gestor)' },
  { modulo: 'viagens', acao: 'aprovar_financeiro', descricao: 'Aprovar viagens (financeiro)' },
  { modulo: 'viagens', acao: 'liberar_adiantamento', descricao: 'Liberar adiantamento de viagem' },
  { modulo: 'viagens', acao: 'concluir', descricao: 'Concluir viagens' },
  { modulo: 'caixa_entrada', acao: 'visualizar', descricao: 'Visualizar caixa de entrada' },
  { modulo: 'caixa_entrada', acao: 'criar', descricao: 'Upload de comprovantes' },
  { modulo: 'caixa_entrada', acao: 'aprovar', descricao: 'Aprovar pré-lançamentos' },
  { modulo: 'emprestimos', acao: 'visualizar', descricao: 'Visualizar empréstimos' },
  { modulo: 'emprestimos', acao: 'criar', descricao: 'Criar empréstimos' },
  { modulo: 'emprestimos', acao: 'editar', descricao: 'Editar empréstimos' },
  { modulo: 'parcelamento_impostos', acao: 'visualizar', descricao: 'Visualizar parcelamentos' },
  { modulo: 'parcelamento_impostos', acao: 'criar', descricao: 'Criar parcelamentos' },
  { modulo: 'apuracao_impostos', acao: 'visualizar', descricao: 'Visualizar apurações' },
  { modulo: 'apuracao_impostos', acao: 'criar', descricao: 'Criar apurações' },
  { modulo: 'cadastros', acao: 'visualizar', descricao: 'Visualizar cadastros' },
  { modulo: 'cadastros', acao: 'criar', descricao: 'Criar cadastros' },
  { modulo: 'cadastros', acao: 'editar', descricao: 'Editar cadastros' },
  { modulo: 'cadastros', acao: 'excluir', descricao: 'Excluir cadastros' },
  { modulo: 'relatorios', acao: 'visualizar', descricao: 'Visualizar relatórios' },
  { modulo: 'relatorios', acao: 'exportar', descricao: 'Exportar relatórios' },
  { modulo: 'admin', acao: 'usuarios', descricao: 'Gerenciar usuários' },
  { modulo: 'admin', acao: 'empresas', descricao: 'Gerenciar empresas' },
  { modulo: 'admin', acao: 'perfis', descricao: 'Gerenciar perfis e permissões' },
  { modulo: 'admin', acao: 'auditoria', descricao: 'Visualizar auditoria' },
];

export class PerfilService {
  static async seedPermissions() {
    for (const perm of ALL_PERMISSIONS) {
      await prisma.permissao.upsert({
        where: { modulo_acao: { modulo: perm.modulo, acao: perm.acao } },
        update: { descricao: perm.descricao },
        create: perm,
      });
    }
  }

  static async listPermissions() {
    return prisma.permissao.findMany({ orderBy: [{ modulo: 'asc' }, { acao: 'asc' }] });
  }

  static async list(empresaId?: number) {
    return prisma.perfil.findMany({
      where: {
        OR: [{ empresaId: null }, ...(empresaId ? [{ empresaId }] : [])],
      },
      include: {
        permissoes: { include: { permissao: true } },
        _count: { select: { usuarios: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  static async getById(id: number) {
    const perfil = await prisma.perfil.findUnique({
      where: { id },
      include: {
        permissoes: { include: { permissao: true } },
        _count: { select: { usuarios: true } },
      },
    });
    if (!perfil) throw new AppError(404, 'Perfil não encontrado');
    return perfil;
  }

  static async create(data: {
    empresaId?: number;
    nome: string;
    descricao?: string;
    permissaoIds: number[];
  }) {
    const perfil = await prisma.perfil.create({
      data: {
        empresaId: data.empresaId,
        nome: data.nome,
        descricao: data.descricao,
        permissoes: {
          create: data.permissaoIds.map((permissaoId) => ({ permissaoId })),
        },
      },
      include: { permissoes: { include: { permissao: true } } },
    });
    return perfil;
  }

  static async update(
    id: number,
    data: { nome?: string; descricao?: string; permissaoIds?: number[] },
  ) {
    const existing = await prisma.perfil.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Perfil não encontrado');
    if (existing.sistema) throw new AppError(400, 'Perfis do sistema não podem ser editados');

    if (data.permissaoIds) {
      await prisma.perfilPermissao.deleteMany({ where: { perfilId: id } });
      await prisma.perfilPermissao.createMany({
        data: data.permissaoIds.map((permissaoId) => ({ perfilId: id, permissaoId })),
      });
    }

    const perfil = await prisma.perfil.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
      },
      include: { permissoes: { include: { permissao: true } } },
    });

    clearPermissionsCache(id);
    return perfil;
  }

  static async remove(id: number) {
    const existing = await prisma.perfil.findUnique({
      where: { id },
      include: { _count: { select: { usuarios: true } } },
    });
    if (!existing) throw new AppError(404, 'Perfil não encontrado');
    if (existing.sistema) throw new AppError(400, 'Perfis do sistema não podem ser removidos');
    if (existing._count.usuarios > 0) {
      throw new AppError(400, 'Perfil em uso por usuários. Remova os vínculos antes.');
    }

    await prisma.perfil.delete({ where: { id } });
    clearPermissionsCache(id);
  }
}
