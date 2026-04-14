import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SisFin API',
      version: '1.0.0',
      description: 'API do Sistema Financeiro Empresarial Multi-Tenant',
      contact: { name: 'SisFin', email: 'suporte@sisfin.com.br' },
    },
    servers: [
      { url: '/api', description: 'API Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autenticação e autorização' },
      { name: 'Dashboard', description: 'Dashboard e indicadores' },
      { name: 'Empresas', description: 'Gestão de empresas' },
      { name: 'Usuarios', description: 'Gestão de usuários' },
      { name: 'Perfis', description: 'Perfis e permissões RBAC' },
      { name: 'Contas a Pagar', description: 'Módulo de contas a pagar' },
      { name: 'Contas a Receber', description: 'Módulo de contas a receber' },
      { name: 'Fluxo de Caixa', description: 'Fluxo de caixa real e projetado' },
      { name: 'DRE', description: 'Demonstrativo de Resultado' },
      { name: 'Contratos', description: 'Gestão de contratos' },
      { name: 'Notificações', description: 'Centro de notificações' },
      { name: 'Auditoria', description: 'Logs de auditoria' },
    ],
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
