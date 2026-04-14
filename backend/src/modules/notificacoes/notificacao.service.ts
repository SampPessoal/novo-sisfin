import { prisma } from '../../config/database';

export class NotificacaoService {
  static async list(usuarioId: number, empresaId: number, apenasNaoLidas = false) {
    return prisma.notificacao.findMany({
      where: {
        usuarioId,
        empresaId,
        ...(apenasNaoLidas ? { lida: false } : {}),
      },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    });
  }

  static async countNaoLidas(usuarioId: number, empresaId: number) {
    return prisma.notificacao.count({
      where: { usuarioId, empresaId, lida: false },
    });
  }

  static async marcarComoLida(id: number, usuarioId: number) {
    return prisma.notificacao.updateMany({
      where: { id, usuarioId },
      data: { lida: true, lidaEm: new Date() },
    });
  }

  static async marcarTodasComoLidas(usuarioId: number, empresaId: number) {
    return prisma.notificacao.updateMany({
      where: { usuarioId, empresaId, lida: false },
      data: { lida: true, lidaEm: new Date() },
    });
  }

  static async criar(data: {
    empresaId: number;
    usuarioId: number;
    tipo: string;
    titulo: string;
    mensagem: string;
    link?: string;
  }) {
    return prisma.notificacao.create({ data });
  }

  static async criarParaPerfil(data: {
    empresaId: number;
    perfil: string;
    tipo: string;
    titulo: string;
    mensagem: string;
    link?: string;
  }) {
    const usuarios = await prisma.usuarioEmpresa.findMany({
      where: { empresaId: data.empresaId, perfil: data.perfil },
      select: { usuarioId: true },
    });

    if (usuarios.length === 0) return;

    await prisma.notificacao.createMany({
      data: usuarios.map((u) => ({
        empresaId: data.empresaId,
        usuarioId: u.usuarioId,
        tipo: data.tipo,
        titulo: data.titulo,
        mensagem: data.mensagem,
        link: data.link,
      })),
    });
  }
}
