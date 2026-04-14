import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as conciliacaoController from './conciliacao.controller';

const uploadDir = multer({
  dest: 'uploads/conciliacao/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.ofx', '.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    cb(null, allowed.includes(ext));
  },
});

const router = Router();

router.use(requireAuth);
router.use(auditLog('ConciliacaoBancaria'));

router.get('/', conciliacaoController.list);
router.post('/importar', uploadDir.single('arquivo'), conciliacaoController.importar);
router.get('/:id', conciliacaoController.getById);
router.post('/:id/conciliar-item', conciliacaoController.conciliarItem);
router.post('/:id/auto-conciliar', conciliacaoController.autoConciliar);
router.get('/:id/pendentes', conciliacaoController.pendentes);

export const conciliacaoRouter = router;
