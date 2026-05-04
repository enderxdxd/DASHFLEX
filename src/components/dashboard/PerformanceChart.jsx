import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import dayjs from "dayjs";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const BAR_COLORS = [
  'rgba(37, 99, 235, 0.85)',   // blue (primary)
  'rgba(99, 102, 241, 0.85)',  // indigo (secondary)
  'rgba(14, 165, 233, 0.85)',  // sky
  'rgba(234, 88, 12, 0.85)',   // orange
  'rgba(5, 150, 105, 0.85)',   // emerald
  'rgba(168, 85, 247, 0.85)',  // purple
  'rgba(239, 68, 68, 0.85)',   // red
  'rgba(16, 185, 129, 0.85)',  // green
  'rgba(245, 158, 11, 0.85)',  // amber
  'rgba(236, 72, 153, 0.85)',  // pink
];

const PerformanceChart = ({
  filteredVendas,
  chartTimeRange,
  setChartTimeRange,
  selectedMonth = dayjs().format("YYYY-MM")
}) => {
  const baseWeekDate = dayjs(`${selectedMonth}-01`);
  const baseMonthStr = baseWeekDate.format("YYYY-MM");
  const baseYearNum = baseWeekDate.year();

  const somaPorResponsavel = useMemo(() => {
    const vendasParaGrafico = filteredVendas.filter((v) => {
      if (!v.dataFormatada) return false;
      const d = dayjs(v.dataFormatada, "YYYY-MM-DD");
      switch (chartTimeRange) {
        case "week": return d.isSame(baseWeekDate, "week");
        case "month": return d.format("YYYY-MM") === baseMonthStr;
        case "year": return d.year() === baseYearNum;
        case "all":
        default: return true;
      }
    });

    return vendasParaGrafico.reduce((acc, v) => {
      const key = (v.responsavel || "desconhecido").trim();
      acc[key] = (acc[key] || 0) + (Number(v.valor) || 0);
      return acc;
    }, {});
  }, [filteredVendas, chartTimeRange, baseWeekDate, baseMonthStr, baseYearNum]);

  const sortedKeys = useMemo(() =>
    Object.keys(somaPorResponsavel).sort((a, b) => somaPorResponsavel[b] - somaPorResponsavel[a]),
    [somaPorResponsavel]
  );

  const truncate = (name, max = 12) =>
    name && name.length > max ? name.substring(0, max) + '…' : name || '';

  const chartData = useMemo(() => ({
    labels: sortedKeys.map(n => truncate(n)),
    datasets: [{
      label: "Valor Total (R$)",
      data: sortedKeys.map(k => somaPorResponsavel[k]),
      backgroundColor: sortedKeys.map((_, i) => BAR_COLORS[i % BAR_COLORS.length]),
      borderWidth: 0,
      borderRadius: 6,
      maxBarThickness: 40,
    }],
  }), [sortedKeys, somaPorResponsavel]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'rectRounded',
          padding: 20,
          font: { size: 12, weight: '500' },
          color: '#64748b',
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f1f5f9',
        bodyColor: '#e2e8f0',
        bodyFont: { size: 13 },
        titleFont: { size: 14, weight: '600' },
        padding: 12,
        borderColor: 'rgba(71, 85, 105, 0.4)',
        borderWidth: 1,
        displayColors: false,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `Valor: R$ ${ctx.raw.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          title: (ctx) => sortedKeys[ctx[0].dataIndex] || ctx[0].label,
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
        border: { display: false },
        ticks: {
          padding: 10,
          color: '#64748b',
          font: { size: 11 },
          callback: (v) => {
            if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
            if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(1)}K`;
            return `R$ ${v}`;
          }
        }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { padding: 8, color: '#64748b', font: { size: 11, weight: '500' } }
      }
    },
    animation: { duration: 600, easing: 'easeOutQuart' },
    layout: { padding: { top: 8, right: 16, bottom: 8, left: 16 } },
    barPercentage: 0.7,
  }), [sortedKeys]);

  const getPeriodTitle = () => {
    switch (chartTimeRange) {
      case "week": return `Semana de ${baseWeekDate.format("DD/MM/YYYY")}`;
      case "month": return baseWeekDate.format("MMMM [de] YYYY");
      case "year": return `Ano ${baseYearNum}`;
      default: return "Todos os períodos";
    }
  };

  if (!filteredVendas || filteredVendas.length === 0) {
    return (
      <div className="pc-empty">
        <p>Nenhuma venda encontrada</p>
        <p className="pc-empty-sub">Ajuste os filtros para visualizar os dados</p>
      </div>
    );
  }

  return (
    <div className="pc-section">
      <div className="pc-header">
        <div className="pc-title-group">
          <h2 className="pc-title">Performance por Responsável</h2>
          <span className="pc-period">{getPeriodTitle()}</span>
        </div>
        <div className="pc-controls">
          {[
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' },
            { id: 'year', label: 'Ano' },
            { id: 'all', label: 'Todos' },
          ].map(r => (
            <button
              key={r.id}
              className={`pc-btn ${chartTimeRange === r.id ? 'pc-btn--active' : ''}`}
              onClick={() => setChartTimeRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pc-chart">
        {sortedKeys.length > 0 ? (
          <Bar data={chartData} options={chartOptions} height={360} />
        ) : (
          <div className="pc-no-data">
            <h3>Nenhum dado disponível</h3>
            <p>Não há dados para o período selecionado</p>
            <button className="pc-try-btn" onClick={() => setChartTimeRange('all')}>
              Ver todos os períodos
            </button>
          </div>
        )}
      </div>

      <style>{`
        .pc-section {
          background: var(--card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          border-top: 2px solid var(--primary);
          padding: 1.5rem;
          box-shadow: var(--shadow);
        }

        .pc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .pc-title-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .pc-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .pc-period {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--primary);
          background: var(--primary-light);
          padding: 0.25rem 0.625rem;
          border-radius: var(--radius-sm);
          width: fit-content;
        }

        .pc-controls {
          display: flex;
          gap: 2px;
          background: var(--background);
          padding: 4px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .pc-btn {
          padding: 0.5rem 0.875rem;
          background: transparent;
          color: var(--text-secondary);
          border: none;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
          font-family: var(--font-sans);
        }

        .pc-btn:hover {
          background: var(--card);
          color: var(--text-primary);
        }

        .pc-btn--active {
          background: var(--primary);
          color: white;
          box-shadow: var(--shadow-sm);
        }

        .pc-btn--active:hover {
          background: var(--primary-hover);
          color: white;
        }

        .pc-chart {
          position: relative;
          height: 360px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1rem;
        }

        .pc-no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
        }

        .pc-no-data h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
        }

        .pc-no-data p {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin: 0 0 1rem 0;
        }

        .pc-try-btn {
          padding: 0.5rem 0.875rem;
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: background var(--transition-fast);
          font-family: var(--font-sans);
        }

        .pc-try-btn:hover {
          background: color-mix(in srgb, var(--primary) 15%, transparent);
        }

        .pc-empty {
          padding: 2rem;
          text-align: center;
          color: var(--text-secondary);
          background: var(--card);
          border-radius: var(--radius);
          border: 1px solid var(--border);
        }

        .pc-empty p { margin: 0; font-size: 0.875rem; }
        .pc-empty-sub { margin-top: 0.25rem !important; font-size: 0.8125rem !important; opacity: 0.7; }

        .pc-btn:focus-visible,
        .pc-try-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        @media (max-width: 768px) {
          .pc-section { padding: 1rem; }
          .pc-header { flex-direction: column; }
          .pc-controls { width: 100%; }
          .pc-btn { flex: 1; text-align: center; }
          .pc-chart { height: 300px; padding: 0.75rem; }
        }

        @media (max-width: 480px) {
          .pc-chart { height: 260px; }
          .pc-btn { padding: 0.375rem 0.5rem; font-size: 0.75rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pc-btn, .pc-try-btn { transition: none; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(PerformanceChart);
