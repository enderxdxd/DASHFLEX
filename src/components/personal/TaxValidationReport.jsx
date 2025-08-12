// src/components/personal/TaxValidationReport.jsx
import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  DollarSign,
  ChevronDown,
  ChevronUp,
  Filter,
  BarChart3,
  Target
} from 'lucide-react';

export default function TaxValidationReport({ data }) {
  const [showDetails, setShowDetails] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'invalid', 'valid'

  if (!data || data.length === 0) {
    return null;
  }

  // Filtrar dados com validação de taxa
  const dataWithValidation = data.filter(personal => personal.taxaValidation);
  
  if (dataWithValidation.length === 0) {
    return null;
  }

  const invalidTaxas = dataWithValidation.filter(p => !p.taxaValidation.isValid);
  const validTaxas = dataWithValidation.filter(p => p.taxaValidation.isValid);

  const filteredData = filterType === 'invalid' ? invalidTaxas : 
                      filterType === 'valid' ? validTaxas : 
                      dataWithValidation;

  const getStatusColor = (isValid) => {
    return isValid ? '#10b981' : '#ef4444';
  };

  const getStatusIcon = (isValid) => {
    return isValid ? <CheckCircle size={16} /> : <AlertTriangle size={16} />;
  };

  // Função para renderizar a visualização do intervalo de alunos
  const renderStudentRangeVisualization = (personal) => {
    const { taxaValidation } = personal;
    if (!taxaValidation || !taxaValidation.expectedRange) return null;

    const { totalAlunos, expectedRange, isValid } = taxaValidation;
    const { min, max } = expectedRange;
    
    // Calcular posição do aluno atual no range
    const rangeSize = max - min;
    const currentPosition = Math.max(0, Math.min(100, ((totalAlunos - min) / rangeSize) * 100));
    
    return (
      <div className="student-range-visualization">
        <div className="range-header">
          <div className="range-title">
            <Target size={14} />
            <span>Intervalo de Alunos para Taxa {taxaValidation.expectedTaxa}</span>
          </div>
          <div className={`range-status ${isValid ? 'valid' : 'invalid'}`}>
            {isValid ? 'Dentro do Intervalo' : 'Fora do Intervalo'}
          </div>
        </div>
        
        <div className="range-bar-container">
          <div className="range-labels">
            <span className="min-label">{min} alunos</span>
            <span className="current-label" style={{ left: `${currentPosition}%` }}>
              {totalAlunos} alunos
            </span>
            <span className="max-label">{max} alunos</span>
          </div>
          
          <div className="range-bar">
            <div className="range-track"></div>
            <div 
              className="range-fill"
              style={{ 
                width: `100%`,
                background: isValid ? 
                  'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 
                  'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
              }}
            ></div>
            <div 
              className={`current-position ${isValid ? 'valid' : 'invalid'}`}
              style={{ left: `${currentPosition}%` }}
            >
              <div className="position-marker"></div>
              <div className="position-tooltip">
                {totalAlunos} alunos
              </div>
            </div>
          </div>
          
          <div className="range-indicators">
            <div className="indicator min-indicator">
              <div className="indicator-line"></div>
              <span>Mín</span>
            </div>
            <div className="indicator max-indicator">
              <div className="indicator-line"></div>
              <span>Máx</span>
            </div>
          </div>
        </div>
        
        <div className="range-explanation">
          {isValid ? (
            <div className="explanation valid">
              <CheckCircle size={12} />
              <span>
                O personal tem {totalAlunos} alunos, que está dentro do intervalo 
                de {min}-{max} alunos para a taxa {taxaValidation.expectedTaxa}.
              </span>
            </div>
          ) : (
            <div className="explanation invalid">
              <AlertTriangle size={12} />
              <span>
                O personal tem {totalAlunos} alunos, que está 
                {totalAlunos < min ? 'abaixo' : 'acima'} do intervalo 
                de {min}-{max} alunos para a taxa {taxaValidation.expectedTaxa}.
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="tax-validation-report">
      <div className="report-header">
        <div className="header-info">
          <div className="header-icon">
            <DollarSign size={24} />
          </div>
          <div className="header-text">
            <h3>Validação de Taxas por Alunos</h3>
            <p>Verificação automática se a taxa aplicada está correta conforme a quantidade de alunos</p>
          </div>
        </div>
        
        <button 
          className="toggle-details"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          {showDetails ? 'Ocultar' : 'Ver Detalhes'}
        </button>
      </div>

      <div className="validation-summary">
        <div className="summary-stats">
          <div className="stat-item valid">
            <CheckCircle size={20} />
            <div className="stat-info">
              <span className="stat-number">{validTaxas.length}</span>
              <span className="stat-label">Taxas Corretas</span>
            </div>
          </div>
          
          <div className="stat-item invalid">
            <AlertTriangle size={20} />
            <div className="stat-info">
              <span className="stat-number">{invalidTaxas.length}</span>
              <span className="stat-label">Taxas Incorretas</span>
            </div>
          </div>
          
          <div className="stat-item total">
            <Users size={20} />
            <div className="stat-info">
              <span className="stat-number">{dataWithValidation.length}</span>
              <span className="stat-label">Total Verificados</span>
            </div>
          </div>
        </div>

        {invalidTaxas.length > 0 && (
          <div className="alert-message">
            <AlertTriangle size={16} />
            <span>
              {invalidTaxas.length} personal{invalidTaxas.length > 1 ? 's' : ''} 
              {invalidTaxas.length > 1 ? ' têm' : ' tem'} taxa incorreta para a quantidade de alunos
            </span>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="validation-details">
          <div className="details-header">
            <h4>Detalhes da Validação</h4>
            <div className="filter-controls">
              <Filter size={16} />
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos ({dataWithValidation.length})</option>
                <option value="invalid">Incorretas ({invalidTaxas.length})</option>
                <option value="valid">Corretas ({validTaxas.length})</option>
              </select>
            </div>
          </div>

          <div className="validation-list">
            {filteredData.map((personal, index) => (
              <div 
                key={index}
                className={`validation-item ${personal.taxaValidation.isValid ? 'valid' : 'invalid'}`}
              >
                <div className="item-header">
                  <div className="personal-info">
                    <div 
                      className="status-icon"
                      style={{ color: getStatusColor(personal.taxaValidation.isValid) }}
                    >
                      {getStatusIcon(personal.taxaValidation.isValid)}
                    </div>
                    <div className="personal-details">
                      <strong>{personal.personal}</strong>
                      <span className="unit-badge">{personal.unidade}</span>
                    </div>
                  </div>
                  <div className="alunos-count">
                    <Users size={14} />
                    {personal.taxaValidation.totalAlunos} alunos
                  </div>
                </div>
                
                <div className="taxa-comparison">
                  <div className="taxa-info">
                    <label>Taxa Atual:</label>
                    <span className="current-taxa">{personal.taxaValidation.currentTaxa || 'Não informada'}</span>
                  </div>
                  <div className="taxa-info">
                    <label>Taxa Esperada:</label>
                    <span className="expected-taxa">{personal.taxaValidation.expectedTaxa}</span>
                  </div>
                </div>
                
                {/* Nova visualização do intervalo de alunos */}
                {renderStudentRangeVisualization(personal)}
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .tax-validation-report {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .header-text h3 {
          margin: 0 0 4px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .header-text p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .toggle-details {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          font-weight: 500;
        }

        .toggle-details:hover {
          background: #e2e8f0;
        }

        .validation-summary {
          margin-bottom: 20px;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid;
        }

        .stat-item.valid {
          background: rgba(16, 185, 129, 0.05);
          border-color: #10b981;
          color: #059669;
        }

        .stat-item.invalid {
          background: rgba(239, 68, 68, 0.05);
          border-color: #ef4444;
          color: #dc2626;
        }

        .stat-item.total {
          background: rgba(99, 102, 241, 0.05);
          border-color: #6366f1;
          color: #4f46e5;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 20px;
          font-weight: 700;
          line-height: 1;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.8;
          margin-top: 2px;
        }

        .alert-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #dc2626;
          font-size: 14px;
          font-weight: 500;
        }

        .validation-details {
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .details-header h4 {
          margin: 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 600;
        }

        .filter-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-select {
          padding: 6px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .validation-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .validation-item {
          padding: 16px;
          border-radius: 8px;
          border: 1px solid;
        }

        .validation-item.valid {
          background: rgba(16, 185, 129, 0.02);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .validation-item.invalid {
          background: rgba(239, 68, 68, 0.02);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .personal-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .personal-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .personal-details strong {
          color: #1e293b;
          font-size: 14px;
        }

        .unit-badge {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .alunos-count {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
        }

        .taxa-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .taxa-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .taxa-info label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .current-taxa {
          color: #1e293b;
          font-size: 14px;
          font-weight: 500;
        }

        .expected-taxa {
          color: #059669;
          font-size: 14px;
          font-weight: 500;
        }

        /* Estilos para a visualização do intervalo de alunos */
        .student-range-visualization {
          margin-top: 16px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .range-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .range-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-size: 14px;
          font-weight: 500;
        }

        .range-status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .range-status.valid {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .range-status.invalid {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .range-bar-container {
          position: relative;
          margin: 20px 0;
        }

        .range-labels {
          position: relative;
          height: 20px;
          margin-bottom: 8px;
        }

        .range-labels span {
          position: absolute;
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          transform: translateX(-50%);
        }

        .min-label {
          left: 0;
          transform: translateX(0);
        }

        .max-label {
          right: 0;
          transform: translateX(0);
        }

        .current-label {
          color: #1e293b;
          font-weight: 600;
          background: white;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .range-bar {
          position: relative;
          height: 12px;
          margin: 8px 0;
        }

        .range-track {
          position: absolute;
          width: 100%;
          height: 100%;
          background: #e2e8f0;
          border-radius: 6px;
        }

        .range-fill {
          position: absolute;
          height: 100%;
          border-radius: 6px;
          opacity: 0.8;
        }

        .current-position {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
        }

        .position-marker {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .current-position.valid .position-marker {
          background: #10b981;
        }

        .current-position.invalid .position-marker {
          background: #ef4444;
        }

        .position-tooltip {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .position-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #1e293b;
        }

        .current-position:hover .position-tooltip {
          opacity: 1;
        }

        .range-indicators {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
        }

        .indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .indicator-line {
          width: 1px;
          height: 8px;
          background: #94a3b8;
        }

        .indicator span {
          font-size: 10px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
        }

        .range-explanation {
          margin-top: 12px;
        }

        .explanation {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          line-height: 1.4;
        }

        .explanation.valid {
          background: rgba(16, 185, 129, 0.05);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .explanation.invalid {
          background: rgba(239, 68, 68, 0.05);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        @media (max-width: 768px) {
          .summary-stats {
            grid-template-columns: 1fr;
          }

          .report-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .details-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .taxa-comparison {
            grid-template-columns: 1fr;
          }

          .item-header {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}
