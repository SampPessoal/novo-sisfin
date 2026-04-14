import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as caixaEntradaController from './caixa-entrada.controller';

const uploadDir = multer({
  dest: 'uploads/comprovantes/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

router.use(requireAuth);
router.use(auditLog('PreLancamento'));

router.get('/', caixaEntradaController.list);
router.get('/dashboard', caixaEntradaController.dashboard);
router.get('/:id', caixaEntradaController.getById);
router.post('/upload', uploadDir.single('comprovante'), caixaEntradaController.upload);
router.post('/:id/classificar', caixaEntradaController.classificar);
router.post('/:id/aprovar', requireRole('APROVADOR', 'FINANCEIRO', 'ADMIN'), caixaEntradaController.aprovar);
router.post('/:id/rejeitar', caixaEntradaController.rejeitar);

export const caixaEntradaRouter = router;
