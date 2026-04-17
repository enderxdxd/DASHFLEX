// src/components/dashboard/FilterControls.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Calendar, Trash2, X, Check, ShoppingCart, DollarSign, Maximize2, FileText, Package } from 'lucide-react';
import dayjs from 'dayjs';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { registerLocale } from 'react-datepicker';
import ptBR from 'date-fns/locale/pt-BR';

registerLocale('pt-BR', ptBR);

const FilterControls = ({
  filters,
  dispatchFilters,
  responsaveis,
  produtos,
  totalVendas,
  totalFaturado,
  mediaVenda,
  estatisticasPlanos,
  estatisticasOutros,
}) => {
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm || '');
  const searchDebounceRef = useRef(null);
  const [localDateRange, setLocalDateRange] = useState({
    startDate: filters.startDate,
    endDate: filters.endDate
  });

  useEffect(() => {
    setLocalDateRange({ startDate: filters.startDate, endDate: filters.endDate });
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    setLocalSearchTerm(filters.searchTerm || '');
  }, [filters.searchTerm]);

  const handleSearchChange = useCallback((value) => {
    setLocalSearchTerm(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      dispatchFilters({ type: 'SET_SEARCH_TERM', payload: value });
    }, 300);
  }, [dispatchFilters]);

  useEffect(() => {
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, []);

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const clearAllFilters = () => dispatchFilters({ type: 'RESET_FILTERS' });

  const applyDateRange = () => {
    dispatchFilters({ type: 'SET_DATE_RANGE', payload: localDateRange });
    setIsDateRangeOpen(false);
  };

  const clearDateRange = () => {
    setLocalDateRange({ startDate: null, endDate: null });
    dispatchFilters({ type: 'SET_DATE_RANGE', payload: { startDate: null, endDate: null } });
  };

  return (
    <div className="fc-panel">
      {/* Header */}
      <div className="fc-header">
        <div>
          <h2 className="fc-heading">Filtros e Controles</h2>
          <p className="fc-desc">Personalize a visualização dos dados conforme suas necessidades</p>
        </div>
        <button className="fc-clear-btn" onClick={clearAllFilters} type="button">
          <Trash2 size={14} />
          Limpar Filtros
        </button>
      </div>

      {/* Content: filters + stats sidebar */}
      <div className="fc-content">
        {/* Filters grid */}
        <div className="fc-filters">
          <div className="fc-row">
            <div className="fc-field">
              <label htmlFor="fc-responsavel">Responsável</label>
              <select
                id="fc-responsavel"
                value={filters.filtroResponsavel}
                onChange={(e) => dispatchFilters({ type: 'SET_FILTER_RESPONSAVEL', payload: e.target.value })}
              >
                <option value="">Todos</option>
                {responsaveis.map(resp => <option key={resp} value={resp}>{resp}</option>)}
              </select>
            </div>

            <div className="fc-field">
              <label htmlFor="fc-search">Pesquisar</label>
              <div className="fc-search-wrap">
                <input
                  type="text"
                  id="fc-search"
                  placeholder="Digite para pesquisar..."
                  value={localSearchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                <Search size={16} className="fc-search-icon" />
              </div>
            </div>
          </div>

          <div className="fc-row">
            <div className="fc-field">
              <label htmlFor="fc-produto">Produto</label>
              <select
                id="fc-produto"
                value={filters.filtroProduto}
                onChange={(e) => dispatchFilters({ type: 'SET_FILTER_PRODUTO', payload: e.target.value })}
              >
                <option value="">Todos</option>
                {produtos.map(prod => <option key={prod} value={prod}>{prod}</option>)}
              </select>
            </div>

            <div className="fc-field fc-field--date">
              <label>Intervalo de Datas</label>
              <button
                className="fc-date-btn"
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                type="button"
              >
                <span>{filters.startDate ? dayjs(filters.startDate).format('DD/MM/YYYY') : 'Data inicial'}</span>
                <span className="fc-date-sep">a</span>
                <span>{filters.endDate ? dayjs(filters.endDate).format('DD/MM/YYYY') : 'Data final'}</span>
                <Calendar size={16} className="fc-date-icon" />
              </button>

              {isDateRangeOpen && (
                <div className="fc-datepicker-popup">
                  <div className="fc-datepicker-header">
                    <h4>Selecione um intervalo</h4>
                    <button className="fc-icon-btn" onClick={() => setIsDateRangeOpen(false)} type="button">
                      <X size={16} />
                    </button>
                  </div>
                  <DatePicker
                    selected={localDateRange.startDate}
                    onChange={(dates) => {
                      const [start, end] = dates;
                      setLocalDateRange({ startDate: start, endDate: end });
                    }}
                    startDate={localDateRange.startDate}
                    endDate={localDateRange.endDate}
                    selectsRange
                    inline
                    monthsShown={2}
                    locale="pt-BR"
                    dateFormat="dd/MM/yyyy"
                    calendarClassName="fc-calendar"
                  />
                  <div className="fc-datepicker-actions">
                    <button className="fc-btn fc-btn--outline-danger" onClick={clearDateRange} type="button">
                      <X size={14} /> Limpar
                    </button>
                    <button className="fc-btn fc-btn--primary" onClick={applyDateRange} type="button">
                      <Check size={14} /> Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="fc-stats">
          <div className="fc-stats-header">
            <h3>Estatísticas Filtradas</h3>
            <div className="fc-period-tag">
              {filters.startDate && filters.endDate
                ? `${dayjs(filters.startDate).format('DD/MM/YYYY')} - ${dayjs(filters.endDate).format('DD/MM/YYYY')}`
                : 'Período completo'}
            </div>
          </div>

          {/* Product breakdown */}
          <div className="fc-breakdown">
            <div className="fc-bk-card">
              <div className="fc-bk-top">
                <div className="fc-bk-icon fc-bk-icon--planos"><FileText size={16} /></div>
                <span className="fc-bk-label">Planos</span>
              </div>
              <div className="fc-bk-badge fc-bk-badge--planos">{formatMoney(estatisticasPlanos?.valorTotal || 0)}</div>
              <div className="fc-bk-stats">
                <div className="fc-bk-stat">
                  <span className="fc-bk-num">{estatisticasPlanos?.quantidade || 0}</span>
                  <span className="fc-bk-desc">VENDAS</span>
                </div>
                <div className="fc-bk-stat">
                  <span className="fc-bk-num">{formatMoney(estatisticasPlanos?.valorMedio || 0)}</span>
                  <span className="fc-bk-desc">MÉDIA</span>
                </div>
              </div>
            </div>

            <div className="fc-bk-card">
              <div className="fc-bk-top">
                <div className="fc-bk-icon fc-bk-icon--outros"><Package size={16} /></div>
                <span className="fc-bk-label">Outros</span>
              </div>
              <div className="fc-bk-badge fc-bk-badge--outros">{formatMoney(estatisticasOutros?.valorTotal || 0)}</div>
              <div className="fc-bk-stats">
                <div className="fc-bk-stat">
                  <span className="fc-bk-num">{estatisticasOutros?.quantidade || 0}</span>
                  <span className="fc-bk-desc">VENDAS</span>
                </div>
                <div className="fc-bk-stat">
                  <span className="fc-bk-num">{formatMoney(estatisticasOutros?.valorMedio || 0)}</span>
                  <span className="fc-bk-desc">MÉDIA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="fc-summary">
            <div className="fc-sum-card">
              <div className="fc-sum-icon fc-sum-icon--sales"><ShoppingCart size={18} /></div>
              <div>
                <div className="fc-sum-value">{totalVendas}</div>
                <div className="fc-sum-label">Vendas</div>
              </div>
            </div>
            <div className="fc-sum-card">
              <div className="fc-sum-icon fc-sum-icon--total"><DollarSign size={18} /></div>
              <div>
                <div className="fc-sum-value">{formatMoney(totalFaturado)}</div>
                <div className="fc-sum-label">Total Faturado</div>
              </div>
            </div>
            <div className="fc-sum-card">
              <div className="fc-sum-icon fc-sum-icon--avg"><Maximize2 size={18} /></div>
              <div>
                <div className="fc-sum-value">{formatMoney(mediaVenda)}</div>
                <div className="fc-sum-label">Média por Venda</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Panel ────────────────────────────── */
        .fc-panel {
          background: var(--card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          border-top: 2px solid var(--primary);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow);
        }

        /* ── Header ──────────────────────────── */
        .fc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .fc-heading {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
        }

        .fc-desc {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .fc-clear-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: var(--error-light);
          color: var(--danger);
          border: 1px solid color-mix(in srgb, var(--danger) 20%, transparent);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: background var(--transition-fast), box-shadow var(--transition-fast);
          flex-shrink: 0;
        }

        .fc-clear-btn:hover {
          background: color-mix(in srgb, var(--danger) 15%, transparent);
          box-shadow: var(--shadow-sm);
        }

        /* ── Content layout ──────────────────── */
        .fc-content {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .fc-filters {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .fc-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        /* ── Fields ──────────────────────────── */
        .fc-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .fc-field--date {
          position: relative;
          z-index: 100;
        }

        .fc-field label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .fc-field label::before {
          content: '';
          width: 3px;
          height: 14px;
          background: var(--primary);
          border-radius: 2px;
        }

        .fc-field select,
        .fc-field input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--card);
          font-size: 0.875rem;
          color: var(--text-primary);
          appearance: none;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          box-shadow: var(--shadow-sm);
          font-family: var(--font-sans);
        }

        .fc-field select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          padding-right: 2.25rem;
        }

        .fc-field select:focus,
        .fc-field input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
        }

        .fc-field input::placeholder {
          color: var(--text-secondary);
          opacity: 0.6;
        }

        .fc-search-wrap {
          position: relative;
        }

        .fc-search-wrap input {
          padding-right: 2.5rem;
        }

        .fc-search-icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
        }

        /* ── Date button ─────────────────────── */
        .fc-date-btn {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--card);
          font-size: 0.875rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: border-color var(--transition-fast);
          text-align: left;
          box-shadow: var(--shadow-sm);
          font-family: var(--font-sans);
        }

        .fc-date-btn:hover {
          border-color: var(--primary);
        }

        .fc-date-sep {
          margin: 0 0.5rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .fc-date-icon {
          margin-left: auto;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        /* ── Datepicker popup ────────────────── */
        .fc-datepicker-popup {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          z-index: 9999;
          min-width: 600px;
          background: var(--card);
          border-radius: var(--radius);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          padding: 1.25rem;
          animation: fc-slideDown 200ms ease;
        }

        @keyframes fc-slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fc-datepicker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }

        .fc-datepicker-header h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .fc-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
        }

        .fc-icon-btn:hover {
          background: var(--error-light);
          color: var(--danger);
        }

        .fc-datepicker-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border);
        }

        .fc-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: background var(--transition-fast), box-shadow var(--transition-fast);
          font-family: var(--font-sans);
        }

        .fc-btn--outline-danger {
          background: none;
          border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
          color: var(--danger);
        }

        .fc-btn--outline-danger:hover {
          background: var(--error-light);
        }

        .fc-btn--primary {
          background: var(--primary);
          color: white;
          border: none;
          box-shadow: var(--shadow-sm);
        }

        .fc-btn--primary:hover {
          background: var(--primary-hover);
          box-shadow: var(--shadow-md);
        }

        /* ── react-datepicker overrides ──────── */
        :global(.react-datepicker) {
          font-family: var(--font-sans) !important;
          border: none !important;
          width: 100% !important;
          background-color: transparent !important;
        }

        :global(.react-datepicker__month-container) {
          width: 48% !important;
        }

        :global(.react-datepicker__header) {
          background: var(--background) !important;
          border-bottom: 1px solid var(--border) !important;
          border-radius: var(--radius-sm) var(--radius-sm) 0 0 !important;
        }

        :global(.react-datepicker__current-month) {
          color: var(--text-primary) !important;
          font-weight: 600 !important;
        }

        :global(.react-datepicker__day-name) {
          color: var(--text-secondary) !important;
          font-weight: 600 !important;
        }

        :global(.react-datepicker__day) {
          color: var(--text-primary) !important;
          border-radius: var(--radius-sm) !important;
          transition: background 150ms ease !important;
        }

        :global(.react-datepicker__day:hover) {
          background: var(--primary-light) !important;
          color: var(--primary) !important;
        }

        :global(.react-datepicker__day--selected),
        :global(.react-datepicker__day--in-selecting-range),
        :global(.react-datepicker__day--in-range) {
          background: var(--primary) !important;
          color: white !important;
          font-weight: 600 !important;
        }

        :global(.react-datepicker__day--keyboard-selected) {
          background: var(--primary) !important;
          color: white !important;
        }

        :global(.react-datepicker__day--in-selecting-range:not(.react-datepicker__day--in-range)) {
          background: color-mix(in srgb, var(--primary) 25%, transparent) !important;
        }

        :global(.react-datepicker__day--disabled) {
          color: var(--text-secondary) !important;
          opacity: 0.4 !important;
        }

        :global(.react-datepicker__navigation--previous) {
          border-right-color: var(--primary) !important;
        }

        :global(.react-datepicker__navigation--next) {
          border-left-color: var(--primary) !important;
        }

        /* ── Stats sidebar ───────────────────── */
        .fc-stats {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.25rem;
          min-width: 300px;
          max-width: 360px;
          flex-shrink: 0;
        }

        .fc-stats-header {
          margin-bottom: 1rem;
        }

        .fc-stats-header h3 {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .fc-period-tag {
          display: inline-block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.25rem 0.625rem;
          font-weight: 500;
        }

        /* ── Breakdown cards ─────────────────── */
        .fc-breakdown {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .fc-bk-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .fc-bk-top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .fc-bk-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .fc-bk-icon--planos {
          background: var(--success);
          color: white;
        }

        .fc-bk-icon--outros {
          background: var(--primary);
          color: white;
        }

        .fc-bk-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .fc-bk-badge {
          font-size: 0.8125rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: white;
          width: fit-content;
          font-variant-numeric: tabular-nums;
        }

        .fc-bk-badge--planos { background: var(--success); }
        .fc-bk-badge--outros { background: var(--primary); }

        .fc-bk-stats {
          display: flex;
          gap: 1rem;
        }

        .fc-bk-stat {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .fc-bk-num {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }

        .fc-bk-desc {
          font-size: 0.625rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 500;
        }

        /* ── Summary stat cards ──────────────── */
        .fc-summary {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .fc-sum-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: box-shadow var(--transition-fast);
        }

        .fc-sum-card:hover {
          box-shadow: var(--shadow-md);
        }

        .fc-sum-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .fc-sum-icon--sales {
          background: var(--primary-light);
          color: var(--primary);
        }

        .fc-sum-icon--total {
          background: var(--secondary-light);
          color: var(--secondary);
        }

        .fc-sum-icon--avg {
          background: var(--warning-light);
          color: var(--warning);
        }

        .fc-sum-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
        }

        .fc-sum-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* ── Focus states ────────────────────── */
        .fc-clear-btn:focus-visible,
        .fc-date-btn:focus-visible,
        .fc-icon-btn:focus-visible,
        .fc-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* ── Responsive ──────────────────────── */
        @media (max-width: 1200px) {
          .fc-content {
            flex-direction: column;
          }
          .fc-stats {
            max-width: none;
            min-width: 0;
          }
        }

        @media (max-width: 768px) {
          .fc-panel { padding: 1rem; }
          .fc-header { flex-direction: column; gap: 0.75rem; }
          .fc-row { grid-template-columns: 1fr; }
          .fc-datepicker-popup { min-width: 300px; right: 0; left: auto; }
          .fc-breakdown { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .fc-panel { padding: 0.75rem; border-radius: var(--radius); }
          .fc-datepicker-popup { min-width: 280px; padding: 0.75rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .fc-panel, .fc-clear-btn, .fc-field select, .fc-field input,
          .fc-date-btn, .fc-sum-card, .fc-icon-btn, .fc-btn {
            transition: none;
          }
          .fc-datepicker-popup { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default FilterControls;
