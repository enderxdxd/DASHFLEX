import React, { useState } from 'react';

export default function EnhancedTable({ filteredData, formatMoney }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('dataFormatada');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = (filteredData || []).filter(venda => {
    if (!search) return true;
    return (
      (venda.responsavel || '').toLowerCase().includes(search.toLowerCase()) ||
      (venda.produto || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'valor') {
      return sortDir === 'asc'
        ? (Number(a.valor) || 0) - (Number(b.valor) || 0)
        : (Number(b.valor) || 0) - (Number(a.valor) || 0);
    }
    if (sortKey === 'dataFormatada') {
      return sortDir === 'asc'
        ? new Date(a.dataFormatada) - new Date(b.dataFormatada)
        : new Date(b.dataFormatada) - new Date(a.dataFormatada);
    }
    return sortDir === 'asc'
      ? String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''))
      : String(b[sortKey] || '').localeCompare(String(a[sortKey] || ''));
  });

  return (
    <div className="enhanced-table-section">
      <div className="results-header">
        <h3>📋 Resultados da Consulta</h3>
        <div className="results-controls">
          <input
            type="text"
            placeholder="Buscar na tabela..."
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="table-container">
        <table className="details-table enhanced">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('dataFormatada')}>Data</th>
              <th className="sortable" onClick={() => handleSort('responsavel')}>Responsável</th>
              <th className="sortable" onClick={() => handleSort('produto')}>Produto</th>
              <th className="sortable" onClick={() => handleSort('valor')}>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 50).map((venda, index) => (
              <tr key={index}>
                <td>{venda.dataFormatada}</td>
                <td>{venda.responsavel}</td>
                <td>{venda.produto}</td>
                <td>{formatMoney(venda.valor || 0)}</td>
                <td>
                  <span className="status-badge success">Concluída</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .enhanced-table-section {
          margin-top: 2rem;
          position: relative;
        }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          padding: 0.5rem;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--bg-header, #f8fafc) 0%, var(--bg-header-light, #f1f5f9) 100%);
          border: 1px solid var(--border-header, #e2e8f0);
          gap: 1rem;
        }

        .search-input {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-search, #e5e7eb);
          font-size: 0.95rem;
          background: linear-gradient(135deg, var(--bg-search, white) 0%, var(--bg-search-light, #f8fafc) 100%);
          color: var(--text-primary, #374151);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-search, 0 2px 4px rgba(0, 0, 0, 0.05));
          min-width: 200px;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--primary, #6366f1);
          box-shadow: 0 0 0 3px var(--primary-alpha, rgba(99, 102, 241, 0.1)), var(--shadow-search-focus, 0 4px 12px rgba(99, 102, 241, 0.15));
          background: linear-gradient(135deg, var(--bg-search-focus, white) 0%, var(--bg-search-focus-light, #f8fafc) 100%);
          transform: translateY(-1px);
        }

        .search-input::placeholder {
          color: var(--text-placeholder, #9ca3af);
        }

        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--border-table, #e2e8f0);
          box-shadow: var(--shadow-table, 0 4px 12px rgba(0, 0, 0, 0.05));
          background: linear-gradient(135deg, var(--bg-table, white) 0%, var(--bg-table-light, #f8fafc) 100%);
        }

        .details-table.enhanced {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.95rem;
        }

        .details-table.enhanced th,
        .details-table.enhanced td {
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--border-row, #f1f5f9);
          transition: all 0.2s ease;
        }

        .details-table.enhanced th {
          background: linear-gradient(135deg, var(--bg-th, #f8fafc) 0%, var(--bg-th-light, #f1f5f9) 100%);
          color: var(--text-th, #64748b);
          font-weight: 700;
          cursor: pointer;
          position: sticky;
          top: 0;
          z-index: 10;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid var(--border-th, #e2e8f0);
        }

        .details-table.enhanced th:first-child {
          border-top-left-radius: 12px;
        }

        .details-table.enhanced th:last-child {
          border-top-right-radius: 12px;
        }

        .details-table.enhanced th.sortable {
          position: relative;
          padding-right: 2rem;
          user-select: none;
        }

        .details-table.enhanced th.sortable::after {
          content: '↕';
          position: absolute;
          right: 0.5rem;
          opacity: 0.5;
          transition: all 0.2s ease;
          font-size: 0.75rem;
        }

        .details-table.enhanced th.sortable:hover {
          color: var(--primary, #4f46e5);
          background: linear-gradient(135deg, var(--bg-th-hover, rgba(99, 102, 241, 0.05)) 0%, var(--bg-th-hover-light, rgba(99, 102, 241, 0.02)) 100%);
          transform: translateY(-1px);
        }

        .details-table.enhanced th.sortable:hover::after {
          opacity: 1;
          color: var(--primary, #4f46e5);
          transform: scale(1.2);
        }

        .details-table.enhanced td {
          color: var(--text-td, #374151);
          font-weight: 500;
          background: var(--bg-td, transparent);
        }

        .details-table.enhanced tbody tr {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .details-table.enhanced tbody tr::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--primary, #6366f1);
          transform: scaleY(0);
          transition: transform 0.2s ease;
          border-radius: 0 2px 2px 0;
        }

        .details-table.enhanced tbody tr:hover::before {
          transform: scaleY(1);
        }

        .details-table.enhanced tbody tr:hover {
          background: linear-gradient(135deg, var(--bg-row-hover, #f8fafc) 0%, var(--bg-row-hover-light, #f1f5f9) 100%);
          transform: translateX(4px);
          box-shadow: var(--shadow-row, 0 2px 8px rgba(0, 0, 0, 0.05));
        }

        .details-table.enhanced tbody tr:nth-child(even) {
          background: linear-gradient(135deg, var(--bg-row-even, #fcfcff) 0%, var(--bg-row-even-light, #fafbff) 100%);
        }

        .details-table.enhanced tbody tr:nth-child(even):hover {
          background: linear-gradient(135deg, var(--bg-row-hover, #f8fafc) 0%, var(--bg-row-hover-light, #f1f5f9) 100%);
        }

        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          box-shadow: var(--shadow-badge, 0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .status-badge.success {
          background: linear-gradient(135deg, var(--bg-success, #dcfce7) 0%, var(--bg-success-light, #bbf7d0) 100%);
          color: var(--text-success, #166534);
          border-color: var(--border-success, #86efac);
          box-shadow: var(--shadow-success, 0 2px 4px rgba(34, 197, 94, 0.2));
        }

        .status-badge.success:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-success-hover, 0 4px 8px rgba(34, 197, 94, 0.3));
        }

        .status-badge.warning {
          background: linear-gradient(135deg, var(--bg-warning, #fef3c7) 0%, var(--bg-warning-light, #fde68a) 100%);
          color: var(--text-warning, #92400e);
          border-color: var(--border-warning, #f59e0b);
          box-shadow: var(--shadow-warning, 0 2px 4px rgba(245, 158, 11, 0.2));
        }

        .status-badge.warning:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-warning-hover, 0 4px 8px rgba(245, 158, 11, 0.3));
        }

        .status-badge.error {
          background: linear-gradient(135deg, var(--bg-error, #fee2e2) 0%, var(--bg-error-light, #fecaca) 100%);
          color: var(--text-error, #991b1b);
          border-color: var(--border-error, #f87171);
          box-shadow: var(--shadow-error, 0 2px 4px rgba(239, 68, 68, 0.2));
        }

        .status-badge.error:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-error-hover, 0 4px 8px rgba(239, 68, 68, 0.3));
        }

        .status-badge.info {
          background: linear-gradient(135deg, var(--bg-info, #dbeafe) 0%, var(--bg-info-light, #bfdbfe) 100%);
          color: var(--text-info, #1e40af);
          border-color: var(--border-info, #60a5fa);
          box-shadow: var(--shadow-info, 0 2px 4px rgba(59, 130, 246, 0.2));
        }

        .status-badge.info:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-info-hover, 0 4px 8px rgba(59, 130, 246, 0.3));
        }

        /* Manual Dark Mode Classes */
        .dark .enhanced-table-section,
        [data-theme="dark"] .enhanced-table-section {
          --bg-header: #334155;
          --bg-header-light: #475569;
          --border-header: #475569;
          --bg-search: #1e293b;
          --bg-search-light: #334155;
          --bg-search-focus: #1e293b;
          --bg-search-focus-light: #334155;
          --border-search: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-placeholder: #64748b;
          --border-table: #475569;
          --bg-table: #1e293b;
          --bg-table-light: #334155;
          --border-row: #334155;
          --bg-th: #0f172a;
          --bg-th-light: #1e293b;
          --bg-th-hover: rgba(99, 102, 241, 0.1);
          --bg-th-hover-light: rgba(99, 102, 241, 0.05);
          --text-th: #cbd5e1;
          --border-th: #475569;
          --text-td: #e2e8f0;
          --bg-td: transparent;
          --bg-row-hover: #334155;
          --bg-row-hover-light: #475569;
          --bg-row-even: #0f172a;
          --bg-row-even-light: #1e293b;
          --primary: #6366f1;
          --primary-alpha: rgba(99, 102, 241, 0.2);
          --bg-success: #06402520;
          --bg-success-light: #05803020;
          --text-success: #22c55e;
          --border-success: #16a34a;
          --bg-warning: #92400e20;
          --bg-warning-light: #a8530020;
          --text-warning: #fbbf24;
          --border-warning: #f59e0b;
          --bg-error: #99182020;
          --bg-error-light: #dc262620;
          --text-error: #f87171;
          --border-error: #ef4444;
          --bg-info: #1e40af20;
          --bg-info-light: #3b82f620;
          --text-info: #60a5fa;
          --border-info: #3b82f6;
          --shadow-search: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-search-focus: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-table: 0 4px 12px rgba(0, 0, 0, 0.2);
          --shadow-row: 0 2px 8px rgba(0, 0, 0, 0.2);
          --shadow-badge: 0 2px 4px rgba(0, 0, 0, 0.3);
          --shadow-success: 0 2px 4px rgba(34, 197, 94, 0.3);
          --shadow-success-hover: 0 4px 8px rgba(34, 197, 94, 0.4);
          --shadow-warning: 0 2px 4px rgba(245, 158, 11, 0.3);
          --shadow-warning-hover: 0 4px 8px rgba(245, 158, 11, 0.4);
          --shadow-error: 0 2px 4px rgba(239, 68, 68, 0.3);
          --shadow-error-hover: 0 4px 8px rgba(239, 68, 68, 0.4);
          --shadow-info: 0 2px 4px rgba(59, 130, 246, 0.3);
          --shadow-info-hover: 0 4px 8px rgba(59, 130, 246, 0.4);
        }

        /* Light Mode Default Values */
        :root {
          --bg-header: #f8fafc;
          --bg-header-light: #f1f5f9;
          --border-header: #e2e8f0;
          --bg-search: white;
          --bg-search-light: #f8fafc;
          --bg-search-focus: white;
          --bg-search-focus-light: #f8fafc;
          --border-search: #e5e7eb;
          --text-primary: #374151;
          --text-placeholder: #9ca3af;
          --border-table: #e2e8f0;
          --bg-table: white;
          --bg-table-light: #f8fafc;
          --border-row: #f1f5f9;
          --bg-th: #f8fafc;
          --bg-th-light: #f1f5f9;
          --bg-th-hover: rgba(99, 102, 241, 0.05);
          --bg-th-hover-light: rgba(99, 102, 241, 0.02);
          --text-th: #64748b;
          --border-th: #e2e8f0;
          --text-td: #374151;
          --bg-td: transparent;
          --bg-row-hover: #f8fafc;
          --bg-row-hover-light: #f1f5f9;
          --bg-row-even: #fcfcff;
          --bg-row-even-light: #fafbff;
          --primary: #6366f1;
          --primary-alpha: rgba(99, 102, 241, 0.1);
          --bg-success: #dcfce7;
          --bg-success-light: #bbf7d0;
          --text-success: #166534;
          --border-success: #86efac;
          --bg-warning: #fef3c7;
          --bg-warning-light: #fde68a;
          --text-warning: #92400e;
          --border-warning: #f59e0b;
          --bg-error: #fee2e2;
          --bg-error-light: #fecaca;
          --text-error: #991b1b;
          --border-error: #f87171;
          --bg-info: #dbeafe;
          --bg-info-light: #bfdbfe;
          --text-info: #1e40af;
          --border-info: #60a5fa;
          --shadow-search: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-search-focus: 0 4px 12px rgba(99, 102, 241, 0.15);
          --shadow-table: 0 4px 12px rgba(0, 0, 0, 0.05);
          --shadow-row: 0 2px 8px rgba(0, 0, 0, 0.05);
          --shadow-badge: 0 2px 4px rgba(0, 0, 0, 0.1);
          --shadow-success: 0 2px 4px rgba(34, 197, 94, 0.2);
          --shadow-success-hover: 0 4px 8px rgba(34, 197, 94, 0.3);
          --shadow-warning: 0 2px 4px rgba(245, 158, 11, 0.2);
          --shadow-warning-hover: 0 4px 8px rgba(245, 158, 11, 0.3);
          --shadow-error: 0 2px 4px rgba(239, 68, 68, 0.2);
          --shadow-error-hover: 0 4px 8px rgba(239, 68, 68, 0.3);
          --shadow-info: 0 2px 4px rgba(59, 130, 246, 0.2);
          --shadow-info-hover: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        /* Enhanced interactions */
        .search-input:focus,
        .details-table.enhanced th:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: 2px;
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .search-input,
          .details-table.enhanced th,
          .details-table.enhanced tbody tr,
          .status-badge {
            transition: none;
            animation: none;
            transform: none;
          }
          
          .details-table.enhanced th.sortable::after {
            transform: none;
          }
        }

        /* Print styles */
        @media print {
          .enhanced-table-section {
            margin-top: 1rem;
          }
          
          .results-header {
            background: white;
            border: 1px solid #ccc;
            box-shadow: none;
          }
          
          .search-input {
            display: none;
          }
          
          .table-container {
            border: 1px solid #ccc;
            box-shadow: none;
            background: white;
          }
          
          .details-table.enhanced th {
            background: #f5f5f5;
            color: #333;
          }
          
          .status-badge {
            background: #f5f5f5 !important;
            color: #333 !important;
            border: 1px solid #ccc !important;
          }
        }

        /* Responsive improvements */
        @media (max-width: 768px) {
          .results-header {
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .search-input {
            width: 100%;
            min-width: auto;
          }
          
          .details-table.enhanced th,
          .details-table.enhanced td {
            padding: 0.625rem 0.75rem;
            font-size: 0.875rem;
          }
          
          .details-table.enhanced th.sortable {
            padding-right: 1.75rem;
          }
          
          .status-badge {
            font-size: 0.6875rem;
            padding: 0.25rem 0.625rem;
          }
        }

        @media (max-width: 576px) {
          .enhanced-table-section {
            margin-top: 1.5rem;
          }
          
          .details-table.enhanced th,
          .details-table.enhanced td {
            padding: 0.5rem;
            font-size: 0.8125rem;
          }
          
          .details-table.enhanced th {
            font-size: 0.75rem;
          }
          
          .status-badge {
            font-size: 0.625rem;
            padding: 0.1875rem 0.5rem;
          }
        }

        /* Custom scrollbar for table container */
        .table-container::-webkit-scrollbar {
          height: 8px;
        }

        .table-container::-webkit-scrollbar-track {
          background: var(--scrollbar-track, #f1f5f9);
          border-radius: 4px;
        }

        .table-container::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb, #cbd5e1);
          border-radius: 4px;
        }

        .table-container::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover, #94a3b8);
        }

        /* Dark mode scrollbar */
        .dark .table-container::-webkit-scrollbar-track,
        [data-theme="dark"] .table-container::-webkit-scrollbar-track {
          --scrollbar-track: #334155;
        }

        .dark .table-container::-webkit-scrollbar-thumb,
        [data-theme="dark"] .table-container::-webkit-scrollbar-thumb {
          --scrollbar-thumb: #475569;
        }

        .dark .table-container::-webkit-scrollbar-thumb:hover,
        [data-theme="dark"] .table-container::-webkit-scrollbar-thumb:hover {
          --scrollbar-thumb-hover: #64748b;
        }
      `}</style>
    </div>
  );
}
