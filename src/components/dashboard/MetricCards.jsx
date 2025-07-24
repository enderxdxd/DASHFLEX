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
  selectedMonth
}) => {
  // Formata o mês selecionado para exibição
  const formatMes = (mesStr) => {
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    try {
      const data = dayjs(mesStr + "-01");
      return `${meses[data.month()]} de ${data.year()}`;
    } catch (e) {
      return mesStr;
    }
  };
  
  // Formata o valor monetário
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  return (
    <div className="metrics-section">
      <div className="section-header">
      </div>
      
      <div className="metrics-grid">
        {/* Total Faturado usa totalFaturado em vez de totalCurrent */}
        <div className="metric-card">
          <div className="metric-icon total-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="metric-content">
            <h3>Total Faturado</h3>
            <div className="metric-value">{formatMoney(totalFaturado)}</div>
            <div className={`metric-comparison ${percentChange >= 0 ? 'positive' : 'negative'}`}>
              {percentChange >= 0 ? '↑' : '↓'} {Math.abs(percentChange).toFixed(1)}% em relação ao mês anterior
            </div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon count-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          <div className="metric-content">
            <h3>Número de Vendas</h3>
            <div className="metric-value">{countAtual}</div>
            <div className={`metric-comparison ${pctVendas >= 0 ? 'positive' : 'negative'}`}>
              {pctVendas >= 0 ? '↑' : '↓'} {Math.abs(pctVendas).toFixed(1)}% em relação ao mês anterior
            </div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon average-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
          </div>
          <div className="metric-content">
            <h3>Média por Venda</h3>
            <div className="metric-value">{formatMoney(mediaAtual)}</div>
            <div className={`metric-comparison ${pctMedia >= 0 ? 'positive' : 'negative'}`}>
              {pctMedia >= 0 ? '↑' : '↓'} {Math.abs(pctMedia).toFixed(1)}% em relação ao mês anterior
            </div>
          </div>
        </div>
        

        
      </div>
      
      <style jsx>{`
        .metrics-section {
          margin-bottom: 32px;
        }
        .section-header {
          margin-bottom: 16px;
        }
        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .metric-card {
          background: var(--card);
          color: var(--text-primary);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          display: flex;
          gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        .metric-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .total-icon {
          background-color: rgba(79, 70, 229, 0.1);
          color: var(--primary);
        }
        .count-icon {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--success);
        }
        .average-icon {
          background-color: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }
        .metric-content {
          display: flex;
          flex-direction: column;
        }
        .metric-content h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 8px;
        }
        .metric-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .metric-comparison {
          font-size: 0.75rem;
          font-weight: 500;
        }
        .metric-comparison.positive {
          color: var(--success);
        }
        .metric-comparison.negative {
          color: var(--danger);
        }
      `}</style>
    </div>
  );
};

export default MetricCards;
