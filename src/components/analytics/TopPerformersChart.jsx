import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Trophy, User, ArrowRight } from 'lucide-react';

export default function TopPerformersChart({ data }) {
  // Formata moeda brasileira
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (!data || data.length === 0) {
    return <div style={{ padding: '2rem', color: '#64748b', textAlign: 'center' }}>Sem dados para exibir.</div>;
  }

  const labels = data.map(d => d.nome);
  const totals = data.map(d => d.total);

  // Cores: top 1 dourado, demais azul claro
  const backgroundColors = totals.map((_, index) =>
    index === 0 ? 'rgba(234, 179, 8, 0.85)' : 'rgba(59, 130, 246, 0.7)'
  );
  const borderColors = totals.map((_, index) =>
    index === 0 ? 'rgba(202, 138, 4, 1)' : 'rgba(59, 130, 246, 1)'
  );

  // Valor máximo para ticks
  const maxValue = Math.max(...totals);
  const tickStep = Math.ceil(maxValue / 4 / 1000) * 1000;

  // Chart options
  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { right: 8, top: 8, bottom: 8, left: 0 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatMoney(ctx.parsed.x)}`
        },
        backgroundColor: '#312e81',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#6366f1',
        borderWidth: 1,
        padding: 10,
        caretSize: 6
      },
      datalabels: {
        display: true,
        color: '#334155',
        anchor: 'end',
        align: 'end',
        font: { weight: 'bold', size: 12 },
        formatter: (value) => formatMoney(value)
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(226, 232, 240, 0.6)', drawBorder: false },
        ticks: {
          callback: v => {
            if (v >= 1000000) return `R$ ${(v/1000000).toFixed(1)}M`;
            if (v >= 1000) return `R$ ${(v/1000).toFixed(0)}k`;
            if (v >= 100) return `R$ ${v}`;
            return `R$ ${v}`;
          },
          font: { family: 'Inter, Helvetica, Arial, sans-serif', size: 10 },
          color: '#64748b',
          padding: 4,
          autoSkip: true,
          maxTicksLimit: 5,
          stepSize: tickStep > 0 ? tickStep : undefined,
          maxRotation: 0,
          minRotation: 0
        },
        max: Math.ceil(maxValue / tickStep) * tickStep
      },
      y: {
        grid: { display: false, drawBorder: false },
        ticks: {
          padding: 10,
          font: { family: 'Inter, Helvetica, Arial, sans-serif', size: 13, weight: ctx => ctx.index === 0 ? 'bold' : 'normal' },
          color: ctx => ctx.index === 0 ? '#ca8a04' : '#334155'
        }
      }
    }
  };

  // Adiciona labels de valor ao final das barras
  const plugins = [{
    afterDatasetsDraw: chart => {
      const { ctx, chartArea: area } = chart;
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        ctx.save();
        ctx.font = 'bold 12px Inter, Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatMoney(totals[i]), bar.x + 8, bar.y);
        ctx.restore();
      });
    }
  }];

  return (
    <div className="top-performers-chart">
      <div className="gradient-bar"></div>
      <div className="chart-header">
        <div className="title-container">
          <Trophy className="title-icon" />
          <h3 className="chart-title">Top Performers</h3>
        </div>
      </div>
      <div className="chart-container">
        <Bar
          data={{
            labels,
            datasets: [{
              data: totals,
              backgroundColor: backgroundColors,
              borderColor: borderColors,
              borderWidth: 2,
              borderRadius: 8,
              barPercentage: 0.7,
              categoryPercentage: 0.7
            }]
          }}
          options={chartOptions}
          plugins={plugins}
        />
      </div>
      {data.length >= 3 && (
        <div className="chart-footer">
          <div className="consultors-info">
            <User className="consultors-icon" />
            <span>Total de consultores: {data.length}</span>
          </div>
          <div className="see-all-button">
            <span>Ver todos</span>
            <ArrowRight className="arrow-icon" />
          </div>
        </div>
      )}
      <style jsx>{`
        .top-performers-chart {
          position: relative;
          background-color: white;
          border-radius: 0.75rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: box-shadow 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .top-performers-chart:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07);
        }
        .gradient-bar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(to right, rgba(234, 179, 8, 0.75), rgba(59, 130, 246, 0.75));
          z-index: 5;
        }
        .chart-header {
          padding: 1.1rem 1.1rem 0.25rem 1.1rem;
        }
        .title-container {
          display: flex;
          align-items: center;
        }
        .title-icon {
          width: 1.35rem;
          height: 1.35rem;
          color: #eab308;
          margin-right: 0.5rem;
        }
        .chart-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #334155;
          margin: 0;
        }
        .chart-container {
          flex: 1;
          padding: 0.5rem 0.5rem 0.5rem 0.5rem;
        }
        .chart-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #f1f5f9;
          padding: 0.5rem 1.1rem;
          margin-top: 0.25rem;
          font-size: 0.92rem;
        }
        .consultors-info {
          display: flex;
          align-items: center;
          color: #64748b;
        }
        .consultors-icon {
          width: 1rem;
          height: 1rem;
          margin-right: 0.25rem;
        }
        .see-all-button {
          display: flex;
          align-items: center;
          color: #3b82f6;
          cursor: pointer;
          transition: color 0.2s;
        }
        .see-all-button:hover {
          color: #1d4ed8;
        }
        .arrow-icon {
          width: 1rem;
          height: 1rem;
          margin-left: 0.25rem;
        }
        @media (max-width: 768px) {
          .chart-header {
            padding: 0.75rem 0.75rem 0.25rem 0.75rem;
          }
          .chart-container {
            padding: 0.25rem 0.25rem 0.5rem 0.25rem;
          }
          .chart-footer {
            padding: 0.5rem 0.75rem;
          }
          .chart-title {
            font-size: 1.05rem;
          }
        }
      `}</style>
    </div>
  );
}