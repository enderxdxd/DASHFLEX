import { useState } from "react";
import dayjs from "dayjs";
import DatePicker from "react-datepicker";
import { useParams } from "react-router-dom"
import "react-datepicker/dist/react-datepicker.css";
import { collectionGroup, collection, onSnapshot,getDocs, writeBatch,updateDoc,doc } from "firebase/firestore";
import { db } from "../../firebase";

const VendasTable = ({ 
  vendas, 
  totalVendas,
  loading, 
  currentPage, 
  setCurrentPage,
  filters,
  dispatchFilters,
  updateVenda,
  produtos,
  responsaveis,
  onDeleteAll,         
  onDeleteByMonth,
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editedVenda, setEditedVenda] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deleteMonth, setDeleteMonth] = useState(dayjs().format("YYYY-MM"));
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalVendas / itemsPerPage);
  const { unidade } = useParams();
  
  // Função para lidar com mudanças nos campos editáveis
  const handleEditChange = (field, value) => {
    setEditedVenda({
      ...editedVenda,
      [field]: value
    });
  };
  async function deleteAllDocumentsFromSubcollection(unidade, subcollectionName) {
    const subcolRef = collection(db, "faturamento", unidade.toLowerCase(), subcollectionName);
    const snapshot = await getDocs(subcolRef);
  
    if (snapshot.empty) {
      console.log(`Nenhum documento encontrado na subcoleção "${subcollectionName}"`);
      return;
    }
  
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
  
    await batch.commit();
    console.log(`Todos os documentos da subcoleção "${subcollectionName}" foram excluídos.`);
  }
  
  // Cancelar edição
  const cancelEdit = () => {
    setEditingId(null);
    setEditedVenda({});
  };
  const handleDeleteAllClick = () => {
    if (window.confirm("Tem certeza que deseja excluir TODAS as vendas?")) {
      onDeleteAll();
    }
  };

  const handleDeleteMonthClick = () => {
    if (!deleteMonth) return;
    if (
      window.confirm(
        `Tem certeza que deseja excluir todas as vendas do período ${deleteMonth}?`
      )
    ) {
      onDeleteByMonth(deleteMonth);
    }
  };
  
  // Salvar alterações
  const saveChanges = async (id) => {
    const success = await updateVenda(id, editedVenda);
    if (success) {
      setEditingId(null);
      setEditedVenda({});
    }
  };
  
  // Formatar data para exibição
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return dayjs(dateStr).format("DD/MM/YYYY");
  };
  
  // Formatação de valores monetários
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Ordenação
  const handleSort = (key) => {
    let direction = "ascending";
    if (filters.sortConfig.key === key && filters.sortConfig.direction === "ascending") {
      direction = "descending";
    }
    dispatchFilters({ 
      type: 'SET_SORT_CONFIG', 
      payload: { key, direction } 
    });
  };
  
  return (
    <div className="table-section">
  <div className="table-header">
    <h2>Detalhes das Vendas</h2>
    <div className="table-actions">
      <div className="search-container">
        <input
          type="text"
          placeholder="Buscar..."
          value={filters.searchTerm}
          onChange={(e) => dispatchFilters({
            type: 'SET_SEARCH_TERM',
            payload: e.target.value
          })}
          className="search-input"
        />
            <button className="search-button" aria-label="Buscar">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>
      
      
          
          <div className="filter-container">
            <div className="filter-group">
              <label>Intervalo de Datas</label>
              <div
                className="date-picker-trigger"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <span>{filters.startDate ? dayjs(filters.startDate).format("DD/MM/YYYY") : "Data inicial"}</span>
                <span className="date-separator">a</span>
                <span>{filters.endDate ? dayjs(filters.endDate).format("DD/MM/YYYY") : "Data final"}</span>
                <svg 
                  className="calendar-icon" 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              
              {showDatePicker && (
                <div className="date-picker-wrapper">
                  <div className="date-picker-header">
                    <button 
                      className="clear-dates-button"
                      onClick={() => {
                        dispatchFilters({
                          type: 'SET_DATE_RANGE',
                          payload: { startDate: null, endDate: null }
                        });
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      Limpar
                    </button>
                    <button 
                      className="close-picker-button"
                      onClick={() => setShowDatePicker(false)}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      Fechar
                    </button>
                  </div>
                  
                  <DatePicker
                    selected={filters.startDate}
                    onChange={(dates) => {
                      const [start, end] = dates;
                      dispatchFilters({
                        type: 'SET_DATE_RANGE',
                        payload: { startDate: start, endDate: end }
                      });
                      if (start && end) setShowDatePicker(false);
                    }}
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    selectsRange
                    inline
                    monthsShown={2}
                    locale="pt-BR"
                    dateFormat="dd/MM/yyyy"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="delete-buttons flex items-center space-x-2">
      {/* Secondary Button Styles */}
      <button 
              className="delete-button"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja deletar todas as vendas?')) {
                  deleteAllDocumentsFromSubcollection(unidade, "vendas");
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6H5H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 11V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 11V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Deletar
            </button>

      {/* Modern Input Styles */}
      
    </div>
        </div>
      </div>
      
      
      <div className="table-container">
        <table className="vendas-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('dataFormatada')} className="sortable-header">
                Data
                {filters.sortConfig.key === 'dataFormatada' && (
                  <span className="sort-indicator">
                    {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('produto')} className="sortable-header">
                Produto
                {filters.sortConfig.key === 'produto' && (
                  <span className="sort-indicator">
                    {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th>Matrícula</th>
              <th onClick={() => handleSort('nome')} className="sortable-header">
                Nome
                {filters.sortConfig.key === 'nome' && (
                  <span className="sort-indicator">
                    {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('responsavel')} className="sortable-header">
                Responsável
                {filters.sortConfig.key === 'responsavel' && (
                  <span className="sort-indicator">
                    {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('valor')} className="sortable-header">
                Valor
                {filters.sortConfig.key === 'valor' && (
                  <span className="sort-indicator">
                    {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="loading-cell">
                  <div className="loading-indicator">
                    <div className="spinner-small"></div>
                    <span>Carregando dados...</span>
                  </div>
                </td>
              </tr>
            ) : vendas.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-table">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  <p>Nenhuma venda encontrada para os filtros selecionados</p>
                </td>
              </tr>
            ) : (
              vendas.map((venda) => (
                <tr key={venda.id} className={editingId === venda.id ? 'editing-row' : ''}>
                  <td>
                    {editingId === venda.id ? (
                      <input
                        type="date"
                        value={(editedVenda.dataFormatada || venda.dataFormatada || '')}
                        onChange={(e) => handleEditChange('dataFormatada', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      formatDate(venda.dataFormatada)
                    )}
                  </td>
                  <td>
                    {editingId === venda.id ? (
                      <select
                        value={(editedVenda.produto || venda.produto || '')}
                        onChange={(e) => handleEditChange('produto', e.target.value)}
                        className="edit-input"
                      >
                        {produtos.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      venda.produto
                    )}
                  </td>
                  <td>
                    {editingId === venda.id ? (
                      <input
                        type="text"
                        value={(editedVenda.matricula || venda.matricula || '')}
                        onChange={(e) => handleEditChange('matricula', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      venda.matricula
                    )}
                  </td>
                  <td>
                    {editingId === venda.id ? (
                      <input
                        type="text"
                        value={(editedVenda.nome || venda.nome || '')}
                        onChange={(e) => handleEditChange('nome', e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      venda.nome
                    )}
                  </td>
                  <td>
                    {editingId === venda.id ? (
                      <select
                        value={(editedVenda.responsavel || venda.responsavel || '')}
                        onChange={(e) => handleEditChange('responsavel', e.target.value)}
                        className="edit-input"
                      >
                        {responsaveis.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      venda.responsavel
                    )}
                  </td>
                  <td>
                    {editingId === venda.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={(editedVenda.valor !== undefined ? editedVenda.valor : venda.valor || '')}
                        onChange={(e) => handleEditChange('valor', parseFloat(e.target.value))}
                        className="edit-input"
                      />
                    ) : (
                      formatMoney(venda.valor)
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingId === venda.id ? (
                      <>
                        <button
                          onClick={() => saveChanges(venda.id)}
                          className="action-button save-button"
                          title="Salvar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                          </svg>
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="action-button cancel-button"
                          title="Cancelar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                          </svg>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(venda.id);
                          setEditedVenda({});
                        }}
                        className="action-button edit-button"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div className="pagination-info">
            <span>Página {currentPage} de {totalPages}</span>
            <span className="total-results">({totalVendas} resultados)</span>
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          </button>
        </div>
      )}
      
      <style jsx>{`
        .table-section {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      padding: 24px;
      margin-bottom: 32px;
    }
    
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .table-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }
    
    .table-actions {
      display: flex;
      gap: 16px;
    }
    
    .search-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .search-input {
      width: 260px;
      padding: 10px 16px;
      padding-right: 40px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #818cf8;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    
    .search-button {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      background: none;
      border: none;
      padding: 0 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      border-radius: 0 8px 8px 0;
    }
    
    .search-button:hover {
      background-color: #f8fafc;
    }
    
    .search-icon {
      color: #64748b;
    }
    
    .search-input:focus + .search-button .search-icon,
    .search-button:hover .search-icon {
      color: #4f46e5;
    }
        
        .filter-container {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .filter-group {
          position: relative;
        }
        
        .filter-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        
        .date-picker-trigger {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          color: var(--text-primary);
          min-width: 280px;
        }
        
        .date-picker-trigger:hover {
          border-color: var(--primary);
        }
        
        .date-separator {
          margin: 0 8px;
          color: var(--text-secondary);
        }
        
        .calendar-icon {
          margin-left: auto;
          color: var(--text-secondary);
        }
        
        .date-picker-wrapper {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 10;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          padding: 16px;
          border: 1px solid var(--border);
        }
        
        .date-picker-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .clear-dates-button,
        .close-picker-button {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .clear-dates-button {
          color: var(--danger);
        }
        
        .clear-dates-button:hover {
          background-color: var(--error-light);
        }
        
        .close-picker-button {
          color: var(--text-secondary);
        }
        
        .close-picker-button:hover {
          background-color: var(--background);
        }
        
        .table-container {
          overflow-x: auto;
          margin-bottom: 16px;
        }
        
        .vendas-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .vendas-table th {
          background-color: var(--background);
          font-weight: 600;
          color: var(--text-secondary);
          text-align: left;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .sortable-header {
          cursor: pointer;
          position: relative;
          padding-right: 24px !important;
        }
        
        .sortable-header:hover {
          color: var(--primary);
        }
        
        .sort-indicator {
          position: absolute;
          right: 8px;
          color: var(--primary);
        }
        
        .vendas-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
        }
        
        .vendas-table tr:hover td {
          background-color: var(--primary-light);
        }
        
        .actions-cell {
          white-space: nowrap;
          text-align: right;
        }
        
        .action-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          transition: all 0.2s;
          margin-left: 4px;
        }
        
        .edit-button {
          color: var(--primary);
        }
        
        .edit-button:hover {
          background-color: var(--primary-light);
        }
        
        .save-button {
          color: var(--success);
        }
        
        .save-button:hover {
          background-color: var(--success-light);
        }
        
        .cancel-button {
          color: var(--danger);
        }
        
        .cancel-button:hover {
          background-color: var(--error-light);
        }
        .delete-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background-color: transparent;
          color: var(--color-danger);
          border: 1px solid var(--color-danger);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
        }

        .delete-button:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }
        
        .editing-row td {
          background-color: rgba(79, 70, 229, 0.05);
        }
        
        .edit-input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--primary);
          border-radius: 4px;
          font-size: 14px;
        }
        
        .edit-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
        }
        
        .loading-cell, .empty-table {
          text-align: center;
          padding: 32px !important;
          color: var(--text-secondary);
        }
        
        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        
        .spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(79, 70, 229, 0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .empty-table {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .empty-table svg {
          opacity: 0.5;
          margin-bottom: 8px;
        }
        
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
        }
        
        .pagination-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background-color: white;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .pagination-button:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
          background-color: var(--primary-light);
        }
        
        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .pagination-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 16px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .total-results {
          font-size: 12px;
          margin-top: 2px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
      `}</style>
    </div>
  );
};

export default VendasTable;