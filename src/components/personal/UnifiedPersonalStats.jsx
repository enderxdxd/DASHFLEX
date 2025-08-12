// src/components/personal/UnifiedPersonalStats.jsx
import React from 'react';
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  TrendingUp,
  MapPin,
  Activity,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

export default function UnifiedPersonalStats({ stats, selectedUnidade }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getUnidadeColor = (unidade) => {
    const colors = {
      'alphaville': '#3b82f6',
      'buenavista': '#10b981',
      'marista': '#f59e0b'
    };
    return colors[unidade] || '#6b7280';
  };

  const getUnidadeName = (unidade) => {
    const names = {
      'alphaville': 'Alphaville',
      'buenavista': 'Buena Vista',
      'marista': 'Marista'
    };
    return names[unidade] || unidade;
  };

  return (
    <div className="unified-personal-stats">
      {/* Stats Principais */}
      <div className="main-stats">
        <div className="stat-card primary">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalPersonals}</h3>
            <p>Personal Trainers</p>
            <span className="stat-subtitle">
              {selectedUnidade === 'all' ? 'Todas as unidades' : getUnidadeName(selectedUnidade)}
            </span>
          </div>
        </div>

        <div className="stat-card secondary">
          <div className="stat-icon">
            <GraduationCap size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalAlunos}</h3>
            <p>Alunos Únicos</p>
            <span className="stat-subtitle">
              Clientes ativos
            </span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(stats.totalFaturamento)}</h3>
            <p>Faturamento Total</p>
            <span className="stat-subtitle">
              Valor consolidado
            </span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <h3>{stats.registrosPagos + stats.registrosLivres}</h3>
            <p>Registros Totais</p>
            <div className="stat-breakdown">
              <span className="breakdown-item pago">
                <CheckCircle size={12} />
                {stats.registrosPagos} Pagos
              </span>
              <span className="breakdown-item livre">
                <Clock size={12} />
                {stats.registrosLivres} Livres
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats por Unidade */}
      {selectedUnidade === 'all' && stats.statsByUnidade && (
        <div className="unit-stats">
          <div className="section-header">
            <h3>
              <BarChart3 size={20} />
              Estatísticas por Unidade
            </h3>
            <p>Comparativo entre as unidades</p>
          </div>

          <div className="unit-cards">
            {Object.entries(stats.statsByUnidade).map(([unidade, unitStats]) => (
              <div 
                key={unidade}
                className="unit-card"
                style={{ '--unit-color': getUnidadeColor(unidade) }}
              >
                <div className="unit-header">
                  <div className="unit-icon">
                    <MapPin size={16} />
                  </div>
                  <h4>{getUnidadeName(unidade)}</h4>
                </div>

                <div className="unit-metrics">
                  <div className="metric">
                    <div className="metric-icon">
                      <Users size={16} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-value">{unitStats.personals}</span>
                      <span className="metric-label">Personais</span>
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-icon">
                      <GraduationCap size={16} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-value">{unitStats.alunos}</span>
                      <span className="metric-label">Alunos</span>
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-icon">
                      <DollarSign size={16} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-value">
                        {formatCurrency(unitStats.faturamento)}
                      </span>
                      <span className="metric-label">Faturamento</span>
                    </div>
                  </div>
                </div>

                <div className="unit-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${(unitStats.faturamento / stats.totalFaturamento) * 100}%`,
                        backgroundColor: getUnidadeColor(unidade)
                      }}
                    ></div>
                  </div>
                  <span className="progress-label">
                    {((unitStats.faturamento / stats.totalFaturamento) * 100).toFixed(1)}% do total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="insights-section">
        <div className="section-header">
          <h3>
            <TrendingUp size={20} />
            Insights de Performance
          </h3>
        </div>

        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-icon success">
              <CheckCircle size={20} />
            </div>
            <div className="insight-content">
              <h4>Taxa de Conversão</h4>
              <p>
                {stats.registrosPagos > 0 
                  ? `${((stats.registrosPagos / (stats.registrosPagos + stats.registrosLivres)) * 100).toFixed(1)}%`
                  : '0%'
                } dos registros estão pagos
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon info">
              <Users size={20} />
            </div>
            <div className="insight-content">
              <h4>Média por Personal</h4>
              <p>
                {stats.totalPersonals > 0 
                  ? (stats.totalAlunos / stats.totalPersonals).toFixed(1)
                  : '0'
                } alunos por personal trainer
              </p>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-icon warning">
              <DollarSign size={20} />
            </div>
            <div className="insight-content">
              <h4>Ticket Médio</h4>
              <p>
                {formatCurrency(stats.totalAlunos > 0 ? stats.totalFaturamento / stats.totalAlunos : 0)} por aluno
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .unified-personal-stats {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .main-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .stat-card.primary .stat-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .stat-card.secondary .stat-icon {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .stat-card.success .stat-icon {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .stat-card.info .stat-icon {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }

        .stat-content {
          flex: 1;
        }

        .stat-content h3 {
          margin: 0 0 4px;
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
        }

        .stat-content p {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
        }

        .stat-subtitle {
          font-size: 14px;
          color: #94a3b8;
        }

        .stat-breakdown {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .breakdown-item.pago {
          color: #10b981;
        }

        .breakdown-item.livre {
          color: #f59e0b;
        }

        .unit-stats {
          background: white;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 4px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .section-header p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .unit-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .unit-card {
          background: #f8fafc;
          border: 2px solid var(--unit-color);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .unit-card:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .unit-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .unit-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--unit-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .unit-header h4 {
          margin: 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 600;
        }

        .unit-metrics {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .metric {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .metric-icon {
          width: 24px;
          height: 24px;
          color: var(--unit-color);
        }

        .metric-content {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-value {
          font-weight: 600;
          color: #1e293b;
        }

        .metric-label {
          font-size: 12px;
          color: #64748b;
        }

        .unit-progress {
          margin-top: 16px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .insights-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .insight-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }

        .insight-card:hover {
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .insight-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .insight-icon.success {
          background: #10b981;
        }

        .insight-icon.info {
          background: #3b82f6;
        }

        .insight-icon.warning {
          background: #f59e0b;
        }

        .insight-content h4 {
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 16px;
          font-weight: 600;
        }

        .insight-content p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .main-stats {
            grid-template-columns: 1fr;
          }

          .unit-cards {
            grid-template-columns: 1fr;
          }

          .insights-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }

          .stat-breakdown {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
