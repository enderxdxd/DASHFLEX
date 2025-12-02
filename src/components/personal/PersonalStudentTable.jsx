// src/components/personal/PersonalStudentTable.jsx
import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Users,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  Eye,
  Search,
  Filter
} from 'lucide-react';
import './PersonalStudentTable.css';

export default function PersonalStudentTable({ data }) {
  const [sortField, setSortField] = useState('aluno');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');

  // Agora recebemos dados de alunos individuais, não dados agrupados por personal

  // Filtrar dados por busca e remover duplicatas de alunos
  const filteredData = useMemo(() => {
    let processedData = data || [];
    
    // Primeiro, remover duplicatas de alunos (manter apenas o primeiro registro de cada aluno)
    const uniqueStudents = new Map();
    processedData.forEach(item => {
      if (item.aluno && !uniqueStudents.has(item.aluno.toLowerCase())) {
        uniqueStudents.set(item.aluno.toLowerCase(), item);
      }
    });
    
    // Converter Map de volta para array
    processedData = Array.from(uniqueStudents.values());
    
    // Aplicar filtro de busca se houver termo de busca
    if (!searchTerm) return processedData;
    
    return processedData.filter(item =>
      (item.aluno && item.aluno.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.personal && item.personal.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.produto && item.produto.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [data, searchTerm]);

  // Dados ordenados
  const sortedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    return [...filteredData].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredData, sortField, sortDirection]);

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
    setCurrentPage(1);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ChevronDown size={16} className="sort-icon inactive" />;
    return sortDirection === 'asc' ? 
      <ChevronUp size={16} className="sort-icon active" /> : 
      <ChevronDown size={16} className="sort-icon active" />;
  };

  const getUnidadeColor = (unidade) => {
    const colors = {
      'alphaville': '#10b981',
      'buenavista': '#3b82f6', 
      'marista': '#f59e0b',
      'palmas': '#ec4899'
    };
    return colors[unidade] || '#6366f1';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getSituacaoColor = (situacao) => {
    switch(situacao) {
      case 'Pago': return '#10b981';
      case 'Livre': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="personal-table-container">
        <div className="no-data">
          <Users size={48} />
          <h3>Selecione um personal trainer</h3>
          <p>Use o campo de busca para encontrar e selecionar um personal trainer e visualizar seus alunos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="personal-table-container">
      {/* Header da Tabela */}
      <div className="table-header">
        <div className="header-left">
          <h2>
            <Users size={20} />
            Lista de Alunos
          </h2>
          <p>Detalhamento completo dos alunos do personal selecionado</p>
        </div>
        
        <div className="header-controls">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar aluno, personal ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="table-wrapper">
        <table className="personal-table">
          <thead>
            <tr>
              <th 
                className="sortable"
                onClick={() => handleSort('aluno')}
              >
                <div className="th-content">
                  <Users size={16} />
                  Aluno
                  {getSortIcon('aluno')}
                </div>
              </th>
              
              <th 
                className="sortable"
                onClick={() => handleSort('personal')}
              >
                <div className="th-content">
                  <Users size={16} />
                  Personal
                  {getSortIcon('personal')}
                </div>
              </th>
              
              <th>
                <div className="th-content">
                  <MapPin size={16} />
                  Unidade
                </div>
              </th>
              
              <th 
                className="sortable"
                onClick={() => handleSort('produto')}
              >
                <div className="th-content">
                  <CheckCircle size={16} />
                  Produto
                  {getSortIcon('produto')}
                </div>
              </th>
              
              <th 
                className="sortable"
                onClick={() => handleSort('situacao')}
              >
                <div className="th-content">
                  <CheckCircle size={16} />
                  Situação
                  {getSortIcon('situacao')}
                </div>
              </th>
              
              <th 
                className="sortable"
                onClick={() => handleSort('valorFinal')}
              >
                <div className="th-content">
                  <DollarSign size={16} />
                  Valor
                  {getSortIcon('valorFinal')}
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody>
            {paginatedData.map((item, index) => (
              <tr 
                key={`${item.aluno}-${item.personal}-${index}`}
                className="student-row"
                style={{ '--unit-color': getUnidadeColor(item.unidade) }}
              >
                <td className="student-cell">
                  <div className="student-info">
                    <Users size={16} />
                    <span className="student-name">{item.aluno}</span>
                  </div>
                </td>
                
                <td className="personal-cell">
                  <div className="personal-info">
                    <span className="personal-name">{item.personal}</span>
                  </div>
                </td>
                
                <td>
                  <span 
                    className="unit-badge"
                    style={{ backgroundColor: getUnidadeColor(item.unidade) }}
                  >
                    {item.unidade}
                  </span>
                </td>
                
                <td className="product-cell">
                  <span className="product-name">{item.produto}</span>
                </td>
                
                <td>
                  <span 
                    className="status-badge"
                    style={{ 
                      backgroundColor: getSituacaoColor(item.situacao),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    {item.situacao}
                  </span>
                </td>
                
                <td className="currency-cell">
                  {formatCurrency(item.valorFinal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Anterior
          </button>
          
          <div className="pagination-info">
            Página {currentPage} de {totalPages} • {sortedData.length} alunos
          </div>
          
          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
