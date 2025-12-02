// src/components/personal/PersonalStudentCards.jsx
import React from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award,
  MapPin,
  CheckCircle,
  Clock
} from 'lucide-react';
import './PersonalStudentCards.css';

export default function PersonalStudentCards({ personalStats, selectedUnidade }) {
  const { personalsData, totalPersonals, totalAlunosUnicos, valorTotalFaturamento, mediaAlunosPorPersonal } = personalStats;

  const getUnidadeColor = (unidade) => {
    const colors = {
      'alphaville': '#3b82f6',
      'buenavista': '#10b981', 
      'marista': '#f59e0b',
      'palmas': '#ec4899'
    };
    return colors[unidade] || '#6366f1';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="personal-student-cards">
      {/* Cards de Resumo */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">
            <Users size={24} />
          </div>
          <div className="card-content">
            <h3>Total de Personais</h3>
            <p className="card-number">{totalPersonals}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <Award size={24} />
          </div>
          <div className="card-content">
            <h3>Alunos Únicos</h3>
            <p className="card-number">{totalAlunosUnicos}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <TrendingUp size={24} />
          </div>
          <div className="card-content">
            <h3>Média por Personal</h3>
            <p className="card-number">{mediaAlunosPorPersonal}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <DollarSign size={24} />
          </div>
          <div className="card-content">
            <h3>Faturamento Total</h3>
            <p className="card-number">{formatCurrency(valorTotalFaturamento)}</p>
          </div>
        </div>
      </div>

      {/* Cards de Personals - Foco Principal */}
      <div className="personal-cards-grid">
        <h2 className="section-title">
          <Users size={20} />
          Alunos por Personal
          {selectedUnidade !== 'all' && (
            <span className="unit-badge" style={{ backgroundColor: getUnidadeColor(selectedUnidade) }}>
              {selectedUnidade.charAt(0).toUpperCase() + selectedUnidade.slice(1)}
            </span>
          )}
        </h2>

        <div className="personal-cards">
          {personalsData.length === 0 ? (
            <div className="no-data">
              <Users size={48} />
              <p>Nenhum personal encontrado</p>
            </div>
          ) : (
            personalsData.map((personal, index) => (
              <div 
                key={personal.personal} 
                className={`personal-card ${index < 3 ? 'top-performer' : ''}`}
                style={{ '--unit-color': getUnidadeColor(personal.unidade) }}
              >
                <div className="personal-header">
                  <div className="personal-info">
                    <h3 className="personal-name">{personal.personal}</h3>
                    {selectedUnidade === 'all' && (
                      <span className="unit-tag" style={{ backgroundColor: getUnidadeColor(personal.unidade) }}>
                        <MapPin size={12} />
                        {personal.unidade}
                      </span>
                    )}
                  </div>
                  {index < 3 && (
                    <div className="rank-badge">
                      #{index + 1}
                    </div>
                  )}
                </div>

                <div className="student-count">
                  <div className="count-main">
                    <Users size={32} />
                    <span className="count-number">{personal.totalAlunos}</span>
                  </div>
                  <p className="count-label">Alunos Reais</p>
                </div>

                <div className="personal-details">
                  <div className="detail-item">
                    <CheckCircle size={16} />
                    <span>{personal.alunosPagos} Isentados</span>
                  </div>
                  <div className="detail-item">
                    <Clock size={16} />
                    <span>{personal.alunosLivres} Abertos</span>
                  </div>
                  <div className="detail-item">
                    <DollarSign size={16} />
                    <span>{formatCurrency(personal.totalFaturamento)}</span>
                  </div>
                </div>

                {personal.totalAlunos > 0 && (
                  <div className="students-preview">
                    <p className="preview-title">Alunos:</p>
                    <div className="students-list">
                      {personal.alunos.slice(0, 3).map((aluno, idx) => (
                        <span key={idx} className="student-name">{aluno}</span>
                      ))}
                      {personal.alunos.length > 3 && (
                        <span className="more-students">+{personal.alunos.length - 3} mais</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
