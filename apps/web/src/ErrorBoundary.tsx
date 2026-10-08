import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = { readonly children: ReactNode; readonly onReset: () => void };
type ErrorBoundaryState = { readonly failed: boolean };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private readonly reset = (): void => {
    this.setState({ failed: false });
    this.props.onReset();
  };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="screen menu">
        <h1 className="menu__title">Что-то сломалось</h1>
        <button type="button" className="pbtn pbtn--red" onClick={this.reset}>
          Вернуться в меню
        </button>
      </main>
    );
  }
}
