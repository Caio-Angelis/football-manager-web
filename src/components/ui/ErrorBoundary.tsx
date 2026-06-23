import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('🚨 Error Boundary caught:', error);
    console.error('Stack trace:', info.componentStack);
  }

  reset() {
    this.setState({ hasError: false, error: null });
    // Limpar estado corrompido
    try {
      localStorage.removeItem('fm-game-storage-v3');
      localStorage.removeItem('fm-save-slots-v3');
      window.location.reload();
    } catch (e) {
      console.error('Erro ao limpar localStorage:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fm-error-boundary">
          <div className="fm-error-boundary__content">
            <div className="fm-error-boundary__icon">⚠️</div>
            <h2>Erro no estado do jogo</h2>
            <p className="fm-error-boundary__message">
              Ocorreu um erro ao renderizar a aplicação.
              {this.state.error?.message && (
                <><br />Detalhe: {this.state.error.message}</>
              )}
            </p>
            <p className="fm-error-boundary__hint">
              Isso pode acontecer se o estado foi corrompido.
              <br />
              Clique abaixo para recarregar com estado limpo.
            </p>
            <button
              className="fm-button fm-button--primary fm-error-boundary__button"
              onClick={() => this.reset()}
            >
              Recarregar com estado limpo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
