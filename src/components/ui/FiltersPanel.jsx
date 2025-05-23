import React, { useState } from 'react';
import { Filter, X, Search, Calendar, User, Package, DollarSign, RotateCcw } from 'lucide-react';

const FiltersPanel = ({ 
  isOpen, 
  onClose, 
  onApplyFilters,
  vendas = [],
  metas = [],
  currentFilters = {}
}) => {
  const [filters, setFilters] = useState({
    responsavel: currentFilters.responsavel || '',
    produto: currentFilters.produto || '',
    valorMin: currentFilters.valorMin || '',
    valorMax: currentFilters.valorMax || '',
    dataInicio: currentFilters.dataInicio || '',
    dataFim: currentFilters.dataFim || '',
    status: currentFilters.status || '', // 'ativo', 'meta_atingida', 'abaixo_meta'
    ordenacao: currentFilters.ordenacao || 'data_desc'
  });

  // Extrair dados únicos para os filtros
  const responsaveisUnicos = [...new Set(metas.map(m => m.responsavel))].sort();
  const produtosUnicos = [...new Set(vendas.map(v => v.produto))].filter(Boolean).sort();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      responsavel: '',
      produto: '',
      valorMin: '',
      valorMax: '',
      dataInicio: '',
      dataFim: '',
      status: '',
      ordenacao: 'data_desc'
    });
  };

  const applyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '' && value !== 'data_desc');

  if (!isOpen) return null;

  return (
    <div className="filters-overlay">
      <div className="filters-panel">
        <div className="filters-header">
          <div className="filters-title-container">
            <Filter className="filters-icon" />
            <h3 className="filters-title">Filtros Avançados</h3>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="filters-content">
          {/* Filtro por Responsável */}
          <div className="filter-group">
            <label className="filter-label">
              <User size={16} />
              <span>Responsável</span>
            </label>
            <select 
              className="filter-select"
              value={filters.responsavel}
              onChange={(e) => handleFilterChange('responsavel', e.target.value)}
            >
              <option value="">Todos os responsáveis</option>
              {responsaveisUnicos.map(resp => (
                <option key={resp} value={resp}>{resp}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Produto */}
          <div className="filter-group">
            <label className="filter-label">
              <Package size={16} />
              <span>Produto</span>
            </label>
            <select 
              className="filter-select"
              value={filters.produto}
              onChange={(e) => handleFilterChange('produto', e.target.value)}
            >
              <option value="">Todos os produtos</option>
              {produtosUnicos.map(produto => (
                <option key={produto} value={produto}>{produto}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Valor */}
          <div className="filter-group">
            <label className="filter-label">
              <DollarSign size={16} />
              <span>Faixa de Valor</span>
            </label>
            <div className="range-inputs">
              <input 
                type="number"
                className="filter-input"
                placeholder="Valor mínimo"
                value={filters.valorMin}
                onChange={(e) => handleFilterChange('valorMin', e.target.value)}
              />
              <span className="range-separator">até</span>
              <input 
                type="number"
                className="filter-input"
                placeholder="Valor máximo"
                value={filters.valorMax}
                onChange={(e) => handleFilterChange('valorMax', e.target.value)}
              />
            </div>
          </div>

          {/* Filtro por Período */}
          <div className="filter-group">
            <label className="filter-label">
              <Calendar size={16} />
              <span>Período Personalizado</span>
            </label>
            <div className="date-inputs">
              <input 
                type="date"
                className="filter-input"
                value={filters.dataInicio}
                onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
              />
              <span className="range-separator">até</span>
              <input 
                type="date"
                className="filter-input"
                value={filters.dataFim}
                onChange={(e) => handleFilterChange('dataFim', e.target.value)}
              />
            </div>
          </div>

          {/* Filtro por Status */}
          <div className="filter-group">
            <label className="filter-label">
              <Search size={16} />
              <span>Status do Desempenho</span>
            </label>
            <select 
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="meta_atingida">Meta atingida (≥100%)</option>
              <option value="proximo_meta">Próximo da meta (75-99%)</option>
              <option value="abaixo_meta">Abaixo da meta (&lt;75%)</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="filter-group">
            <label className="filter-label">
              <span>Ordenar por</span>
            </label>
            <select 
              className="filter-select"
              value={filters.ordenacao}
              onChange={(e) => handleFilterChange('ordenacao', e.target.value)}
            >
              <option value="data_desc">Data (mais recente)</option>
              <option value="data_asc">Data (mais antiga)</option>
              <option value="valor_desc">Valor (maior para menor)</option>
              <option value="valor_asc">Valor (menor para maior)</option>
              <option value="responsavel_asc">Responsável (A-Z)</option>
              <option value="produto_asc">Produto (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Indicador de filtros ativos */}
        {hasActiveFilters && (
          <div className="active-filters">
            <div className="active-filters-header">
              <span className="active-filters-label">Filtros ativos:</span>
              <button className="clear-filters-button" onClick={clearFilters}>
                <RotateCcw size={14} />
                <span>Limpar todos</span>
              </button>
            </div>
            <div className="active-filters-list">
              {filters.responsavel && (
                <span className="filter-tag">
                  Responsável: {filters.responsavel}
                  <button onClick={() => handleFilterChange('responsavel', '')}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.produto && (
                <span className="filter-tag">
                  Produto: {filters.produto}
                  <button onClick={() => handleFilterChange('produto', '')}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {(filters.valorMin || filters.valorMax) && (
                <span className="filter-tag">
                  Valor: R$ {filters.valorMin || '0'} - R$ {filters.valorMax || '∞'}
                  <button onClick={() => {
                    handleFilterChange('valorMin', '');
                    handleFilterChange('valorMax', '');
                  }}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {(filters.dataInicio || filters.dataFim) && (
                <span className="filter-tag">
                  Período: {filters.dataInicio || '...'} - {filters.dataFim || '...'}
                  <button onClick={() => {
                    handleFilterChange('dataInicio', '');
                    handleFilterChange('dataFim', '');
                  }}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="filter-tag">
                  Status: {filters.status === 'meta_atingida' ? 'Meta atingida' : 
                           filters.status === 'proximo_meta' ? 'Próximo da meta' : 'Abaixo da meta'}
                  <button onClick={() => handleFilterChange('status', '')}>
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="filters-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="apply-button" onClick={applyFilters}>
            Aplicar Filtros
          </button>
        </div>
      </div>

      <style jsx>{`
        .filters-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .filters-panel {
          background-color: white;
          border-radius: 0.75rem;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }

        .filters-title-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filters-icon {
          color: #4f46e5;
        }

        .filters-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }

        .close-button:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }

        .filters-content {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .filter-select,
        .filter-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          background-color: white;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .range-inputs,
        .date-inputs {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .range-inputs .filter-input,
        .date-inputs .filter-input {
          flex: 1;
        }

        .range-separator {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .active-filters {
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 1rem 1.5rem;
        }

        .active-filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .active-filters-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .clear-filters-button {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }

        .clear-filters-button:hover {
          background-color: #e5e7eb;
          color: #374151;
        }

        .active-filters-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .filter-tag {
          background-color: #e0e7ff;
          color: #3730a3;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .filter-tag button {
          background: none;
          border: none;
          color: #3730a3;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          padding: 0.125rem;
          transition: all 0.2s;
        }

        .filter-tag button:hover {
          background-color: #c7d2fe;
        }

        .filters-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.25rem;
          border-top: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }

        .cancel-button,
        .apply-button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .cancel-button {
          background-color: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .cancel-button:hover {
          background-color: #f9fafb;
        }

        .apply-button {
          background-color: #4f46e5;
          color: white;
        }

        .apply-button:hover {
          background-color: #4338ca;
        }

        @media (max-width: 640px) {
          .filters-panel {
            width: 100%;
            margin: 0.5rem;
          }

          .range-inputs,
          .date-inputs {
            flex-direction: column;
            align-items: stretch;
          }

          .range-separator {
            text-align: center;
          }

          .active-filters-list {
            flex-direction: column;
          }

          .filters-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default FiltersPanel;