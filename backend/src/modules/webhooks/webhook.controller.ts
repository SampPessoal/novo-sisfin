import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../middleware/errorHandler';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { BoletoService } from '../boletos/boleto.service';

export const asaasWebhook = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers['asaas-access-token'] || req.query.token;

  if (env.ASAAS_WEBHOOK_TOKEN && token !== env.ASAAS_WEBHOOK_TOKEN) {
    logger.warn('Asaas webhook: invalid token');
    throw new AppError(401, 'Token inválido');
  }

  logger.info('Asaas webhook received', { event: req.body.event });

  const result = await BoletoService.processWebhook(req.body);

  return res.json({ success: true, data: result });
});

export const whatsappWebhook = asyncHandler(async (req: Request, res: Response) => {
  logger.info('WhatsApp webhook received', {
    from: req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from,
  });

  return res.json({ success: true, message: 'Webhook recebido' });
});

export const whatsappVerify = asyncHandler(async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  throw new AppError(403, 'Token de verificação inválido');
});
