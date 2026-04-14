import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as dreController from './dre.controller';

const router = Router();

router.use(requireAuth);

router.get('/', dreController.getDRE);
router.get('/comparativo', dreController.getComparativo);

export const dreRouter = router;
