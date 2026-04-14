import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

export class WhatsAppService {
  static async sendMessage(to: string, message: string): Promise<void> {
    try {
      await axios.post(
        `${GRAPH_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      logger.info('WhatsApp message sent', { to });
    } catch (error) {
      logger.error('WhatsApp send failed', { error, to });
    }
  }

  static async sendPaymentLink(
    to: string,
    descricao: string,
    valor: number,
    link: string
  ): Promise<void> {
    const message =
      `💰 *Cobrança SisFin*\n\n` +
      `Descrição: ${descricao}\n` +
      `Valor: R$ ${valor.toFixed(2)}\n\n` +
      `Link de pagamento: ${link}\n\n` +
      `_Mensagem automática do Sistema Financeiro_`;

    await this.sendMessage(to, message);
  }

  static async sendVencimentoAlerta(
    to: string,
    tipo: string,
    descricao: string,
    valor: number,
    dataVencimento: string
  ): Promise<void> {
    const message =
      `⚠️ *Alerta de Vencimento*\n\n` +
      `Tipo: ${tipo}\n` +
      `Descrição: ${descricao}\n` +
      `Valor: R$ ${valor.toFixed(2)}\n` +
      `Vencimento: ${dataVencimento}\n\n` +
      `_Acesse o sistema para mais detalhes._`;

    await this.sendMessage(to, message);
  }

  static async downloadMedia(mediaId: string): Promise<Buffer> {
    const mediaUrlResponse = await axios.get(`${GRAPH_API_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
    });

    const mediaResponse = await axios.get(mediaUrlResponse.data.url, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
      responseType: 'arraybuffer',
    });

    return Buffer.from(mediaResponse.data);
  }
}
