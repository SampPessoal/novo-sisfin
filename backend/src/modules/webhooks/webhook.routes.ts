import { Router } from 'express';
import * as webhookController from './webhook.controller';

const router = Router();

router.post('/asaas', webhookController.asaasWebhook);
router.post('/whatsapp', webhookController.whatsappWebhook);
router.get('/whatsapp', webhookController.whatsappVerify);

export const webhookRouter = router;
