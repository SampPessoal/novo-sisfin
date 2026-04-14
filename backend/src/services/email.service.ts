import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER
    ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
    : undefined,
});

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class EmailService {
  static async send(options: EmailOptions): Promise<void> {
    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      });
      logger.info('Email sent', { to: options.to, subject: options.subject });
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to });
      throw error;
    }
  }

  static async sendVencimentoAlerta(
    to: string,
    tipo: 'CP' | 'CR',
    descricao: string,
    valor: number,
    dataVencimento: string
  ): Promise<void> {
    const tipoLabel = tipo === 'CP' ? 'Conta a Pagar' : 'Conta a Receber';
    await this.send({
      to,
      subject: `[SisFin] Alerta de Vencimento - ${tipoLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Alerta de Vencimento</h2>
          <p>Há um vencimento próximo que requer sua atenção:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tipo</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${tipoLabel}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Descrição</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${descricao}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Valor</strong></td><td style="padding: 8px; border: 1px solid #ddd;">R$ ${valor.toFixed(2)}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Vencimento</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dataVencimento}</td></tr>
          </table>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">Esta é uma mensagem automática do SisFin.</p>
        </div>
      `,
    });
  }

  static async sendAprovacaoPendente(
    to: string,
    tipo: string,
    descricao: string,
    solicitante: string
  ): Promise<void> {
    await this.send({
      to,
      subject: `[SisFin] Aprovação Pendente - ${tipo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Aprovação Pendente</h2>
          <p>Há uma solicitação aguardando sua aprovação:</p>
          <p><strong>Tipo:</strong> ${tipo}</p>
          <p><strong>Descrição:</strong> ${descricao}</p>
          <p><strong>Solicitante:</strong> ${solicitante}</p>
          <p><a href="${env.FRONTEND_URL}" style="background: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Acessar o Sistema</a></p>
        </div>
      `,
    });
  }
}
