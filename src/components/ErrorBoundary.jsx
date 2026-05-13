import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
          <div className="max-w-sm w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">Algo salió mal</h1>
            <p className="text-sm text-zinc-400 mb-6">
              Ocurrió un error inesperado. Recargá la página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-lime-400 text-zinc-900 font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
