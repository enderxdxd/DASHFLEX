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
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .metric-card {
          background: var(--card);
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .metric-card:hover {
          box-shadow: var(--card-hover-shadow);
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
          background: var(--success);
          color: white;
        }

        .warning-icon {
          background: var(--warning);
          color: white;
        }

        .excluded-icon {
          background: var(--danger);
          color: white;
        }

        .card-title h3 {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0 0 0.125rem 0;
        }

        .card-title p {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .card-content {
          margin-bottom: 0.5rem;
        }

        .main-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          font-variant-numeric: tabular-nums;
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
          background: var(--success-light);
          color: var(--success);
        }

        .comparison-badge.negative {
          background: var(--error-light);
          color: var(--danger);
        }

        .comparison-badge.neutral {
          background: var(--background);
          color: var(--text-secondary);
        }

        .trend-icon {
          font-size: 0.7rem;
        }

        .excluded-details {
          background: var(--background);
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
          color: var(--text-secondary);
        }

        .detail-value {
          font-size: 0.7rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .card-footer {
          border-top: 1px solid var(--border);
          padding-top: 0.5rem;
          margin-top: 0.5rem;
        }

        .card-footer span {
          font-size: 0.65rem;
          color: var(--text-secondary);
        }

        @media (max-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
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
      `}</style>
    </div>
  );
}

export default React.memo(MetricCards);