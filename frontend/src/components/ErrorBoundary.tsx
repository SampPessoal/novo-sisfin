import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h3>Algo deu errado{this.props.moduleName ? ` em ${this.props.moduleName}` : ''}</h3>
            <p className="text-muted">
              Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
            </p>
            {this.state.error && (
              <details className="mb-3">
                <summary className="text-muted small" style={{ cursor: 'pointer' }}>
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 p-2 bg-light rounded small" style={{ maxHeight: 120, overflow: 'auto' }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button className="btn btn-primary" onClick={this.handleRetry}>
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
