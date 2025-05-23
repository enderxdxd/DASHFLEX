import React, { useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Registra componentes do Chart.js uma vez, incluindo Filler para área abaixo da linha
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

/**
 * LineChart componente aprimorado que encapsula o <Line> do react-chartjs-2
 * Com design melhorado, opções de personalização e melhor responsividade
 */
export default function LineChart({ 
  data, 
  options = {}, 
  height = '100%',
  showGrid = true,
  gradientFill = true,
  smooth = true,
  theme = 'primary',
  className = '' 
}) {
  const chartRef = useRef(null);
  
  // Temas de cores pré-definidos e refinados
  const themes = {
    primary: {
      line: '#3b82f6',
      fill: 'rgba(59, 130, 246, 0.12)',
      point: '#2563eb',
      pointHover: '#1d4ed8',
      pointBorder: '#ffffff'
    },
    success: {
      line: '#10b981',
      fill: 'rgba(16, 185, 129, 0.12)',
      point: '#059669',
      pointHover: '#047857',
      pointBorder: '#ffffff'
    },
    warning: {
      line: '#f59e0b',
      fill: 'rgba(245, 158, 11, 0.12)',
      point: '#d97706',
      pointHover: '#b45309',
      pointBorder: '#ffffff'
    },
    danger: {
      line: '#ef4444',
      fill: 'rgba(239, 68, 68, 0.12)',
      point: '#dc2626',
      pointHover: '#b91c1c',
      pointBorder: '#ffffff'
    },
    purple: {
      line: '#8b5cf6',
      fill: 'rgba(139, 92, 246, 0.12)',
      point: '#7c3aed',
      pointHover: '#6d28d9',
      pointBorder: '#ffffff'
    },
    cyan: {
      line: '#06b6d4',
      fill: 'rgba(6, 182, 212, 0.12)',
      point: '#0891b2',
      pointHover: '#0e7490',
      pointBorder: '#ffffff'
    }
  };

  const themeColors = themes[theme] || themes.primary;

  // Função para criar o dataset com o tema escolhido
  const createThemedDatasets = () => {
    return data.datasets.map(dataset => ({
      ...dataset,
      borderColor: dataset.borderColor || themeColors.line,
      backgroundColor: gradientFill ? 
        (context) => {
          if (!context.chart.chartArea) return themeColors.fill;
          
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(
            0, 0, 0, context.chart.height
          );
          gradient.addColorStop(0, themeColors.fill);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          return gradient;
        } : 
        themeColors.fill,
      pointBackgroundColor: dataset.pointBackgroundColor || themeColors.point,
      pointHoverBackgroundColor: dataset.pointHoverBackgroundColor || themeColors.pointHover,
      pointBorderColor: dataset.pointBorderColor || themeColors.pointBorder,
      pointHoverBorderColor: dataset.pointHoverBorderColor || themeColors.pointBorder,
      borderWidth: dataset.borderWidth || 2.5,
      pointRadius: dataset.pointRadius || 3,
      pointHoverRadius: dataset.pointHoverRadius || 5,
      tension: smooth ? 0.4 : 0,
      fill: true
    }));
  };

  // Opções melhoradas para o gráfico
  const enhancedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        display: data.datasets.length > 1,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          boxHeight: 6,
          padding: 15,
          font: {
            family: "'Inter', 'Helvetica', 'Arial', sans-serif",
            size: 11,
            weight: '500' 
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleFont: {
          family: "'Inter', 'Helvetica', 'Arial', sans-serif",
          size: 12,
          weight: 'bold'
        },
        bodyFont: {
          family: "'Inter', 'Helvetica', 'Arial', sans-serif",
          size: 11
        },
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
        usePointStyle: true,
        caretSize: 6,
        ...options?.plugins?.tooltip
      }
    },
    scales: {
      x: {
        grid: {
          display: showGrid,
          color: 'rgba(226, 232, 240, 0.5)',
          drawBorder: false,
          tickLength: 8
        },
        ticks: {
          font: {
            family: "'Inter', 'Helvetica', 'Arial', sans-serif",
            size: 10,
          },
          color: '#64748b',
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          autoSkipPadding: 8,
          padding: 8
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: showGrid,
          color: 'rgba(226, 232, 240, 0.7)',
          drawBorder: false
        },
        ticks: {
          font: {
            family: "'Inter', 'Helvetica', 'Arial', sans-serif",
            size: 10,
          },
          color: '#64748b',
          padding: 8,
          callback: function(value, index, values) {
            // Adaptamos o formato baseado no tamanho da tela e nos valores
            if (values.length > 5 && value >= 1000) {
              return `${Math.floor(value / 1000)}k`;
            }
            return value;
          }
        }
      }
    },
    ...options
  };

  // Dados com tema aplicado
  const themedData = {
    ...data,
    datasets: createThemedDatasets()
  };

  // Ajustar tamanho dinamicamente se a janela for redimensionada
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Estilo condicional para o container
  const containerStyle = typeof height === 'string' 
    ? { height } 
    : { height: `${height}px` };

  return (
    <div className={`line-chart-container ${className}`} style={containerStyle}>
      <Line 
        ref={chartRef}
        data={themedData} 
        options={enhancedOptions} 
        // Não passamos height diretamente para o componente Line
      />
      
      <style jsx>{`
        .line-chart-container {
          width: 100%;
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          border-radius: 0.5rem;
          padding: 0;
          background-color: var(--card, white);
          border: 1px solid var(--border, #e2e8f0);
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
        }
        
        /* Light Mode Fallback */
        :root {
          --card: white;
          --border: #e2e8f0;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        /* Dark Mode Styles */
        .dark .line-chart-container {
          --card: #1e293b;
          --border: #334155;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        
        /* Melhorias de responsividade */
        @media (max-width: 768px) {
          .line-chart-container {
            min-height: 250px;
          }
        }
        
        @media (max-width: 480px) {
          .line-chart-container {
            min-height: 220px;
          }
        }
      `}</style>
    </div>
  );
}