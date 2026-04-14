import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { EmailService } from './email.service';
import { addDays, format, startOfDay, endOfDay } from 'date-fns';

export class AlertasService {
  static init(): void {
    // Every day at 8:00 AM - check due dates
    cron.schedule('0 8 * * *', async () => {
      logger.info('Running daily due date alerts');
      await this.alertarVencimentosCP();
      await this.alertarVencimentosCR();
      await this.alertarContratosVencendo();
      await this.alertarPrestacaoContasPendentes();
    });

    // Every day at 9:00 AM - check installments
    cron.schedule('0 9 * * *', async () => {
      logger.info('Running daily installment alerts');
      await this.alertarParcelasEmprestimo();
      await this.alertarParcelasImposto();
    });

    logger.info('Alert cron jobs initialized');
  }

  static async alertarVencimentosCP(): Promise<void> {
    try {
      const hoje = startOfDay(new Date());
      const em5dias = endOfDay(addDays(hoje, 5));

      const vencimentos = await prisma.contaPagar.findMany({
        where: {
          status: { in: ['PENDENTE', 'APROVADO'] },
          dataVencimento: { gte: hoje, lte: em5dias },
        },
        include: {
          empresa: true,
          criador: true,
        },
      });

      for (const cp of vencimentos) {
        if (cp.criador.email) {
          await EmailService.sendVencimentoAlerta(
            cp.criador.email,
            'CP',
            cp.descricao,
            Number(cp.valor),
            format(cp.dataVencimento, 'dd/MM/yyyy')
          );
        }
      }

      logger.info(`CP alerts sent: ${vencimentos.length}`);
    } catch (error) {
      logger.error('Failed to send CP alerts', { error });
    }
  }

  static async alertarVencimentosCR(): Promise<void> {
    try {
      const hoje = startOfDay(new Date());
      const em5dias = endOfDay(addDays(hoje, 5));

      const vencimentos = await prisma.contaReceber.findMany({
        where: {
          status: 'PENDENTE',
          dataVencimento: { gte: hoje, lte: em5dias },
        },
        include: {
          empresa: true,
          criador: true,
        },
      });

      for (const cr of vencimentos) {
        if (cr.criador.email) {
          await EmailService.sendVencimentoAlerta(
            cr.criador.email,
            'CR',
            cr.descricao,
            Number(cr.valor),
            format(cr.dataVencimento, 'dd/MM/yyyy')
          );
        }
      }

      logger.info(`CR alerts sent: ${vencimentos.length}`);
    } catch (error) {
      logger.error('Failed to send CR alerts', { error });
    }
  }

  static async alertarContratosVencendo(): Promise<void> {
    try {
      const hoje = new Date();
      const em30dias = addDays(hoje, 30);

      const contratos = await prisma.contrato.findMany({
        where: {
          status: 'ATIVO',
          vigenciaFim: { gte: hoje, lte: em30dias },
        },
        include: { empresa: true },
      });

      if (contratos.length > 0) {
        const admins = await prisma.usuarioEmpresa.findMany({
          where: {
            empresaId: { in: contratos.map((c) => c.empresaId) },
            perfil: { in: ['ADMIN', 'FINANCEIRO'] },
          },
          include: { usuario: true },
        });

        for (const admin of admins) {
          if (admin.usuario.email) {
            const empresaContratos = contratos.filter((c) => c.empresaId === admin.empresaId);
            if (empresaContratos.length > 0) {
              await EmailService.send({
                to: admin.usuario.email,
                subject: `[SisFin] ${empresaContratos.length} contrato(s) vencendo nos próximos 30 dias`,
                html: `
                  <h2>Contratos com Vencimento Próximo</h2>
                  <ul>
                    ${empresaContratos.map((c) => `<li>${c.descricao} - Vencimento: ${format(c.vigenciaFim, 'dd/MM/yyyy')}</li>`).join('')}
                  </ul>
                `,
              });
            }
          }
        }
      }

      logger.info(`Contract alerts: ${contratos.length} contracts expiring`);
    } catch (error) {
      logger.error('Failed to send contract alerts', { error });
    }
  }

  static async alertarPrestacaoContasPendentes(): Promise<void> {
    try {
      const viagens = await prisma.solicitacaoViagem.findMany({
        where: {
          status: 'PRESTACAO_PENDENTE',
        },
        include: {
          colaborador: true,
          empresa: true,
        },
      });

      for (const viagem of viagens) {
        if (viagem.colaborador.email) {
          await EmailService.send({
            to: viagem.colaborador.email,
            subject: '[SisFin] Prestação de contas pendente',
            html: `
              <p>Olá ${viagem.colaborador.nome},</p>
              <p>Sua viagem para <strong>${viagem.destino}</strong> está com prestação de contas pendente.</p>
              <p>Por favor, acesse o sistema e realize a prestação de contas o mais breve possível.</p>
            `,
          });
        }
      }

      logger.info(`Travel accountability alerts sent: ${viagens.length}`);
    } catch (error) {
      logger.error('Failed to send travel alerts', { error });
    }
  }

  static async alertarParcelasEmprestimo(): Promise<void> {
    try {
      const hoje = startOfDay(new Date());
      const em5dias = endOfDay(addDays(hoje, 5));

      const parcelas = await prisma.parcelaEmprestimo.findMany({
        where: {
          status: 'PENDENTE',
          dataVencimento: { gte: hoje, lte: em5dias },
        },
        include: { emprestimo: { include: { empresa: true } } },
      });

      logger.info(`Loan installment alerts: ${parcelas.length}`);
    } catch (error) {
      logger.error('Failed to process loan alerts', { error });
    }
  }

  static async alertarParcelasImposto(): Promise<void> {
    try {
      const hoje = startOfDay(new Date());
      const em5dias = endOfDay(addDays(hoje, 5));

      const parcelas = await prisma.parcelaParcelamentoImposto.findMany({
        where: {
          status: 'PENDENTE',
          dataVencimento: { gte: hoje, lte: em5dias },
        },
        include: { parcelamento: { include: { empresa: true } } },
      });

      logger.info(`Tax installment alerts: ${parcelas.length}`);
    } catch (error) {
      logger.error('Failed to process tax alerts', { error });
    }
  }
}
