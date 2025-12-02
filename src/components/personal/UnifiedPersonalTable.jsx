// src/components/personal/UnifiedPersonalTable.jsx
import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  MapPin,
  User,
  GraduationCap,
  Package,
  DollarSign,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function UnifiedPersonalTable({ data, loading }) {
  const [sortField, setSortField] = useState('personal');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);

  // Dados ordenados
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return [...data].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Tratamento especial para valores numéricos
      if (sortField === 'valorFinal' || sortField === 'valor' || sortField === 'desconto') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [data, sortField, sortDirection]);

  // Paginação
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === paginatedData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedData.map(item => item.id));
    }
  };

  const getUnidadeColor = (unidade) => {
    const colors = {
      'alphaville': '#3b82f6',
      'buenavista': '#10b981',
      'marista': '#f59e0b',
      'palmas': '#ec4899'
    };
    return colors[unidade] || '#6b7280';
  };

  const getUnidadeName = (unidade) => {
    const names = {
      'alphaville': 'Alphaville',
      'buenavista': 'Buena Vista',
      'marista': 'Marista',
      'palmas': 'Palmas'
    };
    return names[unidade] || unidade;
  };

  const getSituacaoIcon = (situacao) => {
    switch (situacao?.toLowerCase()) {
      case 'pago':
        return <CheckCircle size={16} className="situacao-icon pago" />;
      case 'livre':
        return <Clock size={16} className="situacao-icon livre" />;
      default:
        return <Clock size={16} className="situacao-icon default" />;
    }
  };

  if (loading) {
    return (
      <div className="table-loading">
        <div className="loading-spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-empty">
        <Package size={48} />
        <h3>Nenhum registro encontrado</h3>
        <p>Faça upload de planilhas ou ajuste os filtros para visualizar os dados.</p>
      </div>
    );
  }

  return (
    <div className="unified-personal-table">
      {/* Table Header */}
      <div className="table-header">
        <div className="table-info">
          <h3>Registros de Personal Trainers</h3>
          <p>{sortedData.length} registro{sortedData.length !== 1 ? 's' : ''} encontrado{sortedData.length !== 1 ? 's' : ''}</p>
        </div>
        
        {selectedItems.length > 0 && (
          <div className="bulk-actions">
            <span>{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selecionado{selectedItems.length !== 1 ? 's' : ''}</span>
            <button className="bulk-btn delete">
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="sortable" onClick={() => handleSort('unidade')}>
                <div className="th-content">
                  <MapPin size={16} />
                  Unidade
                  {sortField === 'unidade' && (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort('personal')}>
                <div className="th-content">
                  <User size={16} />
                  Personal
                  {sortField === 'personal' && (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort('aluno')}>
                <div className="th-content">
                  <GraduationCap size={16} />
                  Aluno
                  {sortField === 'aluno' && (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort('produto')}>
                <div className="th-content">
                  <Package size={16} />
                  Produto
                  {sortField === 'produto' && (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort('valorFinal')}>
                <div className="th-content">
                  <DollarSign size={16} />
                  Valor Final
                  {sortField === 'valorFinal' && (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort('situacao')}>
                <div className="th-content">
                  Situação
                  {sortField === 'situacao' && (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
              <th className="actions-col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={item.id || index} className={selectedItems.includes(item.id) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                  />
                </td>
                <td>
                  <div className="unidade-cell">
                    <div 
                      className="unidade-badge"
                      style={{ backgroundColor: getUnidadeColor(item.unidade) }}
                    >
                      <MapPin size={12} />
                    </div>
                    {getUnidadeName(item.unidade)}
                  </div>
                </td>
                <td className="personal-cell">
                  <div className="personal-info">
                    <div className="personal-avatar">
                      <User size={16} />
                    </div>
                    <span>{item.personal || '-'}</span>
                  </div>
                </td>
                <td className="aluno-cell">{item.aluno || '-'}</td>
                <td className="produto-cell">{item.produto || '-'}</td>
                <td className="valor-cell">
                  <span className="valor-amount">
                    R$ {(item.valorFinal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="situacao-cell">
                  <div className="situacao-badge">
                    {getSituacaoIcon(item.situacao)}
                    <span>{item.situacao || 'N/A'}</span>
                  </div>
                </td>
                <td className="actions-cell">
                  <div className="action-menu">
                    <button className="action-btn">
                      <MoreVertical size={16} />
                    </button>
                    <div className="action-dropdown">
                      <button className="action-item">
                        <Eye size={14} />
                        Visualizar
                      </button>
                      <button className="action-item">
                        <Edit size={14} />
                        Editar
                      </button>
                      <button className="action-item delete">
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, sortedData.length)} de {sortedData.length} registros
          </div>
          <div className="pagination-controls">
            <button 
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Anterior
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`page-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            
            <button 
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .unified-personal-table {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .table-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .table-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #64748b;
          text-align: center;
        }

        .table-empty svg {
          color: #cbd5e1;
          margin-bottom: 16px;
        }

        .table-empty h3 {
          margin: 0 0 8px;
          color: #374151;
          font-size: 18px;
        }

        .table-empty p {
          margin: 0;
          font-size: 14px;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-info h3 {
          margin: 0 0 4px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .table-info p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #64748b;
          font-size: 14px;
        }

        .bulk-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .bulk-btn.delete {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .bulk-btn.delete:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #f1f5f9;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          font-size: 14px;
          border-bottom: 1px solid #e2e8f0;
        }

        .data-table th.sortable {
          cursor: pointer;
          user-select: none;
        }

        .data-table th.sortable:hover {
          background: #e2e8f0;
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .data-table td {
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
          color: #374151;
        }

        .data-table tr:hover {
          background: #f8fafc;
        }

        .data-table tr.selected {
          background: rgba(16, 185, 129, 0.05);
        }

        .checkbox-col,
        .actions-col {
          width: 50px;
          text-align: center;
        }

        .unidade-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .unidade-badge {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .personal-cell {
          min-width: 150px;
        }

        .personal-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .personal-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .valor-cell {
          text-align: right;
        }

        .valor-amount {
          font-weight: 600;
          color: #059669;
        }

        .situacao-cell {
          min-width: 120px;
        }

        .situacao-badge {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .situacao-icon.pago {
          color: #10b981;
        }

        .situacao-icon.livre {
          color: #f59e0b;
        }

        .situacao-icon.default {
          color: #6b7280;
        }

        .action-menu {
          position: relative;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: #e2e8f0;
          color: #475569;
        }

        .action-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10;
          min-width: 120px;
          display: none;
        }

        .action-menu:hover .action-dropdown {
          display: block;
        }

        .action-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: none;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-item:hover {
          background: #f8fafc;
        }

        .action-item.delete {
          color: #dc2626;
        }

        .action-item.delete:hover {
          background: #fef2f2;
        }

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .pagination-info {
          color: #64748b;
          font-size: 14px;
        }

        .pagination-controls {
          display: flex;
          gap: 4px;
        }

        .page-btn {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .page-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .page-btn.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .table-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .bulk-actions {
            justify-content: space-between;
          }

          .pagination {
            flex-direction: column;
            gap: 12px;
          }

          .pagination-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
