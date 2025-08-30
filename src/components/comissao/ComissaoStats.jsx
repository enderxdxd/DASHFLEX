// src/components/comissao/ComissaoStats.jsx
import React from 'react';
import { 
  Target, 
  DollarSign, 
  Calculator, 
  CheckCircle, 
  Package, 
  PieChart, 
  AlertTriangle,
  TrendingUp,
  Award,
  BarChart3
} from 'lucide-react';
import useDarkMode from '../../hooks/useDarkMode';

const ComissaoStats = ({ estatisticas, consultor }) => {
  const [theme] = useDarkMode();
  
  if (!estatisticas || !consultor) {
    return null;
  }

  const {
    totalVendas,
    valorTotal,
    totalComissao,
    corretos,
    incorretos,
    planos,
    produtos,
    naoComissionaveis,
    comissaoPlanos,
    comissaoProdutos,
    percentualMeta,
    bateuMetaIndividual,
    metaIndividual,
    unidadeBatida
  } = estatisticas;

  const percentualCorretos = totalVendas > 0 ? (corretos / totalVendas * 100) : 0;
  const percentualComissao = valorTotal > 0 ? (totalComissao / valorTotal * 100) : 0;

  return (
    <div className={`comissao-stats ${theme === 'light' ? 'light-mode' : 'dark-mode'}`}>
      <div className="stats-header">
        <h3>
          <BarChart3 size={20} />
          Estatísticas - {consultor}
        </h3>
        <div className="stats-badges">
          {bateuMetaIndividual ? (
            <span className="status-badge success">
              <Award size={16} />
              Meta Atingida
            </span>
          ) : (
            <span className="status-badge warning">
              <Target size={16} />
              {percentualMeta.toFixed(1)}% da Meta
            </span>
          )}
          {unidadeBatida && (
            <span className="status-badge info">
              <TrendingUp size={16} />
              Unidade Batida
            </span>
          )}
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="main-stats-grid">
        {/* Performance da Meta */}
        <div className="stat-card primary">
          <div className="stat-icon">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <h4>Performance da Meta</h4>
            <div className="stat-value large">
              {percentualMeta.toFixed(1)}%
            </div>
            <div className="stat-detail">
              R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
              R$ {metaIndividual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="progress-bar">
              <div 
                className={`progress-fill ${bateuMetaIndividual ? 'success' : 'primary'}`}
                style={{ width: `${Math.min(percentualMeta, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total de Vendas */}
        <div className="stat-card success">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h4>Total de Vendas</h4>
            <div className="stat-value large">
              R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-detail">
              {totalVendas} vendas realizadas
            </div>
          </div>
        </div>

        {/* Comissão Total */}
        <div className="stat-card warning">
          <div className="stat-icon">
            <Calculator size={24} />
          </div>
          <div className="stat-content">
            <h4>Comissão Total</h4>
            <div className="stat-value large">
              R$ {totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="stat-detail">
              {percentualComissao.toFixed(2)}% do total vendido
            </div>
          </div>
        </div>

        {/* Status de Classificação */}
        <div className="stat-card info">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h4>Classificações</h4>
            <div className="stat-value large">
              {percentualCorretos.toFixed(1)}%
            </div>
            <div className="stat-detail">
              {corretos} corretas de {totalVendas} total
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Detalhado */}
      <div className="breakdown-section">
        <h4>Breakdown por Categoria</h4>
        <div className="breakdown-grid">
          {/* Planos */}
          <div className="breakdown-card">
            <div className="breakdown-header">
              <Package size={18} />
              <span>Planos</span>
            </div>
            <div className="breakdown-stats">
              <div className="breakdown-stat">
                <span className="label">Quantidade:</span>
                <span className="value">{planos}</span>
              </div>
              <div className="breakdown-stat">
                <span className="label">Comissão:</span>
                <span className="value">
                  R$ {comissaoPlanos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="breakdown-stat">
                <span className="label">% do Total:</span>
                <span className="value">
                  {totalVendas > 0 ? ((planos / totalVendas) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <div className="breakdown-card">
            <div className="breakdown-header">
              <PieChart size={18} />
              <span>Produtos</span>
            </div>
            <div className="breakdown-stats">
              <div className="breakdown-stat">
                <span className="label">Quantidade:</span>
                <span className="value">{produtos}</span>
              </div>
              <div className="breakdown-stat">
                <span className="label">Comissão:</span>
                <span className="value">
                  R$ {comissaoProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="breakdown-stat">
                <span className="label">% do Total:</span>
                <span className="value">
                  {totalVendas > 0 ? ((produtos / totalVendas) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Não Comissionáveis */}
          <div className="breakdown-card">
            <div className="breakdown-header">
              <AlertTriangle size={18} />
              <span>Não Comissionáveis</span>
            </div>
            <div className="breakdown-stats">
              <div className="breakdown-stat">
                <span className="label">Quantidade:</span>
                <span className="value">{naoComissionaveis}</span>
              </div>
              <div className="breakdown-stat">
                <span className="label">% do Total:</span>
                <span className="value">
                  {totalVendas > 0 ? ((naoComissionaveis / totalVendas) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="breakdown-stat">
                <span className="label">Tipos:</span>
                <span className="value">Taxa, Estorno, Ajuste</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores de Problemas */}
      {incorretos > 0 && (
        <div className="problems-section">
          <h4>
            <AlertTriangle size={18} />
            Problemas Identificados
          </h4>
          <div className="problem-alerts">
            <div className="alert warning">
              <AlertTriangle size={16} />
              <span>
                {incorretos} classificação(ões) incorreta(s) encontrada(s). 
                Verifique os itens marcados em vermelho na tabela.
              </span>
            </div>
            {incorretos > totalVendas * 0.1 && (
              <div className="alert danger">
                <AlertTriangle size={16} />
                <span>
                  Alto índice de problemas ({((incorretos / totalVendas) * 100).toFixed(1)}%). 
                  Recomendamos revisão dos critérios de classificação.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumo de Performance */}
      <div className="performance-summary">
        <h4>Resumo de Performance</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Taxa de Conversão em Comissão:</span>
            <span className="summary-value">{percentualComissao.toFixed(2)}%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Comissão Média por Venda:</span>
            <span className="summary-value">
              R$ {totalVendas > 0 ? (totalComissao / totalVendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Valor Médio por Venda:</span>
            <span className="summary-value">
              R$ {totalVendas > 0 ? (valorTotal / totalVendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Precisão da Classificação:</span>
            <span className="summary-value">{percentualCorretos.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComissaoStats;