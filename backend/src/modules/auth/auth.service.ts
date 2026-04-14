import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import type { JWTPayload } from '../../middleware/auth';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
  empresaId: z.number().int().positive().optional(),
  codigoTOTP: z.string().length(6).optional(),
});

const refreshSchema = z.object({
  token: z.string().min(1, 'Refresh token obrigatório'),
});

const totpCodeSchema = z.object({
  code: z.string().length(6, 'Código TOTP deve ter 6 dígitos'),
});

export class AuthService {
  static async login(email: string, senha: string, empresaId?: number, codigoTOTP?: string) {
    const input = loginSchema.parse({ email, senha, empresaId, codigoTOTP });

    const usuario = await prisma.usuario.findUnique({
      where: { email: input.email },
      include: {
        empresas: {
          include: { empresa: true },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new AppError(401, 'Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(input.senha, usuario.senha);
    if (!senhaValida) {
      throw new AppError(401, 'Credenciais inválidas');
    }

    if (usuario.twoFactorAtivo) {
      if (!input.codigoTOTP) {
        return {
          require2FA: true,
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            empresas: usuario.empresas.map((ue) => ({
              id: ue.empresa.id,
              razaoSocial: ue.empresa.razaoSocial,
              perfil: ue.perfil,
            })),
          },
        };
      }

      if (!usuario.twoFactorSecret) {
        throw new AppError(500, 'Configuração 2FA inconsistente');
      }

      const valido = authenticator.verify({
        token: input.codigoTOTP,
        secret: usuario.twoFactorSecret,
      });

      if (!valido) {
        throw new AppError(401, 'Código 2FA inválido');
      }
    }

    if (usuario.empresas.length === 0) {
      throw new AppError(403, 'Usuário não vinculado a nenhuma empresa');
    }

    const empresaSelecionada = input.empresaId
      ? usuario.empresas.find((ue) => ue.empresaId === input.empresaId)
      : usuario.empresas[0];

    if (!empresaSelecionada) {
      throw new AppError(403, 'Acesso não autorizado a esta empresa');
    }

    const payload: JWTPayload = {
      userId: usuario.id,
      email: usuario.email,
      empresaId: empresaSelecionada.empresaId,
      perfil: empresaSelecionada.perfil,
      perfilId: empresaSelecionada.perfilId ?? undefined,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: usuario.id, type: 'refresh', jti: uuidv4() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
    );

    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    await prisma.$transaction([
      prisma.refreshToken.deleteMany({
        where: { usuarioId: usuario.id, expiraEm: { lt: new Date() } },
      }),
      prisma.refreshToken.create({
        data: { token: refreshToken, usuarioId: usuario.id, expiraEm },
      }),
    ]);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    return {
      token,
      refreshToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        empresas: usuario.empresas.map((ue) => ({
          id: ue.empresa.id,
          razaoSocial: ue.empresa.razaoSocial,
          perfil: ue.perfil,
          perfilId: ue.perfilId,
        })),
      },
    };
  }

  static async refreshToken(token: string) {
    const input = refreshSchema.parse({ token });

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: input.token },
    });

    if (!storedToken || storedToken.expiraEm < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AppError(401, 'Refresh token inválido ou expirado');
    }

    let decoded: { userId: number };
    try {
      decoded = jwt.verify(input.token, env.JWT_REFRESH_SECRET) as { userId: number };
    } catch {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError(401, 'Refresh token inválido');
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: {
        empresas: {
          include: { empresa: true },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError(401, 'Usuário não encontrado ou inativo');
    }

    const empresaPrincipal = usuario.empresas[0];
    if (!empresaPrincipal) {
      throw new AppError(403, 'Usuário não vinculado a nenhuma empresa');
    }

    const payload: JWTPayload = {
      userId: usuario.id,
      email: usuario.email,
      empresaId: empresaPrincipal.empresaId,
      perfil: empresaPrincipal.perfil,
      perfilId: empresaPrincipal.perfilId ?? undefined,
    };

    const newToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const newRefreshToken = jwt.sign(
      { userId: usuario.id, type: 'refresh', jti: uuidv4() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
    );

    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: { token: newRefreshToken, usuarioId: usuario.id, expiraEm },
      }),
    ]);

    return { token: newToken, refreshToken: newRefreshToken };
  }

  static async getMe(userId: number) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        twoFactorAtivo: true,
        empresas: {
          include: { empresa: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
        },
      },
    });

    if (!usuario) throw new AppError(404, 'Usuário não encontrado');

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      twoFactorAtivo: usuario.twoFactorAtivo,
      empresas: usuario.empresas.map((ue) => ({
        id: ue.empresa.id,
        razaoSocial: ue.empresa.razaoSocial,
        perfil: ue.perfil,
      })),
    };
  }

  static async setup2FA(userId: number) {
    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario) {
      throw new AppError(404, 'Usuário não encontrado');
    }

    if (usuario.twoFactorAtivo) {
      throw new AppError(400, '2FA já está ativo');
    }

    const secret = authenticator.generateSecret();

    await prisma.usuario.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const otpauthUrl = authenticator.keyuri(usuario.email, 'SisFin', secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, qrCodeUrl };
  }

  static async verify2FA(userId: number, code: string) {
    const input = totpCodeSchema.parse({ code });

    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!usuario || !usuario.twoFactorSecret) {
      throw new AppError(400, 'Configure o 2FA antes de verificar');
    }

    const valido = authenticator.verify({
      token: input.code,
      secret: usuario.twoFactorSecret,
    });

    if (!valido) {
      throw new AppError(400, 'Código inválido');
    }

    await prisma.usuario.update({
      where: { id: userId },
      data: { twoFactorAtivo: true },
    });

    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex'),
    );

    return { success: true, backupCodes };
  }

  static async selectEmpresa(userId: number, empresaId: number) {
    const usuarioEmpresa = await prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: userId, empresaId },
      include: {
        empresa: { select: { id: true, razaoSocial: true } },
        usuario: { select: { id: true, email: true } },
        perfilRef: { select: { id: true, nome: true } },
      },
    });

    if (!usuarioEmpresa) {
      throw new AppError(403, 'Acesso não autorizado a esta empresa');
    }

    const payload: JWTPayload = {
      userId,
      email: usuarioEmpresa.usuario.email,
      empresaId: usuarioEmpresa.empresaId,
      perfil: usuarioEmpresa.perfil,
      perfilId: usuarioEmpresa.perfilId ?? undefined,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId, type: 'refresh', jti: uuidv4() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
    );

    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: userId,
        expiraEm,
      },
    });

    return {
      token,
      refreshToken,
      empresa: {
        id: usuarioEmpresa.empresa.id,
        razaoSocial: usuarioEmpresa.empresa.razaoSocial,
      },
    };
  }

  static async logout(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
  }
}
