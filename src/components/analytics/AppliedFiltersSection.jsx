import React from 'react';
import { X, User, Package, DollarSign, Calendar } from 'lucide-react';

const filterLabels = {
  responsavel: 'Responsável',
  produto: 'Produto',
  valorMin: 'Valor Mínimo',
  valorMax: 'Valor Máximo',
  dataInicio: 'Data Início',
  dataFim: 'Data Fim',
  status: 'Status'
};

export default function AppliedFiltersSection({ activeFilters, onClearAll, onRemoveFilter }) {
  return (
    <div className="applied-filters-section">
      <div className="section-header">
        <h3>🔍 Filtros Aplicados</h3>
        <button className="clear-all-filters" onClick={onClearAll}>
          <X size={14} />
          <span>Limpar todos</span>
        </button>
      </div>
      <div className="filter-tags">
        {Object.entries(activeFilters).map(([key, value]) => {
          if (!value || (key === 'ordenacao' && value === 'data_desc')) return null;
          return (
            <span key={key} className="filter-tag enhanced">
              <div className="tag-icon">
                {key === 'responsavel' && <User size={12} />} 
                {key === 'produto' && <Package size={12} />} 
                {(key === 'valorMin' || key === 'valorMax') && <DollarSign size={12} />} 
                {(key === 'dataInicio' || key === 'dataFim') && <Calendar size={12} />}
              </div>
              <span className="tag-content">
                {filterLabels[key] || key}: {value}
              </span>
              <button className="remove-filter" onClick={() => onRemoveFilter(key)}>
                <X size={10} />
              </button>
            </span>
          );
        })}
      </div>
      <style jsx>{`
        .applied-filters-section {
          margin-bottom: 1.5rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .clear-all-filters {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }
        .clear-all-filters:hover {
          background-color: #e5e7eb;
        }
        .filter-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .filter-tag.enhanced {
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
        .tag-icon {
          display: flex;
          align-items: center;
        }
        .remove-filter {
          background: none;
          border: none;
          color: #3730a3;
          cursor: pointer;
          display: flex;
          align-items: center;
          border-radius: 50%;
          padding: 0.125rem;
          transition: all 0.2s;
        }
        .remove-filter:hover {
          background-color: #c7d2fe;
        }
      `}</style>
    </div>
  );
} 