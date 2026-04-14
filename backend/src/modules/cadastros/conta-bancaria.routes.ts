import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import * as contaBancariaController from './conta-bancaria.controller';

const router = Router();

router.use(requireAuth);
router.use(auditLog('ContaBancaria'));

router.get('/', contaBancariaController.list);
router.get('/:id', contaBancariaController.getById);
router.post('/', contaBancariaController.create);
router.put('/:id', contaBancariaController.update);
router.delete('/:id', contaBancariaController.remove);

export const contaBancariaRouter = router;
