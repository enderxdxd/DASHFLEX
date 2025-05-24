
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

  // Animação de entrada
  useEffect(() => {
    const timer = setTimeout(() => setAnimationPhase(1), 100);
    return () => clearTimeout(timer);
  }, []);

  // Tema de cores baseado no modo
  const theme = useMemo(() => {
    if (isDarkMode) {
      return {
        // Cores principais
        background: '#1e293b',
        surface: '#334155',
        surfaceHover: '#475569',
        border: '#475569',
        borderLight: '#64748b',
        
        // Texto
        primary: '#f1f5f9',
        secondary: '#e2e8f0',
        muted: '#94a3b8',
        
        // Estados de meta (dark mode)
        metaStates: {
          excellent: {
            bg: '#059669',
            bgLight: 'rgba(16, 185, 129, 0.15)',
            bgGlow: 'rgba(16, 185, 129, 0.3)',
            text: '#34d399',
            textSecondary: '#a7f3d0'
          },
          good: {
            bg: '#2563eb',
            bgLight: 'rgba(59, 130, 246, 0.15)',
            bgGlow: 'rgba(59, 130, 246, 0.3)',
            text: '#60a5fa',
            textSecondary: '#93c5fd'
          },
          warning: {
            bg: '#d97706',
            bgLight: 'rgba(245, 158, 11, 0.15)',
            bgGlow: 'rgba(245, 158, 11, 0.3)',
            text: '#fbbf24',
            textSecondary: '#fcd34d'
          },
          critical: {
            bg: '#dc2626',
            bgLight: 'rgba(239, 68, 68, 0.15)',
            bgGlow: 'rgba(239, 68, 68, 0.3)',
            text: '#f87171',
            textSecondary: '#fca5a5'
          }
        },
        
        // Botões e controles
        button: {
          bg: '#475569',
          bgHover: '#64748b',
          text: '#f1f5f9'
        },
        
        // Indicadores de progresso
        progress: {
          ahead: '#10b981',
          behind: '#ef4444',
          onTrack: '#3b82f6'
        },
        
        // Sombras
        shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)',
        shadowLg: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.15)'
      };
    } else {
      return {
        // Cores principais
        background: '#ffffff',
        surface: '#f8fafc',
        surfaceHover: '#f1f5f9',
        border: '#e2e8f0',
        borderLight: '#f1f5f9',
        
        // Texto
        primary: '#1e293b',
        secondary: '#334155',
        muted: '#64748b',
        
        // Estados de meta (light mode)
        metaStates: {
          excellent: {
            bg: '#10b981',
            bgLight: '#d1fae5',
            bgGlow: 'rgba(16, 185, 129, 0.2)',
            text: '#065f46',
            textSecondary: '#047857'
          },
          good: {
            bg: '#3b82f6',
            bgLight: '#dbeafe',
            bgGlow: 'rgba(59, 130, 246, 0.2)',
            text: '#1e40af',
            textSecondary: '#1d4ed8'
          },
          warning: {
            bg: '#f59e0b',
            bgLight: '#fef3c7',
            bgGlow: 'rgba(245, 158, 11, 0.2)',
            text: '#92400e',
            textSecondary: '#b45309'
          },
          critical: {
            bg: '#ef4444',
            bgLight: '#fee2e2',
            bgGlow: 'rgba(239, 68, 68, 0.2)',
            text: '#991b1b',
            textSecondary: '#b91c1c'
          }
        },
        
        // Botões e controles
        button: {
          bg: '#f1f5f9',
          bgHover: '#e2e8f0',
          text: '#374151'
        },
        
        // Indicadores de progresso
        progress: {
          ahead: '#10b981',
          behind: '#ef4444',
          onTrack: '#3b82f6'
        },
        
        // Sombras
        shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        shadowLg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      };
    }
  }, [isDarkMode]);

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
      ...theme.metaStates.excellent,
      label: 'Meta Atingida',
      icon: Target
    };
    if (pct >= 90) return {
      level: 'good',
      ...theme.metaStates.good,
      label: 'Quase Lá',
      icon: TrendingUp
    };
    if (pct >= 70) return {
      level: 'warning',
      ...theme.metaStates.warning,
      label: 'Atenção',
      icon: AlertTriangle
    };
    return {
      level: 'critical',
      ...theme.metaStates.critical,
      label: 'Crítico',
      icon: AlertCircle
    };
  };

  const metaStatus = getMetaStatusConfig(pctOfMeta);
  const StatusIcon = metaStatus.icon;

  const cardStyle = {
    backgroundColor: theme.background,
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: theme.shadow,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: `translateY(${animationPhase === 0 ? '20px' : '0px'})`,
    opacity: animationPhase === 0 ? 0 : 1,
    position: 'relative',
    overflow: 'hidden'
  };

  if (isFullscreen) {
    Object.assign(cardStyle, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      zIndex: 1000,
      borderRadius: '0',
      padding: '32px',
      boxShadow: 'none'
    });
  }

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
          background: linear-gradient(135deg, var(--bg-card, white) 0%, var(--bg-card-light, #f8fafc) 100%);
          color: var(--text-primary, #1e293b);
          border-radius: 1rem;
          box-shadow: var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.08));
          border: 1px solid var(--border-card, #e2e8f0);
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          transform: translateY(20px);
          backdrop-filter: blur(20px);
        }
        
        .enhanced-projection-card.phase-1 {
          opacity: 1;
          transform: translateY(0);
        }
        
        .enhanced-projection-card:hover {
          box-shadow: var(--shadow-card-hover, 0 12px 40px rgba(0, 0, 0, 0.12));
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
          background: linear-gradient(90deg, var(--bg-gradient-track, #f1f5f9) 0%, var(--bg-gradient-track-light, #e2e8f0) 100%);
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
          background: linear-gradient(135deg, var(--bg-icon-wrapper, #e0e7ff) 0%, var(--bg-icon-wrapper-light, #c7d2fe) 100%);
          color: var(--text-icon-wrapper, #4f46e5);
          box-shadow: var(--shadow-icon-wrapper, 0 4px 12px rgba(79, 70, 229, 0.2));
          transition: all 0.3s ease;
        }
        
        .enhanced-projection-card:hover .title-icon-wrapper {
          transform: scale(1.1);
          box-shadow: var(--shadow-icon-wrapper-hover, 0 6px 16px rgba(79, 70, 229, 0.3));
        }
        
        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.25rem 0;
          line-height: 1.4;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .card-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
          font-weight: 500;
        }
        
        .status-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 2px solid var(--border-status, #e2e8f0);
          min-width: 6rem;
          text-align: center;
          background: linear-gradient(135deg, var(--bg-status, rgba(248, 250, 252, 0.8)) 0%, var(--bg-status-light, rgba(241, 245, 249, 0.6)) 100%);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        
        .status-badge:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-status, 0 4px 12px rgba(0, 0, 0, 0.1));
        }
        
        .status-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.8;
          color: var(--text-status-label, #64748b);
        }
        
        .status-value {
          font-size: 1.25rem;
          font-weight: 800;
          margin-top: 0.25rem;
          color: var(--text-primary, #1e293b);
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
          background: linear-gradient(135deg, var(--bg-control-btn, #f8fafc) 0%, var(--bg-control-btn-light, #f1f5f9) 100%);
          border: 1px solid var(--border-control-btn, #e2e8f0);
          border-radius: 0.5rem;
          color: var(--text-control-btn, #64748b);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-control-btn, 0 2px 4px rgba(0, 0, 0, 0.05));
        }
        
        .control-btn:hover {
          background: linear-gradient(135deg, var(--bg-control-btn-hover, #e2e8f0) 0%, var(--bg-control-btn-hover-light, #d1d5db) 100%);
          color: var(--text-control-btn-hover, #374151);
          transform: translateY(-1px);
          box-shadow: var(--shadow-control-btn-hover, 0 4px 8px rgba(0, 0, 0, 0.1));
        }
        
        .advanced-progress-section {
          background: linear-gradient(135deg, var(--bg-progress-section, #f8fafc) 0%, var(--bg-progress-section-light, #f1f5f9) 100%);
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-progress-section, #e2e8f0);
          box-shadow: var(--shadow-progress-section, 0 2px 8px rgba(0, 0, 0, 0.05));
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
          color: var(--text-secondary, #64748b);
          font-weight: 600;
          display: block;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .progress-stats {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        
        .current-value {
          font-size: 1.375rem;
          font-weight: 800;
          color: var(--text-primary, #1e293b);
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .divider {
          color: var(--text-divider, #94a3b8);
          font-weight: 400;
        }
        
        .target-value {
          font-size: 1rem;
          color: var(--text-secondary, #64748b);
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
          color: var(--text-secondary, #64748b);
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          background: var(--bg-time-item, rgba(100, 116, 139, 0.1));
          border-radius: 0.375rem;
        }
        
        .multi-progress-container {
          margin-bottom: 1rem;
        }
        
        .main-progress-bar {
          position: relative;
          width: 100%;
          height: 0.875rem;
          background: linear-gradient(90deg, var(--bg-progress-track, #f1f5f9) 0%, var(--bg-progress-track-light, #e2e8f0) 100%);
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 0.75rem;
          box-shadow: var(--shadow-progress-bar, inset 0 2px 4px rgba(0, 0, 0, 0.06));
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
          background-color: var(--expected-line, #1f2937);
          z-index: 2;
        }
        
        .expected-tooltip {
          position: absolute;
          top: -2rem;
          left: 50%;
          transform: translateX(-50%);
          background-color: var(--bg-tooltip, #1f2937);
          color: var(--text-tooltip, white);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          white-space: nowrap;
          font-weight: 500;
          box-shadow: var(--shadow-tooltip, 0 4px 12px rgba(0, 0, 0, 0.3));
        }
        
        .expected-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: var(--bg-tooltip, #1f2937);
        }
        
        .velocity-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .velocity-bar {
          flex: 1;
          height: 0.375rem;
          background: linear-gradient(90deg, var(--bg-velocity-track, #f1f5f9) 0%, var(--bg-velocity-track-light, #e2e8f0) 100%);
          border-radius: 9999px;
          overflow: hidden;
        }
        
        .velocity-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.8s ease;
          background: linear-gradient(90deg, var(--primary, #6366f1) 0%, var(--primary-light, #818cf8) 100%);
        }
        
        .velocity-label {
          font-size: 0.75rem;
          color: var(--text-secondary, #64748b);
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
          transition: all 0.2s ease;
        }
        
        .status-chip.ahead {
          background: linear-gradient(135deg, var(--bg-chip-ahead, #dcfce7) 0%, var(--bg-chip-ahead-light, #bbf7d0) 100%);
          color: var(--text-chip-ahead, #166534);
          border: 1px solid var(--border-chip-ahead, #86efac);
        }
        
        .status-chip.behind {
          background: linear-gradient(135deg, var(--bg-chip-behind, #fee2e2) 0%, var(--bg-chip-behind-light, #fecaca) 100%);
          color: var(--text-chip-behind, #991b1b);
          border: 1px solid var(--border-chip-behind, #fca5a5);
        }
        
        .status-chip.on-track {
          background: linear-gradient(135deg, var(--bg-chip-on-track, #dbeafe) 0%, var(--bg-chip-on-track-light, #bfdbfe) 100%);
          color: var(--text-chip-on-track, #1e40af);
          border: 1px solid var(--border-chip-on-track, #60a5fa);
        }
        
        .status-chip:hover {
          transform: scale(1.05);
        }
        
        .date-display {
          font-size: 0.75rem;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
          background: var(--bg-date-display, rgba(100, 116, 139, 0.1));
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
        }
        
        .enhanced-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .metric-card {
          background: linear-gradient(135deg, var(--bg-metric-card, #ffffff) 0%, var(--bg-metric-card-light, #f8fafc) 100%);
          border: 1px solid var(--border-metric-card, #e2e8f0);
          border-radius: 0.75rem;
          padding: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-metric-card, 0 2px 8px rgba(0, 0, 0, 0.05));
        }
        
        .metric-card.primary {
          background: linear-gradient(135deg, var(--bg-metric-primary, #f0f9ff) 0%, var(--bg-metric-primary-light, #e0f2fe) 100%);
          border-color: var(--border-metric-primary, #0ea5e9);
        }
        
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-metric-card-hover, 0 8px 25px rgba(0, 0, 0, 0.1));
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
          background: linear-gradient(135deg, var(--bg-metric-icon, #f1f5f9) 0%, var(--bg-metric-icon-light, #e2e8f0) 100%);
          border-radius: 0.5rem;
          color: var(--text-metric-icon, #64748b);
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        
        .metric-card.primary .metric-icon-wrapper {
          background: linear-gradient(135deg, var(--bg-metric-icon-primary, #e0f2fe) 0%, var(--bg-metric-icon-primary-light, #bae6fd) 100%);
          color: var(--text-metric-icon-primary, #0369a1);
        }
        
        .metric-card:hover .metric-icon-wrapper {
          transform: scale(1.1);
        }
        
        .metric-info {
          flex: 1;
          min-width: 0;
        }
        
        .metric-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          display: block;
          margin-bottom: 0.25rem;
        }
        
        .metric-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary, #64748b);
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
          color: var(--text-primary, #1e293b);
        }
        
        .trend-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        
        .trend-indicator.positive {
          background: linear-gradient(135deg, var(--bg-trend-positive, #dcfce7) 0%, var(--bg-trend-positive-light, #bbf7d0) 100%);
          color: var(--text-trend-positive, #166534);
          box-shadow: var(--shadow-trend-positive, 0 2px 8px rgba(34, 197, 94, 0.3));
        }
        
        .trend-indicator.negative {
          background: linear-gradient(135deg, var(--bg-trend-negative, #fee2e2) 0%, var(--bg-trend-negative-light, #fecaca) 100%);
          color: var(--text-trend-negative, #991b1b);
          box-shadow: var(--shadow-trend-negative, 0 2px 8px rgba(239, 68, 68, 0.3));
        }
        
        .metric-card:hover .trend-indicator {
          transform: scale(1.1);
        }
        
        .expanded-details {
          background: linear-gradient(135deg, var(--bg-expanded-details, #fafbfc) 0%, var(--bg-expanded-details-light, #f1f5f9) 100%);
          border-radius: 0.75rem;
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-expanded-details, #e2e8f0);
          box-shadow: var(--shadow-expanded-details, 0 2px 8px rgba(0, 0, 0, 0.05));
        }
        
        .details-header {
          margin-bottom: 1rem;
        }
        
        .details-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .detail-card {
          background: linear-gradient(135deg, var(--bg-detail-card, white) 0%, var(--bg-detail-card-light, #f8fafc) 100%);
          border: 1px solid var(--border-detail-card, #e2e8f0);
          border-radius: 0.5rem;
          padding: 1rem;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-detail-card, 0 2px 4px rgba(0, 0, 0, 0.05));
        }
        
        .detail-card:hover {
          box-shadow: var(--shadow-detail-card-hover, 0 4px 12px rgba(0, 0, 0, 0.05));
          transform: translateY(-1px);
        }
        
        .detail-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
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
          color: var(--danger, #991b1b);
        }
        
        .detail-value.success {
          color: var(--success, #166534);
        }
        
        .detail-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
        }
        
        .acceleration-info {
          font-size: 0.75rem;
          color: var(--text-acceleration, #92400e);
          background: linear-gradient(135deg, var(--bg-acceleration, #fef3c7) 0%, var(--bg-acceleration-light, #fde68a) 100%);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-weight: 500;
          border: 1px solid var(--border-acceleration, #f59e0b);
        }
        
        .timeline-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }
        
        .timeline-label {
          color: var(--text-secondary, #64748b);
        }
        
        .timeline-value {
          font-weight: 600;
          color: var(--text-primary, #1e293b);
        }
        
        .performance-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .perf-label {
          font-size: 0.875rem;
          color: var(--text-secondary, #64748b);
        }
        
        .perf-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }
        
        .perf-badge.excellent {
          background: linear-gradient(135deg, var(--bg-badge-excellent, #dcfce7) 0%, var(--bg-badge-excellent-light, #bbf7d0) 100%);
          color: var(--text-badge-excellent, #166534);
          border-color: var(--border-badge-excellent, #86efac);
        }
        
        .perf-badge.good {
          background: linear-gradient(135deg, var(--bg-badge-good, #dbeafe) 0%, var(--bg-badge-good-light, #bfdbfe) 100%);
          color: var(--text-badge-good, #1e40af);
          border-color: var(--border-badge-good, #60a5fa);
        }
        
        .perf-badge.warning {
          background: linear-gradient(135deg, var(--bg-badge-warning, #fef3c7) 0%, var(--bg-badge-warning-light, #fde68a) 100%);
          color: var(--text-badge-warning, #92400e);
          border-color: var(--border-badge-warning, #f59e0b);
        }
        
        .perf-badge.critical {
          background: linear-gradient(135deg, var(--bg-badge-critical, #fee2e2) 0%, var(--bg-badge-critical-light, #fecaca) 100%);
          color: var(--text-badge-critical, #991b1b);
          border-color: var(--border-badge-critical, #fca5a5);
        }
        
        .perf-badge:hover {
          transform: scale(1.05);
        }
        
        .performance-bar {
          width: 100%;
          height: 0.375rem;
          background: linear-gradient(90deg, var(--bg-perf-track, #f1f5f9) 0%, var(--bg-perf-track-light, #e2e8f0) 100%);
          border-radius: 9999px;
          overflow: hidden;
          margin-top: 0.5rem;
        }
        
        .perf-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.8s ease;
          background: linear-gradient(90deg, currentColor 0%, rgba(255,255,255,0.3) 50%, currentColor 100%);
        }
        
        .action-summary {
          background: linear-gradient(135deg, var(--bg-action-summary, #fef3c7) 0%, var(--bg-action-summary-light, #fde68a) 100%);
          border: 1px solid var(--border-action-summary, #f59e0b);
          border-radius: 0.75rem;
          padding: 1rem;
          box-shadow: var(--shadow-action-summary, 0 4px 12px rgba(245, 158, 11, 0.2));
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
          background: linear-gradient(135deg, var(--bg-action-icon, #f59e0b) 0%, var(--bg-action-icon-light, #fbbf24) 100%);
          color: var(--text-action-icon, white);
          border-radius: 0.5rem;
          flex-shrink: 0;
          box-shadow: var(--shadow-action-icon, 0 4px 12px rgba(245, 158, 11, 0.4));
          transition: all 0.2s ease;
        }
        
        .action-summary:hover .action-icon {
          transform: scale(1.1);
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
          color: var(--text-action-title, #92400e);
        }
        
        .action-subtitle {
          font-size: 0.75rem;
          color: var(--text-action-subtitle, #a16207);
          font-weight: 500;
        }

        /* Manual Dark Mode Classes */
        .dark .enhanced-projection-card,
        [data-theme="dark"] .enhanced-projection-card {
          --bg-card: #1e293b;
          --bg-card-light: #334155;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-divider: #64748b;
          --text-status-label: #cbd5e1;
          --text-control-btn: #94a3b8;
          --text-control-btn-hover: #f1f5f9;
          --text-icon-wrapper: #a5b4fc;
          --text-tooltip: white;
          --text-chip-ahead: #22c55e;
          --text-chip-behind: #f87171;
          --text-chip-on-track: #60a5fa;
          --text-metric-icon: #94a3b8;
          --text-metric-icon-primary: #38bdf8;
          --text-trend-positive: #22c55e;
          --text-trend-negative: #f87171;
          --text-badge-excellent: #22c55e;
          --text-badge-good: #60a5fa;
          --text-badge-warning: #fbbf24;
          --text-badge-critical: #f87171;
          --text-acceleration: #fbbf24;
          --text-action-title: #fbbf24;
          --text-action-subtitle: #fde68a;
          --text-action-icon: white;
          --border-card: #334155;
          --border-status: #475569;
          --border-control-btn: #475569;
          --border-progress-section: #475569;
          --border-metric-card: #475569;
          --border-metric-primary: #0ea5e9;
          --border-detail-card: #475569;
          --border-expanded-details: #475569;
          --border-chip-ahead: #22c55e;
          --border-chip-behind: #f87171;
          --border-chip-on-track: #60a5fa;
          --border-badge-excellent: #22c55e;
          --border-badge-good: #60a5fa;
          --border-badge-warning: #fbbf24;
          --border-badge-critical: #f87171;
          --border-acceleration: #f59e0b;
          --border-action-summary: #f59e0b;
          --bg-gradient-track: #334155;
          --bg-gradient-track-light: #475569;
          --bg-icon-wrapper: #1e40af40;
          --bg-icon-wrapper-light: #3b82f640;
          --bg-status: rgba(30, 41, 59, 0.8);
          --bg-status-light: rgba(51, 65, 85, 0.6);
          --bg-control-btn: #334155;
          --bg-control-btn-light: #475569;
          --bg-control-btn-hover: #475569;
          --bg-control-btn-hover-light: #64748b;
          --bg-progress-section: #0f172a;
          --bg-progress-section-light: #1e293b;
          --bg-time-item: rgba(148, 163, 184, 0.1);
          --bg-progress-track: #334155;
          --bg-progress-track-light: #475569;
          --bg-velocity-track: #334155;
          --bg-velocity-track-light: #475569;
          --bg-chip-ahead: #06402520;
          --bg-chip-ahead-light: #05803020;
          --bg-chip-behind: #99182020;
          --bg-chip-behind-light: #dc262620;
          --bg-chip-on-track: #1e40af20;
          --bg-chip-on-track-light: #3b82f620;
          --bg-date-display: rgba(148, 163, 184, 0.1);
          --bg-metric-card: #1e293b;
          --bg-metric-card-light: #334155;
          --bg-metric-primary: #1e293b;
          --bg-metric-primary-light: #334155;
          --bg-metric-icon: #334155;
          --bg-metric-icon-light: #475569;
          --bg-metric-icon-primary: #1e40af40;
          --bg-metric-icon-primary-light: #3b82f640;
          --bg-trend-positive: #06402520;
          --bg-trend-positive-light: #05803020;
          --bg-trend-negative: #99182020;
          --bg-trend-negative-light: #dc262620;
          --bg-expanded-details: #0f172a;
          --bg-expanded-details-light: #1e293b;
          --bg-detail-card: #1e293b;
          --bg-detail-card-light: #334155;
          --bg-badge-excellent: #06402520;
          --bg-badge-excellent-light: #05803020;
          --bg-badge-good: #1e40af20;
          --bg-badge-good-light: #3b82f620;
          --bg-badge-warning: #92400e20;
          --bg-badge-warning-light: #a8530020;
          --bg-badge-critical: #99182020;
          --bg-badge-critical-light: #dc262620;
          --bg-perf-track: #334155;
          --bg-perf-track-light: #475569;
          --bg-acceleration: #92400e40;
          --bg-acceleration-light: #a8530040;
          --bg-action-summary: #92400e40;
          --bg-action-summary-light: #a8530040;
          --bg-action-icon: #f59e0b;
          --bg-action-icon-light: #fbbf24;
          --bg-tooltip: #0f172a;
          --expected-line: #f1f5f9;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --success: #22c55e;
          --danger: #f87171;
          --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.3);
          --shadow-card-hover: 0 12px 40px rgba(0, 0, 0, 0.4);
          --shadow-icon-wrapper: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-icon-wrapper-hover: 0 6px 16px rgba(99, 102, 241, 0.4);
          --shadow-status: 0 4px 12px rgba(0, 0, 0, 0.3);
          --shadow-control-btn: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-control-btn-hover: 0 4px 8px rgba(0, 0, 0, 0.3);
          --shadow-progress-section: 0 2px 8px rgba(0, 0, 0, 0.2);
          --shadow-progress-bar: inset 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-tooltip: 0 4px 12px rgba(0, 0, 0, 0.5);
          --shadow-metric-card: 0 2px 8px rgba(0, 0, 0, 0.2);
          --shadow-metric-card-hover: 0 8px 25px rgba(0, 0, 0, 0.3);
          --shadow-trend-positive: 0 2px 8px rgba(34, 197, 94, 0.4);
          --shadow-trend-negative: 0 2px 8px rgba(248, 113, 113, 0.4);
          --shadow-expanded-details: 0 2px 8px rgba(0, 0, 0, 0.2);
          --shadow-detail-card: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-detail-card-hover: 0 4px 12px rgba(0, 0, 0, 0.2);
          --shadow-action-summary: 0 4px 12px rgba(245, 158, 11, 0.3);
          --shadow-action-icon: 0 4px 12px rgba(245, 158, 11, 0.5);
        }

        /* Light Mode Default Values */
        :root {
          --bg-card: white;
          --bg-card-light: #f8fafc;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-divider: #94a3b8;
          --text-status-label: #64748b;
          --text-control-btn: #64748b;
          --text-control-btn-hover: #374151;
          --text-icon-wrapper: #4f46e5;
          --text-tooltip: white;
          --text-chip-ahead: #166534;
          --text-chip-behind: #991b1b;
          --text-chip-on-track: #1e40af;
          --text-metric-icon: #64748b;
          --text-metric-icon-primary: #0369a1;
          --text-trend-positive: #166534;
          --text-trend-negative: #991b1b;
          --text-badge-excellent: #166534;
          --text-badge-good: #1e40af;
          --text-badge-warning: #92400e;
          --text-badge-critical: #991b1b;
          --text-acceleration: #92400e;
          --text-action-title: #92400e;
          --text-action-subtitle: #a16207;
          --text-action-icon: white;
          --border-card: #e2e8f0;
          --border-status: #e2e8f0;
          --border-control-btn: #e2e8f0;
          --border-progress-section: #e2e8f0;
          --border-metric-card: #e2e8f0;
          --border-metric-primary: #0ea5e9;
          --border-detail-card: #e2e8f0;
          --border-expanded-details: #e2e8f0;
          --border-chip-ahead: #86efac;
          --border-chip-behind: #fca5a5;
          --border-chip-on-track: #60a5fa;
          --border-badge-excellent: #86efac;
          --border-badge-good: #60a5fa;
          --border-badge-warning: #f59e0b;
          --border-badge-critical: #fca5a5;
          --border-acceleration: #f59e0b;
          --border-action-summary: #f59e0b;
          --bg-gradient-track: #f1f5f9;
          --bg-gradient-track-light: #e2e8f0;
          --bg-icon-wrapper: #e0e7ff;
          --bg-icon-wrapper-light: #c7d2fe;
          --bg-status: rgba(248, 250, 252, 0.8);
          --bg-status-light: rgba(241, 245, 249, 0.6);
          --bg-control-btn: #f8fafc;
          --bg-control-btn-light: #f1f5f9;
          --bg-control-btn-hover: #e2e8f0;
          --bg-control-btn-hover-light: #d1d5db;
          --bg-progress-section: #f8fafc;
          --bg-progress-section-light: #f1f5f9;
          --bg-time-item: rgba(100, 116, 139, 0.1);
          --bg-progress-track: #f1f5f9;
          --bg-progress-track-light: #e2e8f0;
          --bg-velocity-track: #f1f5f9;
          --bg-velocity-track-light: #e2e8f0;
          --bg-chip-ahead: #dcfce7;
          --bg-chip-ahead-light: #bbf7d0;
          --bg-chip-behind: #fee2e2;
          --bg-chip-behind-light: #fecaca;
          --bg-chip-on-track: #dbeafe;
          --bg-chip-on-track-light: #bfdbfe;
          --bg-date-display: rgba(100, 116, 139, 0.1);
          --bg-metric-card: #ffffff;
          --bg-metric-card-light: #f8fafc;
          --bg-metric-primary: #f0f9ff;
          --bg-metric-primary-light: #e0f2fe;
          --bg-metric-icon: #f1f5f9;
          --bg-metric-icon-light: #e2e8f0;
          --bg-metric-icon-primary: #e0f2fe;
          --bg-metric-icon-primary-light: #bae6fd;
          --bg-trend-positive: #dcfce7;
          --bg-trend-positive-light: #bbf7d0;
          --bg-trend-negative: #fee2e2;
          --bg-trend-negative-light: #fecaca;
          --bg-expanded-details: #fafbfc;
          --bg-expanded-details-light: #f1f5f9;
          --bg-detail-card: white;
          --bg-detail-card-light: #f8fafc;
          --bg-badge-excellent: #dcfce7;
          --bg-badge-excellent-light: #bbf7d0;
          --bg-badge-good: #dbeafe;
          --bg-badge-good-light: #bfdbfe;
          --bg-badge-warning: #fef3c7;
          --bg-badge-warning-light: #fde68a;
          --bg-badge-critical: #fee2e2;
          --bg-badge-critical-light: #fecaca;
          --bg-perf-track: #f1f5f9;
          --bg-perf-track-light: #e2e8f0;
          --bg-acceleration: #fef3c7;
          --bg-acceleration-light: #fde68a;
          --bg-action-summary: #fef3c7;
          --bg-action-summary-light: #fde68a;
          --bg-action-icon: #f59e0b;
          --bg-action-icon-light: #fbbf24;
          --bg-tooltip: #1f2937;
          --expected-line: #1f2937;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --success: #166534;
          --danger: #991b1b;
          --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.08);
          --shadow-card-hover: 0 12px 40px rgba(0, 0, 0, 0.12);
          --shadow-icon-wrapper: 0 4px 12px rgba(79, 70, 229, 0.2);
          --shadow-icon-wrapper-hover: 0 6px 16px rgba(79, 70, 229, 0.3);
          --shadow-status: 0 4px 12px rgba(0, 0, 0, 0.1);
          --shadow-control-btn: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-control-btn-hover: 0 4px 8px rgba(0, 0, 0, 0.1);
          --shadow-progress-section: 0 2px 8px rgba(0, 0, 0, 0.05);
          --shadow-progress-bar: inset 0 2px 4px rgba(0, 0, 0, 0.06);
          --shadow-tooltip: 0 4px 12px rgba(0, 0, 0, 0.3);
          --shadow-metric-card: 0 2px 8px rgba(0, 0, 0, 0.05);
          --shadow-metric-card-hover: 0 8px 25px rgba(0, 0, 0, 0.1);
          --shadow-trend-positive: 0 2px 8px rgba(34, 197, 94, 0.3);
          --shadow-trend-negative: 0 2px 8px rgba(239, 68, 68, 0.3);
          --shadow-expanded-details: 0 2px 8px rgba(0, 0, 0, 0.05);
          --shadow-detail-card: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-detail-card-hover: 0 4px 12px rgba(0, 0, 0, 0.05);
          --shadow-action-summary: 0 4px 12px rgba(245, 158, 11, 0.2);
          --shadow-action-icon: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        /* Enhanced interactions */
        .control-btn:focus,
        .status-chip:focus,
        .perf-badge:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: 2px;
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .enhanced-projection-card,
          .title-icon-wrapper,
          .status-badge,
          .control-btn,
          .progress-fill,
          .velocity-fill,
          .status-chip,
          .metric-card,
          .metric-icon-wrapper,
          .trend-indicator,
          .detail-card,
          .perf-badge,
          .action-icon {
            transition: none;
            animation: none;
            transform: none;
          }
          
          @keyframes shimmer,
          @keyframes shine {
            0%, 100% { opacity: 1; transform: none; }
          }
        }

        /* Print styles */
        @media print {
          .enhanced-projection-card {
            background: white;
            border: 1px solid #ccc;
            box-shadow: none;
            page-break-inside: avoid;
          }
          
          .header-controls {
            display: none;
          }
          
          .metric-card,
          .detail-card {
            background: white;
            border: 1px solid #ccc;
            box-shadow: none;
          }
          
          .action-summary {
            background: #f5f5f5;
            border: 1px solid #ccc;
          }
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
      `}</style>
    </div>
  );
}