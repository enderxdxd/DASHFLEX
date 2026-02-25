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
import '../../styles/PersonalManagerTable.css';

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
    <div className="unified-personal-table-modern">
      {/* Table Header */}
      <div className="table-header-modern">
        <div className="table-info-modern">
          <h3>Registros de Personal Trainers</h3>
          <p>{sortedData.length} registro{sortedData.length !== 1 ? 's' : ''} encontrado{sortedData.length !== 1 ? 's' : ''}</p>
        </div>
        
        {selectedItems.length > 0 && (
          <div className="bulk-actions-modern">
            <span>{selectedItems.length} selecionado{selectedItems.length !== 1 ? 's' : ''}</span>
            <button className="bulk-btn-modern delete">
              <Trash2 size={14} />
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
    </div>
  );
}
