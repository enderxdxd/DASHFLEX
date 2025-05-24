import React, { useMemo, useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Calendar, TrendingUp } from 'lucide-react';

export default function HeatmapChart({ days, data }) {
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
        
        // Empty state
        emptyIcon: '#94a3b8',
        emptyText: '#cbd5e1',
        emptyBg: '#334155',
        
        // Tooltip dark mode
        tooltip: {
          background: 'rgba(15, 23, 42, 0.95)',
          title: '#f1f5f9',
          body: '#e2e8f0',
          border: 'rgba(71, 85, 105, 0.6)'
        },
        
        // Grid e eixos
        grid: 'rgba(71, 85, 105, 0.4)',
        axis: {
          text: '#94a3b8',
          line: 'rgba(71, 85, 105, 0.3)'
        },
        
        // Legend
        legend: {
          text: '#cbd5e1'
        },
        
        // Paleta de cores vibrantes para dark mode
        colorScales: [
          { base: 'rgba(52, 211, 153, ', highlight: 'rgba(16, 185, 129, ' },   // Esmeralda claro
          { base: 'rgba(56, 189, 248, ', highlight: 'rgba(14, 165, 233, ' },   // Azul claro
          { base: 'rgba(196, 181, 253, ', highlight: 'rgba(139, 92, 246, ' },  // Violeta claro
          { base: 'rgba(251, 146, 60, ', highlight: 'rgba(249, 115, 22, ' },   // Laranja claro
          { base: 'rgba(244, 114, 182, ', highlight: 'rgba(236, 72, 153, ' },  // Rosa claro
          { base: 'rgba(34, 211, 238, ', highlight: 'rgba(6, 182, 212, ' },    // Ciano claro
          { base: 'rgba(250, 204, 21, ', highlight: 'rgba(245, 158, 11, ' },   // Amarelo claro
          { base: 'rgba(129, 140, 248, ', highlight: 'rgba(99, 102, 241, ' },  // Indigo claro
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
        
        // Empty state
        emptyIcon: '#64748b',
        emptyText: '#64748b',
        emptyBg: '#f8fafc',
        
        // Tooltip light mode
        tooltip: {
          background: 'rgba(17, 24, 39, 0.95)',
          title: '#ffffff',
          body: '#f3f4f6',
          border: 'rgba(255, 255, 255, 0.1)'
        },
        
        // Grid e eixos
        grid: 'rgba(226, 232, 240, 0.8)',
        axis: {
          text: '#64748b',
          line: 'rgba(226, 232, 240, 0.8)'
        },
        
        // Legend
        legend: {
          text: '#374151'
        },
        
        // Paleta de cores original
        colorScales: [
          { base: 'rgba(16, 185, 129, ', highlight: 'rgba(6, 95, 70, ' },      // Esmeralda
          { base: 'rgba(14, 165, 233, ', highlight: 'rgba(3, 105, 161, ' },    // Azul
          { base: 'rgba(139, 92, 246, ', highlight: 'rgba(91, 33, 182, ' },    // Violeta
          { base: 'rgba(249, 115, 22, ', highlight: 'rgba(194, 65, 12, ' },    // Laranja
          { base: 'rgba(236, 72, 153, ', highlight: 'rgba(190, 24, 93, ' },    // Rosa
          { base: 'rgba(6, 182, 212, ', highlight: 'rgba(8, 145, 178, ' },     // Ciano
          { base: 'rgba(245, 158, 11, ', highlight: 'rgba(217, 119, 6, ' },    // Amarelo
          { base: 'rgba(99, 102, 241, ', highlight: 'rgba(67, 56, 202, ' },    // Indigo
        ]
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

  // Calcula estatísticas dos dados
  const stats = useMemo(() => {
    if (!data || !Object.keys(data).length) return null;
    
    const allValues = Object.values(data).flat();
    const total = allValues.reduce((sum, val) => sum + val, 0);
    const average = total / allValues.length;
    const maxDay = Math.max(...allValues);
    const vendedores = Object.keys(data).length;
    
    return { total, average, maxDay, vendedores };
  }, [data]);

  // Se não tiver dados
  if (!days.length || !Object.keys(data).length) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '16rem',
        backgroundColor: theme.emptyBg,
        borderRadius: '0.75rem',
        padding: '1.5rem',
        border: `1px solid ${theme.border}`,
        transition: 'all 0.2s ease'
      }}>
        <Calendar 
          size={48} 
          color={theme.emptyIcon}
          style={{ marginBottom: '0.75rem' }}
        />
        <p style={{
          color: theme.emptyText,
          textAlign: 'center',
          fontSize: '0.9375rem',
          margin: 0,
          fontStyle: 'italic'
        }}>
          Sem dados disponíveis para este mês.
        </p>
        <p style={{
          color: theme.muted,
          textAlign: 'center',
          fontSize: '0.8125rem',
          margin: '0.5rem 0 0 0'
        }}>
          Selecione um período com vendas registradas
        </p>
      </div>
    );
  }

  const labels = days;
  
  // Função para gerar escala de cores adaptada ao tema
  const generateColorScale = (index, total) => {
    const scale = theme.colorScales[index % theme.colorScales.length];
    return {
      base: scale.base + '0.85)',
      highlight: scale.highlight + '1)',
      hover: scale.base + '0.95)'
    };
  };

  // Prepara os datasets com cores dinâmicas
  const datasets = Object.entries(data).map(([resp, valores], index) => {
    const colors = generateColorScale(index, Object.keys(data).length);
    
    return {
      label: resp,
      data: valores,
      backgroundColor: colors.base,
      hoverBackgroundColor: colors.hover,
      borderRadius: 6,
      borderWidth: 0,
      barPercentage: 0.92,
      categoryPercentage: 0.92,
    };
  });

  // Opções do gráfico com tema dinâmico
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          usePointStyle: true,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label,
              fillStyle: dataset.backgroundColor,
              strokeStyle: dataset.backgroundColor,
              lineWidth: 0,
              pointStyle: 'rectRounded',
              hidden: !chart.isDatasetVisible(i),
              index: i
            }));
          },
          padding: 20,
          boxWidth: 12,
          boxHeight: 12,
          font: {
            family: "'Inter', 'Helvetica', 'Arial', sans-serif",
            size: 11,
            weight: '500' 
          },
          color: theme.legend.text
        }
      },
      tooltip: {
        backgroundColor: theme.tooltip.background,
        titleColor: theme.tooltip.title,
        bodyColor: theme.tooltip.body,
        titleFont: {
          family: "'Inter', 'Helvetica', 'Arial', sans-serif",
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          family: "'Inter', 'Helvetica', 'Arial', sans-serif",
          size: 12
        },
        callbacks: {
          title: (tooltipItems) => {
            return `📅 Dia ${tooltipItems[0].label}`;
          },
          label: (context) => {
            const dataset = context.dataset;
            const value = context.parsed.y;
            return `${dataset.label}: ${formatMoney(value)}`;
          },
          footer: (tooltipItems) => {
            const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
            return `Total do dia: ${formatMoney(total)}`;
          }
        },
        padding: 12,
        cornerRadius: 8,
        caretSize: 6,
        borderColor: theme.tooltip.border,
        borderWidth: 1,
        displayColors: true,
        boxPadding: 4
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          padding: 10,
          font: {
            family: "'Inter', 'Helvetica', 'Arial', sans-serif",
            size: 11
          },
          color: theme.axis.text
        }
      },
      y: {
        stacked: true,
        grid: {
          color: theme.grid,
          drawBorder: false,
          tickLength: 8
        },
        border: {
          display: false
        },
        ticks: {
          callback: value => {
            if (value >= 1000000) return `R$ ${(value/1000000).toFixed(1)}M`;
            if (value >= 1000) return `R$ ${(value/1000).toFixed(0)}K`;
            return formatMoney(value);
          },
          padding: 8,
          font: {
            family: "'Inter', 'Helvetica', 'Arial', sans-serif",
            size: 11
          },
          color: theme.axis.text
        }
      }
    },
    animation: {
      duration: 800,
      easing: 'easeInOutQuart'
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  const chartData = {
    labels,
    datasets
  };

  return (
    <div className="heatmap-chart">
      <div className="gradient-bar"></div>
      <div className="chart-container">
        <Bar
          data={{ labels, datasets }}
          options={chartOptions}
        />
      </div>
      
      <style jsx>{`
        .heatmap-chart {
          position: relative;
          background-color: var(--card);
          border-radius: 0.75rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }
        
        .heatmap-chart:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07);
        }
        
        .gradient-bar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(to right, 
            rgba(16, 185, 129, 0.75), 
            rgba(14, 165, 233, 0.75), 
            rgba(139, 92, 246, 0.75));
          z-index: 5;
        }
        
        .chart-container {
          height: 18rem;
          padding: 1.25rem;
          padding-top: 1.5rem;
        }
        
        @media (max-width: 768px) {
          .chart-container {
            height: 16rem;
            padding: 1rem;
            padding-top: 1.25rem;
          }
        }
        
        @media (max-width: 480px) {
          .chart-container {
            height: 14rem;
            padding: 0.75rem;
            padding-top: 1rem;
          }
        }
      `}</style>
    </div>
  );
}