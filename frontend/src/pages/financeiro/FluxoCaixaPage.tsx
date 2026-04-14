import { useState } from 'react';
import { Row, Col, Card, Form, Button, Table, Nav } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { get } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import QueryErrorBanner from '../../components/QueryErrorBanner';

interface FluxoCaixaItem {
  data: string;
  descricao: string;
  tipo: string;
  valor: number;
  saldoAcumulado: number;
}

interface FluxoCaixaResponse {
  entradas: number;
  saidas: number;
  saldo: number;
  itens: FluxoCaixaItem[];
}

interface ProjecaoItem {
  data: string;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoPrevisto: number;
}

interface ProjecaoResponse {
  itens: ProjecaoItem[];
  totalEntradasPrevistas: number;
  totalSaidasPrevistas: number;
  saldoFinalPrevisto: number;
}

interface ContaBancaria { id: number; nome: string; banco: string }

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return iso;
  }
}

export default function FluxoCaixaPage() {
  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'));
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [activeTab, setActiveTab] = useState<'realizado' | 'projecao'>('realizado');

  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias-fluxo'],
    queryFn: async () => {
      const { data } = await get<{ data: ContaBancaria[] }>('/contas-bancarias?page=1&pageSize=100');
      return data.data;
    },
  });

  const buildParams = () => {
    const params = new URLSearchParams();
    params.set('dataInicio', dataInicio);
    params.set('dataFim', dataFim);
    if (contaBancariaId) params.set('contaBancariaId', contaBancariaId);
    return params.toString();
  };

  const { data: fluxo, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['fluxo-caixa', dataInicio, dataFim, contaBancariaId],
    queryFn: async () => {
      const { data: resp } = await get(`/fluxo-caixa?${buildParams()}`);
      const body = resp as { data: FluxoCaixaResponse };
      return body.data as FluxoCaixaResponse;
    },
  });

  const { data: projecao, isLoading: isLoadingProjecao } = useQuery({
    queryKey: ['fluxo-caixa-projecao', dataInicio, dataFim, contaBancariaId],
    queryFn: async () => {
      const { data: resp } = await get(`/fluxo-caixa/projecao?${buildParams()}`);
      const body = resp as { data: ProjecaoResponse };
      return body.data as ProjecaoResponse;
    },
    enabled: activeTab === 'projecao',
  });

  const handleExport = async (tipo: 'excel' | 'pdf') => {
    try {
      const ext = tipo === 'excel' ? 'xlsx' : 'pdf';
      const resp = await get(`/fluxo-caixa/export/${tipo}?${buildParams()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `fluxo-caixa.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Erro ao exportar ${tipo.toUpperCase()}.`);
    }
  };

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  const itens = fluxo?.itens ?? [];
  const semDados = !isLoading && itens.length === 0;

  const chartData = itens.map((item) => ({
    data: formatDate(item.data),
    saldoAcumulado: item.saldoAcumulado,
  }));

  const projecaoChartData = (projecao?.itens ?? []).map((item) => ({
    data: formatDate(item.data),
    saldoPrevisto: item.saldoPrevisto,
    entradasPrevistas: item.entradasPrevistas,
    saidasPrevistas: item.saidasPrevistas,
  }));

  const summaryCards = [
    { title: 'Total Entradas', value: fluxo?.entradas ?? 0, color: '#38a169' },
    { title: 'Total Saídas', value: fluxo?.saidas ?? 0, color: '#e53e3e' },
    { title: 'Saldo', value: fluxo?.saldo ?? 0, color: '#4299e1' },
  ];

  return (
    <>
      <div className="page-header">
        <h2>Fluxo de Caixa</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-success" size="sm" onClick={() => handleExport('excel')}>
            Exportar Excel
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => handleExport('pdf')}>
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card className="summary-card mb-4">
        <Card.Body>
          <Row className="align-items-end g-3">
            <Col xs={12} sm={6} md={3}>
              <Form.Group>
                <Form.Label>Data Início</Form.Label>
                <Form.Control
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Group>
                <Form.Label>Data Fim</Form.Label>
                <Form.Control
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Group>
                <Form.Label>Conta Bancária</Form.Label>
                <Form.Select
                  value={contaBancariaId}
                  onChange={(e) => setContaBancariaId(e.target.value)}
                >
                  <option value="">Todas</option>
                  {(contasBancarias ?? []).map((cb) => (
                    <option key={cb.id} value={cb.id}>{cb.nome} - {cb.banco}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Button variant="primary" disabled={isLoading}>
                {isLoading ? 'Carregando...' : 'Consultar'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Nav variant="tabs" className="mb-4" activeKey={activeTab} onSelect={(k) => setActiveTab(k as 'realizado' | 'projecao')}>
        <Nav.Item>
          <Nav.Link eventKey="realizado">Realizado</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="projecao">Projeção</Nav.Link>
        </Nav.Item>
      </Nav>

      {isLoading && <LoadingSpinner />}

      {activeTab === 'realizado' && !isLoading && (
        <>
          <Row className="g-3 mb-4">
            {summaryCards.map((card) => (
              <Col key={card.title} xs={12} sm={4}>
                <Card className="summary-card h-100">
                  <Card.Body>
                    <div className="card-title">{card.title}</div>
                    <div className="card-value" style={{ color: card.color }}>
                      {formatCurrency(card.value)}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {semDados ? (
            <Card className="summary-card">
              <Card.Body className="text-center text-muted py-5">
                Nenhum dado para o período.
              </Card.Body>
            </Card>
          ) : (
            <>
              <Card className="summary-card mb-4">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Saldo Acumulado</h6>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="saldoAcumulado"
                        stroke="#4299e1"
                        name="Saldo Acumulado"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>

              <Card className="summary-card">
                <Card.Body>
                  <h6 className="fw-bold mb-3">Movimentações</h6>
                  <Table hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th className="text-end">Valor</th>
                        <th className="text-end">Saldo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(item.data)}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <span
                              className={`badge bg-${item.tipo === 'ENTRADA' ? 'success' : 'danger'}`}
                            >
                              {item.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td
                            className={`text-end ${item.tipo === 'ENTRADA' ? 'valor-positivo' : 'valor-negativo'}`}
                          >
                            {formatCurrency(item.valor)}
                          </td>
                          <td className="text-end">{formatCurrency(item.saldoAcumulado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </>
          )}
        </>
      )}

      {activeTab === 'projecao' && (
        <>
          {isLoadingProjecao && <LoadingSpinner />}

          {!isLoadingProjecao && projecao && (
            <>
              <Row className="g-3 mb-4">
                <Col xs={12} sm={4}>
                  <Card className="summary-card h-100">
                    <Card.Body>
                      <div className="card-title">Entradas Previstas</div>
                      <div className="card-value" style={{ color: '#38a169' }}>
                        {formatCurrency(projecao.totalEntradasPrevistas)}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card className="summary-card h-100">
                    <Card.Body>
                      <div className="card-title">Saídas Previstas</div>
                      <div className="card-value" style={{ color: '#e53e3e' }}>
                        {formatCurrency(projecao.totalSaidasPrevistas)}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card className="summary-card h-100">
                    <Card.Body>
                      <div className="card-title">Saldo Final Previsto</div>
                      <div className="card-value" style={{ color: '#4299e1' }}>
                        {formatCurrency(projecao.saldoFinalPrevisto)}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {projecao.itens.length > 0 ? (
                <>
                  <Card className="summary-card mb-4">
                    <Card.Body>
                      <h6 className="fw-bold mb-3">Projeção de Saldo</h6>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={projecaoChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="saldoPrevisto" stroke="#4299e1" name="Saldo Previsto" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="entradasPrevistas" stroke="#38a169" name="Entradas" strokeWidth={1} dot={false} />
                          <Line type="monotone" dataKey="saidasPrevistas" stroke="#e53e3e" name="Saídas" strokeWidth={1} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>

                  <Card className="summary-card">
                    <Card.Body>
                      <h6 className="fw-bold mb-3">Detalhamento da Projeção</h6>
                      <Table hover responsive size="sm">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th className="text-end">Entradas Previstas</th>
                            <th className="text-end">Saídas Previstas</th>
                            <th className="text-end">Saldo Previsto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projecao.itens.map((item, idx) => (
                            <tr key={idx}>
                              <td>{formatDate(item.data)}</td>
                              <td className="text-end valor-positivo">{formatCurrency(item.entradasPrevistas)}</td>
                              <td className="text-end valor-negativo">{formatCurrency(item.saidasPrevistas)}</td>
                              <td className="text-end" style={{ color: item.saldoPrevisto >= 0 ? '#38a169' : '#e53e3e' }}>
                                {formatCurrency(item.saldoPrevisto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </>
              ) : (
                <Card className="summary-card">
                  <Card.Body className="text-center text-muted py-5">
                    Nenhuma projeção disponível para o período.
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
