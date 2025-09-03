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
import { formatCurrency, formatCompactNumber, formatPercentage, shouldUseCompactFormat } from '../../utils/formatters';
import '../../styles/ModernStatsCards.css';

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
    valorTotalPlanos,
    valorTotalProdutos,
    valorTotalNaoComissionaveis,
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
    <div className="stats-container">
      {/* Header limpo */}
      <div className="stats-header-clean">
        <div className="header-left">
          <BarChart3 size={24} />
          <h2>Estatísticas - {consultor}</h2>
        </div>
        <div className="header-badges">
          {bateuMetaIndividual && (
            <div className="success-badge">
              <Award size={16} />
              <span>Meta Atingida</span>
            </div>
          )}
          {unidadeBatida && (
            <div className="info-badge">
              <TrendingUp size={16} />
              <span>Unidade Batida</span>
            </div>
          )}
        </div>
      </div>

      {/* Cards principais organizados */}
      <div className="metrics-grid">
        {/* Performance da Meta */}
        <div className="metric-card meta-card">
          <div className="card-header-simple">
            <div className="card-icon primary-icon">
              <Target size={20} />
            </div>
            <div className="card-title">
              <h3>Performance da Meta</h3>
              <span className={`status-mini ${bateuMetaIndividual ? 'success' : 'warning'}`}>
                {bateuMetaIndividual ? 'Atingida' : 'Em progresso'}
              </span>
            </div>
          </div>
          
          <div className="main-number">
            {percentualMeta.toFixed(1)}%
          </div>
          
          <div className="comparison-simple">
            <div className="comp-item">
              <span className="comp-label">Realizado</span>
              <span className="comp-value success-text">
                {formatCurrency(valorTotal, shouldUseCompactFormat(valorTotal))}
              </span>
            </div>
            <div className="comp-separator">vs</div>
            <div className="comp-item">
              <span className="comp-label">Meta</span>
              <span className="comp-value primary-text">
                {formatCurrency(metaIndividual, shouldUseCompactFormat(metaIndividual))}
              </span>
            </div>
          </div>
          
          <div className="progress-simple">
            <div className="progress-track">
              <div 
                className={`progress-bar ${bateuMetaIndividual ? 'success-bar' : 'primary-bar'}`}
                style={{ width: `${Math.min(percentualMeta, 100)}%` }}
              />
            </div>
            <div className="progress-text">{Math.min(percentualMeta, 100).toFixed(1)}% concluído</div>
          </div>
        </div>

        {/* Total de Vendas */}
        <div className="metric-card vendas-card">
          <div className="card-header-simple">
            <div className="card-icon success-icon">
              <DollarSign size={20} />
            </div>
            <div className="card-title">
              <h3>Total de Vendas</h3>
              <span className="trend-mini positive">
                <TrendingUp size={14} />
                Vendas
              </span>
            </div>
          </div>
          
          <div className="main-number">
            {formatCurrency(valorTotal, shouldUseCompactFormat(valorTotal))}
          </div>
          
          <div className="sub-metrics-simple">
            <div className="sub-item">
              <span className="sub-number">{totalVendas}</span>
              <span className="sub-text">vendas</span>
            </div>
            <div className="sub-item">
              <span className="sub-number">
                {formatCurrency(totalVendas > 0 ? valorTotal / totalVendas : 0)}
              </span>
              <span className="sub-text">ticket médio</span>
            </div>
          </div>
        </div>

        {/* Comissão Total */}
        <div className="metric-card comissao-card">
          <div className="card-header-simple">
            <div className="card-icon warning-icon">
              <Calculator size={20} />
            </div>
            <div className="card-title">
              <h3>Comissão Total</h3>
              <span className="percentage-mini">
                {percentualComissao.toFixed(2)}%
              </span>
            </div>
          </div>
          
          <div className="main-number">
            {formatCurrency(totalComissao, shouldUseCompactFormat(totalComissao))}
          </div>
          
          <div className="commission-info">
            <div className="commission-rate-simple">
              <span className="rate-label">Média por venda:</span>
              <span className="rate-value">
                {formatCurrency(totalVendas > 0 ? totalComissao / totalVendas : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown por categoria */}
      <div className="breakdown-section-clean">
        <h3 className="section-title-clean">
          <PieChart size={18} />
          Breakdown por Categoria
        </h3>
        
        <div className="category-cards">
          {/* Planos */}
          <div className="category-item">
            <div className="category-header-clean">
              <Package size={16} />
              <span className="category-name">Planos</span>
              <span className="category-count">{planos}</span>
            </div>
            <div className="category-value">
              {formatCurrency(valorTotalPlanos || 0, shouldUseCompactFormat(valorTotalPlanos || 0))}
            </div>
            <div className="category-details">
              <span className="detail-item">
                Comissão: <strong>{formatCurrency(comissaoPlanos)}</strong>
              </span>
              <span className="detail-item">
                {totalVendas > 0 ? ((planos / totalVendas) * 100).toFixed(1) : 0}% do total
              </span>
            </div>
          </div>

          {/* Produtos */}
          <div className="category-item">
            <div className="category-header-clean">
              <PieChart size={16} />
              <span className="category-name">Produtos</span>
              <span className="category-count">{produtos}</span>
            </div>
            <div className="category-value">
              {formatCurrency(valorTotalProdutos || 0, shouldUseCompactFormat(valorTotalProdutos || 0))}
            </div>
            <div className="category-details">
              <span className="detail-item">
                Comissão: <strong>{formatCurrency(comissaoProdutos)}</strong>
              </span>
              <span className="detail-item">
                {totalVendas > 0 ? ((produtos / totalVendas) * 100).toFixed(1) : 0}% do total
              </span>
            </div>
          </div>

          {/* Não Comissionáveis */}
          <div className="category-item">
            <div className="category-header-clean">
              <AlertTriangle size={16} />
              <span className="category-name">Não Comissionáveis</span>
              <span className="category-count">{naoComissionaveis}</span>
            </div>
            <div className="category-value">
              {formatCurrency(valorTotalNaoComissionaveis || 0, shouldUseCompactFormat(valorTotalNaoComissionaveis || 0))}
            </div>
            <div className="category-details">
              <span className="detail-item">
                Comissão: <strong>R$ 0,00</strong>
              </span>
              <span className="detail-item">
                {totalVendas > 0 ? ((naoComissionaveis / totalVendas) * 100).toFixed(1) : 0}% do total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Problemas (se existirem) */}
      {incorretos > 0 && (
        <div className="alert-simple warning">
          <AlertTriangle size={18} />
          <div className="alert-content">
            <strong>{incorretos} classificação(ões) incorreta(s)</strong> encontrada(s).
            Verifique os itens destacados na tabela.
          </div>
        </div>
      )}

      {/* Resumo final */}
      <div className="summary-clean">
        <h4>Resumo de Performance</h4>
        <div className="summary-items">
          <div className="summary-stat">
            <span className="stat-label">Taxa de Conversão</span>
            <span className="stat-value">{percentualComissao.toFixed(2)}%</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Comissão Média</span>
            <span className="stat-value">
              {formatCurrency(totalVendas > 0 ? totalComissao / totalVendas : 0)}
            </span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Valor Médio</span>
            <span className="stat-value">
              {formatCurrency(totalVendas > 0 ? valorTotal / totalVendas : 0)}
            </span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Precisão</span>
            <span className="stat-value">{percentualCorretos.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComissaoStats;