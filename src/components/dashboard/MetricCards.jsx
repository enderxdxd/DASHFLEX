import dayjs from "dayjs";

const MetricCards = ({
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
}) => {
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
            <div className="main-value">{formatMoney(faturamentoUnidade?.totalAtual || 0)}</div>
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
            <div className="main-value">{formatMoney(faturamentoConsultores?.totalAtual || 0)}</div>
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
          margin-bottom: 2rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .metric-card {
          background: var(--card);
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          min-height: 140px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          border-radius: 16px 16px 0 0;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .metric-card:hover::before {
          opacity: 1;
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

        .secondary-card::before {
          background: #6366f1;
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
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .icon-container {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .metric-card:hover .icon-container {
          transform: scale(1.05);
          box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.15);
        }

        .primary-icon {
          background: linear-gradient(135deg, #4f46e5, #3730a3);
          color: white;
        }

        .secondary-icon {
          background: linear-gradient(135deg, #6366f1, #4338ca);
          color: white;
        }

        .success-icon {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .warning-icon {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .excluded-icon {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
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
          font-size: clamp(1.5rem, 4vw, 2.25rem);
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .comparison-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.025em;
          backdrop-filter: blur(10px);
          border: 1px solid transparent;
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .comparison-badge.positive {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
          color: var(--success);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .comparison-badge.negative {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1));
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .comparison-badge.neutral {
          background: linear-gradient(135deg, var(--bg-secondary), rgba(148, 163, 184, 0.1));
          color: var(--text-secondary);
          border-color: var(--border);
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

        .excluded-card {
          animation: slideInRight 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        /* Staggered animation for cards */
        .metric-card:nth-child(1) { animation-delay: 0.1s; }
        .metric-card:nth-child(2) { animation-delay: 0.2s; }
        .metric-card:nth-child(3) { animation-delay: 0.3s; }
        .metric-card:nth-child(4) { animation-delay: 0.4s; }
        .metric-card:nth-child(5) { animation-delay: 0.5s; }

        .metric-card {
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Responsividade melhorada */
        @media (min-width: 1440px) {
          .metrics-grid {
            grid-template-columns: repeat(3, 1fr);
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

        @media (max-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
            max-width: 800px;
          }
        }
        
        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
            max-width: 100%;
          }
          
          .metric-card {
            padding: 1rem;
            min-height: 120px;

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
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
          }

          .metric-card {
            padding: 0.75rem;
          }

          .main-value {
            font-size: 1.125rem;
          }

          .card-header {
            margin-bottom: 0.75rem;
          }

          .comparison-badge {
            font-size: 0.6rem;
            gap: 0.2rem;
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
};

export default MetricCards;