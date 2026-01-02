import { useState } from "react";
import dayjs from "dayjs";
import DatePicker from "react-datepicker";
import { useParams } from "react-router-dom"
import "react-datepicker/dist/react-datepicker.css";
import { collectionGroup, collection, onSnapshot,getDocs, writeBatch,updateDoc,doc } from "firebase/firestore";
import { db } from "../../firebase";
import { deleteVendasDoMes } from "../../utils/firestoreHelpers";
import { useUserRole } from "../../hooks/useUserRole";

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
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [deleteMode, setDeleteMode] = useState('month'); // 'month' | 'range'
  const [startDate, setStartDate] = useState(dayjs().startOf('month').toDate());
  const [endDate, setEndDate] = useState(dayjs().endOf('month').toDate());
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalVendas / itemsPerPage);
  const { unidade } = useParams();
  const { role, loading: roleLoading } = useUserRole();
  
  // Função para verificar se o usuário atual é admin
  const isAdmin = role === "admin";

  // Função para lidar com mudanças nos campos editáveis
  const handleEditChange = (field, value) => {
    if (!isAdmin) return; // Apenas admin pode editar
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
  
    // Firestore tem limite de 500 operações por batch
    const BATCH_SIZE = 500;
    const docs = snapshot.docs;
    const totalDocs = docs.length;
    
    console.log(`Deletando ${totalDocs} documentos em batches de ${BATCH_SIZE}...`);
    
    // Processar em lotes de 500
    for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, Math.min(i + BATCH_SIZE, totalDocs));
      
      batchDocs.forEach((doc) => batch.delete(doc.ref));
      
      await batch.commit();
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} concluído (${batchDocs.length} documentos)`);
    }
  
    console.log(`Todos os documentos da subcoleção "${subcollectionName}" foram excluídos.`);
  }
  
  // Iniciar edição
  const startEdit = (venda) => {
    if (!isAdmin) {
      alert("Apenas administradores podem editar vendas.");
      return;
    }
    setEditingId(venda.id);
    setEditedVenda({ ...venda });
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingId(null);
    setEditedVenda({});
  };
  const handleDeleteAllClick = () => {
    if (!isAdmin) {
      alert("Apenas administradores podem excluir vendas.");
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir TODAS as vendas?")) {
      onDeleteAll();
    }
  };
  

  const handleDeleteMonthClick = async () => {
    if (!window.confirm(`Excluir todas as vendas de ${deleteMonth}?`)) return;
    try {
      setLoadingDelete(true);
      const count = await deleteVendasDoMes(unidade, deleteMonth);
      alert(`✅ ${count} vendas deletadas de ${deleteMonth}`);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao deletar vendas do mês.");
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleDeleteRangeClick = async () => {
    const startDateStr = dayjs(startDate).format('YYYY-MM-DD');
    const endDateStr = dayjs(endDate).format('YYYY-MM-DD');
    
    if (!window.confirm(`Excluir todas as vendas entre ${dayjs(startDate).format('DD/MM/YYYY')} e ${dayjs(endDate).format('DD/MM/YYYY')}?`)) return;
    
    try {
      setLoadingDelete(true);
      const count = await deleteVendasPorIntervalo(unidade, startDateStr, endDateStr);
      alert(`✅ ${count} vendas deletadas no período selecionado`);
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao deletar vendas do período.");
    } finally {
      setLoadingDelete(false);
    }
  };

  // Função para deletar vendas por intervalo de datas
  const deleteVendasPorIntervalo = async (unidade, startDate, endDate) => {
    const vendasRef = collection(db, "faturamento", unidade.toLowerCase(), "vendas");
    const snapshot = await getDocs(vendasRef);
    
    if (snapshot.empty) {
      return 0;
    }
    
    // Filtrar documentos que estão no intervalo
    const docsToDelete = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const vendaDate = data.dataFormatada;
      
      if (vendaDate && vendaDate >= startDate && vendaDate <= endDate) {
        docsToDelete.push(doc);
      }
    });
    
    if (docsToDelete.length === 0) {
      return 0;
    }
    
    // Firestore tem limite de 500 operações por batch
    const BATCH_SIZE = 500;
    const totalDocs = docsToDelete.length;
    
    console.log(`Deletando ${totalDocs} vendas em batches de ${BATCH_SIZE}...`);
    
    // Processar em lotes de 500
    for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchDocs = docsToDelete.slice(i, Math.min(i + BATCH_SIZE, totalDocs));
      
      batchDocs.forEach((doc) => batch.delete(doc.ref));
      
      await batch.commit();
      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} concluído (${batchDocs.length} documentos)`);
    }
    
    return totalDocs;
  };
  
  // Salvar alterações
  const saveChanges = async (id) => {
    if (!isAdmin) {
      alert("Apenas administradores podem editar vendas.");
      return;
    }
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
  
  if (roleLoading) {
    return <div className="table-section"><div className="loading-indicator">Carregando permissões...</div></div>;
  }

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
          
          <div className="delete-buttons">
            {role === "admin" && (
              <>
                <div className="date-inputs-container">
                  <DatePicker
                    selected={startDate}
                    onChange={date => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    placeholderText="Data inicial"
                    dateFormat="dd/MM/yyyy"
                    className="date-input"
                    maxDate={endDate}
                  />
                  <span className="date-separator">até</span>
                  <DatePicker
                    selected={endDate}
                    onChange={date => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    placeholderText="Data final"
                    dateFormat="dd/MM/yyyy"
                    className="date-input"
                  />
                </div>
                
                <button
                  className="delete-button"
                  onClick={handleDeleteRangeClick}
                  disabled={loadingDelete || !startDate || !endDate}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {loadingDelete ? "Deletando..." : "Deletar Período"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="table-wrapper">
        <div className="table-container">
          <table className="vendas-table">
            <thead>
              <tr>
                <th className="col-data sortable-header" onClick={() => handleSort('dataFormatada')}>
                  Data
                  {filters.sortConfig.key === 'dataFormatada' && (
                    <span className="sort-indicator">
                      {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="col-produto sortable-header" onClick={() => handleSort('produto')}>
                  Produto
                  {filters.sortConfig.key === 'produto' && (
                    <span className="sort-indicator">
                      {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="col-matricula">Matrícula</th>
                <th className="col-nome sortable-header" onClick={() => handleSort('nome')}>
                  Nome
                  {filters.sortConfig.key === 'nome' && (
                    <span className="sort-indicator">
                      {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="col-responsavel sortable-header" onClick={() => handleSort('responsavel')}>
                  Responsável
                  {filters.sortConfig.key === 'responsavel' && (
                    <span className="sort-indicator">
                      {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="col-valor sortable-header" onClick={() => handleSort('valor')}>
                  Valor
                  {filters.sortConfig.key === 'valor' && (
                    <span className="sort-indicator">
                      {filters.sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th className="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="loading-cell">
                    <div className="loading-indicator">
                      <div className="spinner-small"></div>
                      <span>Carregando dados...</span>
                    </div>
                  </td>
                </tr>
              ) : vendas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-table">
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
                    <td className="col-data">
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
                    <td className="col-produto">
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
                    <td className="col-matricula">
                      {editingId === venda.id ? (
                        <input
                          type="text"
                          value={(editedVenda.matricula || venda.matricula || '')}
                          onChange={(e) => handleEditChange('matricula', e.target.value)}
                          className="edit-input"
                        />
                      ) : (
                        venda.matricula || '-'
                      )}
                    </td>
                    <td className="col-nome">
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
                    <td className="col-responsavel">
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
                    <td className="col-valor">
                      {editingId === venda.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={(editedVenda.valor !== undefined ? editedVenda.valor : venda.valor || '')}
                          onChange={(e) => handleEditChange('valor', parseFloat(e.target.value))}
                          className="edit-input"
                        />
                      ) : (
                        <span className="money-value">{formatMoney(venda.valor)}</span>
                      )}
                    </td>
                    <td className="col-acoes">
                      <div className="actions-cell">
                        {role === "admin" ? (
                          editingId === venda.id ? (
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
                          )
                        ) : (
                          <span className="no-actions">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    background: linear-gradient(135deg, var(--bg-primary, #ffffff) 0%, var(--bg-secondary, #fafcff) 100%);
    border-radius: 16px;
    padding: 28px;
    margin-bottom: 32px;
    box-shadow: var(--shadow-table, 0 4px 20px rgba(0, 0, 0, 0.03)), var(--shadow-table-accent, 0 1px 3px rgba(0, 0, 0, 0.05));
    border: 1px solid var(--border-primary, rgba(226, 232, 240, 0.8));
    position: relative;
    overflow: visible;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .table-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--primary, #6366f1) 0%, var(--primary-light, #818cf8) 50%, var(--primary, #6366f1) 100%);
    opacity: 0.7;
  }
  
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .table-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    margin: 0;
    background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .table-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  /* Campo de busca */
  .search-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .search-input {
    padding: 10px 16px;
    padding-right: 38px;
    background: linear-gradient(135deg, var(--bg-input, #f8fafc) 0%, var(--bg-input-light, #f1f5f9) 100%);
    border: 1px solid var(--border-input, #e2e8f0);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary, #1e293b);
    width: 240px;
    height: 40px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-input, 0 1px 3px rgba(0, 0, 0, 0.05));
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--primary, #6366f1);
    box-shadow: 0 0 0 3px var(--primary-alpha, rgba(99, 102, 241, 0.1)), var(--shadow-input-focus, 0 4px 12px rgba(99, 102, 241, 0.15));
    background: linear-gradient(135deg, var(--bg-input-focus, white) 0%, var(--bg-input-focus-light, #f8fafc) 100%);
    transform: translateY(-1px);
  }
  
  .search-input::placeholder {
    color: var(--text-placeholder, #94a3b8);
  }
  
  .search-button {
    position: absolute;
    right: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted, #94a3b8);
    transition: all 0.2s ease;
    border-radius: 4px;
    width: 24px;
    height: 24px;
  }
  
  .search-button:hover {
    color: var(--primary, #6366f1);
    background: linear-gradient(135deg, var(--primary-light, rgba(99, 102, 241, 0.1)) 0%, var(--primary-lighter, rgba(99, 102, 241, 0.05)) 100%);
    transform: scale(1.1);
  }
  
  /* Container de botões de delete */
  .delete-buttons {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  /* Toggle minimalista */
  .mode-toggle {
    display: inline-flex;
    background: var(--bg-input, #f8fafc);
    border: 1px solid var(--border-input, #e2e8f0);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }
  
  .toggle-option {
    display: flex;
    align-items: center;
    cursor: pointer;
    position: relative;
  }
  
  .toggle-option input[type="radio"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle-label {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary, #64748b);
    border-radius: 4px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  
  .toggle-option input[type="radio"]:checked + .toggle-label {
    background: var(--primary, #6366f1);
    color: white;
    box-shadow: 0 1px 3px rgba(99, 102, 241, 0.3);
  }
  
  .toggle-option:hover .toggle-label {
    color: var(--text-primary, #1e293b);
  }
  
  .toggle-option input[type="radio"]:checked + .toggle-label:hover {
    color: white;
  }
  
  /* Container padronizado para inputs de data */
  .date-inputs-container {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    position: relative;
    z-index: 20;
  }
  
  /* Container de intervalo de datas */
  .date-range-container {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    position: relative;
    z-index: 20;
  }
  
  .date-input {
    padding: 10px 14px;
    background: linear-gradient(135deg, var(--bg-input, #f8fafc) 0%, var(--bg-input-light, #f1f5f9) 100%);
    border: 1px solid var(--border-input, #e2e8f0);
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-primary, #1e293b);
    height: 40px;
    width: 140px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-input, 0 1px 3px rgba(0, 0, 0, 0.05));
    box-sizing: border-box;
    position: relative;
    z-index: 10;
  }
  
  .date-input:focus {
    outline: none;
    border-color: var(--primary, #6366f1);
    box-shadow: 0 0 0 3px var(--primary-alpha, rgba(99, 102, 241, 0.1));
  }
  
  .date-separator {
    font-size: 12px;
    color: var(--text-secondary, #64748b);
    font-weight: 500;
    white-space: nowrap;
    padding: 0 4px;
  }
  
  /* Botão de deletar */
  .delete-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, var(--bg-delete, rgba(239, 68, 68, 0.05)) 0%, var(--bg-delete-light, rgba(239, 68, 68, 0.02)) 100%);
    color: var(--danger, #ef4444);
    border: 1px solid var(--border-delete, rgba(239, 68, 68, 0.25));
    transition: all 0.2s ease;
    height: 40px;
    box-shadow: var(--shadow-delete, 0 2px 8px rgba(239, 68, 68, 0.1));
  }
  
  .delete-button:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--bg-delete-hover, rgba(239, 68, 68, 0.1)) 0%, var(--bg-delete-hover-light, rgba(239, 68, 68, 0.05)) 100%);
    border-color: var(--danger, #ef4444);
    transform: translateY(-1px);
    box-shadow: var(--shadow-delete-hover, 0 4px 12px rgba(239, 68, 68, 0.2));
  }
  
  .delete-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  /* Wrapper e container da tabela */
  .table-wrapper {
    position: relative;
    width: 100%;
    z-index: 1;
  }
  
  .table-container {
    overflow-x: auto;
    overflow-y: visible;
    border-radius: 12px;
    border: 1px solid var(--border-table, #e2e8f0);
    box-shadow: var(--shadow-table-container, 0 2px 8px rgba(0, 0, 0, 0.05));
    background: var(--bg-table, white);
    position: relative;
    z-index: 1;
  }
  
  /* TABELA PRINCIPAL - LAYOUT FIXO */
  .vendas-table {
    width: 100%;
    table-layout: fixed; /* CRUCIAL para alinhamento */
    border-collapse: collapse;
    font-size: 12px; /* Reduzido de 13px */
    background: var(--bg-table, white);
    min-width: auto; /* Removido min-width fixo */
  }
  
  /* DEFINIÇÃO DE LARGURAS DAS COLUNAS - OTIMIZADAS */
  .col-data { width: 85px; }
  .col-produto { width: 220px; }
  .col-matricula { width: 75px; }
  .col-nome { width: 180px; }
  .col-responsavel { width: 150px; }
  .col-valor { width: 90px; }
  .col-acoes { width: 80px; }
  
  /* Cabeçalho da tabela */
  .vendas-table thead {
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .vendas-table th {
    padding: 10px 12px; /* Reduzido de 14px 16px */
    font-weight: 600;
    font-size: 11px; /* Tamanho menor para headers */
    color: var(--text-table-header, #475569);
    border-bottom: 1px solid var(--border-table-header, #e2e8f0);
    background: linear-gradient(135deg, var(--bg-table-header, #f8fafc) 0%, var(--bg-table-header-light, #f1f5f9) 100%);
    text-align: left;
    vertical-align: middle;
  }
  
  .vendas-table th:first-child {
    border-top-left-radius: 11px;
  }
  
  .vendas-table th:last-child {
    border-top-right-radius: 11px;
  }
  
  /* Alinhamentos específicos */
  .vendas-table th.col-valor {
    text-align: right;
  }
  
  .vendas-table th.col-acoes {
    text-align: center;
  }
  
  .sortable-header {
    cursor: pointer;
    user-select: none;
    position: relative;
    padding-right: 28px !important;
    transition: all 0.2s ease;
  }
  
  .sortable-header:hover {
    color: var(--primary, #6366f1);
    background: linear-gradient(135deg, var(--bg-header-hover, rgba(99, 102, 241, 0.05)) 0%, var(--bg-header-hover-light, rgba(99, 102, 241, 0.02)) 100%);
  }
  
  .sort-indicator {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--primary, #6366f1);
    font-weight: bold;
    transition: transform 0.2s ease;
  }
  
  /* Células da tabela */
  .vendas-table td {
    padding: 10px 12px; /* Reduzido de 14px 16px */
    border-bottom: 1px solid var(--border-table-row, #f1f5f9);
    color: var(--text-table-cell, #334155);
    vertical-align: middle;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  /* Células específicas com diferentes comportamentos */
  .vendas-table td.col-data {
    font-family: 'Roboto Mono', monospace;
    font-size: 11px; /* Reduzido */
    color: var(--text-table-mono, #475569);
    font-weight: 500;
  }
  
  .vendas-table td.col-produto,
  .vendas-table td.col-nome {
    white-space: normal;
    word-wrap: break-word;
    line-height: 1.3; /* Mais compacto */
    font-size: 11px; /* Reduzido */
  }
  
  .vendas-table td.col-produto {
    font-weight: 600;
    color: var(--text-table-important, #1e293b);
  }
  
  .vendas-table td.col-matricula {
    font-family: 'Roboto Mono', monospace;
    font-size: 10px; /* Bem pequeno */
    color: var(--text-table-secondary, #64748b);
    font-weight: 500;
    text-align: center;
  }
  
  .vendas-table td.col-nome {
    font-weight: 500; /* Reduzido de 600 */
    color: var(--text-table-important, #1e293b);
  }
  
  .vendas-table td.col-responsavel {
    color: var(--text-table-secondary, #64748b);
    font-size: 11px; /* Reduzido */
  }
  
  .vendas-table td.col-valor {
    text-align: right;
    font-size: 12px; /* Mantido um pouco maior para valores */
  }
  
  .vendas-table td.col-acoes {
    text-align: center;
    padding: 8px; /* Menos padding para ações */
  }
  
  /* Valor monetário */
  .money-value {
    font-weight: 700;
    color: var(--text-table-value, #1e293b);
    font-variant-numeric: tabular-nums;
    background: linear-gradient(135deg, var(--text-table-value, #1e293b) 0%, var(--primary, #6366f1) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  /* Hover nas linhas */
  .vendas-table tbody tr {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--bg-table-row, transparent);
  }
  
  .vendas-table tbody tr:hover {
    background: linear-gradient(135deg, var(--bg-table-row-hover, #f8fafc) 0%, var(--bg-table-row-hover-light, #f1f5f9) 100%);
    transform: translateX(2px);
    box-shadow: var(--shadow-table-row, 0 2px 8px rgba(0, 0, 0, 0.05));
  }
  
  .vendas-table tbody tr:nth-child(even) {
    background: linear-gradient(135deg, var(--bg-table-row-even, #fcfcff) 0%, var(--bg-table-row-even-light, #fafbff) 100%);
  }
  
  .vendas-table tbody tr:nth-child(even):hover {
    background: linear-gradient(135deg, var(--bg-table-row-hover, #f8fafc) 0%, var(--bg-table-row-hover-light, #f1f5f9) 100%);
  }
  
  /* Estados de carregamento e vazio */
  .loading-cell,
  .empty-table {
    text-align: center;
    padding: 40px !important;
  }
  
  .loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-secondary, #64748b);
  }
  
  .spinner-small {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--spinner-bg, rgba(99, 102, 241, 0.15));
    border-top-color: var(--primary, #6366f1);
    animation: spinner 0.8s linear infinite;
  }
  
  @keyframes spinner {
    to {
      transform: rotate(360deg);
    }
  }
  
  .empty-table {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: var(--text-muted, #94a3b8);
  }
  
  .empty-table svg {
    opacity: 0.5;
    width: 40px;
    height: 40px;
    color: var(--text-muted, #94a3b8);
  }
  
  .empty-table p {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary, #64748b);
  }
  
  /* Campos de edição */
  .edit-input {
    width: 100%;
    padding: 8px 12px;
    border: 2px solid var(--primary, #6366f1);
    border-radius: 6px;
    font-size: 13px;
    background: linear-gradient(135deg, var(--bg-edit, white) 0%, var(--bg-edit-light, #f8fafc) 100%);
    color: var(--text-primary, #1e293b);
    transition: all 0.2s ease;
    box-shadow: var(--shadow-edit, 0 2px 8px rgba(99, 102, 241, 0.1));
  }
  
  .edit-input:focus {
    outline: none;
    box-shadow: 0 0 0 3px var(--primary-alpha, rgba(99, 102, 241, 0.1)), var(--shadow-edit-focus, 0 4px 12px rgba(99, 102, 241, 0.2));
    transform: scale(1.01);
  }
  
  select.edit-input {
    padding-right: 28px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236366f1' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 16px;
    appearance: none;
  }
  
  /* Linha em edição */
  .editing-row {
    background: linear-gradient(135deg, var(--bg-editing, rgba(99, 102, 241, 0.05)) 0%, var(--bg-editing-light, rgba(99, 102, 241, 0.02)) 100%) !important;
    border-left: 3px solid var(--primary, #6366f1);
    box-shadow: var(--shadow-editing, 0 4px 12px rgba(99, 102, 241, 0.1));
  }
  
  /* Container de ações */
  .actions-cell {
    display: flex;
    gap: 6px;
    justify-content: center;
    align-items: center;
  }
  
  .action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px; /* Reduzido de 32px */
    height: 28px; /* Reduzido de 32px */
    border-radius: 6px; /* Mais compacto */
    border: none;
    cursor: pointer;
    background-color: transparent;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .action-button svg {
    width: 14px; /* Ícones menores */
    height: 14px;
  }
  
  .action-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.2s ease;
    border-radius: inherit;
  }
  
  .action-button:hover::before {
    opacity: 0.1;
  }
  
  .edit-button {
    color: var(--primary, #6366f1);
  }
  
  .edit-button:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-edit-btn, 0 4px 12px rgba(99, 102, 241, 0.2));
  }
  
  .save-button {
    color: var(--success, #10b981);
  }
  
  .save-button:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-save-btn, 0 4px 12px rgba(16, 185, 129, 0.2));
  }
  
  .cancel-button {
    color: var(--danger, #ef4444);
  }
  
  .cancel-button:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-cancel-btn, 0 4px 12px rgba(239, 68, 68, 0.2));
  }
  
  .no-actions {
    color: var(--text-muted, #94a3b8);
    font-size: 14px;
  }
  
  /* Paginação */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 0 0;
    gap: 4px;
  }
  
  .pagination-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background-color: transparent;
    border: 1px solid var(--border-pagination, #e2e8f0);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: var(--text-secondary, #64748b);
    font-weight: 500;
  }
  
  .pagination-button:hover:not(:disabled) {
    border-color: var(--primary, #6366f1);
    color: var(--primary, #6366f1);
    background: linear-gradient(135deg, var(--bg-pagination-hover, rgba(99, 102, 241, 0.05)) 0%, var(--bg-pagination-hover-light, rgba(99, 102, 241, 0.02)) 100%);
    transform: translateY(-1px);
    box-shadow: var(--shadow-pagination, 0 2px 8px rgba(99, 102, 241, 0.1));
  }
  
  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pagination-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 12px;
    font-size: 13px;
    color: var(--text-table-header, #475569);
    font-weight: 600;
  }
  
  .total-results {
    font-size: 12px;
    color: var(--text-muted, #94a3b8);
    margin-top: 4px;
    font-weight: 500;
  }
  
  /* Dark Mode */
  .dark .table-section,
  [data-theme="dark"] .table-section {
    --bg-primary: #1e293b;
    --bg-secondary: #0f172a;
    --bg-input: #334155;
    --bg-input-light: #475569;
    --bg-input-focus: #334155;
    --bg-input-focus-light: #475569;
    --bg-input-hover: #334155;
    --bg-input-hover-light: #475569;
    --bg-popup: #1e293b;
    --bg-popup-light: #334155;
    --bg-button-hover: #334155;
    --bg-button-hover-light: #475569;
    --bg-table: #1e293b;
    --bg-table-header: #0f172a;
    --bg-table-header-light: #1e293b;
    --bg-header-hover: rgba(99, 102, 241, 0.1);
    --bg-header-hover-light: rgba(99, 102, 241, 0.05);
    --bg-table-row: transparent;
    --bg-table-row-hover: #334155;
    --bg-table-row-hover-light: #475569;
    --bg-table-row-even: #0f172a;
    --bg-table-row-even-light: #1e293b;
    --bg-edit: #334155;
    --bg-edit-light: #475569;
    --bg-editing: rgba(99, 102, 241, 0.1);
    --bg-editing-light: rgba(99, 102, 241, 0.05);
    --bg-delete: rgba(239, 68, 68, 0.1);
    --bg-delete-light: rgba(239, 68, 68, 0.05);
    --bg-delete-hover: rgba(239, 68, 68, 0.2);
    --bg-delete-hover-light: rgba(239, 68, 68, 0.1);
    --bg-pagination-hover: rgba(99, 102, 241, 0.1);
    --bg-pagination-hover-light: rgba(99, 102, 241, 0.05);
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --text-placeholder: #64748b;
    --text-table-header: #cbd5e1;
    --text-table-cell: #e2e8f0;
    --text-table-mono: #cbd5e1;
    --text-table-important: #f1f5f9;
    --text-table-secondary: #94a3b8;
    --text-table-value: #f1f5f9;
    --border-primary: #334155;
    --border-input: #475569;
    --border-popup: #475569;
    --border-divider: #334155;
    --border-table: #334155;
    --border-table-header: #475569;
    --border-table-row: #334155;
    --border-delete: rgba(239, 68, 68, 0.3);
    --border-pagination: #475569;
    --primary: #6366f1;
    --primary-light: #818cf8;
    --primary-alpha: rgba(99, 102, 241, 0.2);
    --success: #22c55e;
    --danger: #f87171;
    --spinner-bg: rgba(99, 102, 241, 0.2);
    --shadow-table: 0 4px 20px rgba(0, 0, 0, 0.3);
    --shadow-table-accent: 0 1px 3px rgba(0, 0, 0, 0.2);
    --shadow-input: 0 1px 3px rgba(0, 0, 0, 0.2);
    --shadow-input-focus: 0 4px 12px rgba(99, 102, 241, 0.3);
    --shadow-input-hover: 0 4px 12px rgba(0, 0, 0, 0.3);
    --shadow-popup: 0 20px 40px rgba(0, 0, 0, 0.6);
    --shadow-table-container: 0 2px 8px rgba(0, 0, 0, 0.2);
    --shadow-table-row: 0 2px 8px rgba(0, 0, 0, 0.2);
    --shadow-edit: 0 2px 8px rgba(99, 102, 241, 0.2);
    --shadow-edit-focus: 0 4px 12px rgba(99, 102, 241, 0.3);
    --shadow-editing: 0 4px 12px rgba(99, 102, 241, 0.2);
    --shadow-edit-btn: 0 4px 12px rgba(99, 102, 241, 0.3);
    --shadow-save-btn: 0 4px 12px rgba(34, 197, 94, 0.3);
    --shadow-cancel-btn: 0 4px 12px rgba(248, 113, 113, 0.3);
    --shadow-delete: 0 2px 8px rgba(248, 113, 113, 0.2);
    --shadow-delete-hover: 0 4px 12px rgba(248, 113, 113, 0.3);
    --shadow-pagination: 0 2px 8px rgba(99, 102, 241, 0.2);
  }
  
  /* Responsividade */
  @media (max-width: 1200px) {
    /* Para telas menores, reduzir ainda mais */
    .col-data { width: 80px; }
    .col-produto { width: 180px; }
    .col-matricula { width: 70px; }
    .col-nome { width: 150px; }
    .col-responsavel { width: 130px; }
    .col-valor { width: 85px; }
    .col-acoes { width: 70px; }
    
    .vendas-table {
      font-size: 11px;
    }
  }
  
  @media (max-width: 992px) {
    /* Tablets - começa a precisar de scroll */
    .table-container {
      margin: 0 -20px;
      border-radius: 0;
      border-left: none;
      border-right: none;
    }
    
    .vendas-table {
      min-width: 768px;
    }
  }
  
  @media (max-width: 768px) {
    .table-section {
      padding: 20px;
      border-radius: 12px;
    }
    
    .table-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .table-actions {
      width: 100%;
      flex-direction: column;
      gap: 8px;
    }
    
    .search-container {
      width: 100%;
    }
    
    .search-input {
      width: 100%;
    }
    
    .delete-buttons {
      width: 100%;
      flex-direction: column;
    }
    
    .month-input,
    .delete-button {
      width: 100%;
    }
    
    .delete-mode-selector {
      width: 100%;
    }
    
    .date-range-container {
      width: 100%;
      justify-content: space-between;
    }
    
    .date-input {
      width: calc(50% - 20px);
    }
    
    .vendas-table {
      font-size: 12px;
      min-width: 800px;
    }
    
    .vendas-table th,
    .vendas-table td {
      padding: 10px 8px;
    }
    
    .action-button {
      width: 30px;
      height: 30px;
    }
    
    /* Ajuste de larguras em mobile */
    .col-data { width: 90px; }
    .col-produto { width: 200px; }
    .col-matricula { width: 80px; }
    .col-nome { width: 180px; }
    .col-responsavel { width: 150px; }
    .col-valor { width: 100px; }
    .col-acoes { width: 80px; }
  }
  
  @media (max-width: 576px) {
    .table-section {
      padding: 16px;
      margin-bottom: 24px;
      border-radius: 8px;
    }
    
    .table-header h2 {
      font-size: 16px;
    }
    
    .vendas-table {
      font-size: 11px;
      min-width: 700px;
    }
    
    .vendas-table th,
    .vendas-table td {
      padding: 8px 6px;
    }
    
    .search-input,
    .month-input,
    .delete-button,
    .date-input {
      height: 36px;
      font-size: 12px;
    }
    
    .pagination-info {
      font-size: 11px;
    }
    
    .pagination-button {
      width: 32px;
      height: 32px;
    }
    
    .action-button {
      width: 28px;
      height: 28px;
    }
    
    .actions-cell {
      gap: 4px;
    }
  }
  
  /* Print styles */
  @media print {
    .table-section {
      box-shadow: none;
      border: 1px solid #ccc;
      background: white;
    }
    
    .table-actions,
    .action-button,
    .delete-button,
    .pagination {
      display: none;
    }
    
    .vendas-table {
      font-size: 11px;
    }
    
    .vendas-table th,
    .vendas-table td {
      padding: 8px;
      border: 1px solid #ddd;
    }
  }
  
  /* Acessibilidade - Redução de movimento */
  @media (prefers-reduced-motion: reduce) {
    .table-section,
    .search-input,
    .search-button,
    .month-input,
    .delete-button,
    .vendas-table tbody tr,
    .action-button,
    .pagination-button,
    .edit-input,
    .sort-indicator {
      transition: none;
      animation: none;
    }
    
    .vendas-table tbody tr:hover {
      transform: none;
    }
    
    .action-button:hover,
    .delete-button:hover,
    .pagination-button:hover {
      transform: none;
    }
  }
  
  /* Alto contraste */
  @media (prefers-contrast: high) {
    .table-section,
    .search-input,
    .month-input,
    .vendas-table th,
    .vendas-table td,
    .action-button,
    .delete-button,
    .pagination-button {
      border-width: 2px;
    }
    
    .sort-indicator {
      font-weight: 900;
    }
  }
  
  /* Scrollbar customizada para o container da tabela */
  .table-container::-webkit-scrollbar {
    height: 8px;
  }
  
  .table-container::-webkit-scrollbar-track {
    background: var(--bg-table-header, #f8fafc);
    border-radius: 4px;
  }
  
  .table-container::-webkit-scrollbar-thumb {
    background: var(--primary-alpha, rgba(99, 102, 241, 0.3));
    border-radius: 4px;
  }
  
  .table-container::-webkit-scrollbar-thumb:hover {
    background: var(--primary, #6366f1);
  }
`}</style>
    </div>
  );
};

export default VendasTable;