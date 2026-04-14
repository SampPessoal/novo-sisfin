import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as contratoController from './contrato.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);
router.use(auditLog('Contrato'));

router.get('/', contratoController.list);
router.get('/alertas', contratoController.getAlertas);
router.get('/:id', contratoController.getById);
router.post('/', contratoController.create);
router.put('/:id', contratoController.update);
router.delete('/:id', contratoController.remove);
router.post('/:id/parcelas', contratoController.generateParcelas);
router.post('/:id/aditivo', contratoController.addAditivo);
router.post('/:id/provisionar', contratoController.provisionar);
router.get('/:id/contas-pagar', contratoController.getContasPagar);
router.post('/:id/cancelar-provisionamento', contratoController.cancelarProvisionamento);

router.get('/:id/arquivos', contratoController.listArquivos);
router.post('/:id/arquivos', upload.single('arquivo'), contratoController.uploadArquivo);
router.get('/:id/arquivos/:arquivoId', contratoController.downloadArquivo);
router.delete('/:id/arquivos/:arquivoId', contratoController.deleteArquivo);

export const contratoRouter = router;
