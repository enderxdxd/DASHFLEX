// src/components/comissao/ComissaoTable.jsx
import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import useDarkMode from '../../hooks/useDarkMode';

const ComissaoTable = ({ 
  resultados = [], 
  consultor = '',
  showDetails = true,
  onToggleDetails
}) => {
  const [theme] = useDarkMode();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Função para ordenar resultados
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Aplicar ordenação
  const sortedResultados = React.useMemo(() => {
    if (!sortConfig.key) return resultados;
    
    return [...resultados].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Tratamento especial para valores numéricos
      if (sortConfig.key === 'valor' || sortConfig.key === 'comissao') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      
      // Tratamento para strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [resultados, sortConfig]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="sort-icon inactive" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp size={14} className="sort-icon active" /> : 
      <ChevronDown size={14} className="sort-icon active" />;
  };

  if (resultados.length === 0) {
    return (
      <div className={`comissao-table-container ${theme === 'light' ? 'light-mode' : 'dark-mode'}`}>
        <div className="table-header">
          <h3>Resultados da Análise</h3>
          <div className="table-actions">
            <button
              className="table-action-btn"
              onClick={onToggleDetails}
            >
              {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
              {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
            </button>
          </div>
        </div>
        
        <div className="empty-results">
          <AlertCircle size={48} />
          <h4>Nenhum resultado encontrado</h4>
          <p>Selecione um consultor para ver a análise detalhada das comissões.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`comissao-table-container ${theme === 'light' ? 'light-mode' : 'dark-mode'}`}>
      <div className="table-header">
        <h3>
          Análise Detalhada - {consultor}
          <span className="results-count">({resultados.length} resultados)</span>
        </h3>
        <div className="table-actions">
          <button
            className="table-action-btn"
            onClick={onToggleDetails}
          >
            {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
            {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="comissao-table">
          <thead>
            <tr>
              <th 
                className="sortable"
                onClick={() => handleSort('matricula')}
              >
                Matrícula
                {getSortIcon('matricula')}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('nome')}
              >
                Nome
                {getSortIcon('nome')}
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('produto')}
              >
                Produto
                {getSortIcon('produto')}
              </th>
              {showDetails && (
                <th 
                  className="sortable"
                  onClick={() => handleSort('plano')}
                >
                  Plano
                  {getSortIcon('plano')}
                </th>
              )}
              <th 
                className="sortable numeric"
                onClick={() => handleSort('valor')}
              >
                Valor
                {getSortIcon('valor')}
              </th>
              <th>Classificação</th>
              <th>Status</th>
              <th 
                className="sortable numeric"
                onClick={() => handleSort('comissao')}
              >
                Comissão
                {getSortIcon('comissao')}
              </th>
              {showDetails && (
                <>
                  <th>Desconto</th>
                  <th>Observações</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedResultados.map((resultado, index) => (
              <tr 
                key={index} 
                className={`result-row ${resultado.statusCorreto ? 'correct' : 'incorrect'}`}
              >
                <td className="matricula-cell">
                  {resultado.matricula}
                </td>
                <td className="nome-cell" title={resultado.nome}>
                  {resultado.nome}
                </td>
                <td className="produto-cell" title={resultado.produto}>
                  {resultado.produto}
                </td>
                {showDetails && (
                  <td className="plano-cell" title={resultado.plano || ''}>
                    {resultado.plano || '-'}
                  </td>
                )}
                <td className="valor-cell">
                  R$ {Number(resultado.valor).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2 
                  })}
                </td>
                <td className="classificacao-cell">
                  <div className="classificacao-wrapper">
                    <span className={`classificacao-badge ${resultado.classificacaoAtual.toLowerCase().replace(/\s/g, '_')}`}>
                      {resultado.classificacaoAtual}
                    </span>
                    {resultado.classificacaoAtual !== resultado.classificacaoEsperada && (
                      <div className="classificacao-esperada">
                        Esperado: {resultado.classificacaoEsperada}
                      </div>
                    )}
                  </div>
                </td>
                <td className="status-cell">
                  <div className="status-wrapper">
                    {resultado.statusCorreto ? (
                      <CheckCircle className="status-icon correct" size={18} />
                    ) : (
                      <AlertCircle className="status-icon incorrect" size={18} />
                    )}
                    <span className={`status-text ${resultado.statusCorreto ? 'correct' : 'incorrect'}`}>
                      {resultado.statusCorreto ? 'Correto' : 'Incorreto'}
                    </span>
                  </div>
                </td>
                <td className="comissao-cell">
                  <span className="comissao-value">
                    R$ {resultado.comissao.toLocaleString('pt-BR', { 
                      minimumFractionDigits: 2 
                    })}
                  </span>
                  {showDetails && resultado.comissao > 0 && (
                    <div className="comissao-percentage">
                      {((resultado.comissao / Number(resultado.valor)) * 100).toFixed(2)}%
                    </div>
                  )}
                </td>
                {showDetails && (
                  <>
                    <td className="desconto-cell">
                      {resultado.temDesconto ? (
                        <span className="tem-desconto">
                          {resultado.ehPlano ? 'Plano' : 'Matrícula'}
                        </span>
                      ) : (
                        <span className="sem-desconto">-</span>
                      )}
                    </td>
                    <td className="observacoes-cell">
                      {resultado.vendaCorrigida?.motivoCorrecao && (
                        <span className="correcao-aplicada" title={resultado.vendaCorrigida.motivoCorrecao}>
                          Correção aplicada
                        </span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo da tabela */}
      <div className="table-summary">
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-label">Total de Itens:</span>
            <span className="stat-value">{resultados.length}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Corretos:</span>
            <span className="stat-value correct">
              {resultados.filter(r => r.statusCorreto).length}
            </span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Incorretos:</span>
            <span className="stat-value incorrect">
              {resultados.filter(r => !r.statusCorreto).length}
            </span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Comissão Total:</span>
            <span className="stat-value">
              R$ {resultados.reduce((sum, r) => sum + r.comissao, 0).toLocaleString('pt-BR', { 
                minimumFractionDigits: 2 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComissaoTable;