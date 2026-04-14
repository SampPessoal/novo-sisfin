import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { PaginationOptions } from '../../utils/pagination';

const createUsuarioSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(255),
  email: z.string().email('E-mail inválido').max(255),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  telefone: z.string().max(20).optional(),
  telefoneWhatsApp: z.string().max(20).optional(),
  empresas: z.array(z.object({
    empresaId: z.number().int().positive(),
    perfil: z.string().min(1),
  })).min(1, 'Pelo menos uma empresa deve ser vinculada'),
});

const updateUsuarioSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  email: z.string().email('E-mail inválido').max(255).optional(),
  senha: z.string().min(6).optional(),
  telefone: z.string().max(20).nullable().optional(),
  telefoneWhatsApp: z.string().max(20).nullable().optional(),
  empresas: z.array(z.object({
    empresaId: z.number().int().positive(),
    perfil: z.string().min(1),
  })).optional(),
});

export class UsuarioService {
  static async list(empresaId: number, pagination: PaginationOptions) {
    const where = {
      empresas: { some: { empresaId } },
      ...(pagination.search && {
        OR: [
          { nome: { contains: pagination.search } },
          { email: { contains: pagination.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          telefoneWhatsApp: true,
          twoFactorAtivo: true,
          ativo: true,
          ultimoLogin: true,
          criadoEm: true,
          atualizadoEm: true,
          empresas: {
            where: { empresaId },
            select: { perfil: true, empresaId: true },
          },
        },
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.usuario.count({ where }),
    ]);

    return { data, total };
  }

  static async findById(id: number, empresaId?: number) {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        telefoneWhatsApp: true,
        twoFactorAtivo: true,
        ativo: true,
        ultimoLogin: true,
        criadoEm: true,
        atualizadoEm: true,
        empresas: {
          include: { empresa: { select: { id: true, razaoSocial: true } } },
          ...(empresaId && { where: { empresaId } }),
        },
      },
    });

    if (!usuario) {
      throw new AppError(404, 'Usuário não encontrado');
    }

    return usuario;
  }

  static async create(data: z.infer<typeof createUsuarioSchema>) {
    const input = createUsuarioSchema.parse(data);

    const existente = await prisma.usuario.findUnique({ where: { email: input.email } });
    if (existente) {
      throw new AppError(409, 'Já existe um usuário com este e-mail');
    }

    const senhaHash = await bcrypt.hash(input.senha, 12);

    return prisma.usuario.create({
      data: {
        nome: input.nome,
        email: input.email,
        senha: senhaHash,
        telefone: input.telefone,
        telefoneWhatsApp: input.telefoneWhatsApp,
        empresas: {
          create: input.empresas.map((e) => ({
            empresaId: e.empresaId,
            perfil: e.perfil,
          })),
        },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        telefoneWhatsApp: true,
        ativo: true,
        criadoEm: true,
        empresas: {
          select: { empresaId: true, perfil: true },
        },
      },
    });
  }

  static async update(id: number, data: z.infer<typeof updateUsuarioSchema>) {
    const input = updateUsuarioSchema.parse(data);

    await this.findById(id);

    if (input.email) {
      const existente = await prisma.usuario.findFirst({
        where: { email: input.email, NOT: { id } },
      });
      if (existente) {
        throw new AppError(409, 'Já existe outro usuário com este e-mail');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (input.nome !== undefined) updateData.nome = input.nome;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.telefone !== undefined) updateData.telefone = input.telefone;
    if (input.telefoneWhatsApp !== undefined) updateData.telefoneWhatsApp = input.telefoneWhatsApp;

    if (input.senha) {
      updateData.senha = await bcrypt.hash(input.senha, 12);
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        telefoneWhatsApp: true,
        twoFactorAtivo: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        empresas: {
          select: { empresaId: true, perfil: true },
        },
      },
    });

    if (input.empresas) {
      await prisma.usuarioEmpresa.deleteMany({ where: { usuarioId: id } });
      await prisma.usuarioEmpresa.createMany({
        data: input.empresas.map((e) => ({
          usuarioId: id,
          empresaId: e.empresaId,
          perfil: e.perfil,
        })),
      });
    }

    return usuario;
  }

  static async delete(id: number) {
    await this.findById(id);
    return prisma.usuario.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
