#!/bin/bash
set -e

echo "================================================"
echo "  SisFin - Deploy de Produção (Docker Compose)"
echo "================================================"

if [ ! -f .env.prod ]; then
  echo ""
  echo "Arquivo .env.prod não encontrado!"
  echo "Copie o template e configure:"
  echo "  cp .env.prod.example .env.prod"
  echo "  nano .env.prod"
  echo ""
  exit 1
fi

export $(grep -v '^#' .env.prod | xargs)

echo ""
echo "1/4 - Construindo imagens..."
docker compose -f docker-compose.prod.yml build

echo ""
echo "2/4 - Subindo infraestrutura (SQL Server + Redis)..."
docker compose -f docker-compose.prod.yml up -d sqlserver redis
echo "Aguardando banco ficar saudável..."
sleep 15

echo ""
echo "3/4 - Subindo backend..."
docker compose -f docker-compose.prod.yml up -d backend
echo "Aguardando backend ficar saudável..."
sleep 10

echo ""
echo "4/4 - Subindo frontend..."
docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "================================================"
echo "  Deploy concluído!"
echo ""
echo "  Acesse: ${FRONTEND_URL:-http://localhost}"
echo "  API:    ${FRONTEND_URL:-http://localhost}/api/health"
echo "  Docs:   ${FRONTEND_URL:-http://localhost}/api/docs"
echo ""
echo "  Credenciais demo:"
echo "    Email: admin@demo.com.br"
echo "    Senha: master2026"
echo ""
echo "  Para rodar o seed inicial:"
echo "    docker exec sisfin-backend npx ts-node prisma/seed.ts"
echo "================================================"
