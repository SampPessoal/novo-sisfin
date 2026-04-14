import { Spinner } from 'react-bootstrap';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  message?: string;
}

export default function LoadingSpinner({ fullPage = false, message = 'Carregando...' }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" variant="primary" />
        <span className="mt-2 text-muted">{message}</span>
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center justify-content-center py-4">
      <Spinner animation="border" size="sm" variant="primary" className="me-2" />
      <span className="text-muted">{message}</span>
    </div>
  );
}
