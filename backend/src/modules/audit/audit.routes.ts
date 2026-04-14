import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { multiTenant, getEmpresaId } from '../../middleware/multiTenant';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, paginatedResponse } from '../../utils/pagination';
import { prisma } from '../../config/database';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'), multiTenant);

router.get('/', asyncHandler(async (req, res) => {
  const empresaId = getEmpresaId(req);
  const pagination = getPagination(req, 'criadoEm');
  const where: Record<string, unknown> = { empresaId };

  if (req.query.entidade) where.entidade = req.query.entidade;
  if (req.query.acao) where.acao = req.query.acao;
  if (req.query.usuarioId) where.usuarioId = parseInt(req.query.usuarioId as string);

  if (req.query.dataInicio || req.query.dataFim) {
    const criadoEm: Record<string, Date> = {};
    if (req.query.dataInicio) criadoEm.gte = new Date(req.query.dataInicio as string);
    if (req.query.dataFim) criadoEm.lte = new Date(req.query.dataFim as string);
    where.criadoEm = criadoEm;
  }

  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { usuario: { select: { id: true, nome: true } } },
      skip: pagination.skip,
      take: pagination.pageSize,
      orderBy: { [pagination.sortBy]: sortOrder },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json(paginatedResponse(data, total, pagination));
}));

export { router as auditRouter };
