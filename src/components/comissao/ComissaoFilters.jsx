// src/components/comissao/ComissaoFilters.jsx
import React from 'react';
import { 
  Filter, 
  Search, 
  Calendar, 
  Building,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  FileText,
  File
} from 'lucide-react';
import useDarkMode from '../../hooks/useDarkMode';

const ComissaoFilters = ({
  unidadeSelecionada,
  setUnidadeSelecionada,
  mesAtual,
  setMesAtual,
  filtroTipo,
  setFiltroTipo,
  searchTerm,
  setSearchTerm,
  mostrarEstatisticas,
  setMostrarEstatisticas,
  onExportar,
  onExportarPDF,
  onExportarPDFResumo,
  onRefresh,
  loading = false,
  hasResults = false,
  gerandoPDF = false,
  progressoPDF = { porcentagem: 0, mensagem: '' }
}) => {
  const [theme] = useDarkMode();
  const unidades = ['alphaville', 'buenavista', 'marista'];
  
  const tiposFiltro = [
    { value: 'todos', label: 'Todos os Resultados', count: null },
    { value: 'corretos', label: 'Classificações Corretas', count: null },
    { value: 'incorretos', label: 'Classificações Incorretas', count: null },
    { value: 'planos', label: 'Apenas Planos', count: null },
    { value: 'produtos', label: 'Apenas Produtos', count: null },
    { value: 'nao_comissionaveis', label: 'Não Comissionáveis', count: null }
  ];

  return (
    <div className={`comissao-filters ${theme === 'light' ? 'light-mode' : 'dark-mode'}`}>
      <div className="filters-header">
        <div className="filters-title">
          <Filter size={20} />
          <h3>Filtros e Configurações</h3>
        </div>
        <div className="filters-actions">
          <button
            className="filter-action-btn secondary"
            onClick={() => setMostrarEstatisticas(!mostrarEstatisticas)}
            title={mostrarEstatisticas ? 'Ocultar Estatísticas' : 'Mostrar Estatísticas'}
          >
            {mostrarEstatisticas ? <EyeOff size={16} /> : <Eye size={16} />}
            {mostrarEstatisticas ? 'Ocultar' : 'Mostrar'} Stats
          </button>
          
          {hasResults && (
            <>
              <button
                className="filter-action-btn success"
                onClick={onExportar}
                title="Exportar para Excel"
              >
                <Download size={16} />
                Excel
              </button>
              
              <button
                className={`filter-action-btn pdf ${gerandoPDF ? 'loading' : ''}`}
                onClick={onExportarPDF}
                disabled={gerandoPDF}
                title={gerandoPDF ? 'Gerando PDF...' : 'Exportar PDF completo'}
              >
                {gerandoPDF ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <FileText size={16} />
                )}
                {gerandoPDF ? 'Gerando...' : 'PDF Completo'}
              </button>
              
              <button
                className={`filter-action-btn pdf-light ${gerandoPDF ? 'loading' : ''}`}
                onClick={onExportarPDFResumo}
                disabled={gerandoPDF}
                title={gerandoPDF ? 'Gerando PDF...' : 'Exportar PDF resumido'}
              >
                {gerandoPDF ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <File size={16} />
                )}
                {gerandoPDF ? 'Gerando...' : 'PDF Resumo'}
              </button>
            </>
          )}
          
          <button
            className="filter-action-btn primary"
            onClick={onRefresh}
            disabled={loading}
            title="Atualizar dados"
          >
            {loading ? (
              <RefreshCw size={16} className="spinning" />
            ) : (
              <RefreshCw size={16} />
            )}
            Atualizar
          </button>
        </div>
      </div>

      <div className="filters-grid">
        {/* Seletor de Unidade */}
        <div className="filter-group">
          <label className="filter-label">
            <Building size={16} />
            Unidade
          </label>
          <select
            value={unidadeSelecionada}
            onChange={(e) => setUnidadeSelecionada(e.target.value)}
            className="filter-select"
          >
            {unidades.map(unidade => (
              <option key={unidade} value={unidade}>
                {unidade.charAt(0).toUpperCase() + unidade.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Período */}
        <div className="filter-group">
          <label className="filter-label">
            <Calendar size={16} />
            Período
          </label>
          <input
            type="month"
            value={mesAtual}
            onChange={(e) => setMesAtual(e.target.value)}
            className="filter-input"
          />
        </div>

        {/* Filtro por Tipo */}
        <div className="filter-group">
          <label className="filter-label">
            <Filter size={16} />
            Tipo de Resultado
          </label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filter-select"
          >
            {tiposFiltro.map(tipo => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
                {tipo.count && ` (${tipo.count})`}
              </option>
            ))}
          </select>
        </div>

        {/* Busca por Texto */}
        <div className="filter-group">
          <label className="filter-label">
            <Search size={16} />
            Buscar
          </label>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Matrícula, nome, produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input search-input"
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm('')}
                title="Limpar busca"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar para PDF */}
      {gerandoPDF && (
        <div className="pdf-progress">
          <div className="pdf-progress-bar">
            <div 
              className="pdf-progress-fill" 
              style={{ width: `${progressoPDF.porcentagem}%` }}
            ></div>
          </div>
          <div className="pdf-progress-text">
            {progressoPDF.mensagem} ({progressoPDF.porcentagem}%)
          </div>
        </div>
      )}

      {/* Filtros Rápidos */}
      <div className="quick-filters">
        <span className="quick-filters-label">Filtros Rápidos:</span>
        <div className="quick-filter-buttons">
          <button
            className={`quick-filter-btn ${filtroTipo === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('todos')}
          >
            Todos
          </button>
          <button
            className={`quick-filter-btn ${filtroTipo === 'incorretos' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('incorretos')}
          >
            Problemas
          </button>
          <button
            className={`quick-filter-btn ${filtroTipo === 'planos' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('planos')}
          >
            Planos
          </button>
          <button
            className={`quick-filter-btn ${filtroTipo === 'produtos' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('produtos')}
          >
            Produtos
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComissaoFilters;