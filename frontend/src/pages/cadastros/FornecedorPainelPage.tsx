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

interface DespesaMensal {
  mes: string;
  valor: number;
}

interface ContaPagar {
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

interface FornecedorPainel {
  fornecedor: {
    razaoSocial: string;
    nomeFantasia?: string;
    cnpjCpf: string;
    email?: string;
    telefone?: string;
    cidade?: string;
    estado?: string;
  };
  indicadores: {
    totalComprado: number;
    totalPago: number;
    totalAberto: number;
    totalAtrasos: number;
    contasAtrasadas: number;
    totalContratos: number;
  };
  despesaMensal: DespesaMensal[];
  contasPagar: ContaPagar[];
  contratos: Contrato[];
}

interface FornecedorAnaliseIA {
  score: number;
  confiabilidade: string;
  analisePreco: string;
  nivelDependencia: string;
  sugestaoRenegociacao: string;
  acoes: string[];
  fonte: 'ai' | 'regras';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function FornecedorPainelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: painel, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['fornecedor-painel', id],
    queryFn: async () => {
      const { data: resp } = await get(`/fornecedores/${id}/painel`);
      const body = resp as { data: FornecedorPainel };
      return body.data as FornecedorPainel;
    },
    enabled: !!id,
  });

  const { data: analiseIA, isLoading: loadingIA } = useQuery({
    queryKey: ['fornecedor-analise-ia', id],
    queryFn: async () => {
      const { data: resp } = await get(`/fornecedores/${id}/analise-ia`);
      const body = resp as { data: FornecedorAnaliseIA };
      return body.data as FornecedorAnaliseIA;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;
  if (!painel) return null;

  const contasPagarColumns: Column<ContaPagar>[] = [
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
        <Button variant="outline-secondary" size="sm" onClick={() => navigate('/fornecedores')} className="me-3">
          ← Voltar
        </Button>
        <div>
          <h2 className="mb-0">{painel.fornecedor.razaoSocial}</h2>
          <div className="text-muted small">
            {painel.fornecedor.nomeFantasia && <span className="me-3">{painel.fornecedor.nomeFantasia}</span>}
            <span className="me-3">{formatCNPJCPF(painel.fornecedor.cnpjCpf || '')}</span>
            {painel.fornecedor.email && <span className="me-3">{painel.fornecedor.email}</span>}
            {painel.fornecedor.telefone && <span className="me-3">{painel.fornecedor.telefone}</span>}
            {painel.fornecedor.cidade && painel.fornecedor.estado && <span>{painel.fornecedor.cidade}/{painel.fornecedor.estado}</span>}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} lg={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small fw-medium">Total Comprado</div>
              <div className="fs-4 fw-bold" style={{ color: '#4299e1' }}>
                {formatCurrency(painel.indicadores.totalComprado)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} lg={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small fw-medium">Total Pago</div>
              <div className="fs-4 fw-bold" style={{ color: '#38a169' }}>
                {formatCurrency(painel.indicadores.totalPago)}
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
              <div className="text-muted small fw-medium">Atrasos</div>
              <div className="fs-4 fw-bold">
                <Badge bg={painel.indicadores.totalAtrasos > 0 ? 'danger' : 'success'}>
                  {painel.indicadores.totalAtrasos}
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
              <Card.Title>Despesa Mensal</Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={painel.despesaMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="valor" stroke="#e53e3e" strokeWidth={2} dot={{ r: 4 }} />
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
                  <span className="text-muted">Comprado</span>
                  <span className="fw-bold" style={{ color: '#4299e1' }}>{formatCurrency(painel.indicadores.totalComprado)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Pago</span>
                  <span className="fw-bold" style={{ color: '#38a169' }}>{formatCurrency(painel.indicadores.totalPago)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Em Aberto</span>
                  <span className="fw-bold" style={{ color: '#ed8936' }}>{formatCurrency(painel.indicadores.totalAberto)}</span>
                </div>
              </div>
            </Card.Body>
          </Card>
          <AIInsightCard
            title="Análise IA do Fornecedor"
            loading={loadingIA}
            score={analiseIA?.score}
            items={analiseIA ? [
              { label: 'Confiabilidade', value: analiseIA.confiabilidade },
              { label: 'Análise de Preço', value: analiseIA.analisePreco },
              { label: 'Nível de Dependência', value: analiseIA.nivelDependencia },
              { label: 'Sugestão de Renegociação', value: analiseIA.sugestaoRenegociacao },
            ] : []}
            actions={analiseIA?.acoes}
            fonte={analiseIA?.fonte}
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Tabs defaultActiveKey="contas-pagar" className="mb-3">
            <Tab eventKey="contas-pagar" title="Contas a Pagar">
              <DataTable<ContaPagar>
                columns={contasPagarColumns}
                data={painel.contasPagar}
                emptyMessage="Nenhuma conta a pagar encontrada."
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
