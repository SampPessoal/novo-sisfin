import { Card, Badge, ListGroup, ProgressBar } from 'react-bootstrap';

interface AIInsightCardProps {
  title: string;
  loading?: boolean;
  score?: number;
  items: Array<{ label: string; value: string | number; variant?: string }>;
  actions?: string[];
  fonte?: 'ai' | 'regras';
}

export default function AIInsightCard({ title, loading, score, items, actions, fonte }: AIInsightCardProps) {
  if (loading) return <Card className="mb-3"><Card.Body className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />Analisando com IA...</Card.Body></Card>;

  const scoreColor = score !== undefined ? (score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger') : 'secondary';

  return (
    <Card className="mb-3 border-start border-4" style={{ borderLeftColor: score !== undefined ? (score >= 70 ? '#28a745' : score >= 40 ? '#ffc107' : '#dc3545') : '#6c757d' }}>
      <Card.Header className="d-flex justify-content-between align-items-center bg-light">
        <strong>{title}</strong>
        {fonte && <Badge bg={fonte === 'ai' ? 'primary' : 'secondary'} className="ms-2">{fonte === 'ai' ? 'IA' : 'Regras'}</Badge>}
      </Card.Header>
      <Card.Body>
        {score !== undefined && (
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <small className="fw-bold">Score de Risco</small>
              <small>{score}/100</small>
            </div>
            <ProgressBar now={score} variant={scoreColor} style={{ height: '8px' }} />
          </div>
        )}
        <ListGroup variant="flush">
          {items.map((item, i) => (
            <ListGroup.Item key={i} className="d-flex justify-content-between px-0 py-2">
              <span className="text-muted">{item.label}</span>
              <span className={item.variant ? `text-${item.variant}` : 'fw-bold'}>{typeof item.value === 'number' ? item.value.toLocaleString('pt-BR') : item.value}</span>
            </ListGroup.Item>
          ))}
        </ListGroup>
        {actions && actions.length > 0 && (
          <div className="mt-3">
            <small className="fw-bold text-muted">Ações Recomendadas:</small>
            <ul className="mt-1 mb-0 ps-3">
              {actions.map((a, i) => <li key={i} className="small">{a}</li>)}
            </ul>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
