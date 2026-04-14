-- CreateTable
CREATE TABLE "grupos_empresariais" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" VARCHAR(500),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_empresariais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER,
    "razaoSocial" VARCHAR(255) NOT NULL,
    "nomeFantasia" VARCHAR(255),
    "cnpj" VARCHAR(18) NOT NULL,
    "inscricaoEstadual" VARCHAR(20),
    "inscricaoMunicipal" VARCHAR(20),
    "regimeTributario" VARCHAR(30),
    "endereco" VARCHAR(500),
    "cidade" VARCHAR(100),
    "estado" VARCHAR(2),
    "cep" VARCHAR(10),
    "telefone" VARCHAR(20),
    "email" VARCHAR(255),
    "logoUrl" VARCHAR(500),
    "config" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20),
    "telefoneWhatsApp" VARCHAR(20),
    "twoFactorSecret" VARCHAR(255),
    "twoFactorAtivo" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_empresas" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "perfil" VARCHAR(30) NOT NULL,
    "perfilId" INTEGER,

    CONSTRAINT "usuarios_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" VARCHAR(255),
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "id" SERIAL NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "acao" VARCHAR(50) NOT NULL,
    "descricao" VARCHAR(255),

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis_permissoes" (
    "id" SERIAL NOT NULL,
    "perfilId" INTEGER NOT NULL,
    "permissaoId" INTEGER NOT NULL,

    CONSTRAINT "perfis_permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "mensagem" VARCHAR(500) NOT NULL,
    "link" VARCHAR(255),
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_autorizados" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "whatsapp_autorizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" VARCHAR(2) NOT NULL DEFAULT 'PJ',
    "razaoSocial" VARCHAR(255) NOT NULL,
    "nomeFantasia" VARCHAR(255),
    "cnpjCpf" VARCHAR(18) NOT NULL,
    "inscricaoEstadual" VARCHAR(20),
    "inscricaoMunicipal" VARCHAR(20),
    "regimeTributario" VARCHAR(30),
    "contribuinteIcms" VARCHAR(20),
    "segmento" VARCHAR(50),
    "cep" VARCHAR(10),
    "logradouro" VARCHAR(300),
    "numero" VARCHAR(20),
    "complemento" VARCHAR(100),
    "bairro" VARCHAR(100),
    "cidade" VARCHAR(100),
    "estado" VARCHAR(2),
    "telefone" VARCHAR(20),
    "celular" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "email" VARCHAR(255),
    "emailFinanceiro" VARCHAR(255),
    "contatoPrincipal" VARCHAR(150),
    "website" VARCHAR(255),
    "banco" VARCHAR(10),
    "nomeBanco" VARCHAR(100),
    "agencia" VARCHAR(10),
    "contaBancaria" VARCHAR(20),
    "tipoConta" VARCHAR(2),
    "chavePix" VARCHAR(255),
    "tipoChavePix" VARCHAR(20),
    "titularConta" VARCHAR(255),
    "retIss" BOOLEAN NOT NULL DEFAULT false,
    "retIrrf" BOOLEAN NOT NULL DEFAULT false,
    "retPis" BOOLEAN NOT NULL DEFAULT false,
    "retCofins" BOOLEAN NOT NULL DEFAULT false,
    "retCsll" BOOLEAN NOT NULL DEFAULT false,
    "retInss" BOOLEAN NOT NULL DEFAULT false,
    "condicaoPagamento" VARCHAR(30),
    "endereco" VARCHAR(500),
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores_contatos" (
    "id" SERIAL NOT NULL,
    "fornecedorId" INTEGER NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "departamento" VARCHAR(50),
    "cargo" VARCHAR(100),
    "telefone" VARCHAR(20),
    "celular" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "email" VARCHAR(255),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" VARCHAR(500),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores_enderecos" (
    "id" SERIAL NOT NULL,
    "fornecedorId" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "cep" VARCHAR(10),
    "logradouro" VARCHAR(300),
    "numero" VARCHAR(20),
    "complemento" VARCHAR(100),
    "bairro" VARCHAR(100),
    "cidade" VARCHAR(100),
    "estado" VARCHAR(2),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" VARCHAR(500),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "razaoSocial" VARCHAR(255) NOT NULL,
    "nomeFantasia" VARCHAR(255),
    "cnpjCpf" VARCHAR(18) NOT NULL,
    "tipo" VARCHAR(2) NOT NULL DEFAULT 'PJ',
    "endereco" VARCHAR(500),
    "cidade" VARCHAR(100),
    "estado" VARCHAR(2),
    "cep" VARCHAR(10),
    "telefone" VARCHAR(20),
    "email" VARCHAR(255),
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_financeiras" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "grupoDRE" VARCHAR(100),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_custo" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "centros_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_contas" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "nivel" INTEGER NOT NULL,
    "paiId" INTEGER,
    "tipo" VARCHAR(20) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plano_contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "banco" VARCHAR(10) NOT NULL,
    "nomeBanco" VARCHAR(100) NOT NULL,
    "agencia" VARCHAR(10) NOT NULL,
    "conta" VARCHAR(20) NOT NULL,
    "tipoConta" VARCHAR(20) NOT NULL,
    "saldoInicial" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias_bancarias" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "contaOrigemId" INTEGER NOT NULL,
    "contaDestinoId" INTEGER NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "data" DATE NOT NULL,
    "descricao" VARCHAR(500),
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "fornecedorId" INTEGER,
    "categoriaId" INTEGER,
    "centroCustoId" INTEGER,
    "criadorId" INTEGER NOT NULL,
    "descricao" VARCHAR(500) NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "dataEmissao" DATE,
    "dataVencimento" DATE NOT NULL,
    "dataPagamento" DATE,
    "valorPago" DECIMAL(18,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    "origemLancamento" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    "recorrencia" VARCHAR(20) NOT NULL DEFAULT 'UNICA',
    "recorrenciaFim" DATE,
    "parcelaAtual" INTEGER,
    "totalParcelas" INTEGER,
    "cpPaiId" INTEGER,
    "contratoId" INTEGER,
    "observacoes" TEXT,
    "comprovanteUrl" VARCHAR(500),
    "codigoBarras" VARCHAR(100),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprovacoes_cp" (
    "id" SERIAL NOT NULL,
    "contaPagarId" INTEGER NOT NULL,
    "aprovadorId" INTEGER NOT NULL,
    "acao" VARCHAR(20) NOT NULL,
    "observacao" VARCHAR(500),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aprovacoes_cp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rateios_centro_custo" (
    "id" SERIAL NOT NULL,
    "contaPagarId" INTEGER NOT NULL,
    "centroCustoId" INTEGER NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "rateios_centro_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "clienteId" INTEGER,
    "categoriaId" INTEGER,
    "centroCustoId" INTEGER,
    "criadorId" INTEGER NOT NULL,
    "descricao" VARCHAR(500) NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "dataEmissao" DATE,
    "dataVencimento" DATE NOT NULL,
    "dataRecebimento" DATE,
    "valorRecebido" DECIMAL(18,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    "origemLancamento" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    "notaFiscalId" INTEGER,
    "observacoes" TEXT,
    "comprovanteUrl" VARCHAR(500),
    "asaasId" VARCHAR(100),
    "linkPagamento" VARCHAR(500),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "clienteId" INTEGER,
    "fornecedorId" INTEGER,
    "numero" VARCHAR(50),
    "descricao" VARCHAR(500) NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "vigenciaInicio" DATE NOT NULL,
    "vigenciaFim" DATE NOT NULL,
    "indiceReajuste" VARCHAR(30),
    "percentualReajuste" DECIMAL(5,2),
    "clausulas" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas_contrato" (
    "id" SERIAL NOT NULL,
    "contratoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "parcelas_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aditivos_contrato" (
    "id" SERIAL NOT NULL,
    "contratoId" INTEGER NOT NULL,
    "descricao" VARCHAR(500) NOT NULL,
    "novoValor" DECIMAL(18,2),
    "novaVigencia" DATE,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aditivos_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arquivos_contrato" (
    "id" SERIAL NOT NULL,
    "contratoId" INTEGER NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arquivos_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissao_regras" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comissao_regras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_vendedor" (
    "id" SERIAL NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "periodo" VARCHAR(7) NOT NULL,
    "valorMeta" DECIMAL(18,2) NOT NULL,
    "valorRealizado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_vendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comissoes" (
    "id" SERIAL NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "regraId" INTEGER,
    "referencia" VARCHAR(255),
    "valor" DECIMAL(18,2) NOT NULL,
    "percentual" DECIMAL(5,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" DATE,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_fiscais" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "numero" VARCHAR(20),
    "serie" VARCHAR(5),
    "chaveAcesso" VARCHAR(60),
    "status" VARCHAR(20) NOT NULL DEFAULT 'EMITIDA',
    "valorTotal" DECIMAL(18,2) NOT NULL,
    "dataEmissao" DATE NOT NULL,
    "xmlUrl" VARCHAR(500),
    "pdfUrl" VARCHAR(500),
    "plugnotasId" VARCHAR(100),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_fiscais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_viagem" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "colaboradorId" INTEGER NOT NULL,
    "destino" VARCHAR(255) NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "objetivo" VARCHAR(500) NOT NULL,
    "estimativaDespesas" DECIMAL(18,2) NOT NULL,
    "valorAdiantamento" DECIMAL(18,2),
    "chavePix" VARCHAR(100),
    "dadosBancarios" VARCHAR(500),
    "status" VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagens_clientes" (
    "id" SERIAL NOT NULL,
    "viagemId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,

    CONSTRAINT "viagens_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas_viagem" (
    "id" SERIAL NOT NULL,
    "viagemId" INTEGER NOT NULL,
    "preLancamentoId" INTEGER,
    "descricao" VARCHAR(500) NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "data" DATE NOT NULL,
    "tipoDespesa" VARCHAR(30) NOT NULL,
    "comprovanteUrl" VARCHAR(500),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprovantes" (
    "id" SERIAL NOT NULL,
    "nomeOriginal" VARCHAR(255) NOT NULL,
    "pathStorage" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(50) NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "hashMD5" VARCHAR(32),
    "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprovantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_lancamentos" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "comprovanteId" INTEGER NOT NULL,
    "origem" VARCHAR(20) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
    "dadosOCR" TEXT,
    "confiancaOCR" INTEGER,
    "dataDocumento" DATE,
    "cnpjEmissor" VARCHAR(18),
    "razaoSocialEmissor" VARCHAR(255),
    "valor" DECIMAL(18,2),
    "descricao" VARCHAR(500),
    "localidade" VARCHAR(100),
    "tipoDespesa" VARCHAR(30),
    "categoriaId" INTEGER,
    "centroCustoId" INTEGER,
    "clienteId" INTEGER,
    "aprovadoPor" INTEGER,
    "aprovadoEm" TIMESTAMP(3),
    "motivoRejeicao" VARCHAR(500),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "credorDevedor" VARCHAR(255) NOT NULL,
    "cnpjCpfCredorDevedor" VARCHAR(18),
    "valorPrincipal" DECIMAL(18,2) NOT NULL,
    "taxaJuros" DECIMAL(8,4) NOT NULL,
    "tipoTaxa" VARCHAR(20) NOT NULL,
    "indexador" VARCHAR(20),
    "sistemaAmortizacao" VARCHAR(10) NOT NULL,
    "numeroParcelas" INTEGER NOT NULL,
    "periodicidade" VARCHAR(20) NOT NULL,
    "dataContratacao" DATE NOT NULL,
    "dataVencimentoFinal" DATE NOT NULL,
    "saldoDevedor" DECIMAL(18,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    "contratoReferencia" VARCHAR(100),
    "observacoes" TEXT,
    "centroCustoId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas_emprestimo" (
    "id" SERIAL NOT NULL,
    "emprestimoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "valorParcela" DECIMAL(18,2) NOT NULL,
    "valorAmortizacao" DECIMAL(18,2) NOT NULL,
    "valorJuros" DECIMAL(18,2) NOT NULL,
    "saldoDevedor" DECIMAL(18,2) NOT NULL,
    "dataPagamento" DATE,
    "valorPago" DECIMAL(18,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "parcelas_emprestimo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelamentos_imposto" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipoImposto" VARCHAR(30) NOT NULL,
    "orgaoCredor" VARCHAR(100) NOT NULL,
    "modalidade" VARCHAR(100) NOT NULL,
    "numeroProcesso" VARCHAR(50),
    "valorTotal" DECIMAL(18,2) NOT NULL,
    "numeroParcelas" INTEGER NOT NULL,
    "indiceCorrecao" VARCHAR(20),
    "dataInicio" DATE NOT NULL,
    "saldoDevedor" DECIMAL(18,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcelamentos_imposto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas_parcelamento_imposto" (
    "id" SERIAL NOT NULL,
    "parcelamentoImpostoId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "dataPagamento" DATE,
    "valorPago" DECIMAL(18,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "comprovanteUrl" VARCHAR(500),

    CONSTRAINT "parcelas_parcelamento_imposto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apuracoes_imposto" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "competencia" VARCHAR(7) NOT NULL,
    "tipoImposto" VARCHAR(30) NOT NULL,
    "baseCalculo" DECIMAL(18,2) NOT NULL,
    "aliquota" DECIMAL(8,4) NOT NULL,
    "valorDevido" DECIMAL(18,2) NOT NULL,
    "deducoes" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorPagar" DECIMAL(18,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'CALCULADO',
    "detalhes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apuracoes_imposto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliacoes_bancarias" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "contaBancariaId" INTEGER NOT NULL,
    "dataImportacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arquivo" VARCHAR(255),
    "formato" VARCHAR(10) NOT NULL,
    "totalItens" INTEGER NOT NULL DEFAULT 0,
    "itensConciliados" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "conciliacoes_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliacao_itens" (
    "id" SERIAL NOT NULL,
    "conciliacaoId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "descricao" VARCHAR(500) NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "contaPagarId" INTEGER,
    "contaReceberId" INTEGER,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "conciliadoEm" TIMESTAMP(3),

    CONSTRAINT "conciliacao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "acao" VARCHAR(20) NOT NULL,
    "entidade" VARCHAR(50) NOT NULL,
    "entidadeId" INTEGER,
    "dadosAntes" TEXT,
    "dadosDepois" TEXT,
    "ip" VARCHAR(45),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresas_usuarioId_empresaId_key" ON "usuarios_empresas"("usuarioId", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_empresaId_nome_key" ON "perfis"("empresaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_modulo_acao_key" ON "permissoes"("modulo", "acao");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_permissoes_perfilId_permissaoId_key" ON "perfis_permissoes"("perfilId", "permissaoId");

-- CreateIndex
CREATE INDEX "notificacoes_usuarioId_lida_idx" ON "notificacoes"("usuarioId", "lida");

-- CreateIndex
CREATE INDEX "notificacoes_empresaId_criadoEm_idx" ON "notificacoes"("empresaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_autorizados_usuarioId_key" ON "whatsapp_autorizados"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_autorizados_numero_key" ON "whatsapp_autorizados"("numero");

-- CreateIndex
CREATE INDEX "fornecedores_empresaId_ativo_idx" ON "fornecedores"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_empresaId_cnpjCpf_key" ON "fornecedores"("empresaId", "cnpjCpf");

-- CreateIndex
CREATE INDEX "fornecedores_contatos_fornecedorId_idx" ON "fornecedores_contatos"("fornecedorId");

-- CreateIndex
CREATE INDEX "fornecedores_enderecos_fornecedorId_idx" ON "fornecedores_enderecos"("fornecedorId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_empresaId_cnpjCpf_key" ON "clientes"("empresaId", "cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "centros_custo_empresaId_codigo_key" ON "centros_custo"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "plano_contas_empresaId_codigo_key" ON "plano_contas"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "transferencias_bancarias_empresaId_data_idx" ON "transferencias_bancarias"("empresaId", "data");

-- CreateIndex
CREATE INDEX "contas_pagar_empresaId_dataVencimento_idx" ON "contas_pagar"("empresaId", "dataVencimento");

-- CreateIndex
CREATE INDEX "contas_pagar_empresaId_status_idx" ON "contas_pagar"("empresaId", "status");

-- CreateIndex
CREATE INDEX "contas_pagar_empresaId_contratoId_idx" ON "contas_pagar"("empresaId", "contratoId");

-- CreateIndex
CREATE INDEX "contas_receber_empresaId_dataVencimento_idx" ON "contas_receber"("empresaId", "dataVencimento");

-- CreateIndex
CREATE INDEX "contas_receber_empresaId_status_idx" ON "contas_receber"("empresaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "metas_vendedor_colaboradorId_periodo_key" ON "metas_vendedor"("colaboradorId", "periodo");

-- CreateIndex
CREATE INDEX "solicitacoes_viagem_empresaId_status_idx" ON "solicitacoes_viagem"("empresaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "viagens_clientes_viagemId_clienteId_key" ON "viagens_clientes"("viagemId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "pre_lancamentos_comprovanteId_key" ON "pre_lancamentos"("comprovanteId");

-- CreateIndex
CREATE INDEX "pre_lancamentos_empresaId_status_idx" ON "pre_lancamentos"("empresaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "apuracoes_imposto_empresaId_competencia_tipoImposto_key" ON "apuracoes_imposto"("empresaId", "competencia", "tipoImposto");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacao_itens_contaPagarId_key" ON "conciliacao_itens"("contaPagarId");

-- CreateIndex
CREATE UNIQUE INDEX "conciliacao_itens_contaReceberId_key" ON "conciliacao_itens"("contaReceberId");

-- CreateIndex
CREATE INDEX "audit_logs_empresaId_criadoEm_idx" ON "audit_logs"("empresaId", "criadoEm");

-- CreateIndex
CREATE INDEX "audit_logs_entidade_entidadeId_idx" ON "audit_logs"("entidade", "entidadeId");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_empresariais"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_empresas" ADD CONSTRAINT "usuarios_empresas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_empresas" ADD CONSTRAINT "usuarios_empresas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_empresas" ADD CONSTRAINT "usuarios_empresas_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfis"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis" ADD CONSTRAINT "perfis_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_permissoes" ADD CONSTRAINT "perfis_permissoes_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_permissoes" ADD CONSTRAINT "perfis_permissoes_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_autorizados" ADD CONSTRAINT "whatsapp_autorizados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedores_contatos" ADD CONSTRAINT "fornecedores_contatos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedores_enderecos" ADD CONSTRAINT "fornecedores_enderecos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_financeiras" ADD CONSTRAINT "categorias_financeiras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_custo" ADD CONSTRAINT "centros_custo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_contas" ADD CONSTRAINT "plano_contas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plano_contas" ADD CONSTRAINT "plano_contas_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "plano_contas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_bancarias" ADD CONSTRAINT "contas_bancarias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_bancarias" ADD CONSTRAINT "transferencias_bancarias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_bancarias" ADD CONSTRAINT "transferencias_bancarias_contaOrigemId_fkey" FOREIGN KEY ("contaOrigemId") REFERENCES "contas_bancarias"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_bancarias" ADD CONSTRAINT "transferencias_bancarias_contaDestinoId_fkey" FOREIGN KEY ("contaDestinoId") REFERENCES "contas_bancarias"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_criadorId_fkey" FOREIGN KEY ("criadorId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_cpPaiId_fkey" FOREIGN KEY ("cpPaiId") REFERENCES "contas_pagar"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes_cp" ADD CONSTRAINT "aprovacoes_cp_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "contas_pagar"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes_cp" ADD CONSTRAINT "aprovacoes_cp_aprovadorId_fkey" FOREIGN KEY ("aprovadorId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rateios_centro_custo" ADD CONSTRAINT "rateios_centro_custo_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "contas_pagar"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rateios_centro_custo" ADD CONSTRAINT "rateios_centro_custo_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias_financeiras"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_centroCustoId_fkey" FOREIGN KEY ("centroCustoId") REFERENCES "centros_custo"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_criadorId_fkey" FOREIGN KEY ("criadorId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_notaFiscalId_fkey" FOREIGN KEY ("notaFiscalId") REFERENCES "notas_fiscais"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas_contrato" ADD CONSTRAINT "parcelas_contrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aditivos_contrato" ADD CONSTRAINT "aditivos_contrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arquivos_contrato" ADD CONSTRAINT "arquivos_contrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissao_regras" ADD CONSTRAINT "comissao_regras_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_vendedor" ADD CONSTRAINT "metas_vendedor_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comissoes" ADD CONSTRAINT "comissoes_regraId_fkey" FOREIGN KEY ("regraId") REFERENCES "comissao_regras"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_fiscais" ADD CONSTRAINT "notas_fiscais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_viagem" ADD CONSTRAINT "solicitacoes_viagem_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_viagem" ADD CONSTRAINT "solicitacoes_viagem_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens_clientes" ADD CONSTRAINT "viagens_clientes_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "solicitacoes_viagem"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens_clientes" ADD CONSTRAINT "viagens_clientes_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas_viagem" ADD CONSTRAINT "despesas_viagem_viagemId_fkey" FOREIGN KEY ("viagemId") REFERENCES "solicitacoes_viagem"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas_viagem" ADD CONSTRAINT "despesas_viagem_preLancamentoId_fkey" FOREIGN KEY ("preLancamentoId") REFERENCES "pre_lancamentos"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_lancamentos" ADD CONSTRAINT "pre_lancamentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_lancamentos" ADD CONSTRAINT "pre_lancamentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_lancamentos" ADD CONSTRAINT "pre_lancamentos_comprovanteId_fkey" FOREIGN KEY ("comprovanteId") REFERENCES "comprovantes"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas_emprestimo" ADD CONSTRAINT "parcelas_emprestimo_emprestimoId_fkey" FOREIGN KEY ("emprestimoId") REFERENCES "emprestimos"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelamentos_imposto" ADD CONSTRAINT "parcelamentos_imposto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas_parcelamento_imposto" ADD CONSTRAINT "parcelas_parcelamento_imposto_parcelamentoImpostoId_fkey" FOREIGN KEY ("parcelamentoImpostoId") REFERENCES "parcelamentos_imposto"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apuracoes_imposto" ADD CONSTRAINT "apuracoes_imposto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_bancarias" ADD CONSTRAINT "conciliacoes_bancarias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacoes_bancarias" ADD CONSTRAINT "conciliacoes_bancarias_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "contas_bancarias"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacao_itens" ADD CONSTRAINT "conciliacao_itens_conciliacaoId_fkey" FOREIGN KEY ("conciliacaoId") REFERENCES "conciliacoes_bancarias"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacao_itens" ADD CONSTRAINT "conciliacao_itens_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "contas_pagar"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacao_itens" ADD CONSTRAINT "conciliacao_itens_contaReceberId_fkey" FOREIGN KEY ("contaReceberId") REFERENCES "contas_receber"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
