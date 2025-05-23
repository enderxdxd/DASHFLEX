import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Calendar } from 'lucide-react';

export default function HeatmapChart({ days, data }) {
  // Formata moeda brasileira
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL'
    }).format(value);
  };

  // Se não tiver dados
  if (!days.length || !Object.keys(data).length) {
    return (
      <div className="empty-state">
        <Calendar className="empty-icon" />
        <p className="empty-message">
          Sem dados disponíveis para este mês.
        </p>
        
        <style jsx>{`
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 16rem;
            background-color: var(--card);
            border-radius: 0.75rem;
            padding: 1.5rem;
          }
          
          .empty-icon {
            width: 3rem;
            height: 3rem;
            color: var(--text-secondary);
            margin-bottom: 0.75rem;
          }
          
          .empty-message {
            color: var(--text-secondary);
            text-align: center;
            font-size: 0.9375rem;
          }
        `}</style>
      </div>
    );
  }

  const labels = days;
  
  // Função para gerar uma escala de cores melhorada e mais vibrante
  const generateColorScale = (index, total) => {
    const colorScales = [
      { base: 'rgba(16, 185, 129, ', highlight: 'rgba(6, 95, 70, ' },    // Esmeralda
      { base: 'rgba(14, 165, 233, ', highlight: 'rgba(3, 105, 161, ' },  // Azul
      { base: 'rgba(139, 92, 246, ', highlight: 'rgba(91, 33, 182, ' },  // Violeta
      { base: 'rgba(249, 115, 22, ', highlight: 'rgba(194, 65, 12, ' },  // Laranja
      { base: 'rgba(236, 72, 153, ', highlight: 'rgba(190, 24, 93, ' },  // Rosa
      { base: 'rgba(6, 182, 212, ', highlight: 'rgba(8, 145, 178, ' },   // Ciano
    ];
    
    const scale = colorScales[index % colorScales.length];
    return {
      base: scale.base + '0.8)',
      highlight: scale.highlight + '1)'
    };
  };

  // Prepara os datasets com cores melhores e rótulos mais descritivos
  const datasets = Object.entries(data).map(([resp, valores], index) => {
    const colors = generateColorScale(index, Object.keys(data).length);
    
    return {
      label: resp,
      data: valores,
      backgroundColor: colors.base,
      hoverBackgroundColor: colors.highlight,
      borderRadius: 6,
      borderWidth: 0,
      barPercentage: 0.92,
      categoryPercentage: 0.92,
    };
  });

  // Opções aprimoradas para o gráfico
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
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
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
            return `Dia ${tooltipItems[0].label}`;
          },
          label: (context) => {
            const dataset = context.dataset;
            const value = context.parsed.y;
            return `${dataset.label}: ${formatMoney(value)}`;
          }
        },
        padding: 10,
        cornerRadius: 8,
        caretSize: 6,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          padding: 10,
          font: {
            family: "'Inter', 'Helvetica', 'Arial', sans-serif",
            size: 11
          },
          color: '#64748b'
        }
      },
      y: {
        stacked: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.8)',
          drawBorder: false,
          tickLength: 8
        },
        ticks: {
          callback: value => formatMoney(value),
          padding: 8,
          font: {
            family: "'Inter', 'Helvetica', 'Arial', sans-serif",
            size: 11
          },
          color: '#64748b'
        }
      }
    }
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