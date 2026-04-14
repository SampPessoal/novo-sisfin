import { Row, Col, Card, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { get } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import QueryErrorBanner from '../../components/QueryErrorBanner';
import DashboardInsights from '../../components/DashboardInsights';

interface VencimentosSummary {
  totalPagarHoje: number;
  totalReceberHoje: number;
  saldoProjetado: number;
  atrasados: number;
}

interface FluxoMensal {
  mes: string;
  pagar: number;
  receber: number;
}

interface DespesaCategoria {
  categoria: string;
  valor: number;
}

interface ProximoVencimento {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  tipo: string;
  status: string;
}

const PIE_COLORS = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#fc8181', '#4fd1c5', '#f6ad55'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data: resp } = await get('/dashboard/summary');
      const raw = resp as Record<string, unknown>;
      if ('success' in raw && 'data' in raw) return raw.data as VencimentosSummary;
      return raw as unknown as VencimentosSummary;
    },
  });

  const { data: fluxoMensal, isLoading: loadingFluxo } = useQuery({
    queryKey: ['dashboard-fluxo'],
    queryFn: async () => {
      const { data: resp } = await get('/dashboard/fluxo-mensal');
      const raw = resp as unknown;
      if (Array.isArray(raw)) return raw as FluxoMensal[];
      if (raw && typeof raw === 'object' && 'data' in raw) return (raw as Record<string, unknown>).data as FluxoMensal[];
      return [] as FluxoMensal[];
    },
  });

  const { data: despesasCategoria, isLoading: loadingDespesas } = useQuery({
    queryKey: ['dashboard-despesas-categoria'],
    queryFn: async () => {
      const { data: resp } = await get('/dashboard/despesas-categoria');
      const raw = resp as unknown;
      if (Array.isArray(raw)) return raw as DespesaCategoria[];
      if (raw && typeof raw === 'object' && 'data' in raw) return (raw as Record<string, unknown>).data as DespesaCategoria[];
      return [] as DespesaCategoria[];
    },
  });

  const { data: proximosVencimentos, isLoading: loadingVencimentos } = useQuery({
    queryKey: ['dashboard-proximos-vencimentos'],
    queryFn: async () => {
      const { data: resp } = await get('/dashboard/proximos-vencimentos');
      const raw = resp as unknown;
      if (Array.isArray(raw)) return raw as ProximoVencimento[];
      if (raw && typeof raw === 'object' && 'data' in raw) return (raw as Record<string, unknown>).data as ProximoVencimento[];
      return [] as ProximoVencimento[];
    },
  });

  if (loadingSummary) return <LoadingSpinner />;
  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  const cards = [
    { title: 'Total a Pagar (Hoje)', value: summary?.totalPagarHoje ?? 0, color: '#e53e3e' },
    { title: 'Total a Receber (Hoje)', value: summary?.totalReceberHoje ?? 0, color: '#38a169' },
    { title: 'Saldo Projetado', value: summary?.saldoProjetado ?? 0, color: '#4299e1' },
    { title: 'Vencimentos Atrasados', value: summary?.atrasados ?? 0, color: '#ed8936', isCount: true },
  ];

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <DashboardInsights />

      {/* Summary cards */}
      <Row className="g-3 mb-4">
        {cards.map((card) => (
          <Col key={card.title} xs={12} sm={6} lg={3}>
            <Card className="summary-card h-100">
              <Card.Body>
                <div className="card-title">{card.title}</div>
                <div className="card-value" style={{ color: card.color }}>
                  {card.isCount ? card.value : formatCurrency(card.value)}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row className="g-3 mb-4">
        <Col xs={12} lg={8}>
          <Card className="summary-card h-100">
            <Card.Body>
              <h6 className="fw-bold mb-3">Fluxo de Caixa - Últimos 6 Meses</h6>
              {loadingFluxo ? (
                <LoadingSpinner />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={fluxoMensal ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="pagar" stroke="#e53e3e" name="Contas a Pagar" strokeWidth={2} />
                    <Line type="monotone" dataKey="receber" stroke="#38a169" name="Contas a Receber" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={4}>
          <Card className="summary-card h-100">
            <Card.Body>
              <h6 className="fw-bold mb-3">Despesas por Categoria</h6>
              {loadingDespesas ? (
                <LoadingSpinner />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={despesasCategoria ?? []}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="valor"
                      nameKey="categoria"
                      label={({ categoria, percent }) => `${categoria} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {(despesasCategoria ?? []).map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Próximos vencimentos */}
      <Card className="summary-card">
        <Card.Body>
          <h6 className="fw-bold mb-3">Próximos Vencimentos</h6>
          {loadingVencimentos ? (
            <LoadingSpinner />
          ) : (
            <Table hover responsive size="sm">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Vencimento</th>
                  <th className="text-end">Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(proximosVencimentos ?? []).slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>{item.descricao}</td>
                    <td>{item.tipo === 'CP' ? 'A Pagar' : 'A Receber'}</td>
                    <td>{format(parseISO(item.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}</td>
                    <td className={`text-end ${item.tipo === 'CP' ? 'valor-negativo' : 'valor-positivo'}`}>
                      {formatCurrency(item.valor)}
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
                {(!proximosVencimentos || proximosVencimentos.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      Nenhum vencimento próximo.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );
}
