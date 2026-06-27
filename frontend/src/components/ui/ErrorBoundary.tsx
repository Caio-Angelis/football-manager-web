import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Padrões que indicam corrupção de dados (vs. bugs de código)
const STATE_CORRUPTION_PATTERNS = [
  'corrupt',
  'invalid state',
  'failed to parse',
  'JSON',
];

function isLikelyStateError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return STATE_CORRUPTION_PATTERNS.some((pattern) => message.includes(pattern));
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
    console.error('Likely state corruption:', isLikelyStateError(error));
  }

  reset(soft = true) {
    this.setState({ hasError: false, error: null });
    if (!soft) {
      localStorage.removeItem('fm-game-storage-v3');
      localStorage.removeItem('fm-save-slots-v3');
      window.location.reload();
    }
  }

  clearData() {
    localStorage.removeItem('fm-game-storage-v3');
    localStorage.removeItem('fm-save-slots-v3');
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      const likelyStateError = isLikelyStateError(this.state.error);

      return (
        <div className="fm-error-boundary">
          <div className="fm-error-boundary__content">
            <div className="fm-error-boundary__icon fm-error-boundary__icon--animated">⚠️</div>
            <h2>Erro ao renderizar</h2>
            <p className="fm-error-boundary__message">
              {likelyStateError
                ? 'Parece que o estado do jogo está corrompido.'
                : 'Ocorreu um erro ao renderizar a aplicação.'}
              {this.state.error?.message && (
                <><br />Detalhe: {this.state.error.message}</>
              )}
            </p>
            {likelyStateError ? (
              <p className="fm-error-boundary__hint">
                É possível tentar recarregar com o mesmo estado ou limpar todos
                os dados (incluindo saves).
              </p>
            ) : (
              <p className="fm-error-boundary__hint">
                Tente recarregar para verificar se é um erro temporário.
              </p>
            )}
            <div className="fm-error-boundary__buttons">
              <button
                className="fm-button fm-button--secondary fm-error-boundary__button"
                onClick={() => this.reset(true)}
              >
                Tentar novamente
              </button>
              {likelyStateError && (
                <button
                  className="fm-button fm-button--danger fm-error-boundary__button"
                  onClick={() => this.clearData()}
                >
                  Limpar dados
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
