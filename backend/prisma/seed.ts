import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  { modulo: 'dashboard', acao: 'visualizar', descricao: 'Visualizar dashboard' },
  { modulo: 'contas_pagar', acao: 'visualizar', descricao: 'Visualizar contas a pagar' },
  { modulo: 'contas_pagar', acao: 'criar', descricao: 'Criar contas a pagar' },
  { modulo: 'contas_pagar', acao: 'editar', descricao: 'Editar contas a pagar' },
  { modulo: 'contas_pagar', acao: 'excluir', descricao: 'Excluir contas a pagar' },
  { modulo: 'contas_pagar', acao: 'aprovar', descricao: 'Aprovar contas a pagar' },
  { modulo: 'contas_pagar', acao: 'baixar', descricao: 'Baixar/pagar contas' },
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
  { modulo: 'viagens', acao: 'liberar_adiantamento', descricao: 'Liberar adiantamento' },
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
  { modulo: 'admin', acao: 'perfis', descricao: 'Gerenciar perfis' },
  { modulo: 'admin', acao: 'auditoria', descricao: 'Visualizar auditoria' },
];

const DEFAULT_PROFILES: Record<string, string[]> = {
  Administrador: ['*'],
  Financeiro: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_pagar:criar', 'contas_pagar:editar', 'contas_pagar:aprovar', 'contas_pagar:baixar',
    'contas_receber:visualizar', 'contas_receber:criar', 'contas_receber:editar', 'contas_receber:baixar',
    'fluxo_caixa:visualizar', 'dre:visualizar',
    'conciliacao:visualizar', 'conciliacao:criar',
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
  Aprovador: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_pagar:aprovar',
    'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar',
    'caixa_entrada:visualizar', 'caixa_entrada:aprovar',
    'viagens:visualizar', 'viagens:aprovar_gestor',
    'cadastros:visualizar',
    'relatorios:visualizar',
  ],
  Gestor: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar',
    'contratos:visualizar',
    'viagens:visualizar', 'viagens:criar', 'viagens:aprovar_gestor',
    'cadastros:visualizar',
    'relatorios:visualizar',
    'comissoes:visualizar',
  ],
  Auditor: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar',
    'conciliacao:visualizar',
    'contratos:visualizar', 'comissoes:visualizar',
    'emprestimos:visualizar',
    'parcelamento_impostos:visualizar', 'apuracao_impostos:visualizar',
    'cadastros:visualizar',
    'relatorios:visualizar', 'relatorios:exportar',
    'admin:auditoria',
  ],
  Consulta: [
    'dashboard:visualizar',
    'contas_pagar:visualizar', 'contas_receber:visualizar',
    'fluxo_caixa:visualizar', 'dre:visualizar',
    'cadastros:visualizar',
    'relatorios:visualizar',
  ],
};

async function main() {
  const senhaHash = await bcrypt.hash('master2026', 12);

  // Seed permissions
  const permissionMap = new Map<string, number>();
  for (const perm of ALL_PERMISSIONS) {
    const created = await prisma.permissao.upsert({
      where: { modulo_acao: { modulo: perm.modulo, acao: perm.acao } },
      update: { descricao: perm.descricao },
      create: perm,
    });
    permissionMap.set(`${perm.modulo}:${perm.acao}`, created.id);
  }

  // Seed default profiles (global - empresaId null)
  const allPermIds = Array.from(permissionMap.values());
  for (const [nome, perms] of Object.entries(DEFAULT_PROFILES)) {
    const existing = await prisma.perfil.findFirst({
      where: { nome, empresaId: null },
    });

    if (!existing) {
      const ids = perms.includes('*')
        ? allPermIds
        : perms.map((p) => permissionMap.get(p)).filter(Boolean) as number[];

      await prisma.perfil.create({
        data: {
          nome,
          descricao: `Perfil padrão: ${nome}`,
          sistema: true,
          permissoes: { create: ids.map((permissaoId) => ({ permissaoId })) },
        },
      });
    }
  }

  // Seed grupo empresarial
  const grupo = await prisma.grupoEmpresarial.upsert({
    where: { id: 1 },
    update: {},
    create: { nome: 'Grupo Demo', descricao: 'Grupo empresarial de demonstração' },
  });

  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: { grupoId: grupo.id },
    create: {
      razaoSocial: 'Empresa Demonstração Ltda',
      nomeFantasia: 'Demo Corp',
      cnpj: '00.000.000/0001-00',
      regimeTributario: 'LUCRO_PRESUMIDO',
      cidade: 'São Paulo',
      estado: 'SP',
      email: 'contato@demo.com.br',
      grupoId: grupo.id,
    },
  });

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@demo.com.br' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@demo.com.br',
      senha: senhaHash,
    },
  });

  const adminPerfil = await prisma.perfil.findFirst({
    where: { nome: 'Administrador', empresaId: null },
  });

  await prisma.usuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId: admin.id, empresaId: empresa.id } },
    update: { perfilId: adminPerfil?.id },
    create: {
      usuarioId: admin.id,
      empresaId: empresa.id,
      perfil: 'ADMIN',
      perfilId: adminPerfil?.id,
    },
  });

  const categorias = [
    { nome: 'Salários e Encargos', tipo: 'CP', grupoDRE: 'DESPESAS_PESSOAL' },
    { nome: 'Aluguel', tipo: 'CP', grupoDRE: 'DESPESAS_OPERACIONAIS' },
    { nome: 'Serviços de TI', tipo: 'AMBOS', grupoDRE: 'DESPESAS_OPERACIONAIS' },
    { nome: 'Prestação de Serviços', tipo: 'CR', grupoDRE: 'RECEITA_OPERACIONAL' },
    { nome: 'Licenciamento de Software', tipo: 'CR', grupoDRE: 'RECEITA_OPERACIONAL' },
    { nome: 'Energia Elétrica', tipo: 'CP', grupoDRE: 'DESPESAS_OPERACIONAIS' },
    { nome: 'Transporte', tipo: 'CP', grupoDRE: 'DESPESAS_VIAGEM' },
    { nome: 'Hospedagem', tipo: 'CP', grupoDRE: 'DESPESAS_VIAGEM' },
    { nome: 'Alimentação', tipo: 'CP', grupoDRE: 'DESPESAS_VIAGEM' },
    { nome: 'Material de Escritório', tipo: 'CP', grupoDRE: 'DESPESAS_OPERACIONAIS' },
  ];
  for (const cat of categorias) {
    const exists = await prisma.categoriaFinanceira.findFirst({
      where: { empresaId: empresa.id, nome: cat.nome },
    });
    if (!exists) {
      await prisma.categoriaFinanceira.create({
        data: { empresaId: empresa.id, ...cat },
      });
    }
  }

  const centrosCusto = [
    { codigo: 'ADM', nome: 'Administrativo' },
    { codigo: 'TI', nome: 'Tecnologia da Informação' },
    { codigo: 'COM', nome: 'Comercial' },
    { codigo: 'FIN', nome: 'Financeiro' },
    { codigo: 'RH', nome: 'Recursos Humanos' },
  ];
  for (const cc of centrosCusto) {
    const exists = await prisma.centroCusto.findFirst({
      where: { empresaId: empresa.id, codigo: cc.codigo },
    });
    if (!exists) {
      await prisma.centroCusto.create({
        data: { empresaId: empresa.id, ...cc },
      });
    }
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
