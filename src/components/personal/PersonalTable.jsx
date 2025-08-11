// src/components/personal/PersonalTable.jsx
import React, { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  User,
  Users,
  Package,
  DollarSign
} from 'lucide-react';

export default function PersonalTable({ data, loading }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeMenu, setActiveMenu] = useState(null);

  // Ordenação
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (sortConfig.key === 'valor' || sortConfig.key === 'valorFinal' || sortConfig.key === 'desconto') {
        return sortConfig.direction === 'asc' 
          ? (aValue || 0) - (bValue || 0)
          : (bValue || 0) - (aValue || 0);
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [data, sortConfig]);

  // Paginação
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronDown size={16} className="sort-icon inactive" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={16} className="sort-icon active" />
      : <ChevronDown size={16} className="sort-icon active" />;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusColor = (situacao) => {
    const status = situacao?.toLowerCase();
    switch (status) {
      case 'ativo': return 'success';
      case 'pendente': return 'warning';
      case 'cancelado': return 'danger';
      case 'suspenso': return 'neutral';
      default: return 'neutral';
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

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <Users size={48} />
        <h3>Nenhum registro encontrado</h3>
        <p>Importe uma planilha ou ajuste os filtros para visualizar os dados</p>
      </div>
    );
  }

  return (
    <div className="personal-table-container">
      <div className="table-wrapper">
        <table className="personal-table">
          <thead>
            <tr>
              <th 
                className="sortable"
                onClick={() => handleSort('personal')}
              >
                <div className="header-content">
                  <User size={16} />
                  <span>Personal</span>
                  {getSortIcon('personal')}
                </div>
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('aluno')}
              >
                <div className="header-content">
                  <Users size={16} />
                  <span>Aluno</span>
                  {getSortIcon('aluno')}
                </div>
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('produto')}
              >
                <div className="header-content">
                  <Package size={16} />
                  <span>Produto</span>
                  {getSortIcon('produto')}
                </div>
              </th>
              <th 
                className="sortable number"
                onClick={() => handleSort('valor')}
              >
                <div className="header-content">
                  <DollarSign size={16} />
                  <span>Valor</span>
                  {getSortIcon('valor')}
                </div>
              </th>
              <th 
                className="sortable number"
                onClick={() => handleSort('desconto')}
              >
                <div className="header-content">
                  <span>Desconto</span>
                  {getSortIcon('desconto')}
                </div>
              </th>
              <th 
                className="sortable number"
                onClick={() => handleSort('valorFinal')}
              >
                <div className="header-content">
                  <span>Valor Final</span>
                  {getSortIcon('valorFinal')}
                </div>
              </th>
              <th 
                className="sortable"
                onClick={() => handleSort('situacao')}
              >
                <div className="header-content">
                  <span>Situação</span>
                  {getSortIcon('situacao')}
                </div>
              </th>
              <th className="actions-col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr key={row.id || index} className="table-row">
                <td className="personal-cell">
                  <div className="personal-info">
                    <div className="personal-avatar">
                      {row.personal?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="personal-name">{row.personal}</span>
                  </div>
                </td>
                <td className="aluno-cell">
                  <span className="aluno-name">{row.aluno}</span>
                </td>
                <td className="produto-cell">
                  <span className="produto-name">{row.produto}</span>
                </td>
                <td className="number-cell">
                  <span className="valor-original">{formatCurrency(row.valor)}</span>
                </td>
                <td className="number-cell">
                  <span className="desconto-value">
                    {row.desconto > 0 ? `-${formatCurrency(row.desconto)}` : '-'}
                  </span>
                </td>
                <td className="number-cell">
                  <span className="valor-final">{formatCurrency(row.valorFinal)}</span>
                </td>
                <td className="status-cell">
                  <span className={`status-badge ${getStatusColor(row.situacao)}`}>
                    {row.situacao}
                  </span>
                </td>
                <td className="actions-cell">
                  <div className="actions-wrapper">
                    <button 
                      className="action-trigger"
                      onClick={() => setActiveMenu(activeMenu === row.id ? null : row.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {activeMenu === row.id && (
                      <div className="actions-menu">
                        <button className="action-item">
                          <Eye size={14} />
                          Visualizar
                        </button>
                        <button className="action-item">
                          <Edit size={14} />
                          Editar
                        </button>
                        <button className="action-item danger">
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, sortedData.length)} de {sortedData.length} registros
          </div>
          
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Anterior
            </button>
            
            <div className="page-numbers">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button 
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .personal-table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .personal-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .personal-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .personal-table th {
          padding: 16px 12px;
          text-align: left;
          font-weight: 600;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .personal-table th.number {
          text-align: right;
        }

        .personal-table th.actions-col {
          text-align: center;
          width: 80px;
        }

        .sortable {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s ease;
        }

        .sortable:hover {
          background: rgba(99, 102, 241, 0.05);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-start;
        }

        .personal-table th.number .header-content {
          justify-content: flex-end;
        }

        .sort-icon {
          transition: all 0.2s ease;
        }

        .sort-icon.inactive {
          color: #cbd5e1;
        }

        .sort-icon.active {
          color: #6366f1;
        }

        .personal-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .table-row {
          transition: background-color 0.2s ease;
        }

        .table-row:hover {
          background: rgba(99, 102, 241, 0.02);
        }

        .personal-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .personal-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .personal-name {
          font-weight: 500;
          color: #1e293b;
        }

        .aluno-name, .produto-name {
          color: #374151;
        }

        .number-cell {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .valor-original {
          color: #374151;
          font-weight: 500;
        }

        .desconto-value {
          color: #ef4444;
          font-weight: 500;
        }

        .valor-final {
          color: #10b981;
          font-weight: 600;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.success {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-badge.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .status-badge.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .status-badge.neutral {
          background: rgba(107, 114, 128, 0.1);
          color: #6b7280;
          border: 1px solid rgba(107, 114, 128, 0.2);
        }

        .actions-wrapper {
          position: relative;
        }

        .action-trigger {
          background: none;
          border: none;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s ease;
        }

        .action-trigger:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .actions-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          z-index: 10;
          min-width: 120px;
        }

        .action-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 13px;
          color: #374151;
          transition: background-color 0.2s ease;
        }

        .action-item:hover {
          background: #f9fafb;
        }

        .action-item.danger {
          color: #dc2626;
        }

        .action-item.danger:hover {
          background: rgba(239, 68, 68, 0.05);
        }

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: #fafafa;
          border-top: 1px solid #e2e8f0;
        }

        .pagination-info {
          color: #6b7280;
          font-size: 14px;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pagination-btn, .page-btn {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled), .page-btn:hover {
          border-color: #10b981;
          color: #059669;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-btn.active {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .page-numbers {
          display: flex;
          gap: 4px;
        }

        .table-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #6b7280;
          text-align: center;
        }

        .empty-state h3 {
          margin: 16px 0 8px;
          color: #374151;
        }

        .empty-state p {
          margin: 0;
          max-width: 400px;
        }

        @media (max-width: 768px) {
          .pagination {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .pagination-controls {
            flex-wrap: wrap;
            justify-content: center;
          }

          .personal-table {
            font-size: 12px;
          }

          .personal-table th,
          .personal-table td {
            padding: 12px 8px;
          }

          .personal-info {
            gap: 8px;
          }

          .personal-avatar {
            width: 32px;
            height: 32px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}