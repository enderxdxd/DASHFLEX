// src/components/personal/PersonalStats.jsx
import React from 'react';
import { 
  Users, 
  UserCheck, 
  DollarSign, 
  Activity,
  TrendingUp,
  Target
} from 'lucide-react';

export default function PersonalStats({ stats }) {
  const {
    totalPersonals = 0,
    totalAlunos = 0,
    totalFaturamento = 0,
    alunosAtivos = 0,
    personalsUnicos = []
  } = stats;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value || 0);
  };

  const averagePerPersonal = totalPersonals > 0 ? totalFaturamento / totalPersonals : 0;
  const averagePerAluno = totalAlunos > 0 ? totalFaturamento / totalAlunos : 0;
  const alunosPerPersonal = totalPersonals > 0 ? totalAlunos / totalPersonals : 0;

  const statCards = [
    {
      id: 'personals',
      title: 'Total de Personals',
      value: formatNumber(totalPersonals),
      icon: Users,
      color: 'blue',
      subtitle: 'Personal trainers ativos'
    },
    {
      id: 'alunos',
      title: 'Total de Alunos',
      value: formatNumber(totalAlunos),
      icon: UserCheck,
      color: 'green',
      subtitle: `${alunosAtivos} ativos`
    },
    {
      id: 'faturamento',
      title: 'Faturamento Total',
      value: formatCurrency(totalFaturamento),
      icon: DollarSign,
      color: 'purple',
      subtitle: 'Receita bruta total'
    },
    {
      id: 'media-personal',
      title: 'Média por Personal',
      value: formatCurrency(averagePerPersonal),
      icon: TrendingUp,
      color: 'orange',
      subtitle: 'Faturamento médio'
    },
    {
      id: 'media-aluno',
      title: 'Ticket Médio',
      value: formatCurrency(averagePerAluno),
      icon: Target,
      color: 'pink',
      subtitle: 'Valor médio por aluno'
    },
    {
      id: 'alunos-personal',
      title: 'Alunos por Personal',
      value: alunosPerPersonal.toFixed(1),
      icon: Activity,
      color: 'cyan',
      subtitle: 'Média de alunos'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.2)',
        icon: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
      },
      green: {
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.2)',
        icon: '#10b981',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      },
      purple: {
        bg: 'rgba(139, 92, 246, 0.1)',
        border: 'rgba(139, 92, 246, 0.2)',
        icon: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
      },
      orange: {
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.2)',
        icon: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      },
      pink: {
        bg: 'rgba(236, 72, 153, 0.1)',
        border: 'rgba(236, 72, 153, 0.2)',
        icon: '#ec4899',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
      },
      cyan: {
        bg: 'rgba(6, 182, 212, 0.1)',
        border: 'rgba(6, 182, 212, 0.2)',
        icon: '#06b6d4',
        gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="personal-stats">
      <div className="stats-grid">
        {statCards.map((card) => {
          const colors = getColorClasses(card.color);
          const IconComponent = card.icon;
          
          return (
            <div 
              key={card.id} 
              className="stat-card"
              style={{
                '--card-bg': colors.bg,
                '--card-border': colors.border,
                '--icon-color': colors.icon,
                '--icon-gradient': colors.gradient
              }}
            >
              <div className="card-header">
                <div className="icon-wrapper">
                  <IconComponent size={24} />
                </div>
                <div className="card-info">
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-subtitle">{card.subtitle}</p>
                </div>
              </div>
              
              <div className="card-value">
                {card.value}
              </div>
              
              {/* Pequeno indicador visual */}
              <div className="card-indicator"></div>
            </div>
          );
        })}
      </div>

      {/* Resumo Detalhado */}
      {personalsUnicos.length > 0 && (
        <div className="detailed-summary">
          <h3 className="summary-title">
            📊 Resumo Detalhado por Personal
          </h3>
          
          <div className="summary-grid">
            {personalsUnicos.map((personal, index) => {
              // Calcula estatísticas específicas para cada personal
              // Nota: Em uma implementação real, você receberia essas estatísticas já calculadas
              const personalData = {
                name: personal,
                alunos: Math.floor(Math.random() * 8) + 2, // Mock data
                faturamento: Math.floor(Math.random() * 50000) + 10000, // Mock data
                ticketMedio: Math.floor(Math.random() * 3000) + 500 // Mock data
              };

              return (
                <div key={personal} className="personal-summary-card">
                  <div className="personal-header">
                    <div className="personal-avatar">
                      {personal.charAt(0).toUpperCase()}
                    </div>
                    <div className="personal-info">
                      <h4 className="personal-name">{personal}</h4>
                      <p className="personal-rank">#{index + 1} em faturamento</p>
                    </div>
                  </div>
                  
                  <div className="personal-metrics">
                    <div className="metric">
                      <span className="metric-value">{personalData.alunos}</span>
                      <span className="metric-label">Alunos</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{formatCurrency(personalData.faturamento)}</span>
                      <span className="metric-label">Faturamento</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{formatCurrency(personalData.ticketMedio)}</span>
                      <span className="metric-label">Ticket Médio</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .personal-stats {
          margin-bottom: 32px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .icon-wrapper {
          width: 56px;
          height: 56px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--icon-color);
          transition: all 0.3s ease;
        }

        .stat-card:hover .icon-wrapper {
          background: var(--icon-gradient);
          color: white;
          transform: scale(1.05);
        }

        .card-info {
          flex: 1;
        }

        .card-title {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        .card-subtitle {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }

        .card-value {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
          font-variant-numeric: tabular-nums;
        }

        .card-indicator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--icon-gradient);
          border-radius: 16px 16px 0 0;
        }

        .detailed-summary {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .summary-title {
          margin: 0 0 24px;
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }

        .personal-summary-card {
          background: #fafafa;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s ease;
        }

        .personal-summary-card:hover {
          background: white;
          border-color: #e2e8f0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .personal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .personal-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
        }

        .personal-info {
          flex: 1;
        }

        .personal-name {
          margin: 0 0 2px;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
        }

        .personal-rank {
          margin: 0;
          font-size: 12px;
          color: #64748b;
        }

        .personal-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .metric {
          text-align: center;
          padding: 12px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .metric-value {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
          font-variant-numeric: tabular-nums;
        }

        .metric-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .stat-card {
            padding: 20px;
          }

          .card-header {
            gap: 12px;
          }

          .icon-wrapper {
            width: 48px;
            height: 48px;
          }

          .card-value {
            font-size: 24px;
          }

          .detailed-summary {
            padding: 24px;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .personal-metrics {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .card-header {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }

          .icon-wrapper {
            align-self: center;
          }
        }
      `}</style>
    </div>
  );
}