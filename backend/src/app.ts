import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { CacheService } from './services/cache.service';
import { swaggerSpec } from './config/swagger';
import { authRouter } from './modules/auth/auth.routes';
import { empresaRouter } from './modules/empresas/empresa.routes';
import { usuarioRouter } from './modules/usuarios/usuario.routes';
import { fornecedorRouter } from './modules/cadastros/fornecedor.routes';
import { clienteRouter } from './modules/cadastros/cliente.routes';
import { categoriaRouter } from './modules/cadastros/categoria.routes';
import { centroCustoRouter } from './modules/cadastros/centro-custo.routes';
import { planoContasRouter } from './modules/cadastros/plano-contas.routes';
import { contaBancariaRouter } from './modules/cadastros/conta-bancaria.routes';
import { contasPagarRouter } from './modules/contas-pagar/contas-pagar.routes';
import { contasReceberRouter } from './modules/contas-receber/contas-receber.routes';
import { fluxoCaixaRouter } from './modules/fluxo-caixa/fluxo-caixa.routes';
import { dreRouter } from './modules/dre/dre.routes';
import { contratoRouter } from './modules/contratos/contrato.routes';
import { comissaoRouter } from './modules/comissoes/comissao.routes';
import { boletoRouter } from './modules/boletos/boleto.routes';
import { nfeRouter } from './modules/nfe/nfe.routes';
import { viagemRouter } from './modules/viagens/viagem.routes';
import { caixaEntradaRouter } from './modules/caixa-entrada/caixa-entrada.routes';
import { emprestimoRouter } from './modules/emprestimos/emprestimo.routes';
import { parcelamentoImpostoRouter } from './modules/parcelamento-impostos/parcelamento-imposto.routes';
import { apuracaoImpostoRouter } from './modules/apuracao-impostos/apuracao-imposto.routes';
import { conciliacaoRouter } from './modules/conciliacao/conciliacao.routes';
import { transferenciaRouter } from './modules/transferencias/transferencia.routes';
import { webhookRouter } from './modules/webhooks/webhook.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { perfilRouter } from './modules/perfis/perfil.routes';

import { notificacaoRouter } from './modules/notificacoes/notificacao.routes';
import { AlertasService } from './services/alertas.service';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});
app.use('/api/auth/login', authLimiter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SisFin API Docs',
}));

app.get('/api/health', async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    const redisOk = await CacheService.healthCheck();
    checks.redis = redisOk ? 'ok' : 'error';
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

// Webhooks (sem auth - validados por token proprio)
app.use('/api/webhooks', webhookRouter);

// Rotas autenticadas
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/empresas', empresaRouter);
app.use('/api/usuarios', usuarioRouter);
app.use('/api/fornecedores', fornecedorRouter);
app.use('/api/clientes', clienteRouter);
app.use('/api/categorias', categoriaRouter);
app.use('/api/centros-custo', centroCustoRouter);
app.use('/api/plano-contas', planoContasRouter);
app.use('/api/contas-bancarias', contaBancariaRouter);
app.use('/api/contas-pagar', contasPagarRouter);
app.use('/api/contas-receber', contasReceberRouter);
app.use('/api/fluxo-caixa', fluxoCaixaRouter);
app.use('/api/dre', dreRouter);
app.use('/api/contratos', contratoRouter);
app.use('/api/comissoes', comissaoRouter);
app.use('/api/boletos', boletoRouter);
app.use('/api/nfe', nfeRouter);
app.use('/api/viagens', viagemRouter);
app.use('/api/caixa-entrada', caixaEntradaRouter);
app.use('/api/emprestimos', emprestimoRouter);
app.use('/api/parcelamento-impostos', parcelamentoImpostoRouter);
app.use('/api/apuracao-impostos', apuracaoImpostoRouter);
app.use('/api/conciliacao', conciliacaoRouter);
app.use('/api/transferencias', transferenciaRouter);
app.use('/api/audit-log', auditRouter);
app.use('/api/perfis', perfilRouter);

app.use('/api/notificacoes', notificacaoRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  AlertasService.init();
  logger.info('AlertasService cron jobs initialized');
});

export default app;
