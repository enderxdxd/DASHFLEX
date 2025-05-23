import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart2, 
  Target, 
  ChevronUp, 
  ChevronDown, 
  AlertCircle,
  Calendar,
  Clock,
  Maximize2,
  Download,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Zap,
  AlertTriangle
} from 'lucide-react';

export default function ProjectionCard({ 
  soldToDate, 
  avgDaily, 
  projectedTotal, 
  pctOfMeta, 
  metaUnidade,
  title = "Projeção de Fechamento",
  showDetails = false,
  period = "mensal"
}) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Animação de entrada
  useEffect(() => {
    const timer = setTimeout(() => setAnimationPhase(1), 100);
    return () => clearTimeout(timer);
  }, []);

  const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

  const formatPercent = (value) => `${value.toFixed(1)}%`;

  // Cálculos avançados
  const calculations = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = currentDay;
    const daysRemaining = daysInMonth - currentDay;
    
    const expectedProgress = (daysPassed / daysInMonth) * 100;
    const actualProgress = pctOfMeta;
    const progressDifference = actualProgress - expectedProgress;
    
    const dailyTarget = metaUnidade / daysInMonth;
    const projectedDeficit = Math.max(0, metaUnidade - projectedTotal);
    const dailyNeeded = daysRemaining > 0 ? projectedDeficit / daysRemaining : 0;
    
    const velocity = avgDaily / dailyTarget;
    const accelerationNeeded = dailyNeeded / avgDaily;

    return {
      currentDay,
      daysInMonth,
      daysPassed,
      daysRemaining,
      expectedProgress,
      actualProgress,
      progressDifference,
      dailyTarget,
      projectedDeficit,
      dailyNeeded,
      velocity,
      accelerationNeeded,
      isAhead: progressDifference > 5,
      isBehind: progressDifference < -5,
      isOnTrack: Math.abs(progressDifference) <= 5
    };
  }, [pctOfMeta, metaUnidade, projectedTotal, avgDaily]);

  const getMetaStatusConfig = (pct) => {
    if (pct >= 100) return { 
      level: 'excellent', 
      bg: '#10b981', 
      bgLight: '#d1fae5', 
      text: '#065f46',
      label: 'Meta Atingida',
      icon: Target
    };
    if (pct >= 90) return { 
      level: 'good', 
      bg: '#3b82f6', 
      bgLight: '#dbeafe', 
      text: '#1e40af',
      label: 'Quase Lá',
      icon: TrendingUp
    };
    if (pct >= 70) return { 
      level: 'warning', 
      bg: '#f59e0b', 
      bgLight: '#fef3c7', 
      text: '#92400e',
      label: 'Atenção',
      icon: AlertTriangle
    };
    return { 
      level: 'critical', 
      bg: '#ef4444', 
      bgLight: '#fee2e2', 
      text: '#991b1b',
      label: 'Crítico',
      icon: AlertCircle
    };
  };

  const metaStatus = getMetaStatusConfig(pctOfMeta);
  const StatusIcon = metaStatus.icon;

  return (
    <div className={`enhanced-projection-card ${isFullscreen ? 'fullscreen' : ''} phase-${animationPhase}`}>
      {/* Barra de gradiente dinâmica */}
      <div className="dynamic-gradient-bar">
        <div 
          className="gradient-fill"
          style={{ 
            width: `${Math.min(pctOfMeta, 100)}%`,
            backgroundColor: metaStatus.bg
          }}
        ></div>
      </div>
      
      <div className="card-container">
        {/* Header sofisticado */}
        <div className="enhanced-header">
          <div className="title-section">
            <div className="title-container">
              <div className="title-icon-wrapper" style={{ backgroundColor: metaStatus.bgLight }}>
                <StatusIcon style={{ color: metaStatus.text }} size={20} />
              </div>
              <div>
                <h3 className="card-title">{title}</h3>
                <p className="card-subtitle">
                  Meta {period}: {formatMoney(metaUnidade)}
                </p>
              </div>
            </div>
            
            <div className="status-badge" style={{ 
              backgroundColor: metaStatus.bgLight, 
              color: metaStatus.text,
              borderColor: metaStatus.bg
            }}>
              <span className="status-label">{metaStatus.label}</span>
              <span className="status-value">{formatPercent(pctOfMeta)}</span>
            </div>
          </div>
          
          <div className="header-controls">
            <button 
              className="control-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Ocultar detalhes" : "Mostrar detalhes"}
            >
              {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            
            <button 
              className="control-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Tela cheia"
            >
              <Maximize2 size={16} />
            </button>
            
            <button className="control-btn" title="Exportar">
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Barra de progresso avançada */}
        <div className="advanced-progress-section">
          <div className="progress-header">
            <div className="progress-info">
              <span className="progress-label">Progresso Atual</span>
              <div className="progress-stats">
                <span className="current-value">{formatMoney(soldToDate)}</span>
                <span className="divider">/</span>
                <span className="target-value">{formatMoney(metaUnidade)}</span>
              </div>
            </div>
            
            <div className="time-info">
              <div className="time-item">
                <Calendar size={14} />
                <span>Dia {calculations.currentDay}/{calculations.daysInMonth}</span>
              </div>
              <div className="time-item">
                <Clock size={14} />
                <span>{calculations.daysRemaining} dias restantes</span>
              </div>
            </div>
          </div>
          
          <div className="multi-progress-container">
            {/* Barra principal */}
            <div className="main-progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${Math.min(pctOfMeta, 100)}%`,
                  backgroundColor: metaStatus.bg
                }}
              >
                {pctOfMeta >= 95 && pctOfMeta < 110 && (
                  <div className="progress-shine"></div>
                )}
              </div>
              
              {/* Indicador de progresso esperado */}
              <div 
                className="expected-progress-line"
                style={{ left: `${Math.min(calculations.expectedProgress, 100)}%` }}
              >
                <div className="expected-tooltip">
                  <span>Esperado: {formatPercent(calculations.expectedProgress)}</span>
                </div>
              </div>
            </div>
            
            {/* Indicador de velocidade */}
            <div className="velocity-indicator">
              <div className="velocity-bar">
                <div 
                  className="velocity-fill"
                  style={{ 
                    width: `${Math.min(calculations.velocity * 100, 100)}%`,
                    backgroundColor: calculations.velocity >= 1 ? '#10b981' : 
                                   calculations.velocity >= 0.8 ? '#f59e0b' : '#ef4444'
                  }}
                ></div>
              </div>
              <span className="velocity-label">
                Velocidade: {calculations.velocity.toFixed(1)}x
              </span>
            </div>
          </div>
          
          {/* Status do progresso */}
          <div className="progress-status-row">
            <div className={`status-chip ${
              calculations.isAhead ? 'ahead' : 
              calculations.isBehind ? 'behind' : 'on-track'
            }`}>
              {calculations.isAhead && (
                <>
                  <ArrowUp size={14} />
                  <span>Acima do esperado (+{formatPercent(Math.abs(calculations.progressDifference))})</span>
                </>
              )}
              {calculations.isBehind && (
                <>
                  <ArrowDown size={14} />
                  <span>Abaixo do esperado (-{formatPercent(Math.abs(calculations.progressDifference))})</span>
                </>
              )}
              {calculations.isOnTrack && (
                <>
                  <Zap size={14} />
                  <span>No ritmo certo</span>
                </>
              )}
            </div>
            
            <div className="date-display">
              {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Grid de métricas aprimorado */}
        <div className="enhanced-metrics-grid">
          <div className="metric-card primary">
            <div className="metric-header">
              <div className="metric-icon-wrapper">
                <DollarSign size={18} />
              </div>
              <div className="metric-info">
                <span className="metric-title">Já Faturado</span>
                <span className="metric-subtitle">
                  {formatPercent((soldToDate / metaUnidade) * 100)} da meta
                </span>
              </div>
            </div>
            <div className="metric-value-section">
              <span className="metric-value">{formatMoney(soldToDate)}</span>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon-wrapper">
                <BarChart2 size={18} />
              </div>
              <div className="metric-info">
                <span className="metric-title">Média Diária</span>
                <span className="metric-subtitle">
                  vs. {formatMoney(calculations.dailyTarget)} necessário
                </span>
              </div>
            </div>
            <div className="metric-value-section">
              <span className="metric-value">{formatMoney(avgDaily)}</span>
              <div className={`trend-indicator ${avgDaily >= calculations.dailyTarget ? 'positive' : 'negative'}`}>
                {avgDaily >= calculations.dailyTarget ? 
                  <ChevronUp size={16} /> : <ChevronDown size={16} />
                }
              </div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon-wrapper">
                <TrendingUp size={18} />
              </div>
              <div className="metric-info">
                <span className="metric-title">Projeção Final</span>
                <span className="metric-subtitle">
                  Baseada no ritmo atual
                </span>
              </div>
            </div>
            <div className="metric-value-section">
              <span className="metric-value">{formatMoney(projectedTotal)}</span>
              <div className={`trend-indicator ${projectedTotal >= metaUnidade ? 'positive' : 'negative'}`}>
                {projectedTotal >= metaUnidade ? 
                  <TrendingUp size={16} /> : <TrendingDown size={16} />
                }
              </div>
            </div>
          </div>
        </div>
        
        {/* Seção de detalhes expandida */}
        {isExpanded && (
          <div className="expanded-details">
            <div className="details-header">
              <h4 className="details-title">Análise Detalhada</h4>
            </div>
            
            <div className="details-grid">
              <div className="detail-card">
                <div className="detail-header">
                  <Target size={16} />
                  <span>Para Atingir a Meta</span>
                </div>
                <div className="detail-content">
                  {calculations.projectedDeficit > 0 ? (
                    <>
                      <div className="detail-value critical">
                        {formatMoney(calculations.projectedDeficit)}
                      </div>
                      <div className="detail-subtitle">
                        {formatMoney(calculations.dailyNeeded)}/dia necessário
                      </div>
                      <div className="acceleration-info">
                        Acelerar {calculations.accelerationNeeded.toFixed(1)}x o ritmo atual
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="detail-value success">Meta Atingida!</div>
                      <div className="detail-subtitle">
                        Excesso: {formatMoney(projectedTotal - metaUnidade)}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-header">
                  <Calendar size={16} />
                  <span>Cronograma</span>
                </div>
                <div className="detail-content">
                  <div className="timeline-item">
                    <span className="timeline-label">Dias decorridos:</span>
                    <span className="timeline-value">{calculations.daysPassed}</span>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-label">Dias restantes:</span>
                    <span className="timeline-value">{calculations.daysRemaining}</span>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-label">Progresso esperado:</span>
                    <span className="timeline-value">{formatPercent(calculations.expectedProgress)}</span>
                  </div>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-header">
                  <BarChart2 size={16} />
                  <span>Performance</span>
                </div>
                <div className="detail-content">
                  <div className="performance-metric">
                    <span className="perf-label">Velocidade atual:</span>
                    <div className={`perf-badge ${
                      calculations.velocity >= 1.2 ? 'excellent' :
                      calculations.velocity >= 1 ? 'good' :
                      calculations.velocity >= 0.8 ? 'warning' : 'critical'
                    }`}>
                      {calculations.velocity.toFixed(2)}x
                    </div>
                  </div>
                  <div className="performance-bar">
                    <div 
                      className="perf-fill"
                      style={{ 
                        width: `${Math.min(calculations.velocity * 50, 100)}%`,
                        backgroundColor: calculations.velocity >= 1 ? '#10b981' : '#ef4444'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Resumo de ação (quando necessário) */}
        {calculations.projectedDeficit > 0 && (
          <div className="action-summary">
            <div className="action-content">
              <div className="action-icon">
                <AlertTriangle size={20} />
              </div>
              <div className="action-text">
                <span className="action-title">
                  Ação Necessária: +{formatMoney(calculations.dailyNeeded)}/dia
                </span>
                <span className="action-subtitle">
                  Para atingir {formatMoney(metaUnidade)} até o final do {period}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .enhanced-projection-card {
          position: relative;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #f1f5f9;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          transform: translateY(20px);
        }
        
        .enhanced-projection-card.phase-1 {
          opacity: 1;
          transform: translateY(0);
        }
        
        .enhanced-projection-card:hover {
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
          transform: translateY(-4px);
        }
        
        .enhanced-projection-card.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1000;
          border-radius: 0;
        }
        
        .dynamic-gradient-bar {
          position: relative;
          height: 4px;
          width: 100%;
          background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%);
          overflow: hidden;
        }
        
        .gradient-fill {
          height: 100%;
          background: linear-gradient(90deg, currentColor 0%, rgba(255,255,255,0.3) 50%, currentColor 100%);
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .gradient-fill::after {
          content: '';
          position: absolute;
          top: 0;
          right: -10px;
          width: 10px;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 100%);
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        .card-container {
          padding: 1.5rem;
        }
        
        .enhanced-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          gap: 1rem;
        }
        
        .title-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex: 1;
          gap: 1rem;
        }
        
        .title-container {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        
        .title-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.75rem;
          flex-shrink: 0;
        }
        
        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
          line-height: 1.4;
        }
        
        .card-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }
        
        .status-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 2px solid;
          min-width: 6rem;
          text-align: center;
        }
        
        .status-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.8;
        }
        
        .status-value {
          font-size: 1.25rem;
          font-weight: 800;
          margin-top: 0.25rem;
        }
        
        .header-controls {
          display: flex;
          gap: 0.5rem;
        }
        
        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .control-btn:hover {
          background-color: #e2e8f0;
          color: #374151;
          transform: translateY(-1px);
        }
        
        .advanced-progress-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          border: 1px solid #e2e8f0;
        }
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          gap: 1rem;
        }
        
        .progress-info {
          flex: 1;
        }
        
        .progress-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .progress-stats {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        
        .current-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }
        
        .divider {
          color: #94a3b8;
          font-weight: 400;
        }
        
        .target-value {
          font-size: 1rem;
          color: #64748b;
          font-weight: 600;
        }
        
        .time-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          text-align: right;
        }
        
        .time-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }
        
        .multi-progress-container {
          margin-bottom: 1rem;
        }
        
        .main-progress-bar {
          position: relative;
          width: 100%;
          height: 0.875rem;
          background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%);
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 0.75rem;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
        }
        
        .progress-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          background: linear-gradient(90deg, currentColor 0%, rgba(255,255,255,0.2) 50%, currentColor 100%);
        }
        
        .progress-shine {
          position: absolute;
          top: 0;
          right: 0;
          width: 2rem;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%);
          animation: shine 2s infinite;
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .expected-progress-line {
          position: absolute;
          top: -2px;
          width: 2px;
          height: calc(100% + 4px);
          background-color: #1f2937;
          z-index: 2;
        }
        
        .expected-tooltip {
          position: absolute;
          top: -2rem;
          left: 50%;
          transform: translateX(-50%);
          background-color: #1f2937;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          white-space: nowrap;
          font-weight: 500;
        }
        
        .expected-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #1f2937;
        }
        
        .velocity-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .velocity-bar {
          flex: 1;
          height: 0.375rem;
          background-color: #f1f5f9;
          border-radius: 9999px;
          overflow: hidden;
        }
        
        .velocity-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.8s ease;
        }
        
        .velocity-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          white-space: nowrap;
        }
        
        .progress-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .status-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .status-chip.ahead {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .status-chip.behind {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .status-chip.on-track {
          background-color: #dbeafe;
          color: #1e40af;
        }
        
        .date-display {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }
        
        .enhanced-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .metric-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 1rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .metric-card.primary {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-color: #0ea5e9;
        }
        
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .metric-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        
        .metric-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          background-color: #f1f5f9;
          border-radius: 0.5rem;
          color: #64748b;
          flex-shrink: 0;
        }
        
        .metric-card.primary .metric-icon-wrapper {
          background-color: #e0f2fe;
          color: #0369a1;
        }
        
        .metric-info {
          flex: 1;
          min-width: 0;
        }
        
        .metric-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          display: block;
          margin-bottom: 0.25rem;
        }
        
        .metric-subtitle {
          font-size: 0.75rem;
          color: #64748b;
          display: block;
        }
        
        .metric-value-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .metric-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
        }
        
        .trend-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .trend-indicator.positive {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .trend-indicator.negative {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .expanded-details {
          background: linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%);
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          border: 1px solid #e2e8f0;
        }
        
        .details-header {
          margin-bottom: 1rem;
        }
        
        .details-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .detail-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1rem;
          transition: all 0.2s ease;
        }
        
        .detail-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .detail-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
        }
        
        .detail-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .detail-value {
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .detail-value.critical {
          color: #991b1b;
        }
        
        .detail-value.success {
          color: #166534;
        }
        
        .detail-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }
        
        .acceleration-info {
          font-size: 0.75rem;
          color: #92400e;
          background-color: #fef3c7;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-weight: 500;
        }
        
        .timeline-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }
        
        .timeline-label {
          color: #64748b;
        }
        
        .timeline-value {
          font-weight: 600;
          color: #374151;
        }
        
        .performance-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .perf-label {
          font-size: 0.875rem;
          color: #64748b;
        }
        
        .perf-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .perf-badge.excellent {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .perf-badge.good {
          background-color: #dbeafe;
          color: #1e40af;
        }
        
        .perf-badge.warning {
          background-color: #fef3c7;
          color: #92400e;
        }
        
        .perf-badge.critical {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .performance-bar {
          width: 100%;
          height: 0.375rem;
          background-color: #f1f5f9;
          border-radius: 9999px;
          overflow: hidden;
        }
        
        .perf-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.8s ease;
        }
        
        .action-summary {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 0.75rem;
          padding: 1rem;
        }
        
        .action-content {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        
        .action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          background-color: #f59e0b;
          color: white;
          border-radius: 0.5rem;
          flex-shrink: 0;
        }
        
        .action-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .action-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #92400e;
        }
        
        .action-subtitle {
          font-size: 0.75rem;
          color: #a16207;
        }
        
        @media (max-width: 768px) {
          .card-container {
            padding: 1rem;
          }
          
          .enhanced-header {
            flex-direction: column;
            gap: 1rem;
          }
          
          .title-section {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }
          
          .progress-header {
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .time-info {
            text-align: left;
          }
          
          .enhanced-metrics-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          
          .details-grid {
            grid-template-columns: 1fr;
          }
          
          .progress-status-row {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }
        }
        
        @media (max-width: 480px) {
          .card-container {
            padding: 0.75rem;
          }
          
          .title-container {
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .title-icon-wrapper {
            width: 2rem;
            height: 2rem;
          }
          
          .card-title {
            font-size: 1.125rem;
          }
          
          .status-badge {
            min-width: auto;
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
            padding: 0.5rem 0.75rem;
          }
          
          .status-value {
            font-size: 1rem;
            margin-top: 0;
          }
          
          .metric-card {
            padding: 0.75rem;
          }
          
          .metric-value {
            font-size: 1rem;
          }
          
          .action-content {
            gap: 0.5rem;
          }
          
          .action-icon {
            width: 1.5rem;
            height: 1.5rem;
          }
        }
        }
      `}</style>
    </div>
  );
}