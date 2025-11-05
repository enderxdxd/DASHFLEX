// src/components/comissao/ConsultorCard.jsx
import React from 'react';
import { 
  Target, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  Calculator
} from 'lucide-react';
import useDarkMode from '../../hooks/useDarkMode';

const ConsultorCard = ({ 
  consultor, 
  dados, 
  onClick, 
  isSelected = false,
  isExpanded = false,
  remuneracaoType = 'comissao' // Novo prop para tipo de remuneração
}) => {
  const [theme] = useDarkMode();
  const {
    totalVendas,
    totalComissao,
    metaIndividual,
    bateuMetaIndividual,
    percentualMeta,
    vendasCount,
    planosCount,
    produtosCount,
    planosDetalhados,
    totalComDesconto,
    totalSemDesconto,
    percentualDesconto
  } = dados;

  const getStatusColor = () => {
    if (bateuMetaIndividual) return 'success';
    if (percentualMeta >= 80) return 'warning';
    return 'danger';
  };

  const getStatusIcon = () => {
    if (bateuMetaIndividual) return <CheckCircle size={20} />;
    if (percentualMeta >= 80) return <AlertTriangle size={20} />;
    return <Target size={20} />;
  };

  return (
    <div 
      className={`consultor-card ${isSelected ? 'selected' : ''} ${getStatusColor()} ${theme === 'light' ? 'light-mode' : 'dark-mode'}`}
      onClick={onClick}
    >
      {/* Header do Card */}
      <div className="consultor-card-header">
        <div className="consultor-info">
          <h3 className="consultor-nome">{consultor}</h3>
          <div className="consultor-stats">
            <span className="vendas-count">{vendasCount} vendas</span>
            <span className="remuneracao-type">
              {remuneracaoType === 'premiacao' ? '🏆 Premiação' : '💰 Comissão'}
            </span>
          </div>
        </div>
        <div className="status-indicator">
          {getStatusIcon()}
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="consultor-metrics">
        {/* Total de Vendas */}
        <div className="metric">
          <div className="metric-icon">
            <DollarSign size={16} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Vendas</span>
            <span className="metric-value">
              R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Comissão/Premiação Total */}
        <div className="metric highlight">
          <div className="metric-icon">
            <Calculator size={16} />
          </div>
          <div className="metric-content">
            <span className="metric-label">
              {remuneracaoType === 'premiacao' ? 'Premiação' : 'Comissão'}
            </span>
            <span className="metric-value">
              R$ {totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Performance da Meta */}
        <div className="metric">
          <div className="metric-icon">
            <BarChart3 size={16} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Meta</span>
            <span className="metric-value">
              {percentualMeta.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Progresso da Meta */}
      <div className="progress-section">
        <div className="progress-info">
          <span className="progress-label">
            R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
            R$ {metaIndividual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className={`progress-status ${getStatusColor()}`}>
            {bateuMetaIndividual ? 'Meta Atingida' : 'Em Andamento'}
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className={`progress-fill ${getStatusColor()}`}
            style={{ width: `${Math.min(percentualMeta, 100)}%` }}
          />
        </div>
      </div>

      {/* Detalhamento de Planos (quando expandido) */}
      {isExpanded && planosDetalhados && (
        <div className="breakdown-section">
          <div className="breakdown-header">
            <div className="total-planos">
              <span className="total-label">TOTAL PLANOS VENDIDOS</span>
              <span className="total-number">{planosCount}</span>
            </div>
          </div>
          
          <div className="planos-table">
            <div className="table-header">
              <span className="col-tipo">TIPO</span>
              <span className="col-com">COM DESCTO</span>
              <span className="col-sem">SEM DESCTO</span>
            </div>
            
            {Object.entries(planosDetalhados).map(([tipo, dados]) => (
              <div key={tipo} className="table-row">
                <span className="col-tipo">{tipo}</span>
                <span className="col-com desconto-badge">{dados.comDesconto}</span>
                <span className="col-sem sem-desconto-badge">{dados.semDesconto}</span>
              </div>
            ))}
          </div>
          
          <div className="resumo-desconto">
            <div className="resumo-item">
              <span className="resumo-icon">↓</span>
              <span>Com Desconto: {totalComDesconto}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-icon">↗</span>
              <span>Sem Desconto: {totalSemDesconto}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-icon">%</span>
              <span>% com Desconto: {percentualDesconto}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Seleção */}
      {isSelected && (
        <div className="selection-indicator">
          <span>Clique para ver detalhes</span>
        </div>
      )}
    </div>
  );
};

export default ConsultorCard;