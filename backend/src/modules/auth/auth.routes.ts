import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import * as authController from './auth.controller';

const router = Router();

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', requireAuth, authController.me);
router.post('/2fa/setup', requireAuth, authController.setup2FA);
router.post('/2fa/verify', requireAuth, authController.verify2FA);
router.post('/select-empresa', requireAuth, authController.selectEmpresa);
router.post('/logout', requireAuth, authController.logout);

export const authRouter = router;
