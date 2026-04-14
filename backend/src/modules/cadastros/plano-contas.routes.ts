import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as planoContasController from './plano-contas.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    cb(null, ['xlsx', 'xls', 'pdf'].includes(ext ?? ''));
  },
});

const router = Router();

router.use(requireAuth);
router.use(auditLog('PlanoContas'));

router.get('/', planoContasController.list);
router.post('/', planoContasController.create);
router.post('/importar', upload.single('file'), planoContasController.importar);
router.get('/:id', planoContasController.getById);
router.put('/:id', planoContasController.update);
router.delete('/:id', planoContasController.remove);

export const planoContasRouter = router;
