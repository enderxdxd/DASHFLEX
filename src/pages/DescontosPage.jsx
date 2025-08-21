
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Upload,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Percent,
  AlertCircle,
  CheckCircle,
  Filter,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Package
} from "lucide-react";

// Componentes
import NavBar from "../components/NavBar";
import MonthSelector from "../components/dashboard/MonthSelector";
import Loading3D from "../components/ui/Loading3D";

// Hooks
import { useDescontos } from "../hooks/useDescontos";
import { useVendas } from "../hooks/useVendas";

// Estilos
import "../styles/DescontosPage.css";

const DescontosPage = () => {
  const { unidade } = useParams();
  const navigate = useNavigate();
  
  // Carrega vendas para fazer a reconciliação
  const { vendas, loading: vendasLoading } = useVendas(unidade);
  
  // Hook principal de descontos
  const {
    descontos,
    vendasComDesconto,
    analiseConsultores,
    estatisticas,
    responsaveis,
    loading,
    error,
    successMessage,
    file,
    setFile,
    uploading,
    uploadPlanilha,
    processedData,
    filtroResponsavel,
    setFiltroResponsavel,
    filtroMatricula,
    setFiltroMatricula,
    filtroNome,
    setFiltroNome,
    selectedMonth,
    setSelectedMonth,
    tipoFiltro,
    setTipoFiltro,
    desconsiderarMatricula,
    setDesconsiderarMatricula,
    resetFiltros,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    totalItens,
    sortConfig,
    handleSort,
    deleteAllDescontos,
    clearMessages
  } = useDescontos(unidade, vendas);

  // Estados locais
  const [activeView, setActiveView] = useState("overview"); // overview, consultores, vendas
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!unidade) {
      navigate("/unidade");
    }
  }, [unidade, navigate]);

  if (loading || vendasLoading) {
    return <Loading3D />;
  }

  if (!unidade) {
    return null;
  }

  // Função para upload de arquivo
  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Função para confirmar upload
  const handleConfirmUpload = () => {
    if (window.confirm("Tem certeza que deseja fazer o upload desta planilha de descontos?")) {
      uploadPlanilha();
    }
  };

  // Função para deletar todos os descontos
  const handleDeleteAll = () => {
    if (window.confirm("ATENÇÃO: Isso irá deletar TODOS os descontos desta unidade. Tem certeza?")) {
      deleteAllDescontos();
    }
  };

  return (
    <div className="descontos-page">
      <NavBar currentUnidade={unidade} />
      
      <div className="descontos-container">
        {/* Header */}
        <div className="descontos-header">
          <div className="descontos-header-controls">
            <div>
              <h1 className="descontos-title">
                Análise de Descontos - {unidade.toUpperCase()}
              </h1>
              <p className="descontos-subtitle">
                Reconciliação entre vendas e descontos aplicados
              </p>
            </div>
            
            <div className="flex gap-3 items-center">
              <MonthSelector
                value={selectedMonth}
                onChange={setSelectedMonth}
              />
              
              {/* Toggle para desconsiderar matrícula - visível em todas as views */}
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <input
                  type="checkbox"
                  id="desconsiderar-matricula"
                  checked={desconsiderarMatricula}
                  onChange={(e) => setDesconsiderarMatricula(e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                />
                <label 
                  htmlFor="desconsiderar-matricula" 
                  className="text-sm font-medium text-orange-800 cursor-pointer whitespace-nowrap"
                >
                  Desconsiderar matrícula
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {error && (
          <div className="message error">
            <AlertCircle className="text-red-500 w-5 h-5" />
            <span>{error}</span>
            <button onClick={clearMessages} className="message-close">
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="message success">
            <CheckCircle className="text-green-500 w-5 h-5" />
            <span>{successMessage}</span>
            <button onClick={clearMessages} className="message-close">
              ×
            </button>
          </div>
        )}

        {/* Upload Section */}
        <div className="descontos-card upload-section">
          <div className="upload-title">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2>Upload de Planilha de Descontos</h2>
          </div>
          
          <div className="upload-grid">
            {/* Upload Area */}
            <div>
              <div className="upload-dropzone">
                <FileSpreadsheet className="w-12 h-12 upload-icon" />
                <div className="space-y-2">
                  <p className="text-gray-600">
                    Selecione a planilha de descontos (.xlsx ou .xls)
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="upload-button"
                  >
                    Escolher Arquivo
                  </label>
                </div>
              </div>

              {file && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{file.name}</span>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleConfirmUpload}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {uploading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploading ? "Processando..." : "Fazer Upload"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Estrutura Esperada */}
            
          </div>

          {/* Actions */}
          {descontos.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {descontos.length} desconto(s) carregado(s) no sistema
                </div>
                <button
                  onClick={handleDeleteAll}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Todos
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Estatísticas Processamento */}
        {processedData && (
          <div className="descontos-card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Último Processamento</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{processedData.totalRegistros}</div>
                <div className="text-sm text-gray-600">Registros Consolidados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{processedData.matriculasUnicas}</div>
                <div className="text-sm text-gray-600">Matrículas Únicas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  R$ {processedData.totalDescontoGeral?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600">Total Descontos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{processedData.responsaveisUnicos}</div>
                <div className="text-sm text-gray-600">Consultores</div>
              </div>
            </div>
          </div>
        )}

        {/* Navegação de Views */}
        <div className="view-navigation">
          <button
            onClick={() => setActiveView("overview")}
            className={`view-button ${
              activeView === "overview" ? "active" : ""
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Visão Geral
          </button>
          <button
            onClick={() => setActiveView("consultores")}
            className={`view-button ${
              activeView === "consultores" ? "active" : ""
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Por Consultor
          </button>
          <button
            onClick={() => setActiveView("vendas")}
            className={`view-button ${
              activeView === "vendas" ? "active" : ""
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Vendas Detalhadas
          </button>
        </div>

        {/* Visão Geral */}
        {activeView === "overview" && (
          <div className="space-y-6">
            {/* Cards de Estatísticas */}
            <div className="stats-grid">
              <div className="stat-card" style={{"--stat-color": "#3b82f6"}}>
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                    <p className="text-2xl font-bold text-gray-900">{estatisticas.totalVendas}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {estatisticas.vendasComDesconto} com desconto
                    </p>
                  </div>
                  <div className="stat-icon">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{"--stat-color": "#ea580c"}}>
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="text-sm font-medium text-gray-600">% Vendas com Desconto</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {estatisticas.percentualVendasComDesconto?.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {estatisticas.vendasSemDesconto} sem desconto
                    </p>
                  </div>
                  <div className="stat-icon">
                    <Percent className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{"--stat-color": "#dc2626"}}>
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="text-sm font-medium text-gray-600">Total Descontos</p>
                    <p className="text-2xl font-bold text-red-600">
                      R$ {estatisticas.totalDescontos?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {estatisticas.percentualDescontoGeral?.toFixed(1)}% do valor cheio
                    </p>
                  </div>
                  <div className="stat-icon">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{"--stat-color": "#16a34a"}}>
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="text-sm font-medium text-gray-600">Valor Total Cheio</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {estatisticas.valorTotalCheio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      R$ {estatisticas.valorTotalVendido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vendido
                    </p>
                  </div>
                  <div className="stat-icon">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Distribuição de Descontos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Tipo</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Desconto em Planos</span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        R$ {estatisticas.totalDescontoPlano?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {estatisticas.participacaoDescontoPlano?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Desconto em Matrículas</span>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        R$ {estatisticas.totalDescontoMatricula?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {estatisticas.participacaoDescontoMatricula?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets Médios</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Ticket Médio Vendido</span>
                    <span className="font-semibold text-gray-900">
                      R$ {estatisticas.ticketMedioVendido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Ticket Médio Cheio</span>
                    <span className="font-semibold text-gray-900">
                      R$ {estatisticas.ticketMedioCheio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Desconto Médio</span>
                    <span className="font-semibold text-red-600">
                      R$ {estatisticas.descontoMedioPorVenda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Análise por Consultor */}
        {activeView === "consultores" && (
          <div className="descontos-table-container">
            <div className="table-header">
              <div className="flex items-center justify-between">
                <h3 className="table-title">Análise por Consultor</h3>
                <div className="text-sm text-gray-600">
                  {analiseConsultores.length} consultor(es)
                </div>
              </div>
            </div>
            
            <div className="table-wrapper">
              <table className="descontos-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consultor
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Vendas
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Com Desconto
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Desconto Médio
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Descontos
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Vendido
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Cheio
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analiseConsultores.map((consultor, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{consultor.responsavel}</div>
                        <div className="text-sm text-gray-500">
                          {(consultor.percentualVendasComDesconto || 0).toFixed(1)}% vendas com desconto
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-gray-900">{consultor.totalVendas}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-orange-600">{consultor.vendasComDesconto}</div>
                        <div className="text-xs text-gray-500">{consultor.vendasSemDesconto} sem</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-red-600">
                          {(consultor.percentualDescontoMedio || 0).toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-red-600">
                          R$ {(consultor.totalDescontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          P: {(consultor.totalDescontoPlano || 0).toLocaleString('pt-BR')} | 
                          M: {(consultor.totalDescontoMatricula || 0).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-gray-900">
                          R$ {(consultor.valorTotalVendido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          TM: R$ {(consultor.ticketMedioVendido || 0).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-green-600">
                          R$ {(consultor.valorTotalCheio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500">
                          TM: R$ {(consultor.ticketMedioCheio || 0).toLocaleString('pt-BR')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vendas Detalhadas */}
        {activeView === "vendas" && (
          <div className="space-y-6">
            {/* Filtros */}
            <div className="descontos-card">
              <div className="flex items-center gap-3 mb-4">
                <Filter className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
              </div>

              {/* Toggle para desconsiderar matrícula */}
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={desconsiderarMatricula}
                      onChange={(e) => setDesconsiderarMatricula(e.target.checked)}
                      className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-orange-800">
                      Desconsiderar desconto de matrícula
                    </span>
                  </label>
                  <div className="text-xs text-orange-600 ml-6">
                    Quando ativado, apenas descontos de plano serão considerados no cálculo
                  </div>
                </div>
              </div>
              
              <div className="filters-grid">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsável
                  </label>
                  <select
                    value={filtroResponsavel}
                    onChange={(e) => setFiltroResponsavel(e.target.value)}
                    className="filter-input"
                  >
                    <option value="">Todos</option>
                    {responsaveis.map((resp, index) => (
                      <option key={index} value={resp}>{resp}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Matrícula
                  </label>
                  <input
                    type="text"
                    value={filtroMatricula}
                    onChange={(e) => setFiltroMatricula(e.target.value)}
                    placeholder="Digite a matrícula..."
                    className="filter-input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                    placeholder="Digite o nome..."
                    className="filter-input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo
                  </label>
                  <select
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                    className="filter-select"
                  >
                    <option value="todos">Todas as vendas</option>
                    <option value="com_desconto">Com desconto</option>
                    <option value="sem_desconto">Sem desconto</option>
                    <option value="desconto_plano">Desconto em plano</option>
                    <option value="desconto_matricula">Desconto em matrícula</option>
                  </select>
                </div>
              </div>
              
              <div className="filters-actions">
                <button
                  onClick={resetFiltros}
                  className="filter-button"
                >
                  Limpar Filtros
                </button>
                <div className="results-count">
                  {totalItens} resultado(s) encontrado(s)
                </div>
              </div>
            </div>

            {/* Tabela de Vendas */}
            <div className="descontos-table-container">
              <div className="table-header">
                <h3 className="table-title">Vendas com Análise de Desconto</h3>
              </div>
              
              <div className="table-wrapper">
                <table className="descontos-table">
                  <thead>
                    <tr>
                      <th 
                        onClick={() => handleSort('matricula')}
                        style={{ cursor: 'pointer' }}
                      >
                        Matrícula
                      </th>
                      <th 
                        onClick={() => handleSort('nome')}
                        style={{ cursor: 'pointer' }}
                      >
                        Nome
                      </th>
                      <th 
                        onClick={() => handleSort('responsavel')}
                        style={{ cursor: 'pointer' }}
                      >
                        Responsável
                      </th>
                      <th style={{ textAlign: 'center' }}>
                        Valor Vendido
                      </th>
                      <th style={{ textAlign: 'center' }}>
                        Descontos
                      </th>
                      <th style={{ textAlign: 'center' }}>
                        Valor Cheio
                      </th>
                      <th style={{ textAlign: 'center' }}>
                        % Desconto
                      </th>
                      <th 
                        onClick={() => handleSort('dataFormatada')}
                        style={{ textAlign: 'center', cursor: 'pointer' }}
                      >
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendasComDesconto.map((venda, index) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell">
                          {venda.matricula}
                        </td>
                        <td className="table-cell">
                          <div className="cell-primary">{venda.nome}</div>
                          <div className="cell-secondary">{venda.produto}</div>
                        </td>
                        <td className="table-cell">
                          {venda.responsavel}
                        </td>
                        <td className="table-cell text-center">
                          <div className="cell-primary">
                            R$ {Number(venda.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          {venda.temDesconto ? (
                            <div>
                              <div className="discount-value">
                                R$ {venda.totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                              </div>
                              <div className="discount-details">
                                {venda.temDescontoPlano && `P: R$ ${venda.descontoPlano.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
                                {venda.temDescontoPlano && venda.temDescontoMatricula && ' | '}
                                {venda.temDescontoMatricula && `M: R$ ${venda.descontoMatricula.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
                              </div>
                            </div>
                          ) : (
                            <span className="no-discount">-</span>
                          )}
                        </td>
                        <td className="table-cell text-center">
                          <div className="full-value">
                            R$ {venda.valorCheio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="table-cell text-center">
                          {venda.temDesconto ? (
                            <div className="percentage-container">
                              <span className={`percentage-badge ${
                                venda.percentualDesconto > 20 
                                  ? 'high-discount'
                                  : venda.percentualDesconto > 10
                                  ? 'medium-discount'
                                  : 'low-discount'
                              }`}>
                                {venda.percentualDesconto.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="no-discount">0%</span>
                          )}
                        </td>
                        <td className="table-cell text-center">
                          <span className="date-cell">{dayjs(venda.dataFormatada).format('DD/MM/YY')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination-wrapper">
                    <div className="pagination-info">
                      Página {currentPage} de {totalPages} 
                      ({((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItens)} de {totalItens})
                    </div>
                    <div className="pagination-buttons">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="pagination-button"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                      >
                        Próximo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DescontosPage;