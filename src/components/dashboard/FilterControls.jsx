// src/components/dashboard/FilterControls.jsx
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const FilterControls = ({ 
  filters, 
  dispatchFilters, 
  responsaveis, 
  produtos, 
  totalVendas, 
  totalFaturado, 
  mediaVenda 
}) => {
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [localDateRange, setLocalDateRange] = useState({
    startDate: filters.startDate,
    endDate: filters.endDate
  });
  
  // Atualiza o estado local quando os filtros mudam
  useEffect(() => {
    setLocalDateRange({
      startDate: filters.startDate,
      endDate: filters.endDate
    });
  }, [filters.startDate, filters.endDate]);
  
  // Formatação para valores monetários
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Limpar todos os filtros
  const clearAllFilters = () => {
    dispatchFilters({ type: 'RESET_FILTERS' });
  };
  
  // Aplicar intervalo de datas selecionado
  const applyDateRange = () => {
    dispatchFilters({
      type: 'SET_DATE_RANGE',
      payload: localDateRange
    });
    setIsDateRangeOpen(false);
  };
  
  // Limpar intervalo de datas
  const clearDateRange = () => {
    setLocalDateRange({
      startDate: null,
      endDate: null
    });
    dispatchFilters({
      type: 'SET_DATE_RANGE',
      payload: { startDate: null, endDate: null }
    });
  };
  
  return (
    <div className="filters-panel">
      <div className="filters-header">
        <div>
          <h2>Filtros e Controles</h2>
          <p>Personalize a visualização dos dados conforme suas necessidades</p>
        </div>
        <button className="clear-all-btn" onClick={clearAllFilters} type="button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          Limpar Filtros
        </button>
      </div>
      
      <div className="filters-grid">
        <div className="filter-column">
          <div className="filter-group">
            <label htmlFor="responsavel">Responsável</label>
            <div className="select-wrapper">
              <select 
                id="responsavel"
                value={filters.filtroResponsavel}
                onChange={(e) => dispatchFilters({
                  type: 'SET_FILTER_RESPONSAVEL',
                  payload: e.target.value
                })}
              >
                <option value="">Todos</option>
                {responsaveis.map(resp => (
                  <option key={resp} value={resp}>{resp}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="filter-group">
            <label htmlFor="produto">Produto</label>
            <div className="select-wrapper">
              <select 
                id="produto"
                value={filters.filtroProduto}
                onChange={(e) => dispatchFilters({
                  type: 'SET_FILTER_PRODUTO',
                  payload: e.target.value
                })}
              >
                <option value="">Todos</option>
                {produtos.map(prod => (
                  <option key={prod} value={prod}>{prod}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="filter-column">
          <div className="filter-group">
            <label htmlFor="searchInput">Pesquisar</label>
            <div className="search-input-wrapper">
              <input
                type="text"
                id="searchInput"
                placeholder="Digite para pesquisar..."
                value={filters.searchTerm}
                onChange={(e) => dispatchFilters({
                  type: 'SET_SEARCH_TERM',
                  payload: e.target.value
                })}
              />
              <button className="search-btn" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="filter-group">
            <label>Intervalo de Datas</label>
            <div className="date-range-wrapper">
              <button 
                className="date-range-display"
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                type="button"
              >
                <span>
                  {filters.startDate 
                    ? dayjs(filters.startDate).format('DD/MM/YYYY') 
                    : 'Data inicial'}
                </span>
                <span className="date-range-separator">a</span>
                <span>
                  {filters.endDate 
                    ? dayjs(filters.endDate).format('DD/MM/YYYY') 
                    : 'Data final'}
                </span>
                <svg className="calendar-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
              
             
                {isDateRangeOpen && (
                  <div className="date-picker-popup">
                    <div className="date-picker-header">
                      <h4>Selecione um intervalo de datas</h4>
                      <button 
                        className="close-calendar-btn"
                        onClick={() => setIsDateRangeOpen(false)}
                        type="button"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    
                    <DatePicker
                      selected={localDateRange.startDate}
                      onChange={(dates) => {
                        const [start, end] = dates;
                        setLocalDateRange({
                          startDate: start,
                          endDate: end
                        });
                      }}
                      startDate={localDateRange.startDate}
                      endDate={localDateRange.endDate}
                      selectsRange
                      inline
                      monthsShown={2}
                      locale="pt-BR"
                      dateFormat="dd/MM/yyyy"
                      calendarClassName="custom-datepicker"
                    />
                    <div className="date-picker-actions">
                      <button 
                        className="clear-dates-btn"
                        onClick={clearDateRange}
                        type="button"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Limpar
                      </button>
                      <button
                        className="apply-dates-btn"
                        onClick={applyDateRange}
                        type="button"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
        
        <div className="stats-column">
          <div className="stats-header">
            <h3>Estatísticas Filtradas</h3>
            <div className="period-indicator">
              {filters.startDate && filters.endDate ? (
                <span>
                  {dayjs(filters.startDate).format('DD/MM/YYYY')} - {dayjs(filters.endDate).format('DD/MM/YYYY')}
                </span>
              ) : (
                <span>Período completo</span>
              )}
            </div>
          </div>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon sales-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{totalVendas}</div>
                <div className="stat-label">Vendas</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon total-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatMoney(totalFaturado)}</div>
                <div className="stat-label">Total Faturado</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon average-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{formatMoney(mediaVenda)}</div>
                <div className="stat-label">Média por Venda</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .filters-panel {
          background: linear-gradient(135deg, var(--bg-primary, white) 0%, var(--bg-secondary, #f8fafc) 100%);
          border-radius: 16px;
          box-shadow: var(--shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.05));
          border: 1px solid var(--border-color, #e2e8f0);
          padding: 24px;
          margin-bottom: 32px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .filters-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--primary, #4f46e5) 0%, var(--primary-light, #818cf8) 50%, var(--primary, #4f46e5) 100%);
          opacity: 0.6;
        }
        
        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          position: relative;
        }
        
        .filters-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0 0 6px 0;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #4f46e5) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .filters-header p {
          font-size: 14px;
          color: var(--text-secondary, #64748b);
          margin: 0;
        }
        
        .clear-all-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, var(--danger-light, #fef2f2) 0%, var(--danger-lighter, #fee2e2) 100%);
          color: var(--danger, #ef4444);
          border: 1px solid var(--danger-border, #fecaca);
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm, 0 2px 4px rgba(239, 68, 68, 0.1));
        }
        
        .clear-all-btn:hover {
          background: linear-gradient(135deg, var(--danger-hover, #fee2e2) 0%, var(--danger-hover-light, #fecaca) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md, 0 4px 12px rgba(239, 68, 68, 0.2));
        }
        
        .clear-all-btn:active {
          transform: translateY(0);
        }
        
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        
        .filter-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
        }
        
        .filter-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-label, #475569);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .filter-group label::before {
          content: '';
          width: 3px;
          height: 16px;
          background: linear-gradient(180deg, var(--primary, #4f46e5) 0%, var(--primary-light, #818cf8) 100%);
          border-radius: 2px;
          opacity: 0.6;
        }
        
        .select-wrapper {
          position: relative;
        }
        
        .select-wrapper::after {
          content: "";
          position: absolute;
          top: 50%;
          right: 16px;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid var(--text-muted, #64748b);
          pointer-events: none;
          transition: all 0.2s ease;
        }
        
        .select-wrapper:hover::after {
          border-top-color: var(--primary, #4f46e5);
        }
        
        select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--border-input, #e2e8f0);
          border-radius: 8px;
          background: linear-gradient(135deg, var(--bg-input, white) 0%, var(--bg-input-light, #f8fafc) 100%);
          font-size: 14px;
          color: var(--text-primary, #1e293b);
          appearance: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-input, 0 1px 3px rgba(0, 0, 0, 0.05));
        }
        
        select:hover {
          border-color: var(--border-hover, #cbd5e1);
          transform: translateY(-1px);
          box-shadow: var(--shadow-input-hover, 0 4px 12px rgba(0, 0, 0, 0.1));
        }
        
        select:focus {
          outline: none;
          border-color: var(--primary, #818cf8);
          box-shadow: 0 0 0 3px var(--primary-alpha, rgba(99, 102, 241, 0.1)), var(--shadow-input-focus, 0 4px 12px rgba(99, 102, 241, 0.15));
          transform: translateY(-1px);
        }
        
        input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--border-input, #e2e8f0);
          border-radius: 8px;
          background: linear-gradient(135deg, var(--bg-input, white) 0%, var(--bg-input-light, #f8fafc) 100%);
          font-size: 14px;
          color: var(--text-primary, #1e293b);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-input, 0 1px 3px rgba(0, 0, 0, 0.05));
        }
        
        input:hover {
          border-color: var(--border-hover, #cbd5e1);
          transform: translateY(-1px);
          box-shadow: var(--shadow-input-hover, 0 4px 12px rgba(0, 0, 0, 0.1));
        }
        
        input:focus {
          outline: none;
          border-color: var(--primary, #818cf8);
          box-shadow: 0 0 0 3px var(--primary-alpha, rgba(99, 102, 241, 0.1)), var(--shadow-input-focus, 0 4px 12px rgba(99, 102, 241, 0.15));
          transform: translateY(-1px);
        }
        
        input::placeholder {
          color: var(--text-placeholder, #94a3b8);
        }
        
        .search-input-wrapper {
          position: relative;
        }
        
        .search-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted, #64748b);
          transition: all 0.2s ease;
          border-radius: 6px;
        }
        
        .search-btn:hover {
          color: var(--primary, #4f46e5);
          background: linear-gradient(135deg, var(--primary-light, #f8fafc) 0%, var(--primary-lighter, #eef2ff) 100%);
          transform: translateY(-50%) scale(1.1);
        }
        
        .date-range-wrapper {
          position: relative;
        }
        
        .date-range-display {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--border-input, #e2e8f0);
          border-radius: 8px;
          background: linear-gradient(135deg, var(--bg-input, white) 0%, var(--bg-input-light, #f8fafc) 100%);
          font-size: 14px;
          color: var(--text-primary, #1e293b);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          box-shadow: var(--shadow-input, 0 1px 3px rgba(0, 0, 0, 0.05));
        }
        
        .date-range-display:hover {
          border-color: var(--border-hover, #cbd5e1);
          transform: translateY(-1px);
          box-shadow: var(--shadow-input-hover, 0 4px 12px rgba(0, 0, 0, 0.1));
        }
        
        .date-range-separator {
          margin: 0 8px;
          color: var(--text-muted, #64748b);
          font-weight: 500;
        }
        
        .calendar-icon {
          margin-left: auto;
          color: var(--text-muted, #64748b);
          transition: all 0.2s ease;
        }
        
        .date-range-display:hover .calendar-icon {
          color: var(--primary, #4f46e5);
        }
        
        .date-picker-popup {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 100;
          width: 100%;
          min-width: 660px;
          background: linear-gradient(135deg, var(--bg-popup, white) 0%, var(--bg-popup-light, #f8fafc) 100%);
          border-radius: 12px;
          box-shadow: var(--shadow-popup, 0 20px 40px rgba(0, 0, 0, 0.15));
          border: 1px solid var(--border-popup, #e2e8f0);
          padding: 20px;
          backdrop-filter: blur(20px);
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .custom-datepicker {
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
        }
        
        /* Override react-datepicker styles */
        :global(.react-datepicker) {
          font-family: inherit !important;
          border: none !important;
          width: 100% !important;
          background-color: transparent !important;
        }
        
        :global(.react-datepicker__month-container) {
          width: 48% !important;
        }
        
        :global(.react-datepicker__day--selected),
        :global(.react-datepicker__day--in-selecting-range),
        :global(.react-datepicker__day--in-range) {
          background: linear-gradient(135deg, var(--primary, #4f46e5) 0%, var(--primary-dark, #4338ca) 100%) !important;
          border-radius: 0.5rem !important;
          color: white !important;
          font-weight: 600 !important;
        }
        
        :global(.react-datepicker__day--keyboard-selected) {
          background: linear-gradient(135deg, var(--primary-light, #818cf8) 0%, var(--primary, #4f46e5) 100%) !important;
          color: white !important;
        }
        
        :global(.react-datepicker__day:hover) {
          background: linear-gradient(135deg, var(--primary-lighter, #eef2ff) 0%, var(--primary-light-hover, #e0e7ff) 100%) !important;
          border-radius: 0.4rem !important;
          color: var(--primary, #4f46e5) !important;
        }
        
        :global(.react-datepicker__day--in-selecting-range:not(.react-datepicker__day--in-range)) {
          background: linear-gradient(135deg, var(--primary-alpha, rgba(79, 70, 229, 0.3)) 0%, var(--primary-alpha-light, rgba(129, 140, 248, 0.3)) 100%) !important;
          border-radius: 0.4rem !important;
        }
        
        :global(.react-datepicker__header) {
          background: linear-gradient(135deg, var(--bg-header, #f8fafc) 0%, var(--bg-header-light, #f1f5f9) 100%) !important;
          border-bottom: 1px solid var(--border-header, #e2e8f0) !important;
          border-radius: 8px 8px 0 0 !important;
        }
        
        :global(.react-datepicker__current-month) {
          color: var(--text-primary, #1e293b) !important;
          font-weight: 700 !important;
        }
        
        :global(.react-datepicker__day-name) {
          color: var(--text-secondary, #64748b) !important;
          font-weight: 600 !important;
        }
        
        :global(.react-datepicker__day) {
          color: var(--text-primary, #1e293b) !important;
          border-radius: 0.3rem !important;
          transition: all 0.2s ease !important;
        }
        
        :global(.react-datepicker__day--disabled) {
          color: var(--text-disabled, #cbd5e1) !important;
        }
        
        :global(.react-datepicker__navigation) {
          top: 15px !important;
        }
        
        :global(.react-datepicker__navigation--previous) {
          border-right-color: var(--primary, #4f46e5) !important;
        }
        
        :global(.react-datepicker__navigation--next) {
          border-left-color: var(--primary, #4f46e5) !important;
        }
        
        .date-picker-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
          border-top: 1px solid var(--border-divider, #f1f5f9);
          padding-top: 20px;
        }
        
        .date-picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-divider, #f1f5f9);
        }

        .date-picker-header h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #4f46e5) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .close-calendar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: none;
          border: none;
          color: var(--text-muted, #64748b);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-calendar-btn:hover {
          background: linear-gradient(135deg, var(--danger-light, #f1f5f9) 0%, var(--danger-lighter, #fee2e2) 100%);
          color: var(--danger, #ef4444);
          transform: scale(1.1);
        }
        
        .clear-dates-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid var(--danger-border, #fee2e2);
          color: var(--danger, #ef4444);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          padding: 10px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        
        .clear-dates-btn:hover {
          background: linear-gradient(135deg, var(--danger-light, #fee2e2) 0%, var(--danger-lighter, #fecaca) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-btn, 0 4px 12px rgba(239, 68, 68, 0.2));
        }
        
        .apply-dates-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, var(--primary, #4f46e5) 0%, var(--primary-dark, #4338ca) 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-btn-primary, 0 4px 12px rgba(79, 70, 229, 0.3));
        }
        
        .apply-dates-btn:hover {
          background: linear-gradient(135deg, var(--primary-dark, #4338ca) 0%, var(--primary-darker, #3730a3) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-btn-primary-hover, 0 6px 16px rgba(79, 70, 229, 0.4));
        }
        
        .apply-dates-btn:active {
          transform: translateY(0);
        }
        
        .stats-column {
          background: linear-gradient(135deg, var(--bg-stats, #f8fafc) 0%, var(--bg-stats-light, #f1f5f9) 100%);
          border: 1px solid var(--border-stats, #e2e8f0);
          border-radius: 12px;
          padding: 24px;
          height: 100%;
        }
        
        .stats-header {
          margin-bottom: 20px;
        }
        
        .stats-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #4f46e5) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .period-indicator {
          font-size: 13px;
          color: var(--text-secondary, #64748b);
          background: linear-gradient(135deg, var(--bg-indicator, white) 0%, var(--bg-indicator-light, #f8fafc) 100%);
          border-radius: 8px;
          padding: 8px 12px;
          display: inline-block;
          border: 1px solid var(--border-indicator, #e2e8f0);
          font-weight: 500;
          box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.05));
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, var(--bg-card, white) 0%, var(--bg-card-light, #f8fafc) 100%);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--border-card, #f1f5f9);
          box-shadow: var(--shadow-card, 0 2px 8px rgba(0, 0, 0, 0.05));
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--card-accent, #4f46e5) 0%, transparent 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-card-hover, 0 8px 25px rgba(0, 0, 0, 0.1));
        }
        
        .stat-card:hover::before {
          opacity: 1;
        }
        
        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        
        .stat-card:hover .stat-icon {
          transform: scale(1.1);
        }
        
        .sales-icon {
          background: linear-gradient(135deg, var(--sales-bg, #dbeafe) 0%, var(--sales-bg-light, #bfdbfe) 100%);
          color: var(--sales-color, #3b82f6);
        }
        
        .total-icon {
          background: linear-gradient(135deg, var(--total-bg, #eef2ff) 0%, var(--total-bg-light, #e0e7ff) 100%);
          color: var(--total-color, #4f46e5);
        }
        
        .average-icon {
          background: linear-gradient(135deg, var(--average-bg, #fef3c7) 0%, var(--average-bg-light, #fde68a) 100%);
          color: var(--average-color, #f59e0b);
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .stat-value {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary, #1e293b);
          margin-bottom: 4px;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--text-accent, #4f46e5) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .stat-label {
          font-size: 13px;
          color: var(--text-secondary, #64748b);
          font-weight: 500;
        }
        
       
        
        /* Manual Dark Mode Classes */
        .dark .filters-panel,
        [data-theme="dark"] .filters-panel {
          --bg-primary: #1e293b;
          --bg-secondary: #0f172a;
          --bg-input: #334155;
          --bg-input-light: #475569;
          --bg-popup: #1e293b;
          --bg-popup-light: #334155;
          --bg-header: #334155;
          --bg-header-light: #475569;
          --bg-stats: #0f172a;
          --bg-stats-light: #1e293b;
          --bg-card: #334155;
          --bg-card-light: #475569;
          --bg-indicator: #334155;
          --bg-indicator-light: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --text-label: #cbd5e1;
          --text-placeholder: #64748b;
          --text-disabled: #475569;
          --text-accent: #818cf8;
          --border-color: #334155;
          --border-input: #475569;
          --border-hover: #64748b;
          --border-popup: #475569;
          --border-header: #475569;
          --border-divider: #334155;
          --border-stats: #334155;
          --border-card: #475569;
          --border-indicator: #475569;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-lighter: #1e3a8a40;
          --primary-light-hover: #1e40af40;
          --primary-dark: #4f46e5;
          --primary-darker: #4338ca;
          --primary-alpha: rgba(99, 102, 241, 0.2);
          --primary-alpha-light: rgba(129, 140, 248, 0.2);
          --danger: #f87171;
          --danger-light: #99182040;
          --danger-lighter: #dc262640;
          --danger-hover: #fee2e240;
          --danger-border: #991b1b;
          --sales-bg: #1e40af40;
          --sales-bg-light: #3b82f640;
          --sales-color: #60a5fa;
          --total-bg: #4338ca40;
          --total-bg-light: #6366f140;
          --total-color: #a5b4fc;
          --average-bg: #d9710240;
          --average-bg-light: #f59e0b40;
          --average-color: #fbbf24;
          --card-accent: #6366f1;
          --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.5);
          --shadow-popup: 0 20px 40px rgba(0, 0, 0, 0.6);
          --shadow-input: 0 1px 3px rgba(0, 0, 0, 0.2);
          --shadow-input-hover: 0 4px 12px rgba(0, 0, 0, 0.3);
          --shadow-input-focus: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-btn: 0 4px 12px rgba(0, 0, 0, 0.3);
          --shadow-btn-primary: 0 4px 12px rgba(99, 102, 241, 0.4);
          --shadow-btn-primary-hover: 0 6px 16px rgba(99, 102, 241, 0.5);
          --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.2);
          --shadow-card-hover: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        /* Light Mode Default Values */
        :root {
          --bg-primary: white;
          --bg-secondary: #f8fafc;
          --bg-input: white;
          --bg-input-light: #f8fafc;
          --bg-popup: white;
          --bg-popup-light: #f8fafc;
          --bg-header: #f8fafc;
          --bg-header-light: #f1f5f9;
          --bg-stats: #f8fafc;
          --bg-stats-light: #f1f5f9;
          --bg-card: white;
          --bg-card-light: #f8fafc;
          --bg-indicator: white;
          --bg-indicator-light: #f8fafc;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --text-label: #475569;
          --text-placeholder: #94a3b8;
          --text-disabled: #cbd5e1;
          --text-accent: #4f46e5;
          --border-color: #e2e8f0;
          --border-input: #e2e8f0;
          --border-hover: #cbd5e1;
          --border-popup: #e2e8f0;
          --border-header: #e2e8f0;
          --border-divider: #f1f5f9;
          --border-stats: #e2e8f0;
          --border-card: #f1f5f9;
          --border-indicator: #e2e8f0;
          --primary: #4f46e5;
          --primary-light: #818cf8;
          --primary-lighter: #eef2ff;
          --primary-light-hover: #e0e7ff;
          --primary-dark: #4338ca;
          --primary-darker: #3730a3;
          --primary-alpha: rgba(99, 102, 241, 0.1);
          --primary-alpha-light: rgba(129, 140, 248, 0.1);
          --danger: #ef4444;
          --danger-light: #fef2f2;
          --danger-lighter: #fee2e2;
          --danger-hover: #fee2e2;
          --danger-border: #fecaca;
          --sales-bg: #dbeafe;
          --sales-bg-light: #bfdbfe;
          --sales-color: #3b82f6;
          --total-bg: #eef2ff;
          --total-bg-light: #e0e7ff;
          --total-color: #4f46e5;
          --average-bg: #fef3c7;
          --average-bg-light: #fde68a;
          --average-color: #f59e0b;
          --card-accent: #4f46e5;
          --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.15);
          --shadow-popup: 0 20px 40px rgba(0, 0, 0, 0.15);
          --shadow-input: 0 1px 3px rgba(0, 0, 0, 0.05);
          --shadow-input-hover: 0 4px 12px rgba(0, 0, 0, 0.1);
          --shadow-input-focus: 0 4px 12px rgba(99, 102, 241, 0.15);
          --shadow-btn: 0 4px 12px rgba(239, 68, 68, 0.2);
          --shadow-btn-primary: 0 4px 12px rgba(79, 70, 229, 0.3);
          --shadow-btn-primary-hover: 0 6px 16px rgba(79, 70, 229, 0.4);
          --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.05);
          --shadow-card-hover: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        /* Enhanced interactions */
        .filter-group:hover label::before {
          background: linear-gradient(180deg, var(--primary, #4f46e5) 0%, var(--primary-dark, #4338ca) 100%);
          opacity: 1;
          transform: scaleY(1.2);
        }
        
        .select-wrapper:focus-within,
        .search-input-wrapper:focus-within,
        .date-range-wrapper:focus-within {
          transform: translateY(-1px);
        }
        
        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .filters-panel,
          .clear-all-btn,
          select,
          input,
          .search-btn,
          .date-range-display,
          .stat-card,
          .stat-icon,
          .apply-dates-btn,
          .clear-dates-btn,
          .close-calendar-btn {
            transition: none;
            animation: none;
            transform: none;
          }
          
          .date-picker-popup {
            animation: none;
          }
          
          @keyframes slideDown {
            0%, 100% { opacity: 1; transform: translateY(0); }
          }
        }
        
        /* Focus states for accessibility */
        .clear-all-btn:focus,
        .search-btn:focus,
        .date-range-display:focus,
        .close-calendar-btn:focus,
        .clear-dates-btn:focus,
        .apply-dates-btn:focus {
          outline: 2px solid var(--primary, #4f46e5);
          outline-offset: 2px;
        }
        
        /* Print styles */
        @media print {
          .filters-panel {
            box-shadow: none;
            border: 1px solid #ccc;
            background: white;
          }
          
          .clear-all-btn,
          .search-btn,
          .close-calendar-btn,
          .date-picker-popup {
            display: none;
          }
        }
        
        @media (max-width: 768px) {
          .filters-panel {
            padding: 16px;
            margin-bottom: 24px;
          }
          
          .filters-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          
          .filters-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .date-picker-popup {
            min-width: 300px;
            right: 0;
            left: auto;
            padding: 16px;
          }
          
          .stats-column {
            padding: 16px;
          }
          
          .stat-card {
            padding: 16px;
            gap: 12px;
          }
          
          .stat-icon {
            width: 40px;
            height: 40px;
          }
          
          .stat-value {
            font-size: 18px;
          }
        }
        
        @media (max-width: 480px) {
          .filters-panel {
            padding: 12px;
            border-radius: 12px;
          }
          
          .filter-group {
            gap: 8px;
          }
          
          select,
          input,
          .date-range-display {
            padding: 10px 12px;
          }
          
          .date-picker-popup {
            min-width: 280px;
            padding: 12px;
          }
          
          .date-picker-actions {
            gap: 8px;
          }
          
          .clear-dates-btn,
          .apply-dates-btn {
            padding: 8px 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default FilterControls;