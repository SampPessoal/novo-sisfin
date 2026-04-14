import { useState } from 'react';
import { Row, Col, Card, Form, Button, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { get } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import QueryErrorBanner from '../../components/QueryErrorBanner';

interface DREResponse {
  competencia: string;
  receitaOperacional: number;
  deducoesReceita: number;
  receitaLiquida: number;
  custos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  despesasAdministrativas: number;
  despesasComerciais: number;
  resultadoOperacional: number;
  receitasFinanceiras: number;
  despesasFinanceiras: number;
  resultadoAntesIR: number;
  provisaoIR: number;
  resultadoLiquido: number;
}

interface DREComparativoResponse {
  competencia1: DREResponse;
  competencia2: DREResponse;
}

interface DRELineItem {
  label: string;
  field: keyof DREResponse;
  indent?: number;
  bold?: boolean;
  separator?: boolean;
}

const DRE_STRUCTURE: DRELineItem[] = [
  { label: 'RECEITA OPERACIONAL BRUTA', field: 'receitaOperacional', bold: true },
  { label: '(-) Deduções da Receita', field: 'deducoesReceita', indent: 1 },
  { label: '(=) RECEITA OPERACIONAL LÍQUIDA', field: 'receitaLiquida', bold: true, separator: true },

  { label: '(-) Custos', field: 'custos', indent: 1 },
  { label: '(=) LUCRO BRUTO', field: 'lucroBruto', bold: true, separator: true },

  { label: '(-) Despesas Operacionais', field: 'despesasOperacionais', indent: 1 },
  { label: '    Despesas Administrativas', field: 'despesasAdministrativas', indent: 2 },
  { label: '    Despesas Comerciais', field: 'despesasComerciais', indent: 2 },
  { label: '(=) RESULTADO OPERACIONAL', field: 'resultadoOperacional', bold: true, separator: true },

  { label: '(+) Receitas Financeiras', field: 'receitasFinanceiras', indent: 1 },
  { label: '(-) Despesas Financeiras', field: 'despesasFinanceiras', indent: 1 },
  { label: '(=) RESULTADO ANTES DO IR', field: 'resultadoAntesIR', bold: true, separator: true },

  { label: '(-) Provisão para IR', field: 'provisaoIR', indent: 1 },
  { label: '(=) RESULTADO LÍQUIDO DO EXERCÍCIO', field: 'resultadoLiquido', bold: true, separator: true },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function valueColor(value: number): string {
  if (value > 0) return '#38a169';
  if (value < 0) return '#e53e3e';
  return 'inherit';
}

export default function DREPage() {
  const [competencia, setCompetencia] = useState(format(new Date(), 'yyyy-MM'));
  const [comparativo, setComparativo] = useState(false);
  const [competencia2, setCompetencia2] = useState('');

  const { data: dre, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dre', competencia],
    queryFn: async () => {
      const { data: resp } = await get(`/dre?competencia=${competencia}`);
      const raw = resp as Record<string, unknown>;
      if ('success' in raw && 'data' in raw) return raw.data as DREResponse;
      return raw as unknown as DREResponse;
    },
    enabled: !!competencia && !comparativo,
  });

  const { data: dreComparativo, isLoading: isLoadingComp } = useQuery({
    queryKey: ['dre-comparativo', competencia, competencia2],
    queryFn: async () => {
      const { data: resp } = await get(
        `/dre/comparativo?competencia1=${competencia}&competencia2=${competencia2}`,
      );
      const raw = resp as Record<string, unknown>;
      if ('success' in raw && 'data' in raw) return raw.data as DREComparativoResponse;
      return raw as unknown as DREComparativoResponse;
    },
    enabled: comparativo && !!competencia && !!competencia2,
  });

  const handleExport = async (tipo: 'excel' | 'pdf') => {
    try {
      const ext = tipo === 'excel' ? 'xlsx' : 'pdf';
      const params = comparativo && competencia2
        ? `competencia1=${competencia}&competencia2=${competencia2}`
        : `competencia=${competencia}`;
      const endpoint = comparativo && competencia2 ? `/dre/comparativo/export/${tipo}` : `/dre/export/${tipo}`;
      const resp = await get(`${endpoint}?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dre.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Erro ao exportar ${tipo.toUpperCase()}.`);
    }
  };

  if (isError) return <QueryErrorBanner error={error} onRetry={() => refetch()} />;

  const loading = comparativo ? isLoadingComp : isLoading;
  const semDados = !loading && !comparativo && !dre;
  const semDadosComp = !loading && comparativo && !dreComparativo;

  const cellStyle = (line: DRELineItem) => ({
    paddingLeft: `${(line.indent ?? 0) * 24 + 12}px`,
    fontWeight: line.bold ? 700 : 400,
    fontSize: line.bold ? '0.95rem' : '0.875rem',
  });

  const valueCellStyle = (value: number, line: DRELineItem) => ({
    fontWeight: line.bold ? 700 : 400,
    fontSize: line.bold ? '0.95rem' : '0.875rem',
    color: valueColor(value),
  });

  return (
    <>
      <div className="page-header">
        <h2>DRE - Demonstrativo de Resultados</h2>
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
            <Col xs={12} sm={4} md={3}>
              <Form.Group>
                <Form.Label>Competência</Form.Label>
                <Form.Control
                  type="month"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Form.Check
                type="switch"
                id="comparativo-switch"
                label="Comparativo"
                checked={comparativo}
                onChange={(e) => setComparativo(e.target.checked)}
                className="mt-4"
              />
            </Col>
            {comparativo && (
              <Col xs={12} sm={4} md={3}>
                <Form.Group>
                  <Form.Label>Comparar com</Form.Label>
                  <Form.Control
                    type="month"
                    value={competencia2}
                    onChange={(e) => setCompetencia2(e.target.value)}
                  />
                </Form.Group>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && semDados && (
        <Card className="summary-card">
          <Card.Body className="text-center text-muted py-5">
            Nenhum dado para o período.
          </Card.Body>
        </Card>
      )}

      {!loading && semDadosComp && (
        <Card className="summary-card">
          <Card.Body className="text-center text-muted py-5">
            Nenhum dado comparativo disponível. Selecione ambas as competências.
          </Card.Body>
        </Card>
      )}

      {/* Single DRE */}
      {!loading && !comparativo && dre && (
        <Card className="summary-card">
          <Card.Body>
            <h6 className="fw-bold mb-3">
              Competência: {competencia}
            </h6>
            <Table bordered responsive className="mb-0">
              <thead>
                <tr>
                  <th style={{ width: '70%' }}>Descrição</th>
                  <th className="text-end" style={{ width: '30%' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {DRE_STRUCTURE.map((line) => {
                  const value = dre[line.field] as number;
                  return (
                    <tr
                      key={line.field}
                      style={{ borderBottom: line.separator ? '2px solid #dee2e6' : undefined }}
                    >
                      <td style={cellStyle(line)}>{line.label}</td>
                      <td className="text-end" style={valueCellStyle(value, line)}>
                        {formatCurrency(value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Comparativo DRE */}
      {!loading && comparativo && dreComparativo && (
        <Card className="summary-card">
          <Card.Body>
            <h6 className="fw-bold mb-3">
              Comparativo: {competencia} vs {competencia2}
            </h6>
            <Table bordered responsive className="mb-0">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Descrição</th>
                  <th className="text-end" style={{ width: '20%' }}>{competencia}</th>
                  <th className="text-end" style={{ width: '20%' }}>{competencia2}</th>
                  <th className="text-end" style={{ width: '20%' }}>Variação</th>
                </tr>
              </thead>
              <tbody>
                {DRE_STRUCTURE.map((line) => {
                  const v1 = dreComparativo.competencia1[line.field] as number;
                  const v2 = dreComparativo.competencia2[line.field] as number;
                  const variacao = v1 - v2;
                  const pctVariacao = v2 !== 0 ? ((variacao / Math.abs(v2)) * 100) : 0;
                  return (
                    <tr
                      key={line.field}
                      style={{ borderBottom: line.separator ? '2px solid #dee2e6' : undefined }}
                    >
                      <td style={cellStyle(line)}>{line.label}</td>
                      <td className="text-end" style={valueCellStyle(v1, line)}>
                        {formatCurrency(v1)}
                      </td>
                      <td className="text-end" style={valueCellStyle(v2, line)}>
                        {formatCurrency(v2)}
                      </td>
                      <td className="text-end" style={{ color: valueColor(variacao), fontWeight: line.bold ? 700 : 400, fontSize: line.bold ? '0.95rem' : '0.875rem' }}>
                        {formatCurrency(variacao)}
                        {v2 !== 0 && (
                          <small className="ms-1 text-muted">({pctVariacao >= 0 ? '+' : ''}{pctVariacao.toFixed(1)}%)</small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </>
  );
}
