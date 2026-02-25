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
      'marista': '#f59e0b',
      'palmas': '#ec4899'
    };
    return colors[unidade] || '#6b7280';
  };

  const getUnidadeName = (unidade) => {
    const names = {
      'alphaville': 'Alphaville',
      'buenavista': 'Buena Vista',
      'marista': 'Marista',
      'palmas': 'Palmas'
    };
    return names[unidade] || unidade;
  };

  return (
    <div className="unified-personal-stats">
      {/* Stats Principais - Design Minimalista */}
      <div className="main-stats-modern">
        <div className="stat-card-modern primary">
          <div className="stat-icon-modern">
            <Users size={20} />
          </div>
          <div className="stat-content-modern">
            <div className="stat-value-modern">{stats.totalPersonals}</div>
            <div className="stat-label-modern">Personal Trainers</div>
            <div className="stat-subtitle-modern">
              {selectedUnidade === 'all' ? 'Todas as unidades' : getUnidadeName(selectedUnidade)}
            </div>
          </div>
        </div>

        <div className="stat-card-modern secondary">
          <div className="stat-icon-modern">
            <GraduationCap size={20} />
          </div>
          <div className="stat-content-modern">
            <div className="stat-value-modern">{stats.totalAlunos}</div>
            <div className="stat-label-modern">Alunos Únicos</div>
            <div className="stat-subtitle-modern">Clientes ativos</div>
          </div>
        </div>

        <div className="stat-card-modern success">
          <div className="stat-icon-modern">
            <DollarSign size={20} />
          </div>
          <div className="stat-content-modern">
            <div className="stat-value-modern">{formatCurrency(stats.totalFaturamento)}</div>
            <div className="stat-label-modern">Faturamento Total</div>
            <div className="stat-subtitle-modern">Valor consolidado</div>
          </div>
        </div>

        <div className="stat-card-modern info">
          <div className="stat-icon-modern">
            <Activity size={20} />
          </div>
          <div className="stat-content-modern">
            <div className="stat-value-modern">{stats.registrosPagos + stats.registrosLivres}</div>
            <div className="stat-label-modern">Registros Totais</div>
            <div className="stat-breakdown-modern">
              <span className="breakdown-item-modern pago">
                <CheckCircle size={10} />
                {stats.registrosPagos} Pagos
              </span>
              <span className="breakdown-item-modern livre">
                <Clock size={10} />
                {stats.registrosLivres} Livres
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats por Unidade - Design Moderno */}
      {selectedUnidade === 'all' && stats.statsByUnidade && (
        <div className="unit-stats-modern">
          <div className="section-header-modern">
            <div className="header-icon-modern">
              <BarChart3 size={18} />
            </div>
            <div>
              <h3>Estatísticas por Unidade</h3>
              <p>Comparativo entre as unidades</p>
            </div>
          </div>

          <div className="unit-cards-modern">
            {Object.entries(stats.statsByUnidade).map(([unidade, unitStats]) => (
              <div 
                key={unidade}
                className="unit-card-modern"
                style={{ '--unit-color': getUnidadeColor(unidade) }}
              >
                <div className="unit-header-modern">
                  <div className="unit-icon-modern" style={{ backgroundColor: getUnidadeColor(unidade) }}>
                    <MapPin size={14} />
                  </div>
                  <h4>{getUnidadeName(unidade)}</h4>
                </div>

                <div className="unit-metrics-modern">
                  <div className="metric-modern">
                    <Users size={14} color={getUnidadeColor(unidade)} />
                    <div className="metric-info-modern">
                      <span className="metric-value-modern">{unitStats.personals}</span>
                      <span className="metric-label-modern">Personais</span>
                    </div>
                  </div>

                  <div className="metric-modern">
                    <GraduationCap size={14} color={getUnidadeColor(unidade)} />
                    <div className="metric-info-modern">
                      <span className="metric-value-modern">{unitStats.alunos}</span>
                      <span className="metric-label-modern">Alunos</span>
                    </div>
                  </div>

                  <div className="metric-modern">
                    <DollarSign size={14} color={getUnidadeColor(unidade)} />
                    <div className="metric-info-modern">
                      <span className="metric-value-modern">{formatCurrency(unitStats.faturamento)}</span>
                      <span className="metric-label-modern">Faturamento</span>
                    </div>
                  </div>
                </div>

                <div className="unit-progress-modern">
                  <div className="progress-bar-modern">
                    <div 
                      className="progress-fill-modern"
                      style={{ 
                        width: `${(unitStats.faturamento / stats.totalFaturamento) * 100}%`,
                        backgroundColor: getUnidadeColor(unidade)
                      }}
                    ></div>
                  </div>
                  <span className="progress-label-modern">
                    {((unitStats.faturamento / stats.totalFaturamento) * 100).toFixed(1)}% do total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Insights - Design Moderno */}
      <div className="insights-section-modern">
        <div className="section-header-modern">
          <div className="header-icon-modern">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3>Insights de Performance</h3>
            <p>Métricas e indicadores chave</p>
          </div>
        </div>

        <div className="insights-grid-modern">
          <div className="insight-card-modern success">
            <div className="insight-icon-modern">
              <CheckCircle size={18} />
            </div>
            <div className="insight-content-modern">
              <div className="insight-value-modern">
                {stats.registrosPagos > 0 
                  ? `${((stats.registrosPagos / (stats.registrosPagos + stats.registrosLivres)) * 100).toFixed(1)}%`
                  : '0%'
                }
              </div>
              <div className="insight-label-modern">Taxa de Conversão</div>
              <div className="insight-description-modern">Registros pagos do total</div>
            </div>
          </div>

          <div className="insight-card-modern info">
            <div className="insight-icon-modern">
              <Users size={18} />
            </div>
            <div className="insight-content-modern">
              <div className="insight-value-modern">
                {stats.totalPersonals > 0 
                  ? (stats.totalAlunos / stats.totalPersonals).toFixed(1)
                  : '0'
                }
              </div>
              <div className="insight-label-modern">Média por Personal</div>
              <div className="insight-description-modern">Alunos por personal trainer</div>
            </div>
          </div>

          <div className="insight-card-modern warning">
            <div className="insight-icon-modern">
              <DollarSign size={18} />
            </div>
            <div className="insight-content-modern">
              <div className="insight-value-modern">
                {formatCurrency(stats.totalAlunos > 0 ? stats.totalFaturamento / stats.totalAlunos : 0)}
              </div>
              <div className="insight-label-modern">Ticket Médio</div>
              <div className="insight-description-modern">Valor médio por aluno</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
