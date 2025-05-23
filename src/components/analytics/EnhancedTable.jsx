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
        }
        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .search-input {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          font-size: 0.95rem;
        }
        .table-container {
          overflow-x: auto;
        }
        .details-table.enhanced {
          width: 100%;
          border-collapse: collapse;
        }
        .details-table.enhanced th, .details-table.enhanced td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .details-table.enhanced th {
          background: #f8fafc;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
        }
        .details-table.enhanced th.sortable:hover {
          color: #4f46e5;
        }
        .status-badge.success {
          background-color: #dcfce7;
          color: #166534;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
