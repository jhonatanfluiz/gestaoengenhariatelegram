import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Classe ErrorBoundary para capturar erros de renderização em tempo de execução
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '32px', 
          color: '#ef4444', 
          backgroundColor: '#090d16', 
          minHeight: '100vh', 
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '600px', width: '100%', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#ffffff' }}>⚠️ Erro Crítico no Componente</h1>
            <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Ocorreu um erro inesperado durante a renderização do painel:</p>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              textAlign: 'left', 
              background: '#020617', 
              padding: '16px', 
              borderRadius: '8px', 
              fontSize: '0.85rem',
              color: '#f87171',
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {this.state.error?.toString()}
              {"\n\nStack Trace:\n"}
              {this.state.error?.stack}
            </pre>
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }} 
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: '#06b6d4',
                color: '#090d16',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Limpar Cache e Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
