import { Card, Alert } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { get } from '../services/api';

interface Insight {
  tipo: string;
  prioridade: string;
  mensagem: string;
}

export default function DashboardInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-insights-ia'],
    queryFn: async () => {
      const { data: resp } = await get('/dashboard/insights-ia');
      const body = resp as { data: { insights: Insight[]; geradoEm: string } };
      return body.data as { insights: Insight[]; geradoEm: string };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return null;
  if (!data?.insights?.length) return null;

  const variantMap: Record<string, string> = {
    critico: 'danger',
    alerta: 'warning',
    cobranca: 'info',
    positivo: 'success',
    info: 'secondary',
  };

  return (
    <Card className="mb-4">
      <Card.Header className="bg-light d-flex align-items-center gap-2">
        <strong>Insights Financeiros</strong>
        <small className="text-muted ms-auto">Atualizado automaticamente</small>
      </Card.Header>
      <Card.Body className="p-2">
        {data.insights.map((insight, i) => (
          <Alert key={i} variant={variantMap[insight.tipo] || 'secondary'} className="mb-2 py-2 px-3 d-flex align-items-center">
            <span className="me-2">{insight.tipo === 'critico' ? '🚨' : insight.tipo === 'alerta' ? '⚠️' : insight.tipo === 'cobranca' ? '💰' : insight.tipo === 'positivo' ? '✅' : 'ℹ️'}</span>
            <span>{insight.mensagem}</span>
          </Alert>
        ))}
      </Card.Body>
    </Card>
  );
}
