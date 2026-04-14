# SisFin - Sistema Financeiro Empresarial

Sistema financeiro multi-tenant desenvolvido com Node.js, Express, Prisma, SQL Server e React.

## Stack Tecnologica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20 LTS + Express.js + TypeScript |
| Banco de Dados | Microsoft SQL Server 2022 |
| ORM | Prisma ORM |
| Frontend | React 19 + Vite + TypeScript + Bootstrap 5 |
| Autenticacao | JWT + bcrypt + TOTP (2FA) |
| Filas | BullMQ + Redis |
| Boletos/PIX | API Asaas |
| NFe/NFSe | API PlugNotas |
| WhatsApp | Meta WhatsApp Business API |
| OCR | ExtractLab / Tesseract |
| Storage | AWS S3 / Azure Blob / Local |

## Modulos

- **Contas a Pagar (CP)** - Despesas, aprovacoes, rateio, recorrencias
- **Contas a Receber (CR)** - Receitas, cobrancas, inadimplencia (aging)
- **Fluxo de Caixa** - Real e projetado, cenarios, consolidacao multi-empresa
- **DRE Gerencial** - Plano de contas configuravel, comparativos
- **Conciliacao Bancaria** - Import OFX/CSV/CNAB, match automatico
- **Contratos** - Gestao, parcelas, reajustes, aditivos, alertas
- **Comissoes** - Metas, calculo automatico, painel
- **Boletos/PIX** - Emissao via Asaas, webhooks, links de pagamento
- **NFe/NFSe** - Emissao via PlugNotas, XML, DANFE
- **Viagens** - Adiantamento, prestacao de contas, despesas
- **Caixa de Entrada** - Upload + WhatsApp + OCR automatico
- **Emprestimos** - PRICE/SAC, parcelas, liquidacao antecipada
- **Parcelamento de Impostos** - Tributos parcelados, DARF, alertas
- **Apuracao de Impostos** - IRPJ, CSLL, PIS, COFINS, ISS, SPED

## Pre-requisitos

- Node.js 20+
- Docker e Docker Compose
- SQL Server 2022 (via Docker ou instalado)
- Redis (via Docker)

## Instalacao

```bash
# Clonar repositorio
git clone <repo-url> novo-sisfin
cd novo-sisfin

# Copiar variaveis de ambiente
cp .env.example .env
# Editar .env com suas configuracoes

# Subir containers (SQL Server + Redis)
docker compose up -d

# Instalar dependencias
npm install

# Gerar Prisma Client
cd backend && npx prisma generate

# Executar migrations
npx prisma migrate dev

# Seed inicial (empresa demo + admin)
npm run db:seed

# Iniciar em desenvolvimento
cd .. && npm run dev
```

## Acesso

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health

### Credenciais Demo

- **Email:** admin@demo.com.br
- **Senha:** master2026

## Scripts

```bash
npm run dev              # Backend + Frontend em desenvolvimento
npm run dev:backend      # Apenas backend
npm run dev:frontend     # Apenas frontend
npm run build            # Build producao
npm run docker:up        # Subir containers
npm run docker:down      # Parar containers
npm run db:migrate       # Executar migrations
npm run db:seed          # Seed do banco
```

## Estrutura do Projeto

```
novo-sisfin/
├── backend/             # API Node.js/Express
│   ├── src/
│   │   ├── config/      # Banco, env, logger
│   │   ├── middleware/   # Auth, multi-tenant, audit
│   │   ├── modules/     # Modulos (um por feature)
│   │   ├── services/    # Email, storage, OCR, WhatsApp
│   │   └── utils/       # Helpers
│   └── prisma/          # Schema e migrations
├── frontend/            # React SPA
│   └── src/
│       ├── components/  # Reutilizaveis
│       ├── layouts/     # Main + Auth
│       ├── pages/       # Uma pasta por modulo
│       ├── hooks/       # useAuth, etc
│       └── services/    # API client
├── shared/              # Tipos compartilhados
├── docker-compose.yml   # SQL Server + Redis
└── .github/workflows/   # CI/CD
```

## Multi-Tenant

Todas as tabelas possuem `empresaId` para isolamento de dados por CNPJ. O middleware injeta o `empresaId` do JWT em todas as queries automaticamente.

## Licenca

Propriedade privada - Uso interno exclusivo.
