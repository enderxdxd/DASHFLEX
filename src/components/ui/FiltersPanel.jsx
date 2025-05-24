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
          background: linear-gradient(135deg, var(--bg-overlay, rgba(0, 0, 0, 0.5)) 0%, var(--bg-overlay-light, rgba(15, 23, 42, 0.7)) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
        }

        @keyframes fadeIn {
          from { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to { 
            opacity: 1;
            backdrop-filter: blur(20px);
          }
        }

        .filters-panel {
          background: linear-gradient(135deg, var(--bg-panel, white) 0%, var(--bg-panel-light, #f8fafc) 100%);
          border-radius: 1rem;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          box-shadow: var(--shadow-panel, 0 25px 50px rgba(0, 0, 0, 0.3));
          border: 1px solid var(--border-panel, #e2e8f0);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .filters-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--primary, #6366f1) 0%, var(--primary-light, #818cf8) 50%, var(--primary, #6366f1) 100%);
          opacity: 0.8;
        }

        @keyframes scaleIn {
          from { 
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          to { 
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-header, #e2e8f0);
          background: linear-gradient(135deg, var(--bg-header, rgba(248, 250, 252, 0.8)) 0%, var(--bg-header-light, rgba(241, 245, 249, 0.6)) 100%);
          backdrop-filter: blur(10px);
        }

        .filters-title-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .filters-icon {
          color: var(--primary, #6366f1);
          background: linear-gradient(135deg, var(--bg-icon, #e0e7ff) 0%, var(--bg-icon-light, #c7d2fe) 100%);
          padding: 0.5rem;
          border-radius: 0.5rem;
          box-shadow: var(--shadow-icon, 0 2px 8px rgba(99, 102, 241, 0.2));
          transition: all 0.2s ease;
        }

        .filters-panel:hover .filters-icon {
          transform: scale(1.1);
          box-shadow: var(--shadow-icon-hover, 0 4px 12px rgba(99, 102, 241, 0.3));
        }

        .filters-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .close-button {
          background: linear-gradient(135deg, var(--bg-close, transparent) 0%, var(--bg-close-light, rgba(0, 0, 0, 0.02)) 100%);
          border: 1px solid var(--border-close, transparent);
          color: var(--text-close, #64748b);
          cursor: pointer;
          padding: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          width: 2.5rem;
          height: 2.5rem;
          position: relative;
          overflow: hidden;
        }

        .close-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: currentColor;
          opacity: 0;
          transition: opacity 0.2s ease;
          border-radius: inherit;
        }

        .close-button:hover::before {
          opacity: 0.1;
        }

        .close-button:hover {
          background: linear-gradient(135deg, var(--bg-close-hover, #fee2e2) 0%, var(--bg-close-hover-light, #fecaca) 100%);
          color: var(--text-close-hover, #ef4444);
          border-color: var(--border-close-hover, #fca5a5);
          transform: scale(1.05);
          box-shadow: var(--shadow-close-hover, 0 4px 12px rgba(239, 68, 68, 0.2));
        }

        .close-button svg {
          width: 1.25rem;
          height: 1.25rem;
          transition: transform 0.2s ease;
          z-index: 1;
          position: relative;
        }

        .close-button:hover svg {
          transform: rotate(90deg);
        }

        .filters-content {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: linear-gradient(135deg, var(--bg-content, white) 0%, var(--bg-content-light, #f8fafc) 100%);
        }

        /* Custom scrollbar for filters content */
        .filters-content::-webkit-scrollbar {
          width: 8px;
        }

        .filters-content::-webkit-scrollbar-track {
          background: var(--scrollbar-track, #f1f5f9);
          border-radius: 4px;
        }

        .filters-content::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, var(--scrollbar-thumb, #cbd5e1) 0%, var(--scrollbar-thumb-light, #94a3b8) 100%);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .filters-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, var(--scrollbar-thumb-hover, #94a3b8) 0%, var(--scrollbar-thumb-hover-light, #64748b) 100%);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, var(--bg-filter-group, rgba(248, 250, 252, 0.5)) 0%, var(--bg-filter-group-light, rgba(241, 245, 249, 0.3)) 100%);
          border-radius: 0.75rem;
          border: 1px solid var(--border-filter-group, #e2e8f0);
          transition: all 0.2s ease;
        }

        .filter-group:hover {
          background: linear-gradient(135deg, var(--bg-filter-group-hover, rgba(248, 250, 252, 0.8)) 0%, var(--bg-filter-group-hover-light, rgba(241, 245, 249, 0.6)) 100%);
          border-color: var(--border-filter-group-hover, #cbd5e1);
          transform: translateY(-1px);
          box-shadow: var(--shadow-filter-group, 0 4px 12px rgba(0, 0, 0, 0.05));
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-label::before {
          content: '';
          width: 3px;
          height: 3px;
          background: var(--primary, #6366f1);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--primary, #6366f1);
        }

        .filter-select,
        .filter-input {
          padding: 0.875rem 1rem;
          border: 1px solid var(--border-input, #e2e8f0);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(135deg, var(--bg-input, white) 0%, var(--bg-input-light, #f8fafc) 100%);
          color: var(--text-input, #1e293b);
          box-shadow: var(--shadow-input, 0 2px 4px rgba(0, 0, 0, 0.05));
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: var(--primary, #6366f1);
          box-shadow: 0 0 0 3px var(--primary-alpha, rgba(99, 102, 241, 0.1)), var(--shadow-input-focus, 0 4px 12px rgba(99, 102, 241, 0.15));
          background: linear-gradient(135deg, var(--bg-input-focus, white) 0%, var(--bg-input-focus-light, #f8fafc) 100%);
          transform: translateY(-1px);
        }

        .filter-select:hover,
        .filter-input:hover {
          border-color: var(--border-input-hover, #cbd5e1);
          transform: translateY(-1px);
          box-shadow: var(--shadow-input-hover, 0 4px 8px rgba(0, 0, 0, 0.08));
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
          color: var(--text-separator, #64748b);
          font-weight: 600;
          background: var(--bg-separator, rgba(100, 116, 139, 0.1));
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
        }

        .active-filters {
          background: linear-gradient(135deg, var(--bg-active-filters, #f8fafc) 0%, var(--bg-active-filters-light, #f1f5f9) 100%);
          border-top: 1px solid var(--border-active-filters, #e2e8f0);
          padding: 1.25rem 1.5rem;
        }

        .active-filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .active-filters-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .clear-filters-button {
          background: linear-gradient(135deg, var(--bg-clear-button, transparent) 0%, var(--bg-clear-button-light, rgba(0, 0, 0, 0.02)) 100%);
          border: 1px solid var(--border-clear-button, transparent);
          color: var(--text-clear-button, #64748b);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.375rem 0.75rem;
          border-radius: 0.5rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .clear-filters-button:hover {
          background: linear-gradient(135deg, var(--bg-clear-button-hover, #fee2e2) 0%, var(--bg-clear-button-hover-light, #fecaca) 100%);
          color: var(--text-clear-button-hover, #ef4444);
          border-color: var(--border-clear-button-hover, #fca5a5);
          transform: scale(1.05);
        }

        .active-filters-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .filter-tag {
          background: linear-gradient(135deg, var(--bg-filter-tag, #e0e7ff) 0%, var(--bg-filter-tag-light, #c7d2fe) 100%);
          color: var(--text-filter-tag, #4f46e5);
          padding: 0.5rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid var(--border-filter-tag, #a5b4fc);
          transition: all 0.2s ease;
          box-shadow: var(--shadow-filter-tag, 0 2px 4px rgba(79, 70, 229, 0.2));
        }

        .filter-tag:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-filter-tag-hover, 0 4px 8px rgba(79, 70, 229, 0.3));
        }

        .filter-tag button {
          background: linear-gradient(135deg, var(--bg-tag-button, rgba(255, 255, 255, 0.8)) 0%, var(--bg-tag-button-light, rgba(255, 255, 255, 0.6)) 100%);
          border: 1px solid var(--border-tag-button, rgba(79, 70, 229, 0.2));
          color: var(--text-tag-button, #4f46e5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          transition: all 0.2s ease;
          font-size: 0.75rem;
        }

        .filter-tag button:hover {
          background: linear-gradient(135deg, var(--bg-tag-button-hover, #fee2e2) 0%, var(--bg-tag-button-hover-light, #fecaca) 100%);
          color: var(--text-tag-button-hover, #ef4444);
          border-color: var(--border-tag-button-hover, #fca5a5);
          transform: scale(1.1);
        }

        .filters-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid var(--border-footer, #e2e8f0);
          background: linear-gradient(135deg, var(--bg-footer, #f8fafc) 0%, var(--bg-footer-light, #f1f5f9) 100%);
        }

        .cancel-button,
        .apply-button {
          padding: 0.875rem 1.75rem;
          border-radius: 0.625rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          position: relative;
          overflow: hidden;
        }

        .cancel-button::before,
        .apply-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: currentColor;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .cancel-button:hover::before,
        .apply-button:hover::before {
          opacity: 0.1;
        }

        .cancel-button {
          background: linear-gradient(135deg, var(--bg-cancel, white) 0%, var(--bg-cancel-light, #f8fafc) 100%);
          color: var(--text-cancel, #1e293b);
          border: 1px solid var(--border-cancel, #e2e8f0);
          box-shadow: var(--shadow-cancel, 0 2px 4px rgba(0, 0, 0, 0.05));
        }

        .cancel-button:hover {
          background: linear-gradient(135deg, var(--bg-cancel-hover, #f1f5f9) 0%, var(--bg-cancel-hover-light, #e2e8f0) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-cancel-hover, 0 4px 8px rgba(0, 0, 0, 0.1));
        }

        .apply-button {
          background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dark, #4f46e5) 100%);
          color: var(--text-apply, white);
          box-shadow: var(--shadow-apply, 0 4px 12px rgba(99, 102, 241, 0.3));
        }

        .apply-button:hover {
          background: linear-gradient(135deg, var(--primary-dark, #4f46e5) 0%, var(--primary-darker, #3730a3) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-apply-hover, 0 6px 16px rgba(99, 102, 241, 0.4));
        }

        .apply-button:active,
        .cancel-button:active {
          transform: translateY(0);
        }

        /* Manual Dark Mode Classes */
        .dark .filters-overlay,
        [data-theme="dark"] .filters-overlay {
          --bg-overlay: rgba(15, 23, 42, 0.8);
          --bg-overlay-light: rgba(0, 0, 0, 0.9);
          --bg-panel: #1e293b;
          --bg-panel-light: #334155;
          --border-panel: #334155;
          --bg-header: rgba(15, 23, 42, 0.8);
          --bg-header-light: rgba(30, 41, 59, 0.6);
          --border-header: #334155;
          --bg-icon: #1e40af40;
          --bg-icon-light: #3b82f640;
          --text-primary: #f1f5f9;
          --bg-close: transparent;
          --bg-close-light: rgba(0, 0, 0, 0.05);
          --bg-close-hover: #99182040;
          --bg-close-hover-light: #dc262640;
          --text-close: #94a3b8;
          --text-close-hover: #f87171;
          --border-close: transparent;
          --border-close-hover: #ef4444;
          --bg-content: #1e293b;
          --bg-content-light: #334155;
          --bg-filter-group: rgba(15, 23, 42, 0.5);
          --bg-filter-group-light: rgba(30, 41, 59, 0.3);
          --bg-filter-group-hover: rgba(15, 23, 42, 0.8);
          --bg-filter-group-hover-light: rgba(30, 41, 59, 0.6);
          --border-filter-group: #475569;
          --border-filter-group-hover: #64748b;
          --bg-input: #334155;
          --bg-input-light: #475569;
          --bg-input-focus: #334155;
          --bg-input-focus-light: #475569;
          --border-input: #475569;
          --border-input-hover: #64748b;
          --text-input: #f1f5f9;
          --text-separator: #cbd5e1;
          --bg-separator: rgba(203, 213, 225, 0.1);
          --bg-active-filters: #334155;
          --bg-active-filters-light: #475569;
          --border-active-filters: #475569;
          --bg-clear-button: transparent;
          --bg-clear-button-light: rgba(0, 0, 0, 0.05);
          --bg-clear-button-hover: #99182040;
          --bg-clear-button-hover-light: #dc262640;
          --text-clear-button: #94a3b8;
          --text-clear-button-hover: #f87171;
          --border-clear-button: transparent;
          --border-clear-button-hover: #ef4444;
          --bg-filter-tag: #1e40af40;
          --bg-filter-tag-light: #3b82f640;
          --text-filter-tag: #a5b4fc;
          --border-filter-tag: #6366f1;
          --bg-tag-button: rgba(165, 180, 252, 0.2);
          --bg-tag-button-light: rgba(165, 180, 252, 0.1);
          --bg-tag-button-hover: #99182040;
          --bg-tag-button-hover-light: #dc262640;
          --text-tag-button: #a5b4fc;
          --text-tag-button-hover: #f87171;
          --border-tag-button: rgba(165, 180, 252, 0.3);
          --border-tag-button-hover: #ef4444;
          --bg-footer: #334155;
          --bg-footer-light: #475569;
          --border-footer: #475569;
          --bg-cancel: #1e293b;
          --bg-cancel-light: #334155;
          --bg-cancel-hover: #475569;
          --bg-cancel-hover-light: #64748b;
          --text-cancel: #f1f5f9;
          --border-cancel: #475569;
          --text-apply: white;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-dark: #4f46e5;
          --primary-darker: #3730a3;
          --primary-alpha: rgba(99, 102, 241, 0.2);
          --scrollbar-track: #334155;
          --scrollbar-thumb: #475569;
          --scrollbar-thumb-light: #64748b;
          --scrollbar-thumb-hover: #64748b;
          --scrollbar-thumb-hover-light: #94a3b8;
          --shadow-panel: 0 25px 50px rgba(0, 0, 0, 0.6);
          --shadow-icon: 0 2px 8px rgba(99, 102, 241, 0.3);
          --shadow-icon-hover: 0 4px 12px rgba(99, 102, 241, 0.4);
          --shadow-close-hover: 0 4px 12px rgba(248, 113, 113, 0.3);
          --shadow-filter-group: 0 4px 12px rgba(0, 0, 0, 0.2);
          --shadow-input: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-input-focus: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-input-hover: 0 4px 8px rgba(0, 0, 0, 0.3);
          --shadow-filter-tag: 0 2px 4px rgba(99, 102, 241, 0.3);
          --shadow-filter-tag-hover: 0 4px 8px rgba(99, 102, 241, 0.4);
          --shadow-cancel: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-cancel-hover: 0 4px 8px rgba(0, 0, 0, 0.3);
          --shadow-apply: 0 4px 12px rgba(99, 102, 241, 0.4);
          --shadow-apply-hover: 0 6px 16px rgba(99, 102, 241, 0.5);
        }

        /* Light Mode Default Values */
        :root {
          --bg-overlay: rgba(0, 0, 0, 0.5);
          --bg-overlay-light: rgba(15, 23, 42, 0.7);
          --bg-panel: white;
          --bg-panel-light: #f8fafc;
          --border-panel: #e2e8f0;
          --bg-header: rgba(248, 250, 252, 0.8);
          --bg-header-light: rgba(241, 245, 249, 0.6);
          --border-header: #e2e8f0;
          --bg-icon: #e0e7ff;
          --bg-icon-light: #c7d2fe;
          --text-primary: #1e293b;
          --bg-close: transparent;
          --bg-close-light: rgba(0, 0, 0, 0.02);
          --bg-close-hover: #fee2e2;
          --bg-close-hover-light: #fecaca;
          --text-close: #64748b;
          --text-close-hover: #ef4444;
          --border-close: transparent;
          --border-close-hover: #fca5a5;
          --bg-content: white;
          --bg-content-light: #f8fafc;
          --bg-filter-group: rgba(248, 250, 252, 0.5);
          --bg-filter-group-light: rgba(241, 245, 249, 0.3);
          --bg-filter-group-hover: rgba(248, 250, 252, 0.8);
          --bg-filter-group-hover-light: rgba(241, 245, 249, 0.6);
          --border-filter-group: #e2e8f0;
          --border-filter-group-hover: #cbd5e1;
          --bg-input: white;
          --bg-input-light: #f8fafc;
          --bg-input-focus: white;
          --bg-input-focus-light: #f8fafc;
          --border-input: #e2e8f0;
          --border-input-hover: #cbd5e1;
          --text-input: #1e293b;
          --text-separator: #64748b;
          --bg-separator: rgba(100, 116, 139, 0.1);
          --bg-active-filters: #f8fafc;
          --bg-active-filters-light: #f1f5f9;
          --border-active-filters: #e2e8f0;
          --bg-clear-button: transparent;
          --bg-clear-button-light: rgba(0, 0, 0, 0.02);
          --bg-clear-button-hover: #fee2e2;
          --bg-clear-button-hover-light: #fecaca;
          --text-clear-button: #64748b;
          --text-clear-button-hover: #ef4444;
          --border-clear-button: transparent;
          --border-clear-button-hover: #fca5a5;
          --bg-filter-tag: #e0e7ff;
          --bg-filter-tag-light: #c7d2fe;
          --text-filter-tag: #4f46e5;
          --border-filter-tag: #a5b4fc;
          --bg-tag-button: rgba(255, 255, 255, 0.8);
          --bg-tag-button-light: rgba(255, 255, 255, 0.6);
          --bg-tag-button-hover: #fee2e2;
          --bg-tag-button-hover-light: #fecaca;
          --text-tag-button: #4f46e5;
          --text-tag-button-hover: #ef4444;
          --border-tag-button: rgba(79, 70, 229, 0.2);
          --border-tag-button-hover: #fca5a5;
          --bg-footer: #f8fafc;
          --bg-footer-light: #f1f5f9;
          --border-footer: #e2e8f0;
          --bg-cancel: white;
          --bg-cancel-light: #f8fafc;
          --bg-cancel-hover: #f1f5f9;
          --bg-cancel-hover-light: #e2e8f0;
          --text-cancel: #1e293b;
          --border-cancel: #e2e8f0;
          --text-apply: white;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-dark: #4f46e5;
          --primary-darker: #3730a3;
          --primary-alpha: rgba(99, 102, 241, 0.1);
          --scrollbar-track: #f1f5f9;
          --scrollbar-thumb: #cbd5e1;
          --scrollbar-thumb-light: #94a3b8;
          --scrollbar-thumb-hover: #94a3b8;
          --scrollbar-thumb-hover-light: #64748b;
          --shadow-panel: 0 25px 50px rgba(0, 0, 0, 0.3);
          --shadow-icon: 0 2px 8px rgba(99, 102, 241, 0.2);
          --shadow-icon-hover: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-close-hover: 0 4px 12px rgba(239, 68, 68, 0.2);
          --shadow-filter-group: 0 4px 12px rgba(0, 0, 0, 0.05);
          --shadow-input: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-input-focus: 0 4px 12px rgba(99, 102, 241, 0.15);
          --shadow-input-hover: 0 4px 8px rgba(0, 0, 0, 0.08);
          --shadow-filter-tag: 0 2px 4px rgba(79, 70, 229, 0.2);
          --shadow-filter-tag-hover: 0 4px 8px rgba(79, 70, 229, 0.3);
          --shadow-cancel: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-cancel-hover: 0 4px 8px rgba(0, 0, 0, 0.1);
          --shadow-apply: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-apply-hover: 0 6px 16px rgba(99, 102, 241, 0.4);
        }

        /* Enhanced interactions */
        .close-button:focus,
        .filter-select:focus,
        .filter-input:focus,
        .clear-filters-button:focus,
        .cancel-button:focus,
        .apply-button:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: 2px;
        }

        /* Loading state for filters */
        .filters-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          gap: 1rem;
          color: var(--text-loading, #64748b);
        }

        .filters-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid var(--spinner-track, #e2e8f0);
          border-top: 3px solid var(--primary, #6366f1);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: var(--shadow-spinner, 0 4px 12px rgba(99, 102, 241, 0.2));
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .filters-loading-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-loading, #64748b);
        }

        /* Filter group icons */
        .filter-group-icon {
          width: 1rem;
          height: 1rem;
          color: var(--primary, #6366f1);
          margin-right: 0.25rem;
        }

        /* Custom styles for specific filter types */
        .filter-checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .filter-checkbox-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.5rem;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }

        .filter-checkbox-item:hover {
          background: var(--bg-checkbox-hover, rgba(99, 102, 241, 0.05));
        }

        .filter-checkbox {
          width: 1rem;
          height: 1rem;
          border: 2px solid var(--border-checkbox, #cbd5e1);
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .filter-checkbox:checked {
          background: var(--primary, #6366f1);
          border-color: var(--primary, #6366f1);
        }

        .filter-checkbox:checked::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .filter-checkbox-label {
          font-size: 0.8125rem;
          color: var(--text-checkbox, #475569);
          cursor: pointer;
          user-select: none;
        }

        /* Filter count badge */
        .filter-count-badge {
          background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dark, #4f46e5) 100%);
          color: white;
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          margin-left: 0.5rem;
          box-shadow: var(--shadow-count-badge, 0 2px 4px rgba(99, 102, 241, 0.3));
          animation: pulse 2s ease-in-out infinite alternate;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.05); opacity: 1; }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .filters-overlay,
          .filters-panel,
          .filters-icon,
          .close-button,
          .filter-group,
          .filter-select,
          .filter-input,
          .clear-filters-button,
          .filter-tag,
          .cancel-button,
          .apply-button,
          .filters-spinner,
          .filter-count-badge {
            transition: none;
            animation: none;
            transform: none;
          }
          
          @keyframes fadeIn,
          @keyframes scaleIn,
          @keyframes spin,
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: none; }
          }
        }

        /* Print styles */
        @media print {
          .filters-overlay {
            display: none;
          }
        }

        /* Responsive improvements */
        @media (max-width: 640px) {
          .filters-panel {
            width: 95%;
            margin: 0.5rem;
            max-height: 95vh;
          }

          .filters-header {
            padding: 1rem;
          }

          .filters-title {
            font-size: 1.125rem;
          }

          .filters-content {
            padding: 1.5rem;
            gap: 1.25rem;
          }

          .filter-group {
            padding: 0.75rem;
          }

          .range-inputs,
          .date-inputs {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
          }

          .range-separator {
            text-align: center;
            padding: 0.5rem;
          }

          .active-filters-list {
            flex-direction: column;
            gap: 0.5rem;
          }

          .filter-tag {
            justify-content: space-between;
            width: 100%;
          }

          .filters-footer {
            flex-direction: column;
            gap: 0.5rem;
          }

          .cancel-button,
          .apply-button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .filters-panel {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
            margin: 0;
          }

          .filters-header {
            padding: 0.75rem 1rem;
          }

          .filters-title {
            font-size: 1rem;
          }

          .close-button {
            width: 2rem;
            height: 2rem;
            padding: 0.5rem;
          }

          .close-button svg {
            width: 1rem;
            height: 1rem;
          }

          .filters-content {
            padding: 1rem;
            gap: 1rem;
          }

          .filter-group {
            padding: 0.625rem;
          }

          .filter-label {
            font-size: 0.8125rem;
          }

          .filter-select,
          .filter-input {
            padding: 0.75rem;
            font-size: 0.8125rem;
          }

          .active-filters {
            padding: 1rem;
          }

          .filters-footer {
            padding: 1rem;
          }

          .cancel-button,
          .apply-button {
            padding: 0.75rem 1.5rem;
            font-size: 0.8125rem;
          }
        }

        /* Animation for panel exit */
        .filters-overlay.exiting {
          animation: fadeOut 0.2s ease-in forwards;
        }

        .filters-overlay.exiting .filters-panel {
          animation: scaleOut 0.2s ease-in forwards;
        }

        @keyframes fadeOut {
          from { 
            opacity: 1;
            backdrop-filter: blur(20px);
          }
          to { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
        }

        @keyframes scaleOut {
          from { 
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          to { 
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
        }

        /* Dark mode specific overrides for form elements */
        .dark .filter-select,
        [data-theme="dark"] .filter-select {
          --text-loading: #94a3b8;
          --spinner-track: #334155;
          --bg-checkbox-hover: rgba(99, 102, 241, 0.1);
          --border-checkbox: #64748b;
          --text-checkbox: #cbd5e1;
          --shadow-count-badge: 0 2px 4px rgba(99, 102, 241, 0.4);
          --shadow-spinner: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        :root {
          --text-loading: #64748b;
          --spinner-track: #e2e8f0;
          --bg-checkbox-hover: rgba(99, 102, 241, 0.05);
          --border-checkbox: #cbd5e1;
          --text-checkbox: #475569;
          --shadow-count-badge: 0 2px 4px rgba(99, 102, 241, 0.3);
          --shadow-spinner: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        /* Additional styling for better UX */
        .card-title, 
        .section-header h2 {
          color: var(--text-primary, #1e293b);
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Keyboard navigation improvements */
        .filters-overlay {
          outline: none;
        }

        .filters-panel {
          outline: none;
        }

        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .filter-select,
          .filter-input {
            padding: 1rem;
            font-size: 1rem;
          }

          .cancel-button,
          .apply-button {
            padding: 1rem 2rem;
            font-size: 1rem;
          }

          .close-button {
            width: 3rem;
            height: 3rem;
          }

          .filter-tag button {
            width: 1.5rem;
            height: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FiltersPanel;