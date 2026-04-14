import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type { PaginationOptions } from '../../utils/pagination';

const createEmpresaSchema = z.object({
  razaoSocial: z.string().min(1, 'Razão social obrigatória').max(255),
  nomeFantasia: z.string().max(255).optional(),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  inscricaoEstadual: z.string().max(20).optional(),
  inscricaoMunicipal: z.string().max(20).optional(),
  regimeTributario: z.string().max(30).optional(),
  endereco: z.string().max(500).optional(),
  cidade: z.string().max(100).optional(),
  estado: z.string().max(2).optional(),
  cep: z.string().max(10).optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email('E-mail inválido').max(255).optional(),
  logoUrl: z.string().max(500).optional(),
  config: z.string().optional(),
});

const updateEmpresaSchema = createEmpresaSchema.partial();

export class EmpresaService {
  static async list(pagination: PaginationOptions) {
    const where = {
      ...(pagination.search && {
        OR: [
          { razaoSocial: { contains: pagination.search } },
          { nomeFantasia: { contains: pagination.search } },
          { cnpj: { contains: pagination.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.empresa.findMany({
        where,
        skip: pagination.skip,
        take: pagination.pageSize,
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      prisma.empresa.count({ where }),
    ]);

    return { data, total };
  }

  static async findById(id: number) {
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) {
      throw new AppError(404, 'Empresa não encontrada');
    }
    return empresa;
  }

  static async create(data: z.infer<typeof createEmpresaSchema>) {
    const input = createEmpresaSchema.parse(data);

    const existente = await prisma.empresa.findUnique({ where: { cnpj: input.cnpj } });
    if (existente) {
      throw new AppError(409, 'Já existe uma empresa com este CNPJ');
    }

    return prisma.empresa.create({ data: input });
  }

  static async update(id: number, data: z.infer<typeof updateEmpresaSchema>) {
    const input = updateEmpresaSchema.parse(data);

    await this.findById(id);

    if (input.cnpj) {
      const existente = await prisma.empresa.findFirst({
        where: { cnpj: input.cnpj, NOT: { id } },
      });
      if (existente) {
        throw new AppError(409, 'Já existe outra empresa com este CNPJ');
      }
    }

    return prisma.empresa.update({ where: { id }, data: input });
  }

  static async delete(id: number) {
    await this.findById(id);
    return prisma.empresa.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
