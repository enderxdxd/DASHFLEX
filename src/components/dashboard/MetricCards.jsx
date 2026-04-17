import React from "react";
import { Home, Users, XCircle, TrendingUp, TrendingDown } from "lucide-react";

function MetricCards({
  faturamentoUnidade,
  faturamentoConsultores,
  countAtual,
  countAnterior,
  pctVendas,
  mediaAtual,
  mediaAnterior,
  pctMedia,
  selectedMonth,
  pctConsultoresBatendoMeta,
  metricasExcluidas,
  produtosSelecionados
}) {
  const formatMoney = (value) => {
    const numValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const pctOf = (current, goal) => {
    const c = Number(current) || 0;
    const g = Number(goal) || 1;
    return ((c / g) * 100).toFixed(1);
  };

  const shouldShowExcludedCard = produtosSelecionados?.length > 0 || (metricasExcluidas?.valor || 0) > 0;

  const cards = [
    {
      key: 'unidade',
      icon: Home,
      accent: 'var(--primary)',
      accentBg: 'var(--primary-light)',
      title: 'Faturamento da Unidade',
      subtitle: 'Vendas realizadas na unidade',
      value: faturamentoUnidade?.totalAtual || 0,
      meta: faturamentoUnidade?.meta || 0,
      pct: pctOf(faturamentoUnidade?.totalAtual, faturamentoUnidade?.meta),
      change: faturamentoUnidade?.percentChange || 0,
    },
    {
      key: 'consultores',
      icon: Users,
      accent: 'var(--secondary)',
      accentBg: 'var(--secondary-light)',
      title: 'Faturamento dos Consultores',
      subtitle: 'Total vendido pelos consultores',
      value: faturamentoConsultores?.totalAtual || 0,
      meta: faturamentoConsultores?.meta || 0,
      pct: pctOf(faturamentoConsultores?.totalAtual, faturamentoConsultores?.meta),
      change: faturamentoConsultores?.percentChange || 0,
    },
  ];

  return (
    <div className="mc-container">
      <div className={`mc-grid ${shouldShowExcludedCard ? 'mc-grid--3' : 'mc-grid--2'}`}>
        {cards.map(card => {
          const Icon = card.icon;
          const isPositive = card.change >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          return (
            <div className="mc-card" key={card.key}>
              <div className="mc-header">
                <div className="mc-icon" style={{ background: card.accentBg, color: card.accent }}>
                  <Icon size={20} />
                </div>
                <div className="mc-titles">
                  <h3 className="mc-title">{card.title}</h3>
                  <p className="mc-subtitle">{card.subtitle}</p>
                </div>
              </div>

              <div className="mc-divider" />

              <div className="mc-body">
                <div className="mc-pct-label">{card.pct}% da meta</div>
                <div className="mc-value">{formatMoney(card.value)}</div>

                <div className="mc-bar-track">
                  <div
                    className="mc-bar-fill"
                    style={{
                      width: `${Math.min(Number(card.pct), 100)}%`,
                      background: card.accent,
                    }}
                  />
                </div>
                <div className="mc-meta-label">Meta: {formatMoney(card.meta)}</div>
              </div>

              <div className={`mc-badge ${isPositive ? 'mc-badge--pos' : 'mc-badge--neg'}`}>
                <TrendIcon size={14} />
                <span>{Math.abs(card.change).toFixed(1)}% vs mês anterior</span>
              </div>
            </div>
          );
        })}

        {shouldShowExcludedCard && (
          <div className="mc-card mc-card--excluded">
            <div className="mc-header">
              <div className="mc-icon" style={{ background: 'var(--error-light)', color: 'var(--danger)' }}>
                <XCircle size={20} />
              </div>
              <div className="mc-titles">
                <h3 className="mc-title">Valor Excluído</h3>
                <p className="mc-subtitle">Produtos filtrados</p>
              </div>
            </div>

            <div className="mc-divider" />

            <div className="mc-body">
              <div className="mc-value">{formatMoney(metricasExcluidas?.valor || 0)}</div>
              {metricasExcluidas?.quantidade > 0 ? (
                <div className="mc-excluded-details">
                  <div className="mc-detail-row">
                    <span className="mc-detail-label">Vendas:</span>
                    <span className="mc-detail-value">{metricasExcluidas.quantidade}</span>
                  </div>
                  <div className="mc-detail-row">
                    <span className="mc-detail-label">Média:</span>
                    <span className="mc-detail-value">{formatMoney(metricasExcluidas.media)}</span>
                  </div>
                </div>
              ) : (
                <div className="mc-badge mc-badge--neutral">
                  <span>{produtosSelecionados?.length || 0} produto(s) filtrado(s)</span>
                </div>
              )}
            </div>

            <div className="mc-footer">
              Não incluídos nos cálculos principais
            </div>
          </div>
        )}
      </div>

      <style>{`
        .mc-container {
          margin-bottom: 1.5rem;
        }

        .mc-grid {
          display: grid;
          gap: 1rem;
        }

        .mc-grid--2 {
          grid-template-columns: repeat(2, 1fr);
        }

        .mc-grid--3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .mc-card {
          background: var(--card);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          transition: box-shadow var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .mc-card:hover {
          box-shadow: var(--card-hover-shadow);
        }

        .mc-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .mc-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mc-titles {
          min-width: 0;
        }

        .mc-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.125rem 0;
          line-height: 1.3;
        }

        .mc-subtitle {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.3;
        }

        .mc-divider {
          height: 1px;
          background: var(--border);
          margin: 0.875rem 0;
        }

        .mc-body {
          flex: 1;
        }

        .mc-pct-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }

        .mc-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
          font-family: var(--font-mono);
          line-height: 1.2;
          margin-bottom: 0.5rem;
        }

        .mc-bar-track {
          width: 100%;
          height: 4px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.375rem;
        }

        .mc-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.4s ease;
        }

        .mc-meta-label {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .mc-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.6875rem;
          font-weight: 500;
          margin-top: auto;
          width: fit-content;
        }

        .mc-badge--pos {
          background: var(--success-light);
          color: var(--success);
        }

        .mc-badge--neg {
          background: var(--error-light);
          color: var(--danger);
        }

        .mc-badge--neutral {
          background: var(--background);
          color: var(--text-secondary);
        }

        .mc-excluded-details {
          background: var(--background);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.5rem;
        }

        .mc-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.125rem 0;
        }

        .mc-detail-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .mc-detail-value {
          font-size: 0.75rem;
          color: var(--text-primary);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .mc-footer {
          border-top: 1px solid var(--border);
          padding-top: 0.625rem;
          margin-top: 0.625rem;
          font-size: 0.6875rem;
          color: var(--text-secondary);
        }

        @media (max-width: 1024px) {
          .mc-grid--3 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .mc-grid--2,
          .mc-grid--3 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .mc-card {
            padding: 1rem;
          }
          .mc-value {
            font-size: 1.25rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mc-card, .mc-bar-fill {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

export default React.memo(MetricCards);
