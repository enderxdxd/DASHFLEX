// src/components/ui/ErrorBoundary.jsx
import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '2rem',
      }}>
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2.5rem',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--danger)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: '1.25rem',
            fontWeight: 600,
            margin: '0 0 0.75rem 0',
          }}>
            Algo deu errado
          </h2>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            margin: '0 0 2rem 0',
            wordBreak: 'break-word',
          }}>
            {this.state.error?.message || 'Ocorreu um erro inesperado.'}
          </p>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={this.handleReset}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
            <a
              href="/modules"
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
