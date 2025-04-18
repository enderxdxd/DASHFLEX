import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { useMemo } from "react";
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

  // Cria uma paleta de cores para as barras
  const getBarColors = () => {
    return [
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
    ];
  };

  // Prepara dados para ChartJS
  const chartData = useMemo(() => {
    const sortedKeys = Object.keys(somaPorResponsavel).sort((a, b) => 
      somaPorResponsavel[b] - somaPorResponsavel[a]
    );
    
    const colors = getBarColors();
    
    return {
      labels: sortedKeys.map(nome => truncateName(nome)),
      datasets: [
        {
          label: "Valor Total (R$)",
          data: sortedKeys.map(key => somaPorResponsavel[key]),
          backgroundColor: sortedKeys.map((_, index) => colors[index % colors.length]),
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    };
  }, [somaPorResponsavel]);

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
          } 
        } 
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1e293b',
        bodyColor: '#334155',
        bodyFont: {
          size: 13,
        },
        titleFont: {
          size: 14,
          weight: '600',
        },
        padding: 12,
        borderColor: 'rgba(226, 232, 240, 0.8)',
        borderWidth: 1,
        displayColors: false,
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
          color: 'rgba(226, 232, 240, 0.5)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        title: {
          display: true,
          text: 'Valor Total (R$)',
          color: '#64748b',
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
          color: '#64748b',
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
          color: '#64748b',
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
        
        ctx.font = '500 11px Arial, sans-serif';
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
          
          // Desenha o texto
          ctx.fillStyle = '#475569';
          ctx.fillText(formattedValue, xPos, yPos - 10);
        });
      }
    }]
  }), [somaPorResponsavel, chartData.labels]);

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
          background: linear-gradient(to bottom, #ffffff, #fafcff);
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(226, 232, 240, 0.8);
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
          color: #1e293b;
          margin: 0;
        }
        
        .period-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 500;
          color: #6366f1;
          background-color: #eef2ff;
          padding: 6px 12px;
          border-radius: 6px;
        }
        
        .chart-controls {
          display: flex;
          gap: 6px;
          background-color: #f8fafc;
          padding: 4px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .chart-button {
          padding: 8px 14px;
          background: transparent;
          color: #64748b;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .chart-button:hover {
          background: #f1f5f9;
          color: #4f46e5;
        }
        
        .chart-button.active {
          background: #6366f1;
          color: white;
        }
        
        .chart-container {
          position: relative;
          height: 380px;
          margin-top: 12px;
        }
        
        .no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #94a3b8;
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
          background-color: #f1f5f9;
          margin-bottom: 16px;
        }
        
        .no-data-icon svg {
          opacity: 0.6;
        }
        
        .no-data h3 {
          font-size: 16px;
          font-weight: 600;
          color: #475569;
          margin: 0 0 8px 0;
        }
        
        .no-data p {
          font-size: 14px;
          margin: 0 0 20px 0;
        }
        
        .try-another-period {
          padding: 8px 16px;
          background-color: #eef2ff;
          color: #6366f1;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .try-another-period:hover {
          background-color: #e0e7ff;
          color: #4f46e5;
        }
        
        @media (max-width: 768px) {
          .chart-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .chart-container {
            height: 320px;
          }
        }
      `}</style>
    </div>
  );
};

export default PerformanceChart;