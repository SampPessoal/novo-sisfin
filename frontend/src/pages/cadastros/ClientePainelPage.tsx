import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Tab, Tabs, Badge } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { get } from '../../services/api';
import { formatCNPJCPF } from '../../components/CNPJCPFInput';
import DataTable, { type Column } from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import AIInsightCard from '../../components/AIInsightCard';

interface ReceitaMensal {
  mes: string;
  valor: number;
}

interface ContaReceber {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: string;
}

interface Contrato {
  id: number;
  numero: string;
  descricao: string;
  valor: number;
  vigenciaInicio: string;
  vigenciaFim: string;
  status: string;
}

interface ClientePainel {
  cliente: {
    razaoSocial: string;
    nomeFantasia?: string;
    cnpjCpf: string;
    email?: string;
    telefone?: string;
    cidade?: string;
    estado?: string;
  };
  indicadores: {
    totalFaturado: number;
    totalRecebido: number;
    totalAberto: number;
    inadimplencia: number;
    totalContratos: number;
  };
  receitaMensal: ReceitaMensal[];
  contasReceber: ContaReceber[];
  contratos: Contrato[];
}

interface ClienteAnaliseIA {
  score: number;
  comportamento: string;
  limiteCreditoSugerido: number;
  previsaoChurn: string;
  acoes: string[];
  fonte: 'ai' | 'regras';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getInadimplenciaVariant(percent: number): string {
  if (percent > 10) return 'danger';
  if (percent > 5) return 'warning';
  return 'success';
}

export default function ClientePainelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: painel, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cliente-painel', id],
    queryFn: async () => {
      const { data: resp } = await get(`/clientes/${id}/painel`);
      const body = resp as { data: ClientePainel };
      return body.data as ClientePainel;
    },
    enabled: !!id,
  });

  const { data: analiseIA, isLoading: loadingIA } = useQuery({
    queryKey: ['cliente-analise-ia', id],
    queryFn: async () => {
      const { data: resp } = await get(`/clientes/${id}/analise-ia`);
      const body = resp as { data: ClienteAnaliseIA };
      return body.data as ClienteAnaliseIA;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;
  if (!painel) return null;

  const contasReceberColumns: Column<ContaReceber>[] = [
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (row) => formatCurrency(row.valor),
    },
    {
      header: 'Vencimento',
      accessor: 'dataVencimento',
      render: (row) => format(parseISO(row.dataVencimento), 'dd/MM/yyyy', { locale: ptBR }),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const contratosColumns: Column<Contrato>[] = [
    { header: 'Número', accessor: 'numero' },
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (row) => formatCurrency(row.valor),
    },
    {
      header: 'Vigência',
      accessor: 'vigenciaInicio',
      render: (row) => {
        const inicio = format(parseISO(row.vigenciaInicio), 'dd/MM/yyyy', { locale: ptBR });
        const fim = format(parseISO(row.vigenciaFim), 'dd/MM/yyyy', { locale: ptBR });
        return `${inicio} - ${fim}`;
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-center mb-4">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate('/clientes')} className="me-3">
          ← Voltar
        </Button>
        <div>
          <h2 className="mb-0">{painel.cliente.razaoSocial}</h2>
          <div className="text-muted small">
            {painel.cliente.nomeFantasia && <span className="me-3">{painel.cliente.nomeFantasia}</span>}
            <span className="me-3">{formatCNPJCPF(painel.cliente.cnpjCpf || '')}</span>
            {painel.cliente.email && <span className="me-3">{painel.cliente.email}</span>}
            {painel.cliente.telefone && <span className="me-3">{painel.cliente.telefone}</span>}
            {painel.cliente.cidade && painel.cliente.estado && <span>{painel.cliente.cidade}/{painel.cliente.estado}</span>}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} lg={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small fw-medium">Total Faturado</div>
              <div className="fs-4 fw-bold" style={{ color: '#4299e1' }}>
                {formatCurrency(painel.indicadores.totalFaturado)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small fw-medium">Total Recebido</div>
              <div className="fs-4 fw-bold" style={{ color: '#38a169' }}>
                {formatCurrency(painel.indicadores.totalRecebido)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small fw-medium">Total em Aberto</div>
              <div className="fs-4 fw-bold" style={{ color: '#ed8936' }}>
                {formatCurrency(painel.indicadores.totalAberto)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small fw-medium">Inadimplência</div>
              <div className="fs-4 fw-bold">
                <Badge bg={getInadimplenciaVariant(painel.indicadores.inadimplencia)}>
                  {painel.indicadores.inadimplencia.toFixed(1)}%
                </Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="g-3 mb-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <Card.Title>Receita Mensal</Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={painel.receitaMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="valor" stroke="#4299e1" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <Card.Title>Resumo</Card.Title>
              <div className="d-flex flex-column gap-3 mt-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Total de Contratos</span>
                  <span className="fw-bold">{painel.indicadores.totalContratos}</span>
                </div>
                <hr className="my-0" />
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Faturado</span>
                  <span className="fw-bold" style={{ color: '#4299e1' }}>{formatCurrency(painel.indicadores.totalFaturado)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Recebido</span>
                  <span className="fw-bold" style={{ color: '#38a169' }}>{formatCurrency(painel.indicadores.totalRecebido)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Em Aberto</span>
                  <span className="fw-bold" style={{ color: '#ed8936' }}>{formatCurrency(painel.indicadores.totalAberto)}</span>
                </div>
              </div>
            </Card.Body>
          </Card>
          <AIInsightCard
            title="Análise IA do Cliente"
            loading={loadingIA}
            score={analiseIA?.score}
            items={analiseIA ? [
              { label: 'Comportamento', value: analiseIA.comportamento },
              { label: 'Limite de Crédito Sugerido', value: formatCurrency(analiseIA.limiteCreditoSugerido) },
              { label: 'Previsão de Churn', value: analiseIA.previsaoChurn },
            ] : []}
            actions={analiseIA?.acoes}
            fonte={analiseIA?.fonte}
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Tabs defaultActiveKey="contas-receber" className="mb-3">
            <Tab eventKey="contas-receber" title="Contas a Receber">
              <DataTable<ContaReceber>
                columns={contasReceberColumns}
                data={painel.contasReceber}
                emptyMessage="Nenhuma conta a receber encontrada."
              />
            </Tab>
            <Tab eventKey="contratos" title="Contratos">
              <DataTable<Contrato>
                columns={contratosColumns}
                data={painel.contratos}
                emptyMessage="Nenhum contrato encontrado."
              />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </>
  );
}
