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
          background-color: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          padding: 24px;
          margin-bottom: 32px;
        }
        
        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        
        .filters-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 6px 0;
        }
        
        .filters-header p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }
        
        .clear-all-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #fef2f2;
          color: #ef4444;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .clear-all-btn:hover {
          background-color: #fee2e2;
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
        }
        
        .filter-group label {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
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
          border-top: 5px solid #64748b;
          pointer-events: none;
        }
        
        select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background-color: white;
          font-size: 14px;
          color: #1e293b;
          appearance: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        select:hover {
          border-color: #cbd5e1;
        }
        
        select:focus {
          outline: none;
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          transition: all 0.2s;
        }
        
        input:hover {
          border-color: #cbd5e1;
        }
        
        input:focus {
          outline: none;
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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
          color: #64748b;
          transition: all 0.2s;
          border-radius: 6px;
        }
        
        .search-btn:hover {
          color: #4f46e5;
          background-color: #f8fafc;
        }
        
        .date-range-wrapper {
          position: relative;
        }
        
        .date-range-display {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background-color: white;
          font-size: 14px;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        
        .date-range-display:hover {
          border-color: #cbd5e1;
        }
        
        .date-range-separator {
          margin: 0 8px;
          color: #64748b;
        }
        
        .calendar-icon {
          margin-left: auto;
          color: #64748b;
        }
        
        .date-picker-popup {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 100;
          width: 100%;
          min-width: 660px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          padding: 16px;
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
        }
        
        :global(.react-datepicker__month-container) {
          width: 48% !important;
        }
        
        :global(.react-datepicker__day--selected),
        :global(.react-datepicker__day--in-selecting-range),
        :global(.react-datepicker__day--in-range) {
          background-color: #4f46e5 !important;
          border-radius: 0.3rem !important;
        }
        
        :global(.react-datepicker__day--keyboard-selected) {
          background-color: #818cf8 !important;
        }
        
        :global(.react-datepicker__day:hover) {
          background-color: #eef2ff !important;
        }
        
        :global(.react-datepicker__day--in-selecting-range:not(.react-datepicker__day--in-range)) {
          background-color: rgba(79, 70, 229, 0.5) !important;
        }
        
        :global(.react-datepicker__header) {
          background-color: #f8fafc !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        
        :global(.react-datepicker__current-month) {
          color: #1e293b !important;
          font-weight: 600 !important;
        }
        
        :global(.react-datepicker__day-name) {
          color: #64748b !important;
        }
        
        :global(.react-datepicker__day) {
          color: #1e293b !important;
        }
        
        :global(.react-datepicker__day--disabled) {
          color: #cbd5e1 !important;
        }
        
        .date-picker-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
        }
        .date-picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .date-picker-header h4 {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .close-calendar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .close-calendar-btn:hover {
          background-color: #f1f5f9;
          color: #ef4444;
        }
        
        .clear-dates-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid #fee2e2;
          color: #ef4444;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        
        .clear-dates-btn:hover {
          background-color: #fee2e2;
        }
        
        .apply-dates-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #4f46e5;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .apply-dates-btn:hover {
          background-color: #4338ca;
        }
        
        .stats-column {
          background-color: #f8fafc;
          border-radius: 12px;
          padding: 24px;
          height: 100%;
        }
        
        .stats-header {
          margin-bottom: 20px;
        }
        
        .stats-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        
        .period-indicator {
          font-size: 13px;
          color: #64748b;
          background-color: white;
          border-radius: 6px;
          padding: 6px 12px;
          display: inline-block;
          border: 1px solid #e2e8f0;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        
        .stat-card {
          background: white;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s;
          border: 1px solid #f1f5f9;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        
        .sales-icon {
          background-color: #dbeafe;
          color: #3b82f6;
        }
        
        .total-icon {
          background-color: #eef2ff;
          color: #4f46e5;
        }
        
        .average-icon {
          background-color: #fef3c7;
          color: #f59e0b;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }
        
        .stat-label {
          font-size: 13px;
          color: #64748b;
        }
        
        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          
          .date-picker-popup {
            min-width: 300px;
            right: 0;
            left: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default FilterControls;