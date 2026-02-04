import React from "react";
import dayjs from "dayjs";

function MetricCards({
  // Novos dados de faturamento separados
  faturamentoUnidade,
  faturamentoConsultores,
  
  // Métricas existentes
  countAtual,
  countAnterior,
  pctVendas,
  mediaAtual,
  mediaAnterior,
  pctMedia,
  selectedMonth,
  pctConsultoresBatendoMeta,
  
  // Card de produtos excluídos
  metricasExcluidas,
  produtosSelecionados
}) {
  // Formata o valor monetário com verificação de segurança
  const formatMoney = (value) => {
    const numValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  // Formata percentual com verificação de segurança
  const formatPercent = (value) => {
    const numValue = Number(value) || 0;
    const isPositive = numValue >= 0;
    return {
      value: Math.abs(numValue).toFixed(1),
      isPositive,
      icon: isPositive ? '↗' : '↘'
    };
  };

  // Valores seguros com fallbacks
  const safeCountAtual = Number(countAtual) || 0;
  const safePctVendas = Number(pctVendas) || 0;
  const safeMediaAtual = Number(mediaAtual) || 0;
  const safePctMedia = Number(pctMedia) || 0;

  // Mostra o card de produtos excluídos se houver produtos selecionados ou valores excluídos
  const shouldShowExcludedCard = produtosSelecionados?.length > 0 || (metricasExcluidas?.valor || 0) > 0;

  return (
    <div className="metrics-container">
      <div className="metrics-grid">
        {/* Card 1: Faturamento DA UNIDADE */}
        <div className="metric-card primary-card">
          <div className="card-header">
            <div className="icon-container primary-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="card-title">
              <h3>Faturamento da Unidade</h3>
              <p>Vendas realizadas na unidade</p>
            </div>
          </div>
          <div className="card-content">
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {((faturamentoUnidade?.totalAtual || 0) / (faturamentoUnidade?.meta || 1) * 100).toFixed(1)}% da meta
              </span>
            </div>
            <div className="main-value">{formatMoney(faturamentoUnidade?.totalAtual || 0)}</div>
            <div style={{ margin: '0.75rem 0 0.5rem 0' }}>
              <div style={{
                width: '100%',
                height: '4px',
                background: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '0.5rem'
              }}>
                <div 
                  style={{ 
                    width: `${Math.min((faturamentoUnidade?.totalAtual || 0) / (faturamentoUnidade?.meta || 1) * 100, 100)}%`,
                    height: '100%',
                    background: '#3b82f6',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                Meta: {formatMoney(faturamentoUnidade?.meta || 0)}
              </div>
            </div>
            <div className={`comparison-badge ${(faturamentoUnidade?.percentChange || 0) >= 0 ? 'positive' : 'negative'}`}>
              <span className="trend-icon">{formatPercent(faturamentoUnidade?.percentChange || 0).icon}</span>
              <span>{formatPercent(faturamentoUnidade?.percentChange || 0).value}% vs mês anterior</span>
            </div>
          </div>
        </div>

        {/* Card 2: Faturamento DOS CONSULTORES */}
        <div className="metric-card secondary-card">
          <div className="card-header">
            <div className="icon-container secondary-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.7012C21.7033 16.0484 20.9998 15.5902 20.2 15.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13C16.8003 3.35055 17.5037 3.80875 18.0098 4.46157C18.5159 5.11439 18.8004 5.92481 18.8004 6.76C18.8004 7.59519 18.5159 8.40561 18.0098 9.05843C17.5037 9.71125 16.8003 10.1695 16 10.39" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="card-title">
              <h3>Faturamento dos Consultores</h3>
              <p>Total vendido pelos consultores</p>
            </div>
          </div>
          <div className="card-content">
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {((faturamentoConsultores?.totalAtual || 0) / (faturamentoConsultores?.meta || 1) * 100).toFixed(1)}% da meta
              </span>
            </div>
            <div className="main-value">{formatMoney(faturamentoConsultores?.totalAtual || 0)}</div>
            <div style={{ margin: '0.75rem 0 0.5rem 0' }}>
              <div style={{
                width: '100%',
                height: '4px',
                background: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '0.5rem'
              }}>
                <div 
                  style={{ 
                    width: `${Math.min((faturamentoConsultores?.totalAtual || 0) / (faturamentoConsultores?.meta || 1) * 100, 100)}%`,
                    height: '100%',
                    background: '#6366f1',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                Meta: {formatMoney(faturamentoConsultores?.meta || 0)}
              </div>
            </div>
            <div className={`comparison-badge ${(faturamentoConsultores?.percentChange || 0) >= 0 ? 'positive' : 'negative'}`}>
              <span className="trend-icon">{formatPercent(faturamentoConsultores?.percentChange || 0).icon}</span>
              <span>{formatPercent(faturamentoConsultores?.percentChange || 0).value}% vs mês anterior</span>
            </div>
          </div>
        </div>





        {/* Card 5: Produtos Excluídos */}
        {shouldShowExcludedCard && (
          <div className="metric-card excluded-card">
            <div className="card-header">
              <div className="icon-container excluded-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="card-title">
                <h3>Valor Excluído</h3>
                <p>Produtos filtrados</p>
              </div>
            </div>
            <div className="card-content">
              <div className="main-value">{formatMoney(metricasExcluidas?.valor || 0)}</div>
              {metricasExcluidas?.quantidade > 0 ? (
                <div className="excluded-details">
                  <div className="detail-row">
                    <span className="detail-label">Vendas:</span>
                    <span className="detail-value">{metricasExcluidas.quantidade}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Média:</span>
                    <span className="detail-value">{formatMoney(metricasExcluidas.media)}</span>
                  </div>
                </div>
              ) : (
                <div className="comparison-badge neutral">
                  <span>{produtosSelecionados?.length || 0} produto(s) filtrado(s)</span>
                </div>
              )}
            </div>
            <div className="card-footer">
              <span>Não incluídos nos cálculos principais</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .metrics-container {
          margin-bottom: 1.5rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .metric-card {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
        }

        .metric-card:hover {
          border-color: #d1d5db;
        }
        
        .dark .metric-card {
          background: #1f2937;
          border-color: #374151;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .icon-container {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .primary-icon {
          background: #3b82f6;
          color: white;
        }

        .secondary-icon {
          background: #6366f1;
          color: white;
        }

        .success-icon {
          background: #10b981;
          color: white;
        }

        .warning-icon {
          background: #f59e0b;
          color: white;
        }

        .excluded-icon {
          background: #ef4444;
          color: white;
        }

        .card-title h3 {
          font-size: 0.8rem;
          font-weight: 500;
          color: #111827;
          margin: 0 0 0.125rem 0;
        }

        .card-title p {
          font-size: 0.7rem;
          color: #6b7280;
          margin: 0;
        }

        .card-content {
          margin-bottom: 0.5rem;
        }

        .main-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        
        .dark .card-title h3,
        .dark .main-value {
          color: #f9fafb;
        }
        
        .dark .card-title p {
          color: #9ca3af;
        }

        .comparison-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .comparison-badge.positive {
          background: #ecfdf5;
          color: #059669;
        }

        .comparison-badge.negative {
          background: #fef2f2;
          color: #dc2626;
        }

        .comparison-badge.neutral {
          background: #f3f4f6;
          color: #6b7280;
        }

        .trend-icon {
          font-size: 0.7rem;
        }

        .excluded-details {
          background: #f3f4f6;
          border-radius: 4px;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          font-size: 0.7rem;
          color: #6b7280;
        }

        .detail-value {
          font-size: 0.7rem;
          color: #111827;
          font-weight: 500;
        }

        .card-footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 0.5rem;
          margin-top: 0.5rem;
        }

        .card-footer span {
          font-size: 0.65rem;
          color: #6b7280;
        }
        
        .dark .excluded-details {
          background: #374151;
        }
        
        .dark .detail-label,
        .dark .card-footer span {
          color: #9ca3af;
        }
        
        .dark .detail-value {
          color: #f9fafb;
        }
        
        .dark .card-footer {
          border-color: #4b5563;
        }

        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .metric-card {
            padding: 0.75rem;
          }

          .main-value {
            font-size: 1.25rem;
          }
        }

        /* Sistema de cores compatível com temas existentes */
        :root {
          --primary: #4f46e5;
          --success: #10b981;
          --warning: #f59e0b;
          --danger: #ef4444;
          --card: #ffffff;
          --bg-primary: #f8fafc;
          --bg-secondary: #f1f5f9;
          --border: #e2e8f0;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
        }

        [data-theme="dark"],
        .dark {
          --primary: #6366f1;
          --success: #34d399;
          --warning: #fbbf24;
          --danger: #f87171;
          --card: #1e293b;
          --bg-primary: #0f172a;
          --bg-secondary: #334155;
          --border: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
        }

        /* Dark mode specific fixes for excluded card */
        .dark .excluded-card,
        [data-theme="dark"] .excluded-card {
          background: var(--card) !important;
          border-color: var(--border) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
        }
        
        .dark .excluded-card .main-value,
        [data-theme="dark"] .excluded-card .main-value {
          color: var(--text-primary) !important;
        }
        
        .dark .excluded-card .card-title h3,
        [data-theme="dark"] .excluded-card .card-title h3 {
          color: var(--text-primary) !important;
        }
        
        .dark .excluded-card .card-title p,
        [data-theme="dark"] .excluded-card .card-title p {
          color: var(--text-secondary) !important;
        }
        
        .dark .excluded-card .excluded-details,
        [data-theme="dark"] .excluded-card .excluded-details {
          background: var(--bg-secondary) !important;
          border: 1px solid var(--border) !important;
        }
        
        .dark .excluded-details,
        [data-theme="dark"] .excluded-details {
          background: #334155 !important;
          border: 1px solid #475569 !important;
        }
        
        /* More aggressive dark mode fixes */
        html.dark .excluded-details,
        html[data-theme="dark"] .excluded-details,
        body.dark .excluded-details,
        body[data-theme="dark"] .excluded-details {
          background: #334155 !important;
          background-color: #334155 !important;
        }
        
        .dark .metric-card .excluded-details,
        [data-theme="dark"] .metric-card .excluded-details {
          background: #334155 !important;
          background-color: #334155 !important;
        }
        
        .excluded-card .excluded-details {
          background: var(--bg-secondary);
        }
        
        .dark .excluded-card .excluded-details {
          background: #334155 !important;
          background-color: #334155 !important;
        }
        
        .dark .excluded-card .detail-label,
        [data-theme="dark"] .excluded-card .detail-label {
          color: var(--text-secondary) !important;
        }
        
        .dark .excluded-card .detail-value,
        [data-theme="dark"] .excluded-card .detail-value {
          color: var(--text-primary) !important;
        }
        
        .dark .excluded-card .card-footer,
        [data-theme="dark"] .excluded-card .card-footer {
          border-color: var(--border) !important;
        }
        
        .dark .excluded-card .card-footer span,
        [data-theme="dark"] .excluded-card .card-footer span {
          color: var(--text-secondary) !important;
        }
        
        @media (prefers-color-scheme: dark) {
          :root {
            --primary: #6366f1;
            --success: #34d399;
            --warning: #fbbf24;
            --danger: #f87171;
            --card: #1e293b;
            --bg-primary: #0f172a;
            --bg-secondary: #334155;
            --border: #475569;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
          }
        }
      `}</style>
    </div>
  );
}

export default MetricCards;