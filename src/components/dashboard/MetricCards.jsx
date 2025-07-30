import dayjs from "dayjs";

const MetricCards = ({
  totalFaturado,
  totalCurrent,
  totalPrevious,
  percentChange,
  countAtual,
  countAnterior,
  pctVendas,
  mediaAtual,
  mediaAnterior,
  pctMedia,
  selectedMonth,
  metricasExcluidas,
  produtosSelecionados
}) => {
  // Formata o valor monetário
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formata percentual
  const formatPercent = (value) => {
    const isPositive = value >= 0;
    return {
      value: Math.abs(value).toFixed(1),
      isPositive,
      icon: isPositive ? '↗' : '↘',
      color: isPositive ? 'var(--success)' : 'var(--danger)'
    };
  };

  // Verifica se deve mostrar o card de produtos excluídos
  const shouldShowExcludedCard = metricasExcluidas && 
    (metricasExcluidas.valor > 0 || produtosSelecionados?.length > 0);

  return (
    <div className="metrics-container">
      <div className="metrics-grid">
        {/* Card Total Faturado */}
        <div className="metric-card primary-card">
          <div className="card-header">
            <div className="icon-container primary-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6312 13.6815 18 14.5717 18 15.5C18 16.4283 17.6312 17.3185 16.9749 17.9749C16.3185 18.6312 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="card-title">
              <h3>Total Faturado</h3>
              <p>Receita do período</p>
            </div>
          </div>
          <div className="card-content">
            <div className="main-value">{formatMoney(totalFaturado)}</div>
            <div className={`comparison-badge ${percentChange >= 0 ? 'positive' : 'negative'}`}>
              <span className="trend-icon">{formatPercent(percentChange).icon}</span>
              <span>{formatPercent(percentChange).value}% vs mês anterior</span>
            </div>
          </div>
        </div>

        {/* Card Número de Vendas */}
        <div className="metric-card success-card">
          <div className="card-header">
            <div className="icon-container success-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V17C17 17.5 17.4 18 18 18S19 17.5 19 17V13M9 19.5C9.8 19.5 10.5 20.2 10.5 21S9.8 22.5 9 22.5 7.5 21.8 7.5 21 8.2 19.5 9 19.5ZM20 19.5C20.8 19.5 21.5 20.2 21.5 21S20.8 22.5 20 22.5 18.5 21.8 18.5 21 19.2 19.5 20 19.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="card-title">
              <h3>Número de Vendas</h3>
              <p>Total de transações</p>
            </div>
          </div>
          <div className="card-content">
            <div className="main-value">{countAtual.toLocaleString('pt-BR')}</div>
            <div className={`comparison-badge ${pctVendas >= 0 ? 'positive' : 'negative'}`}>
              <span className="trend-icon">{formatPercent(pctVendas).icon}</span>
              <span>{formatPercent(pctVendas).value}% vs mês anterior</span>
            </div>
          </div>
        </div>

        {/* Card Média por Venda */}
        <div className="metric-card warning-card">
          <div className="card-header">
            <div className="icon-container warning-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 11H15M9 15H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L19.7071 9.70711C19.8946 9.89464 20 10.149 20 10.4142V19C20 20.1046 19.1046 21 18 21H17ZM17 21V10L13 6H7V19H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="card-title">
              <h3>Média por Venda</h3>
              <p>Ticket médio</p>
            </div>
          </div>
          <div className="card-content">
            <div className="main-value">{formatMoney(mediaAtual)}</div>
            <div className={`comparison-badge ${pctMedia >= 0 ? 'positive' : 'negative'}`}>
              <span className="trend-icon">{formatPercent(pctMedia).icon}</span>
              <span>{formatPercent(pctMedia).value}% vs mês anterior</span>
            </div>
          </div>
        </div>

        {/* Card de Produtos Excluídos */}
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
          margin-bottom: 2rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .metric-card {
          background: var(--card);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 12px 12px 0 0;
        }

        .primary-card::before {
          background: var(--primary);
        }

        .success-card::before {
          background: var(--success);
        }

        .warning-card::before {
          background: var(--warning);
        }

        .excluded-card::before {
          background: var(--danger);
        }

        .card-header {
          display: flex;
          align-items: flex-start;
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
          background: rgba(79, 70, 229, 0.1);
          color: var(--primary);
        }

        .success-icon {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .warning-icon {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }

        .excluded-icon {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }

        .card-title h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
          line-height: 1.3;
        }

        .card-title p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.2;
        }

        .card-content {
          margin-bottom: 0.75rem;
        }

        .main-value {
          font-size: clamp(1.25rem, 4vw, 1.75rem);
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          line-height: 1.1;
          letter-spacing: -0.025em;
        }

        .comparison-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.025em;
        }

        .comparison-badge.positive {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }

        .comparison-badge.negative {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
        }

        .comparison-badge.neutral {
          background: var(--bg-secondary);
          color: var(--text-secondary);
        }

        .trend-icon {
          font-size: 0.8rem;
          font-weight: 700;
        }

        .excluded-details {
          background: var(--bg-secondary);
          border-radius: 6px;
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
          font-weight: 500;
        }

        .detail-value {
          font-size: 0.7rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .card-footer {
          border-top: 1px solid var(--border);
          padding-top: 0.5rem;
          margin-top: 0.5rem;
        }

        .card-footer span {
          font-size: 0.65rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Animação para card excluído */
        .excluded-card {
          animation: slideInRight 0.5s ease-out;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Responsividade para diferentes tamanhos de tela */
        @media (min-width: 1440px) {
          .metrics-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
          }
          
          .metric-card {
            padding: 1.5rem;
          }
          
          .main-value {
            font-size: 2rem;
          }
          
          .icon-container {
            width: 44px;
            height: 44px;
          }
        }

        @media (max-width: 1200px) {
          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 0.75rem;
          }

          .metric-card {
            padding: 0.875rem;
          }

          .card-header {
            gap: 0.5rem;
            margin-bottom: 0.875rem;
          }

          .icon-container {
            width: 32px;
            height: 32px;
          }

          .card-title h3 {
            font-size: 0.8rem;
          }

          .card-title p {
            font-size: 0.7rem;
          }

          .main-value {
            font-size: 1.375rem;
            margin-bottom: 0.375rem;
          }

          .comparison-badge {
            font-size: 0.65rem;
            padding: 0.2rem 0.4rem;
          }
        }

        @media (max-width: 480px) {
          .metrics-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .metric-card {
            padding: 0.75rem;
          }

          .main-value {
            font-size: 1.25rem;
          }

          .card-header {
            margin-bottom: 0.75rem;
          }

          .comparison-badge {
            font-size: 0.6rem;
            gap: 0.2rem;
          }
        }

        /* Tema claro (padrão) */
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

        /* Tema escuro */
        [data-theme="dark"] {
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

        /* Auto dark mode baseado na preferência do sistema */
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
};

export default MetricCards;