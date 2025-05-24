
import React, { useMemo, useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Trophy, User, ArrowRight } from 'lucide-react';

export default function TopPerformersChart({ data }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detecta o tema atual
  useEffect(() => {
    const checkTheme = () => {
      const isDark = 
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
    };

    // Verifica inicial
    checkTheme();

    // Observer para mudanças na classe dark
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    // Listener para mudanças no sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Tema de cores baseado no modo
  const theme = useMemo(() => {
    if (isDarkMode) {
      return {
        // Cores das barras
        topPerformer: {
          background: 'rgba(250, 204, 21, 0.8)', // Dourado mais claro
          border: 'rgba(245, 158, 11, 1)',
          text: '#fbbf24'
        },
        regular: {
          background: 'rgba(96, 165, 250, 0.7)', // Azul mais claro
          border: 'rgba(96, 165, 250, 1)',
          text: '#60a5fa'
        },
        // Interface
        tooltip: {
          background: '#1e293b',
          border: '#60a5fa',
          text: '#f1f5f9'
        },
        grid: 'rgba(71, 85, 105, 0.6)', // Grid mais escuro
        axis: {
          text: '#94a3b8', // Texto dos eixos mais claro
          textBold: '#fbbf24' // Texto bold (top performer)
        },
        label: '#e2e8f0', // Labels nas barras
        emptyState: '#94a3b8'
      };
    } else {
      return {
        // Cores das barras
        topPerformer: {
          background: 'rgba(234, 179, 8, 0.85)',
          border: 'rgba(202, 138, 4, 1)',
          text: '#ca8a04'
        },
        regular: {
          background: 'rgba(59, 130, 246, 0.7)',
          border: 'rgba(59, 130, 246, 1)',
          text: '#3b82f6'
        },
        // Interface
        tooltip: {
          background: '#312e81',
          border: '#6366f1',
          text: '#ffffff'
        },
        grid: 'rgba(226, 232, 240, 0.6)',
        axis: {
          text: '#64748b',
          textBold: '#ca8a04'
        },
        label: '#334155',
        emptyState: '#64748b'
      };
    }
  }, [isDarkMode]);

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
    return (
      <div style={{ 
        padding: '2rem', 
        color: theme.emptyState, 
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        Sem dados para exibir.
      </div>
    );
  }

  const labels = data.map(d => d.nome);
  const totals = data.map(d => d.total);

  // Cores dinâmicas baseadas no tema
  const backgroundColors = totals.map((_, index) =>
    index === 0 ? theme.topPerformer.background : theme.regular.background
  );
  const borderColors = totals.map((_, index) =>
    index === 0 ? theme.topPerformer.border : theme.regular.border
  );

  // Valor máximo para ticks
  const maxValue = Math.max(...totals);
  const tickStep = Math.ceil(maxValue / 4 / 1000) * 1000;

  // Chart options com cores dinâmicas
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
        backgroundColor: theme.tooltip.background,
        titleColor: theme.tooltip.text,
        bodyColor: theme.tooltip.text,
        borderColor: theme.tooltip.border,
        borderWidth: 1,
        padding: 10,
        caretSize: 6,
        cornerRadius: 8,
        displayColors: false
      },
      datalabels: {
        display: true,
        color: theme.label,
        anchor: 'end',
        align: 'end',
        font: { weight: 'bold', size: 12 },
        formatter: (value) => formatMoney(value)
      }
    },
    scales: {
      x: {
        grid: { 
          color: theme.grid, 
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          callback: v => {
            if (v >= 1000000) return `R$ ${(v/1000000).toFixed(1)}M`;
            if (v >= 1000) return `R$ ${(v/1000).toFixed(0)}k`;
            if (v >= 100) return `R$ ${v}`;
            return `R$ ${v}`;
          },
          font: { 
            family: 'Inter, Helvetica, Arial, sans-serif', 
            size: 10 
          },
          color: theme.axis.text,
          padding: 4,
          autoSkip: true,
          maxTicksLimit: 4,
          maxRotation: 0,
          minRotation: 0
        },
        max: Math.ceil(maxValue / tickStep) * tickStep,
        border: {
          display: false
        }
      },
      y: {
        grid: { display: false, drawBorder: false },
        ticks: {
          padding: 10,
          font: { 
            family: 'Inter, Helvetica, Arial, sans-serif', 
            size: 13, 
            weight: ctx => ctx.index === 0 ? 'bold' : 'normal' 
          },
          color: ctx => ctx.index === 0 ? theme.axis.textBold : theme.axis.text
        },
        border: {
          display: false
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  // Plugin para labels customizados nas barras
  const plugins = [{
    afterDatasetsDraw: chart => {
      const { ctx } = chart;
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        ctx.save();
        ctx.font = 'bold 12px Inter, Helvetica, Arial, sans-serif';
        ctx.fillStyle = theme.label;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Adiciona um pequeno espaçamento
        const text = formatMoney(totals[i]);
        const padding = 8;
        
        // Desenha um fundo sutil para melhor legibilidade
        const textWidth = ctx.measureText(text).width;
        const textHeight = 16;
        
        ctx.globalAlpha = isDarkMode ? 0.2 : 0.1;
        ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000';
        ctx.fillRect(
          bar.x + padding - 4, 
          bar.y - textHeight/2, 
          textWidth + 8, 
          textHeight
        );
        
        ctx.globalAlpha = 1;
        ctx.fillStyle = theme.label;
        ctx.fillText(text, bar.x + padding, bar.y);
        ctx.restore();
      });
    }
  }];

  // Dados do gráfico
  const chartData = {
    labels,
    datasets: [{
      data: totals,
      backgroundColor: backgroundColors,
      borderColor: borderColors,
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
      hoverBackgroundColor: backgroundColors.map(color => 
        color.replace(/[\d.]+\)$/g, '0.9)')
      ),
      hoverBorderWidth: 3
    }]
  };

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
  /* Light Mode Defaults */
  :root {
    --chart-bg: #ffffff;
    --chart-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    --chart-shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.07);
    --gradient-start: rgba(234, 179, 8, 0.75);
    --gradient-end: rgba(59, 130, 246, 0.75);
    --text-primary: #334155;
    --text-secondary: #64748b;
    --icon-color: #eab308;
    --footer-border: #f1f5f9;
    --link-color: #3b82f6;
    --link-hover: #1d4ed8;
  }

  /* Dark Mode Overrides */
  .dark {
    --chart-bg: #1f2937;
    --chart-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    --chart-shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.5);
    /* Gradient can stay the same or be tweaked if needed */
    --text-primary: #f1f5f9;
    --text-secondary:rgb(255, 255, 255);
    --icon-color: #fde047;
    --footer-border: #334155;
    --link-color: #93c5fd;
    --link-hover: #60a5fa;
  }

  .top-performers-chart {
    position: relative;
    background-color: var(--chart-bg);
    border-radius: 0.75rem;
    box-shadow: var(--chart-shadow);
    overflow: hidden;
    transition: box-shadow 0.3s ease;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .top-performers-chart:hover {
    box-shadow: var(--chart-shadow-hover);
  }

  .gradient-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(
      to right,
      var(--gradient-start),
      var(--gradient-end)
    );
    z-index: 5;
  }

  .chart-header {
    padding: 1.1rem;
  }

  .title-container {
    display: flex;
    align-items: center;
  }

  .title-icon {
    width: 1.35rem;
    height: 1.35rem;
    color: var(--icon-color);
    margin-right: 0.5rem;
  }

  .chart-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .chart-container {
    flex: 1;
    padding: 0.5rem;
  }

  .chart-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--footer-border);
    padding: 0.5rem 1.1rem;
    margin-top: 0.25rem;
    font-size: 0.92rem;
  }

  .consultors-info {
    display: flex;
    align-items: center;
    color: var(--text-secondary);
  }

  .consultors-icon {
    width: 1rem;
    height: 1rem;
    margin-right: 0.25rem;
  }

  .see-all-button {
    display: flex;
    align-items: center;
    color: var(--link-color);
    cursor: pointer;
    transition: color 0.2s;
  }

  .see-all-button:hover {
    color: var(--link-hover);
  }

  .arrow-icon {
    width: 1rem;
    height: 1rem;
    margin-left: 0.25rem;
  }

  @media (max-width: 768px) {
    .chart-header {
      padding: 0.75rem;
    }
    .chart-container {
      padding: 0.25rem 0.25rem 0.5rem;
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