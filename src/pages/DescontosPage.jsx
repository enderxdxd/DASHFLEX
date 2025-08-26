import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import * as XLSX from 'xlsx';
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
import { useConfigRem } from "../hooks/useConfigRem";
import { useGroupedVendas } from "../hooks/useGroupedVendas";

// Firebase
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

// Estilos
import "../styles/DescontosPage.css";

const DescontosPage = () => {
  const { unidade } = useParams();
  const navigate = useNavigate();
  
  // Estado para metas
  const [metas, setMetas] = useState([]);
  
  // Carrega vendas para fazer a reconciliação - usa dados brutos (todas as unidades)
  const { vendas: vendasBrutas, loading: vendasLoading } = useVendas(unidade);
  
  // APLICAR AGRUPAMENTO DE PLANOS DIVIDIDOS (igual ConfigRemuneracao)
  const vendasAgrupadas = useGroupedVendas(vendasBrutas);
  
  // Hook principal de descontos - agora usa vendas agrupadas
  const {
    descontos,
    vendasComDesconto, // Dados paginados para a tabela
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
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    totalItens,
    sortConfig,
    handleSort,
    deleteAllDescontos,
    clearMessages,
    // Dados completos para análise detalhada
    todasVendasProcessadas,
    dadosOrdenados
  } = useDescontos(unidade, vendasAgrupadas);

  // Estados locais
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [desconsiderarMatricula, setDesconsiderarMatricula] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState("");
  
  // Função para resetar filtros
  const resetFiltros = () => {
    setFiltroResponsavel("");
    setFiltroMatricula("");
    setFiltroNome("");
    setTipoFiltro("");
  };

  // Carrega configuração de remuneração para obter as faixas de planos
  const { configRem } = useConfigRem(unidade, selectedMonth);

  // Estados locais
  const [activeView, setActiveView] = useState("overview");
  const [showDetails, setShowDetails] = useState(false);

  // Carregar metas da unidade
  useEffect(() => {
    if (!unidade) return;
    
    const metasRef = collection(db, "faturamento", unidade.toLowerCase(), "metas");
    const unsubMetas = onSnapshot(
      metasRef,
      snap => {
        const metasCarregadas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('🔍 Metas carregadas:', {
          unidade,
          totalMetas: metasCarregadas.length,
          metas: metasCarregadas.map(m => m.responsavel)
        });
        setMetas(metasCarregadas);
      },
      error => console.error("Erro ao carregar metas:", error)
    );

    return () => unsubMetas();
  }, [unidade]);

  // Função para exportar dados para Excel
  const exportarParaExcel = () => {
    try {
      // Preparar dados para exportação
      const dadosExportacao = dadosOrdenados.map(venda => ({
        'Matrícula': venda.matricula || '',
        'Nome': venda.nome || '',
        'Produto': venda.produto || '',
        'Responsável': venda.responsavel || '',
        'Unidade': venda.unidade || '',
        'Valor Pago': `R$ ${(venda.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        'Desconto Plano': venda.descontoPlano > 0 ? `R$ ${venda.descontoPlano.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        'Desconto Matrícula': venda.descontoMatricula > 0 ? `R$ ${venda.descontoMatricula.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        'Total Desconto': venda.totalDesconto > 0 ? `R$ ${venda.totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        'Valor Cheio': `R$ ${(venda.valorCheio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        '% Desconto': venda.percentualDesconto > 0 ? `${venda.percentualDesconto.toFixed(2)}%` : '0%',
        'Data': venda.dataFormatada || venda.dataLancamento || '',
        'Tem Desconto': venda.temDesconto ? 'Sim' : 'Não'
      }));

      // Criar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExportacao);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vendas com Desconto");

      // Configurar larguras das colunas
      const colWidths = [
        { wch: 12 }, // Matrícula
        { wch: 25 }, // Nome
        { wch: 15 }, // Produto
        { wch: 25 }, // Responsável
        { wch: 15 }, // Unidade
        { wch: 15 }, // Valor Pago
        { wch: 15 }, // Desconto Plano
        { wch: 18 }, // Desconto Matrícula
        { wch: 15 }, // Total Desconto
        { wch: 15 }, // Valor Cheio
        { wch: 12 }, // % Desconto
        { wch: 12 }, // Data
        { wch: 12 }  // Tem Desconto
      ];
      ws['!cols'] = colWidths;

      // Gerar nome do arquivo
      const dataAtual = dayjs().format('YYYY-MM-DD_HH-mm');
      const nomeArquivo = `vendas_desconto_${unidade}_${selectedMonth}_${dataAtual}.xlsx`;

      // Fazer download
      XLSX.writeFile(wb, nomeArquivo);
      
      console.log(`Exportação concluída: ${dadosExportacao.length} registros exportados`);
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      alert('Erro ao exportar dados para Excel. Verifique o console para mais detalhes.');
    }
  };

  // Função para classificar tipo de plano baseada nas faixas de comissão configuradas
  const classificarTipoPlano = (venda) => {
    if (!venda) return 'Outros';
    
    const valorVenda = Number(venda.valor || 0);
    
    // Sempre usar classificação por valor, independente da configuração
    if (valorVenda <= 800) return 'Mensal';
    if (valorVenda <= 2000) return 'Trimestral';
    if (valorVenda <= 4000) return 'Semestral';
    if (valorVenda <= 6000) return 'Octomestral';
    if (valorVenda <= 8000) return 'Anual';
    return 'Bianual';
  };

  // Análise detalhada por consultor e tipo de plano
  const analiseDetalhada = useMemo(() => {
    console.log('DEBUG - Análise detalhada iniciada:', {
      todasVendasProcessadas: todasVendasProcessadas?.length,
      analiseConsultores: analiseConsultores?.length,
      unidade
    });

    if (!todasVendasProcessadas?.length) {
      console.log('Usando fallback - dados insuficientes para análise detalhada');
      
      // Fallback usando analiseConsultores (filtrar por unidade aqui também)
      if (analiseConsultores?.length) {
        console.log('Usando analiseConsultores como fallback:', analiseConsultores.length, 'consultores');
        
        // Filtrar consultores que têm metas cadastradas na unidade (igual à renderização)
        const consultoresFiltrados = analiseConsultores.filter(consultor => {
          // DEBUG: Verificar se metas foram carregadas
          if (!metas || metas.length === 0) {
            console.log('⚠️ Análise detalhada: Nenhuma meta carregada ainda');
            return true; // Temporariamente mostrar todos enquanto carrega
          }
          
          // FILTRO IGUAL À PÁGINA METAS: Apenas consultores com meta cadastrada na unidade
          const temMetaNaUnidade = metas?.some(meta => 
            meta.responsavel?.trim().toLowerCase() === consultor.responsavel?.trim().toLowerCase()
          );
          
          console.log(`🔍 Análise detalhada - ${consultor.responsavel}:`, {
            temMetaNaUnidade,
            totalMetas: metas?.length || 0,
            metasNaUnidade: metas?.map(m => m.responsavel) || [],
            consultorNormalizado: consultor.responsavel?.trim().toLowerCase(),
            metasNormalizadas: metas?.map(m => m.responsavel?.trim().toLowerCase()) || []
          });
          
          return temMetaNaUnidade;
        });
        
        console.log('Consultores filtrados por unidade:', consultoresFiltrados.length);
        
        return consultoresFiltrados.map(consultor => ({
          nome: consultor.responsavel,
          totalVendas: consultor.totalVendas || 0,
          vendasComDesconto: consultor.vendasComDesconto || 0,
          vendasSemDesconto: consultor.vendasSemDesconto || 0,
          percentualVendasComDesconto: consultor.percentualVendasComDesconto || 0,
          valorTotal: consultor.valorTotalVendido || 0,
          valorDescontos: consultor.totalDescontos || 0,
          planos: {
            'Total': { 
              comDesconto: consultor.vendasComDesconto || 0, 
              semDesconto: consultor.vendasSemDesconto || 0 
            }
          }
        }));
      }
      return [];
    }

    // Usar todas as vendas sem filtrar por unidade
    const vendasDaUnidade = todasVendasProcessadas;

    console.log('🔍 DEBUG - Filtrando vendas por unidade:', {
      totalVendas: todasVendasProcessadas.length,
      vendasDaUnidade: vendasDaUnidade.length,
      unidadeAtual: unidade,
      exemploVendasOriginais: todasVendasProcessadas.slice(0, 3).map(v => ({
        responsavel: v.responsavel,
        unidade: v.unidade,
        produto: v.produto
      })),
      exemploVendasFiltradas: vendasDaUnidade.slice(0, 3).map(v => ({
        responsavel: v.responsavel,
        unidade: v.unidade,
        produto: v.produto
      }))
    });

    // Agrupar vendas por consultor (apenas da unidade atual)
    const consultoresMap = new Map();
    
    vendasDaUnidade.forEach(venda => {
      const consultor = venda.responsavel;
      if (!consultoresMap.has(consultor)) {
        consultoresMap.set(consultor, {
          nome: consultor,
          vendas: []
        });
      }
      consultoresMap.get(consultor).vendas.push(venda);
    });

    // Filtrar consultores por metas antes de processar
    const consultoresComMeta = Array.from(consultoresMap.values()).filter(({nome}) => {
      // DEBUG: Verificar se metas foram carregadas
      if (!metas || metas.length === 0) {
        console.log('⚠️ Processamento detalhado: Nenhuma meta carregada ainda');
        return true; // Temporariamente mostrar todos enquanto carrega
      }
      
      // FILTRO IGUAL À PÁGINA METAS: Apenas consultores com meta cadastrada na unidade
      const temMetaNaUnidade = metas?.some(meta => 
        meta.responsavel?.trim().toLowerCase() === nome?.trim().toLowerCase()
      );
      
      console.log(`🔍 Processamento - ${nome}:`, {
        temMetaNaUnidade,
        totalMetas: metas?.length || 0
      });
      
      return temMetaNaUnidade;
    });

    // Processar cada consultor que tem meta
    const consultoresProcessados = consultoresComMeta.map(({nome, vendas}) => {
      // Agrupar vendas por tipo de plano
      const planosTipo = {};
      let totalVendas = 0;
      let vendasComDesconto = 0;
      let vendasSemDesconto = 0;
      let valorTotal = 0;
      let valorDescontos = 0;

      vendas.forEach(venda => {
        const tipoPlano = classificarTipoPlano(venda);
        
        console.log('Processando venda:', {
          matricula: venda.matricula,
          responsavel: venda.responsavel,
          produto: venda.produto,
          valor: venda.valor,
          tipoPlano,
          temDesconto: venda.temDesconto,
          totalDesconto: venda.totalDesconto
        });
        
        if (!planosTipo[tipoPlano]) {
          planosTipo[tipoPlano] = { comDesconto: 0, semDesconto: 0 };
        }

        totalVendas++;
        valorTotal += Number(venda.valor || 0);

        if (venda.temDesconto) {
          vendasComDesconto++;
          planosTipo[tipoPlano].comDesconto++;
          valorDescontos += venda.totalDesconto || 0;
        } else {
          vendasSemDesconto++;
          planosTipo[tipoPlano].semDesconto++;
        }
      });

      return {
        nome,
        totalVendas,
        vendasComDesconto,
        vendasSemDesconto,
        percentualVendasComDesconto: totalVendas > 0 ? (vendasComDesconto / totalVendas) * 100 : 0,
        valorTotal,
        valorDescontos,
        planos: planosTipo
      };
    });

    console.log('Análise detalhada processada:', {
      consultores: consultoresProcessados.length,
      exemplo: consultoresProcessados[0],
      planosDetalhados: consultoresProcessados.map(c => ({
        nome: c.nome,
        planos: c.planos,
        totalVendas: c.totalVendas
      }))
    });
    
    return consultoresProcessados.sort((a, b) => b.totalVendas - a.totalVendas);
  }, [todasVendasProcessadas, configRem, classificarTipoPlano, metas]);

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
              
              {/* Toggle para desconsiderar matrícula */}
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
                  className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200 hover:border-red-300 hover:shadow-sm active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    borderColor: '#fecaca',
                    color: '#dc2626'
                  }}
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
            onClick={() => setActiveView("detalhada")}
            className={`view-button ${
              activeView === "detalhada" ? "active" : ""
            }`}
          >
            <PieChart className="w-4 h-4 inline mr-2" />
            Análise Detalhada
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

        {/* Análise Detalhada por Consultor */}
        {activeView === "detalhada" && (
          <div 
            className="analise-detalhada-container"
            style={{
              animation: 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both'
            }}
          >
            <div className="space-y-6" style={{ marginTop: '1.5rem' }}>
              <div 
                className="consultores-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}
              >
                {analiseDetalhada.map((consultor, index) => (
                  <div 
                    key={index} 
                    className="consultor-card"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '1rem',
                      border: '1px solid rgba(228, 228, 231, 0.5)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative'
                    }}
                  >
                    {/* Header do Card */}
                    <div 
                      className="consultor-header"
                      style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #f1f5f9',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div className="consultor-info">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="consultor-avatar"
                            style={{
                              width: '3rem',
                              height: '3rem',
                              borderRadius: '0.75rem',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}
                          >
                            <Users className="w-5 h-5" />
                          </div>
                          <div className="consultor-details">
                            <h3 
                              title={consultor.nome}
                              style={{
                                fontSize: '1.125rem',
                                fontWeight: '700',
                                color: '#1e293b',
                                margin: '0',
                                lineHeight: '1.2',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {consultor.nome}
                            </h3>
                            <p style={{
                              fontSize: '0.875rem',
                              color: '#64748b',
                              margin: '0.25rem 0 0 0'
                            }}>Consultor</p>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="consultor-summary"
                        style={{ textAlign: 'right' }}
                      >
                        <div 
                          className="consultor-summary-content"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '0.25rem'
                          }}
                        >
                          <span 
                            className="consultor-summary-label"
                            style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}
                          >Total Planos Vendidos</span>
                          <span 
                            className="consultor-summary-value"
                            style={{
                              fontSize: '1.5rem',
                              fontWeight: '800',
                              color: '#3b82f6',
                              lineHeight: '1'
                            }}
                          >
                            {consultor.totalVendas}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tabela de Planos */}
                    <div 
                      className="planos-table"
                      style={{ background: 'white' }}
                    >
                      <div 
                        className="planos-table-header"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr',
                          gap: '1rem',
                          padding: '1rem 1.5rem',
                          background: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0'
                        }}
                      >
                        <div 
                          className="planos-table-header-cell"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          <Package className="w-3 h-3" />
                          Tipo
                        </div>
                        <div 
                          className="planos-table-header-cell center"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          <TrendingDown className="w-3 h-3 text-red-500" />
                          Com Descto
                        </div>
                        <div 
                          className="planos-table-header-cell center"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                        >
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          Sem Descto
                        </div>
                      </div>
                      
                      <div 
                        className="planos-table-body"
                        style={{
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}
                      >
                        {Object.entries(consultor.planos).map(([tipo, dados]) => {
                          const total = dados.comDesconto + dados.semDesconto;
                          if (total === 0) return null;
                          
                          return (
                            <div 
                              key={tipo} 
                              className="plano-row"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr',
                                gap: '1rem',
                                padding: '0.75rem 1.5rem',
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background-color 0.2s ease'
                              }}
                            >
                              <div 
                                className="plano-tipo"
                                style={{
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  color: '#1e293b',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                {tipo}
                              </div>
                              <div className="text-center">
                                <span 
                                  className={`plano-count ${
                                    dados.comDesconto > 0 ? 'com-desconto' : 'zero'
                                  }`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    minWidth: '2rem',
                                    textAlign: 'center',
                                    ...(dados.comDesconto > 0 ? {
                                      background: '#fecaca',
                                      color: '#991b1b'
                                    } : {
                                      background: '#f1f5f9',
                                      color: '#64748b'
                                    })
                                  }}
                                >
                                  {dados.comDesconto}
                                </span>
                              </div>
                              <div className="text-center">
                                <span 
                                  className={`plano-count ${
                                    dados.semDesconto > 0 ? 'sem-desconto' : 'zero'
                                  }`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    minWidth: '2rem',
                                    textAlign: 'center',
                                    ...(dados.semDesconto > 0 ? {
                                      background: '#d1fae5',
                                      color: '#065f46'
                                    } : {
                                      background: '#f1f5f9',
                                      color: '#64748b'
                                    })
                                  }}
                                >
                                  {dados.semDesconto}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        
                        {Object.values(consultor.planos).every(p => p.comDesconto + p.semDesconto === 0) && (
                          <div className="plano-row">
                            <div className="plano-tipo">
                              Nenhum plano encontrado
                            </div>
                            <div className="text-center">
                              <span className="plano-count zero">0</span>
                            </div>
                            <div className="text-center">
                              <span className="plano-count zero">0</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer com Resumo */}
                    <div className="consultor-footer">
                      <div className="footer-stats">
                        <div className="footer-stat">
                          <span className="footer-stat-label">
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                            Com Desconto:
                          </span>
                          <span className="footer-stat-value com-desconto">
                            {consultor.vendasComDesconto}
                          </span>
                        </div>
                        <div className="footer-stat">
                          <span className="footer-stat-label">
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                            Sem Desconto:
                          </span>
                          <span className="footer-stat-value sem-desconto">
                            {consultor.vendasSemDesconto}
                          </span>
                        </div>
                        <div className="footer-stat highlight">
                          <span className="footer-stat-label">
                            <Percent className="w-4 h-4 text-orange-500" />
                            % com Desconto:
                          </span>
                          <span className="footer-stat-value percentual">
                            {(consultor.percentualVendasComDesconto || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                  {analiseConsultores.filter(consultor => {
                    // DEBUG: Verificar se metas foram carregadas
                    if (!metas || metas.length === 0) {
                      console.log('⚠️ Nenhuma meta carregada ainda');
                      return true; // Temporariamente mostrar todos enquanto carrega
                    }
                    
                    // FILTRO IGUAL À PÁGINA METAS: Apenas consultores com meta cadastrada na unidade
                    const temMetaNaUnidade = metas?.some(meta => 
                      meta.responsavel?.trim().toLowerCase() === consultor.responsavel?.trim().toLowerCase()
                    );
                    
                    console.log(`🎯 ${consultor.responsavel}:`, {
                      temMetaNaUnidade,
                      totalMetas: metas?.length || 0,
                      metasNaUnidade: metas?.map(m => m.responsavel) || [],
                      consultorNormalizado: consultor.responsavel?.trim().toLowerCase(),
                      metasNormalizadas: metas?.map(m => m.responsavel?.trim().toLowerCase()) || [],
                      unidadeAtual: unidade
                    });
                    
                    return temMetaNaUnidade;
                  }).map((consultor, index) => (
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                </div>
                <button
                  onClick={exportarParaExcel}
                  className="group relative flex items-center gap-3 px-6 py-3 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95 overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(5, 150, 105, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.5), 0 8px 20px rgba(5, 150, 105, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(5, 150, 105, 0.3)';
                  }}
                >
                  {/* Shimmer effect overlay */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.2) 50%, transparent 70%)',
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                  
                  {/* Icon with animation */}
                  <div className="relative flex items-center justify-center w-5 h-5 transition-transform duration-300 group-hover:scale-110">
                    <Download className="w-5 h-5 drop-shadow-sm" />
                  </div>
                  
                  {/* Text */}
                  <span className="relative font-medium tracking-wide drop-shadow-sm">
                    Exportar para Excel
                  </span>
                  
                  {/* Subtle glow effect */}
                  <div 
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%)',
                      filter: 'blur(8px)',
                      zIndex: -1
                    }}
                  />
                </button>
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