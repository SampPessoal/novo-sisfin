import { Alert, Button } from 'react-bootstrap';

interface QueryErrorBannerProps {
  error: unknown;
  onRetry?: () => void;
  message?: string;
}

export default function QueryErrorBanner({ error, onRetry, message }: QueryErrorBannerProps) {
  const errorMessage = message 
    || (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    || (error as Error)?.message 
    || 'Ocorreu um erro ao carregar os dados.';

  return (
    <Alert variant="danger" className="d-flex align-items-center justify-content-between">
      <div>
        <strong>Erro:</strong> {errorMessage}
      </div>
      {onRetry && (
        <Button variant="outline-danger" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </Alert>
  );
}
