import React, { useState, useEffect, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { 
  PieChart, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Download, 
  Filter,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ProductPieChart({ data, title = "Distribuição por Produto" }) {
  const [showDetails, setShowDetails] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [threshold, setThreshold] = useState(3);
  const [sortBy, setSortBy] = useState('value'); // 'value', 'name', 'percent'
  const [hiddenSegments, setHiddenSegments] = useState(new Set());
  
  // Processa os dados com base no threshold configurável
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const totalGeral = data.reduce((sum, item) => sum + item.total, 0);
    const sortedData = [...data].sort((a, b) => b.total - a.total);
    const thresholdValue = (threshold / 100) * totalGeral;
    
    const mainItems = [];
    const smallItems = [];
    
    sortedData.forEach((item, index) => {
      if (index < 5 || item.total >= thresholdValue) {
        mainItems.push(item);
      } else {
        smallItems.push(item);
      }
    });
    
    if (smallItems.length > 0) {
      const othersTotal = smallItems.reduce((sum, item) => sum + item.total, 0);
      mainItems.push({
        produto: 'Outros',
        total: othersTotal,
        subItems: smallItems,
        isOthers: true
      });
    }
    
    return mainItems;
  }, [data, threshold]);

  // Filtrar segmentos visíveis
  const visibleData = useMemo(() => {
    return processedData.filter((_, index) => !hiddenSegments.has(index));
  }, [processedData, hiddenSegments]);
  
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value, total) => {
    return ((value / total) * 100).toFixed(1) + '%';
  };

  // Alternar visibilidade de um segmento
  const toggleSegment = (index) => {
    const newHidden = new Set(hiddenSegments);
    if (newHidden.has(index)) {
      newHidden.delete(index);
    } else {
      newHidden.add(index);
    }
    setHiddenSegments(newHidden);
  };

  // Dados ordenados para a tabela
  const sortedTableData = useMemo(() => {
    if (!data) return [];
    
    const sorted = [...data];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.produto.localeCompare(b.produto));
      case 'percent':
        const total = data.reduce((sum, item) => sum + item.total, 0);
        return sorted.sort((a, b) => (b.total / total) - (a.total / total));
      default:
        return sorted.sort((a, b) => b.total - a.total);
    }
  }, [data, sortBy]);

  if (!data || data.length === 0) {
    return (
      <div className="product-pie-chart empty">
        <div className="empty-state">
          <PieChart className="empty-icon" />
          <h3 className="empty-title">Sem dados disponíveis</h3>
          <p className="empty-message">
            Não há dados de produtos para exibir neste período.
          </p>
        </div>
      </div>
    );
  }

  const totalGeral = data.reduce((sum, item) => sum + item.total, 0);
  const visibleTotal = visibleData.reduce((sum, item) => sum + item.total, 0);
  
  // Paleta de cores mais sofisticada
  const colorPalette = [
    { bg: 'rgba(99, 102, 241, 0.8)', border: 'rgb(99, 102, 241)' },
    { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgb(34, 197, 94)' },
    { bg: 'rgba(251, 146, 60, 0.8)', border: 'rgb(251, 146, 60)' },
    { bg: 'rgba(248, 113, 113, 0.8)', border: 'rgb(248, 113, 113)' },
    { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgb(168, 85, 247)' },
    { bg: 'rgba(14, 165, 233, 0.8)', border: 'rgb(14, 165, 233)' },
    { bg: 'rgba(236, 72, 153, 0.8)', border: 'rgb(236, 72, 153)' },
    { bg: 'rgba(163, 163, 163, 0.8)', border: 'rgb(163, 163, 163)' }
  ];

  const chartData = {
    labels: visibleData.map(d => d.produto),
    datasets: [{
      data: visibleData.map(d => d.total),
      backgroundColor: visibleData.map((_, i) => colorPalette[i]?.bg || colorPalette[7].bg),
      borderColor: visibleData.map((_, i) => colorPalette[i]?.border || colorPalette[7].border),
      borderWidth: 2,
      hoverOffset: 15,
      hoverBorderWidth: 3
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 20
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: { 
        position: showDetails ? 'top' : 'right',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 12,
          boxHeight: 12,
          padding: 15,
          font: {
            family: "'Inter', system-ui, sans-serif",
            size: 12,
            weight: '500'
          },
          generateLabels: (chart) => {
            const original = ChartJS.overrides.pie.plugins.legend.labels.generateLabels(chart);
            return original.map((label, index) => {
              const item = visibleData[index];
              const percent = formatPercent(item?.total || 0, visibleTotal);
              
              return {
                ...label,
                text: label.text.length > 18 ? label.text.substring(0, 18) + '...' : label.text,
                // Adicionar informação de percentual no hover
                fullText: `${item?.produto || ''} (${percent})`
              };
            });
          }
        },
        onClick: (e, legendItem, legend) => {
          // Implementar hide/show de segmentos
          const index = legendItem.datasetIndex !== undefined ? legendItem.datasetIndex : legendItem.index;
          toggleSegment(index);
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: {
          family: "'Inter', system-ui, sans-serif",
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          family: "'Inter', system-ui, sans-serif",
          size: 13
        },
        callbacks: {
          title: (ctx) => {
            const item = visibleData[ctx[0].dataIndex];
            return item?.produto || '';
          },
          label: (ctx) => {
            const value = ctx.raw;
            const percentage = formatPercent(value, visibleTotal);
            return [
              `Valor: ${formatMoney(value)}`,
              `Participação: ${percentage}`,
              `Posição: ${ctx.dataIndex + 1}º lugar`
            ];
          },
          afterLabel: (ctx) => {
            const item = visibleData[ctx.dataIndex];
            if (item?.isOthers && item.subItems) {
              return [
                '',
                'Inclui:',
                ...item.subItems.slice(0, 3).map(sub => `• ${sub.produto}`)
              ];
            }
            return [];
          }
        },
        padding: 12,
        cornerRadius: 8,
        caretSize: 8,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        displayColors: true,
        multiKeyBackground: '#1e293b'
      }
    }
  };

  
  return (
    <div className={`product-pie-chart ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="gradient-bar"></div>
      
      <div className="chart-header">
        <div className="title-section">
          <div className="title-container">
            <PieChart className="title-icon" />
            <h3 className="chart-title">{title}</h3>
          </div>
          <div className="summary-stats">
            <span className="stat-item">
              <strong>{data.length}</strong> produtos
            </span>
            <span className="stat-divider">•</span>
            <span className="stat-item">
              <strong>{formatMoney(totalGeral)}</strong> total
            </span>
          </div>
        </div>
        
        <div className="chart-controls">
          <div className="control-group">
            <label className="control-label">
              Agrupar
              <select 
                value={threshold} 
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="threshold-select"
              >
                <option value={1}>1%</option>
                <option value={2}>2%</option>
                <option value={3}>3%</option>
                <option value={5}>5%</option>
              </select>
            </label>
          </div>
          
          <button 
            className="control-button"
            onClick={() => setShowDetails(!showDetails)}
            title={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
          >
            {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          
          
          
          <button className="control-button" title="Exportar gráfico">
            <Download size={16} />
          </button>
        </div>
      </div>
      
      <div className="chart-content">
        <div className={`pie-container ${showDetails ? 'with-details' : ''}`}>
          <Pie data={chartData} options={chartOptions} />
          
          {hiddenSegments.size > 0 && (
            <div className="hidden-segments-notice">
              <span>{hiddenSegments.size} segmento(s) oculto(s)</span>
              <button 
                onClick={() => setHiddenSegments(new Set())}
                className="show-all-btn"
              >
                Mostrar todos
              </button>
            </div>
          )}
        </div>
        
        {showDetails && (
          <div className="details-container">
            <div className="details-header">
              <h4 className="details-title">Detalhamento Completo</h4>
              <div className="sort-controls">
                <label className="sort-label">
                  Ordenar por:
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="value">Valor</option>
                    <option value="percent">Percentual</option>
                    <option value="name">Nome</option>
                  </select>
                </label>
              </div>
            </div>
            
            <div className="table-container">
              <table className="details-table">
                <thead>
                  <tr>
                    <th className="rank-column">#</th>
                    <th className="product-column">Produto</th>
                    <th className="value-column">Valor</th>
                    <th className="percent-column">Participação</th>
                    <th className="trend-column">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTableData.map((item, index) => {
                    const percentage = (item.total / totalGeral) * 100;
                    const isTopPerformer = percentage > 20;
                    const isGoodPerformer = percentage > 10;
                    
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                        <td className="rank-column">
                          <span className="rank-badge">{index + 1}</span>
                        </td>
                        <td className="product-column">
                          <div className="product-info">
                            <div 
                              className="color-indicator"
                              style={{ 
                                backgroundColor: colorPalette[index % colorPalette.length]?.border 
                              }}
                            ></div>
                            <span className="product-name" title={item.produto}>
                              {item.produto}
                            </span>
                          </div>
                        </td>
                        <td className="value-column">
                          <span className="value-amount">
                            {formatMoney(item.total)}
                          </span>
                        </td>
                        <td className="percent-column">
                          <div className="percent-container">
                            <span className={`percent-badge ${
                              isTopPerformer ? 'top' : 
                              isGoodPerformer ? 'good' : 'standard'
                            }`}>
                              {percentage.toFixed(1)}%
                            </span>
                            <div className="percent-bar">
                              <div 
                                className="percent-fill"
                                style={{ 
                                  width: `${Math.min(percentage, 100)}%`,
                                  backgroundColor: colorPalette[index % colorPalette.length]?.border
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="trend-column">
                          <span className={`status-indicator ${
                            isTopPerformer ? 'excellent' : 
                            isGoodPerformer ? 'good' : 'standard'
                          }`}>
                            {isTopPerformer ? 'Destaque' : 
                             isGoodPerformer ? 'Bom' : 'Padrão'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td className="rank-column">-</td>
                    <td className="product-column">
                      <strong>Total Geral</strong>
                    </td>
                    <td className="value-column">
                      <strong>{formatMoney(totalGeral)}</strong>
                    </td>
                    <td className="percent-column">
                      <span className="total-badge">100.0%</span>
                    </td>
                    <td className="trend-column">
                      <TrendingUp className="trend-icon" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .product-pie-chart {
          position: relative;
          background: linear-gradient(135deg, var(--card) 0%, var(--background) 100%);
          border-radius: 1rem;
          box-shadow: 0 4px 20px var(--shadow-pie, rgba(0, 0, 0, 0.08));
          overflow: hidden;
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .product-pie-chart.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1000;
          border-radius: 0;
        }
        
        .product-pie-chart:hover {
          box-shadow: 0 8px 35px var(--shadow-pie-hover, rgba(0, 0, 0, 0.12));
        }
        
        .product-pie-chart.empty {
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .gradient-bar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, 
            var(--primary, #6366f1) 0%, 
            var(--success, #22c55e) 25%, 
            var(--warning, #fb923c) 50%, 
            var(--danger, #f87171) 75%, 
            var(--purple, #a855f7) 100%);
          z-index: 5;
        }
        
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
        }
        
        .empty-icon {
          width: 4rem;
          height: 4rem;
          color: var(--text-muted, #cbd5e1);
          margin-bottom: 1rem;
        }
        
        .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-secondary, #475569);
          margin: 0 0 0.5rem 0;
        }
        
        .empty-message {
          color: var(--text-secondary, #64748b);
          margin: 0;
        }
        
        .chart-header {
          padding: 1.5rem 1.5rem 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .title-section {
          flex: 1;
          min-width: 0;
        }
        
        .title-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .title-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: var(--primary, #6366f1);
          flex-shrink: 0;
        }
        
        .chart-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        
        .summary-stats {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .stat-item {
          white-space: nowrap;
        }
        
        .stat-divider {
          color: var(--border, #cbd5e1);
        }
        
        .chart-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        
        .control-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .control-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .threshold-select,
        .sort-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--border);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background-color: var(--card, white);
          color: var(--text-primary);
        }
        
        .control-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          background-color: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .control-button:hover {
          background-color: var(--bg-hover, #e2e8f0);
          color: var(--text-primary);
          transform: translateY(-1px);
        }
        
        .chart-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 0 1.5rem 1.5rem 1.5rem;
          gap: 1.5rem;
        }
        
        @media (min-width: 1024px) {
          .chart-content {
            flex-direction: ${showDetails ? 'row' : 'column'};
          }
        }
        
        .pie-container {
          position: relative;
          height: 20rem;
          width: 100%;
        }
        
        .pie-container.with-details {
          width: 100%;
        }
        
        @media (min-width: 1024px) {
          .pie-container.with-details {
            width: 45%;
            height: 24rem;
          }
        }
        
        .hidden-segments-notice {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .show-all-btn {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
        
        .details-container {
          flex: 1;
          background-color: var(--bg-secondary, #fafbfc);
          border-radius: 0.75rem;
          padding: 1.25rem;
          overflow: auto;
          max-height: 1000px;
          overflow-y: auto;
        }
        
        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .details-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        
        .sort-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .sort-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .table-container {
          overflow-x: auto;
          max-height: 600px;
          overflow-y: auto;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background-color: var(--card, white);
        }
        
        .details-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        
        .details-table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, var(--th-bg1, #f1f5f9) 0%, var(--th-bg2, #e2e8f0) 100%);
          color: var(--text-primary);
          font-weight: 600;
          border-bottom: 2px solid var(--border-th, #d1d5db);
          white-space: nowrap;
        }
        
        .details-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-td, #f1f5f9);
        }
        
        .even-row {
          background-color: var(--row-even, #ffffff);
        }
        
        .odd-row {
          background-color: var(--row-odd, #f8fafc);
        }
        
        .rank-column {
          width: 3rem;
          text-align: center;
        }
        
        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          background-color: var(--badge-bg, #e2e8f0);
          color: var(--badge-text, #64748b);
          border-radius: 50%;
          font-weight: 600;
          font-size: 0.75rem;
        }
        
        .product-column {
          min-width: 12rem;
        }
        
        .product-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .color-indicator {
          width: 0.75rem;
          height: 0.75rem;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .product-name {
          color: var(--text-primary);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .value-column {
          text-align: right;
          min-width: 8rem;
        }
        
        .value-amount {
          color: var(--text-primary);
          font-weight: 600;
        }
        
        .percent-column {
          width: 10rem;
          text-align: right;
        }
        
        .percent-container {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .percent-badge.top {
          background-color: var(--success-light, #dcfce7);
          color: var(--success, #166534);
        }
        
        .percent-badge.good {
          background-color: var(--primary-light, #dbeafe);
          color: var(--primary-dark, #1e40af);
        }
        
        .percent-badge.standard {
          background-color: var(--row-odd, #f1f5f9);
          color: var(--text-secondary, #64748b);
        }
        
        .percent-bar {
          width: 100%;
          height: 0.25rem;
          background-color: var(--row-odd, #f1f5f9);
          border-radius: 0.125rem;
          overflow: hidden;
        }
        
        .percent-fill {
          height: 100%;
          border-radius: 0.125rem;
          transition: width 0.5s ease;
        }
        
        .trend-column {
          width: 6rem;
          text-align: center;
        }
        
        .status-indicator.excellent {
          background-color: var(--success-light, #dcfce7);
          color: var(--success, #166534);
        }
        
        .status-indicator.good {
          background-color: var(--primary-light, #dbeafe);
          color: var(--primary-dark, #1e40af);
        }
        
        .status-indicator.standard {
          background-color: var(--row-odd, #f1f5f9);
          color: var(--text-secondary, #64748b);
        }
        
        .total-row {
          background: linear-gradient(135deg, var(--th-bg1, #f1f5f9) 0%, var(--th-bg2, #e2e8f0) 100%);
          font-weight: 600;
        }
        
        .total-row td {
          border-bottom: none;
          color: var(--text-primary);
          border-top: 2px solid var(--border-th, #d1d5db);
        }
        
        .total-badge {
          display: inline-block;
          background-color: var(--primary, #6366f1);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .trend-icon {
          width: 1rem;
          height: 1rem;
          color: var(--success, #22c55e);
        }
        
        @media (max-width: 768px) {
          .chart-header {
            padding: 1rem;
          }
          
          .chart-content {
            padding: 0 1rem 1rem 1rem;
          }
          
          .pie-container {
            height: 16rem;
          }
          
          .chart-title {
            font-size: 1.125rem;
          }
          
          .chart-controls {
            width: 100%;
            justify-content: flex-end;
          }
          
          .details-header {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          
          .details-table th,
          .details-table td {
            padding: 0.5rem 0.75rem;
          }
          
          .product-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
          
          .color-indicator {
            align-self: flex-start;
          }
        }
        
        @media (max-width: 480px) {
          .summary-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
          
          .stat-divider {
            display: none;
          }
          
          .chart-controls {
            gap: 0.5rem;
          }
          
          .control-button {
            width: 2rem;
            height: 2rem;
          }
          
          .details-table {
            font-size: 0.75rem;
          }
          
          .rank-column,
          .trend-column {
            display: none;
          }
        }
        
        /* Light Mode Fallback */
        :root {
          --card: #fff;
          --background: #f8fafc;
          --bg-secondary: #fafbfc;
          --bg-hover: #e2e8f0;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #cbd5e1;
          --primary: #6366f1;
          --primary-dark: #3730a3;
          --primary-light: #dbeafe;
          --success: #22c55e;
          --success-light: #dcfce7;
          --danger: #f87171;
          --warning: #fb923c;
          --purple: #a855f7;
          --border: #e2e8f0;
          --border-th: #d1d5db;
          --border-td: #f1f5f9;
          --row-even: #fff;
          --row-odd: #f8fafc;
          --badge-bg: #e2e8f0;
          --badge-text: #64748b;
          --th-bg1: #f1f5f9;
          --th-bg2: #e2e8f0;
          --shadow-pie: rgba(0,0,0,0.08);
          --shadow-pie-hover: rgba(0,0,0,0.12);
        }
        
        /* Dark Mode Styles */
        .dark {
          --card: #1e293b;
          --background: #0f172a;
          --bg-secondary: #1e293b;
          --bg-hover: #334155;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --primary: #6366f1;
          --primary-dark: #6366f1;
          --primary-light: #312e81;
          --success: #22c55e;
          --success-light: #06402520;
          --danger: #ef4444;
          --warning: #fb923c;
          --purple: #a855f7;
          --border: #334155;
          --border-th: #334155;
          --border-td: #1e293b;
          --row-even: #1e293b;
          --row-odd: #0f172a;
          --badge-bg: #334155;
          --badge-text: #94a3b8;
          --th-bg1: #1e293b;
          --th-bg2: #334155;
          --shadow-pie: rgba(0,0,0,0.18);
          --shadow-pie-hover: rgba(0,0,0,0.28);
        }
      `}</style>
    </div>
   );
}