import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { useMemo, useEffect, useState } from "react";
import dayjs from "dayjs";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/**
 * PerformanceChart
 * Exibe gráfico de barras da soma de vendas por responsável,
 * reagindo a alterações de período selecionado e faixa de tempo.
 * 
 * Props:
 * - filteredVendas: array de vendas já filtradas por consultor e mês
 * - chartTimeRange: 'week' | 'month' | 'year' | 'all'
 * - setChartTimeRange: callback para mudar faixa de tempo
 * - selectedMonth: 'YYYY-MM'
 */
const PerformanceChart = ({
  filteredVendas,
  chartTimeRange,
  setChartTimeRange,
  selectedMonth = dayjs().format("YYYY-MM")
}) => {
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
        // Cores principais
        primary: '#f1f5f9',
        secondary: '#e2e8f0',
        muted: '#94a3b8',
        background: '#1e293b',
        surface: '#334155',
        border: '#475569',
        
        // Tooltip
        tooltip: {
          background: 'rgba(30, 41, 59, 0.95)',
          title: '#f1f5f9',
          body: '#e2e8f0',
          border: 'rgba(71, 85, 105, 0.8)'
        },
        
        // Grid e eixos
        grid: 'rgba(71, 85, 105, 0.5)',
        axis: {
          text: '#94a3b8',
          title: '#cbd5e1'
        },
        
        // Labels nas barras
        valueLabel: '#cbd5e1',
        
        // Paleta de cores vibrantes para dark mode
        barColors: [
          'rgba(129, 140, 248, 0.9)',  // Indigo claro
          'rgba(56, 189, 248, 0.9)',   // Sky claro
          'rgba(251, 146, 60, 0.9)',   // Orange claro
          'rgba(52, 211, 153, 0.9)',   // Emerald claro
          'rgba(196, 181, 253, 0.9)',  // Purple claro
          'rgba(248, 113, 113, 0.9)',  // Red claro
          'rgba(74, 222, 128, 0.9)',   // Green claro
          'rgba(252, 211, 77, 0.9)',   // Amber claro
          'rgba(96, 165, 250, 0.9)',   // Blue claro
          'rgba(244, 114, 182, 0.9)',  // Pink claro
        ]
      };
    } else {
      return {
        // Cores principais
        primary: '#1e293b',
        secondary: '#334155',
        muted: '#64748b',
        background: '#ffffff',
        surface: '#f8fafc',
        border: '#e2e8f0',
        
        // Tooltip
        tooltip: {
          background: 'rgba(255, 255, 255, 0.95)',
          title: '#1e293b',
          body: '#334155',
          border: 'rgba(226, 232, 240, 0.8)'
        },
        
        // Grid e eixos
        grid: 'rgba(226, 232, 240, 0.5)',
        axis: {
          text: '#64748b',
          title: '#64748b'
        },
        
        // Labels nas barras
        valueLabel: '#475569',
        
        // Paleta de cores original
        barColors: [
          'rgba(99, 102, 241, 0.9)',  // Indigo
          'rgba(14, 165, 233, 0.9)',  // Sky
          'rgba(234, 88, 12, 0.9)',   // Orange
          'rgba(5, 150, 105, 0.9)',   // Emerald
          'rgba(168, 85, 247, 0.9)',  // Purple
          'rgba(239, 68, 68, 0.9)',   // Red
          'rgba(16, 185, 129, 0.9)',  // Green
          'rgba(245, 158, 11, 0.9)',  // Amber
          'rgba(59, 130, 246, 0.9)',  // Blue
          'rgba(236, 72, 153, 0.9)',  // Pink
        ]
      };
    }
  }, [isDarkMode]);

  // Define bases de comparação a partir do selectedMonth
  const baseWeekDate = dayjs(`${selectedMonth}-01`);
  const baseMonthStr = baseWeekDate.format("YYYY-MM");
  const baseYearNum  = baseWeekDate.year();

  // Calcula soma por responsável levando em conta chartTimeRange e selectedMonth
  const somaPorResponsavel = useMemo(() => {
    // Filtra vendas de acordo com a faixa escolhida
    const vendasParaGrafico = filteredVendas.filter((v) => {
      if (!v.dataFormatada) return false;
      const d = dayjs(v.dataFormatada, "YYYY-MM-DD");

      switch (chartTimeRange) {
        case "week":
          return d.isSame(baseWeekDate, "week");
        case "month":
          return d.format("YYYY-MM") === baseMonthStr;
        case "year":
          return d.year() === baseYearNum;
        case "all":
        default:
          return true;
      }
    });

    // Agrupa valores por responsável
    return vendasParaGrafico.reduce((acc, v) => {
      const key = (v.responsavel || "desconhecido").trim();
      const valor = Number(v.valor) || 0;
      acc[key] = (acc[key] || 0) + valor;
      return acc;
    }, {});
  }, [filteredVendas, chartTimeRange, baseWeekDate, baseMonthStr, baseYearNum]);

  // Função para truncar nomes longos
  const truncateName = (name, maxLength = 12) => {
    if (!name) return "";
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };

  // Prepara dados para ChartJS
  const chartData = useMemo(() => {
    const sortedKeys = Object.keys(somaPorResponsavel).sort((a, b) => 
      somaPorResponsavel[b] - somaPorResponsavel[a]
    );
    
    return {
      labels: sortedKeys.map(nome => truncateName(nome)),
      datasets: [
        {
          label: "Valor Total (R$)",
          data: sortedKeys.map(key => somaPorResponsavel[key]),
          backgroundColor: sortedKeys.map((_, index) => 
            theme.barColors[index % theme.barColors.length]
          ),
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 40,
          hoverBackgroundColor: sortedKeys.map((_, index) => 
            theme.barColors[index % theme.barColors.length].replace('0.9)', '1)')
          ),
        },
      ],
    };
  }, [somaPorResponsavel, theme.barColors]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',
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
          font: { 
            size: 12,
            weight: '500',
          },
          color: theme.secondary
        } 
      },
      tooltip: {
        backgroundColor: theme.tooltip.background,
        titleColor: theme.tooltip.title,
        bodyColor: theme.tooltip.body,
        bodyFont: {
          size: 13,
        },
        titleFont: {
          size: 14,
          weight: '600',
        },
        padding: 12,
        borderColor: theme.tooltip.border,
        borderWidth: 1,
        displayColors: false,
        cornerRadius: 8,
        caretPadding: 8,
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return `Valor: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          },
          title: (context) => {
            // Mostra o nome completo no tooltip mesmo se estiver truncado no eixo X
            const originalKeys = Object.keys(somaPorResponsavel);
            const indexInSorted = chartData.labels.indexOf(context[0].label);
            const keys = Object.keys(somaPorResponsavel).sort((a, b) => 
              somaPorResponsavel[b] - somaPorResponsavel[a]
            );
            return keys[indexInSorted] || context[0].label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme.grid,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        title: {
          display: true,
          text: 'Valor Total (R$)',
          color: theme.axis.title,
          font: {
            size: 12,
            weight: '500',
          },
          padding: {
            bottom: 10
          }
        },
        ticks: {
          padding: 10,
          color: theme.axis.text,
          font: {
            size: 11,
          },
          callback: (value) => {
            if (value >= 1e6) return `R$ ${(value/1e6).toFixed(1)}M`;
            if (value >= 1e3) return `R$ ${(value/1e3).toFixed(1)}K`;
            return `R$ ${value}`;
          }
        }
      },
      x: { 
        grid: {
          display: false,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: { 
          padding: 8,
          color: theme.axis.text,
          font: { 
            size: 11,
            weight: '500',
          } 
        } 
      }
    },
    animation: {
      duration: 700,
      easing: 'easeOutQuart',
    },
    layout: {
      padding: {
        top: 30,  // Espaço para os valores no topo das barras
        right: 16,
        bottom: 12,
        left: 16
      }
    },
    barPercentage: 0.7,
    // Plugin personalizado para mostrar os valores no topo das barras
    plugins: [{
      id: 'valueLabels',
      afterDatasetsDraw(chart) {
        const { ctx, data, chartArea: { top }, scales: { x, y } } = chart;
        
        ctx.font = '500 11px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        data.datasets[0].data.forEach((value, index) => {
          const xPos = x.getPixelForValue(index);
          const yPos = y.getPixelForValue(value);
          
          // Formata o valor
          let formattedValue;
          if (value >= 1e6) formattedValue = `R$ ${(value/1e6).toFixed(1)}M`;
          else if (value >= 1e3) formattedValue = `R$ ${(value/1e3).toFixed(1)}K`;
          else formattedValue = `R$ ${value.toFixed(0)}`;
          
          // Desenha fundo sutil para melhor legibilidade
          const textWidth = ctx.measureText(formattedValue).width;
          const textHeight = 14;
          
          ctx.globalAlpha = isDarkMode ? 0.3 : 0.1;
          ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000';
          ctx.fillRect(
            xPos - textWidth/2 - 4, 
            yPos - textHeight - 6, 
            textWidth + 8, 
            textHeight
          );
          
          // Desenha o texto
          ctx.globalAlpha = 1;
          ctx.fillStyle = theme.valueLabel;
          ctx.fillText(formattedValue, xPos, yPos - 10);
        });
      }
    }]
  }), [somaPorResponsavel, chartData.labels, theme, isDarkMode]);

  // Determina título baseado no período
  const getPeriodTitle = () => {
    switch (chartTimeRange) {
      case "week":
        return `Performance Semanal (${baseWeekDate.format("DD/MM/YYYY")})`;
      case "month":
        return `Performance Mensal (${baseWeekDate.format("MMMM [de] YYYY")})`;
      case "year":
        return `Performance Anual (${baseYearNum})`;
      case "all":
      default:
        return "Performance Total";
    }
  };

  // Se não há dados
  if (!filteredVendas || filteredVendas.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: theme.muted,
        backgroundColor: theme.background,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`
      }}>
        <p style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>
          📊 Nenhuma venda encontrada
        </p>
        <p style={{ fontSize: '0.875rem', margin: 0 }}>
          Ajuste os filtros para visualizar os dados
        </p>
      </div>
    );
  }
  return (
    <div className="chart-section">
      <div className="chart-header">
        <div className="chart-title">
          <h2>Performance por Responsável</h2>
          <span className="period-badge">{getPeriodTitle()}</span>
        </div>
        <div className="chart-controls">
          {[
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' },
            { id: 'year', label: 'Ano' },
            { id: 'all', label: 'Todos' }
          ].map((range) => (
            <button
              key={range.id}
              className={`chart-button ${chartTimeRange === range.id ? 'active' : ''}`}
              onClick={() => setChartTimeRange(range.id)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        {Object.keys(somaPorResponsavel).length > 0 ? (
          <Bar data={chartData} options={chartOptions} height={380} />
        ) : (
          <div className="no-data">
            <div className="no-data-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h3>Nenhum dado disponível</h3>
            <p>Não há dados para o período selecionado</p>
            <button 
              className="try-another-period" 
              onClick={() => setChartTimeRange('all')}
            >
              Ver todos os períodos
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .chart-section {
          background: linear-gradient(135deg, var(--bg-primary, white) 0%, var(--bg-secondary, #f8fafc) 100%);
          color: var(--text-primary, #1e293b);
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 32px;
          box-shadow: var(--shadow-chart, 0 4px 20px rgba(0, 0, 0, 0.03)), var(--shadow-chart-accent, 0 1px 3px rgba(0, 0, 0, 0.05));
          border: 1px solid var(--border-primary, #e2e8f0);
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .chart-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--primary, #6366f1) 0%, var(--primary-light, #818cf8) 50%, var(--primary, #6366f1) 100%);
          opacity: 0.8;
        }
        
        .chart-section:hover::before {
          background: linear-gradient(90deg, var(--primary, #6366f1) 0%, var(--primary-light, #818cf8) 25%, var(--primary, #6366f1) 50%, var(--primary-light, #818cf8) 75%, var(--primary, #6366f1) 100%);
          animation: shimmer 2s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .chart-title {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .chart-title h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .period-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
          color: var(--badge-color, #6366f1);
          background: linear-gradient(135deg, var(--badge-bg, #eef2ff) 0%, var(--badge-bg-light, #e0e7ff) 100%);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--badge-border, #c7d2fe);
          box-shadow: var(--shadow-badge, 0 2px 4px rgba(99, 102, 241, 0.1));
          transition: all 0.2s ease;
        }
        
        .period-badge:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-badge-hover, 0 4px 8px rgba(99, 102, 241, 0.15));
        }
        
        .chart-controls {
          display: flex;
          gap: 4px;
          background: linear-gradient(135deg, var(--controls-bg, #f8fafc) 0%, var(--controls-bg-light, #f1f5f9) 100%);
          padding: 6px;
          border-radius: 10px;
          border: 1px solid var(--controls-border, #e2e8f0);
          box-shadow: var(--shadow-controls, 0 2px 8px rgba(0, 0, 0, 0.05));
          backdrop-filter: blur(10px);
        }
        
        .chart-button {
          padding: 10px 16px;
          background: transparent;
          color: var(--text-secondary, #64748b);
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .chart-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, var(--button-hover-bg, #f1f5f9) 0%, var(--button-hover-bg-light, #e2e8f0) 100%);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .chart-button:hover::before {
          opacity: 1;
        }
        
        .chart-button:hover {
          color: var(--primary, #4f46e5);
          transform: translateY(-1px);
          box-shadow: var(--shadow-button-hover, 0 2px 8px rgba(79, 70, 229, 0.1));
        }
        
        .chart-button.active {
          background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dark, #4f46e5) 100%);
          color: white;
          transform: translateY(-1px);
          box-shadow: var(--shadow-button-active, 0 4px 12px rgba(99, 102, 241, 0.3));
        }
        
        .chart-button.active::before {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
          opacity: 1;
        }
        
        .chart-container {
          position: relative;
          height: 380px;
          margin-top: 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--chart-bg, white) 0%, var(--chart-bg-light, #fafbff) 100%);
          border: 1px solid var(--chart-border, #f1f5f9);
          padding: 16px;
          box-shadow: var(--shadow-chart-container, 0 2px 8px rgba(0, 0, 0, 0.02));
        }
        
        .no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary, #64748b);
          text-align: center;
          padding: 40px;
        }
        
        .no-data-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--no-data-icon-bg, #f1f5f9) 0%, var(--no-data-icon-bg-light, #e2e8f0) 100%);
          border: 1px solid var(--no-data-icon-border, #e2e8f0);
          margin-bottom: 20px;
          box-shadow: var(--shadow-no-data-icon, 0 4px 12px rgba(0, 0, 0, 0.05));
          animation: pulse 2s ease-in-out infinite alternate;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.05); opacity: 1; }
        }
        
        .no-data-icon svg {
          opacity: 0.6;
          color: var(--text-muted, #94a3b8);
          transition: all 0.3s ease;
        }
        
        .no-data:hover .no-data-icon svg {
          opacity: 0.8;
          transform: scale(1.1);
        }
        
        .no-data h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--text-accent, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .no-data p {
          font-size: 14px;
          margin: 0 0 24px 0;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
        }
        
        .try-another-period {
          padding: 10px 18px;
          background: linear-gradient(135deg, var(--try-button-bg, #eef2ff) 0%, var(--try-button-bg-light, #e0e7ff) 100%);
          color: var(--try-button-color, #6366f1);
          border: 1px solid var(--try-button-border, #c7d2fe);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-try-button, 0 2px 4px rgba(99, 102, 241, 0.1));
        }
        
        .try-another-period:hover {
          background: linear-gradient(135deg, var(--try-button-hover, #e0e7ff) 0%, var(--try-button-hover-light, #c7d2fe) 100%);
          color: var(--try-button-hover-color, #4f46e5);
          transform: translateY(-2px);
          box-shadow: var(--shadow-try-button-hover, 0 4px 12px rgba(99, 102, 241, 0.2));
        }
        
        .try-another-period:active {
          transform: translateY(0);
        }
        
        /* Manual Dark Mode Classes */
        .dark .chart-section,
        [data-theme="dark"] .chart-section {
          --bg-primary: #1e293b;
          --bg-secondary: #0f172a;
          --chart-bg: #334155;
          --chart-bg-light: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --text-accent: #818cf8;
          --border-primary: #334155;
          --chart-border: #475569;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-dark: #4f46e5;
          --badge-color: #a5b4fc;
          --badge-bg: #1e3a8a40;
          --badge-bg-light: #1e40af40;
          --badge-border: #3730a3;
          --controls-bg: #334155;
          --controls-bg-light: #475569;
          --controls-border: #475569;
          --button-hover-bg: #475569;
          --button-hover-bg-light: #64748b;
          --no-data-icon-bg: #334155;
          --no-data-icon-bg-light: #475569;
          --no-data-icon-border: #475569;
          --try-button-bg: #1e3a8a40;
          --try-button-bg-light: #1e40af40;
          --try-button-color: #a5b4fc;
          --try-button-border: #3730a3;
          --try-button-hover: #1e40af60;
          --try-button-hover-light: #3b82f660;
          --try-button-hover-color: #c7d2fe;
          --shadow-chart: 0 4px 20px rgba(0, 0, 0, 0.3);
          --shadow-chart-accent: 0 1px 3px rgba(0, 0, 0, 0.2);
          --shadow-badge: 0 2px 4px rgba(99, 102, 241, 0.2);
          --shadow-badge-hover: 0 4px 8px rgba(99, 102, 241, 0.3);
          --shadow-controls: 0 2px 8px rgba(0, 0, 0, 0.2);
          --shadow-button-hover: 0 2px 8px rgba(99, 102, 241, 0.2);
          --shadow-button-active: 0 4px 12px rgba(99, 102, 241, 0.4);
          --shadow-chart-container: 0 2px 8px rgba(0, 0, 0, 0.1);
          --shadow-no-data-icon: 0 4px 12px rgba(0, 0, 0, 0.2);
          --shadow-try-button: 0 2px 4px rgba(99, 102, 241, 0.2);
          --shadow-try-button-hover: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        
        /* Light Mode Default Values */
        :root {
          --bg-primary: white;
          --bg-secondary: #f8fafc;
          --chart-bg: white;
          --chart-bg-light: #fafbff;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --text-accent: #6366f1;
          --border-primary: #e2e8f0;
          --chart-border: #f1f5f9;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-dark: #4f46e5;
          --badge-color: #6366f1;
          --badge-bg: #eef2ff;
          --badge-bg-light: #e0e7ff;
          --badge-border: #c7d2fe;
          --controls-bg: #f8fafc;
          --controls-bg-light: #f1f5f9;
          --controls-border: #e2e8f0;
          --button-hover-bg: #f1f5f9;
          --button-hover-bg-light: #e2e8f0;
          --no-data-icon-bg: #f1f5f9;
          --no-data-icon-bg-light: #e2e8f0;
          --no-data-icon-border: #e2e8f0;
          --try-button-bg: #eef2ff;
          --try-button-bg-light: #e0e7ff;
          --try-button-color: #6366f1;
          --try-button-border: #c7d2fe;
          --try-button-hover: #e0e7ff;
          --try-button-hover-light: #c7d2fe;
          --try-button-hover-color: #4f46e5;
          --shadow-chart: 0 4px 20px rgba(0, 0, 0, 0.03);
          --shadow-chart-accent: 0 1px 3px rgba(0, 0, 0, 0.05);
          --shadow-badge: 0 2px 4px rgba(99, 102, 241, 0.1);
          --shadow-badge-hover: 0 4px 8px rgba(99, 102, 241, 0.15);
          --shadow-controls: 0 2px 8px rgba(0, 0, 0, 0.05);
          --shadow-button-hover: 0 2px 8px rgba(79, 70, 229, 0.1);
          --shadow-button-active: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-chart-container: 0 2px 8px rgba(0, 0, 0, 0.02);
          --shadow-no-data-icon: 0 4px 12px rgba(0, 0, 0, 0.05);
          --shadow-try-button: 0 2px 4px rgba(99, 102, 241, 0.1);
          --shadow-try-button-hover: 0 4px 12px rgba(99, 102, 241, 0.2);
        }
        
        /* Enhanced micro-interactions */
        .chart-section:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-chart-hover, 0 8px 30px rgba(0, 0, 0, 0.1));
        }
        
        .chart-controls:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-controls-hover, 0 4px 12px rgba(0, 0, 0, 0.08));
        }
        
        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .chart-section,
          .period-badge,
          .chart-button,
          .try-another-period,
          .no-data-icon {
            transition: none;
            animation: none;
            transform: none;
          }
          
          @keyframes shimmer,
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: none; }
          }
        }
        
        /* Focus states for accessibility */
        .chart-button:focus,
        .try-another-period:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: 2px;
        }
        
        /* Print styles */
        @media print {
          .chart-section {
            box-shadow: none;
            border: 1px solid #ccc;
            background: white;
          }
          
          .chart-controls,
          .try-another-period {
            display: none;
          }
          
          .chart-container {
            height: 300px;
            background: white;
          }
        }
        
        /* Responsive improvements */
        @media (max-width: 768px) {
          .chart-section {
            padding: 20px;
            border-radius: 12px;
          }
          
          .chart-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .chart-container {
            height: 320px;
            padding: 12px;
          }
          
          .chart-controls {
            width: 100%;
            justify-content: center;
          }
          
          .chart-button {
            flex: 1;
            text-align: center;
          }
          
          .no-data-icon {
            width: 60px;
            height: 60px;
            margin-bottom: 16px;
          }
          
          .no-data h3 {
            font-size: 14px;
          }
          
          .no-data p {
            font-size: 13px;
          }
        }
        
        @media (max-width: 576px) {
          .chart-section {
            padding: 16px;
            margin-bottom: 24px;
          }
          
          .chart-title h2 {
            font-size: 16px;
          }
          
          .chart-container {
            height: 280px;
            padding: 8px;
          }
          
          .chart-button {
            padding: 8px 12px;
            font-size: 12px;
          }
          
          .period-badge {
            font-size: 11px;
            padding: 6px 10px;
          }
        }
        
        /* Ultra-wide screen optimizations */
        @media (min-width: 1400px) {
          .chart-section {
            padding: 32px;
          }
          
          .chart-container {
            height: 420px;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default PerformanceChart;