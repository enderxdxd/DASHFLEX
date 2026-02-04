import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useVendas } from "../hooks/useVendas";
import { useMetas } from "../hooks/useMetas";
import { useFilters } from "../hooks/useFilters";
import NavBar from "../components/NavBar";
import MetricCards from "../components/dashboard/MetricCards";
import PerformanceChart from "../components/dashboard/PerformanceChart";
import VendasTable from "../components/dashboard/VendasTable";
import FileUploader from "../components/dashboard/FileUploader";
import MonthSelector from "../components/dashboard/MonthSelector";
import FilterControls from "../components/dashboard/FilterControls";
import AnalyticsSummary from "../components/dashboard/AnalyticsSummary";
import { useConfigRem } from '../hooks/useConfigRem';
import { useUserRole } from '../hooks/useUserRole';
import { useGlobalProdutos } from '../hooks/useGlobalProdutos';
import Loading3D from '../components/ui/Loading3D';

import dayjs from "dayjs";
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const Dashboard = () => {
  const { unidade } = useParams();
  const navigate = useNavigate();
  const { role } = useUserRole();
  
  // Hook para produtos selecionados (filtros da página de metas)
  const { produtosSelecionados, loaded: produtosLoaded } = useGlobalProdutos();
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('selectedMonth');
    return saved || dayjs().format('YYYY-MM');
  });

  const { configRem } = useConfigRem(unidade, selectedMonth);

  useEffect(() => {
    localStorage.setItem('selectedMonth', selectedMonth);
  }, [selectedMonth]);

  // Carrega vendas e metas
  const {
    vendas, // ← Vendas de TODAS as unidades para filtro global
    vendasUnidadeAtual, // ← Vendas apenas da unidade atual
    loading: vendasLoading,
    error: vendasError,
    handleUpload,
    file,
    setFile,
    processedData,
    successMessage,
    uploading,
    autoConvertAdmin,
    setAutoConvertAdmin,
    updateVenda,
    responsaveis,
    produtos,
    refreshVendas, // ← Função para atualizar dados manualmente
  } = useVendas(unidade);

  const {
    metas,
    loading: metasLoading,
    error: metasError,
    refreshMetas, // ← Função para atualizar metas manualmente
  } = useMetas(unidade);
  
  // Função para atualizar todos os dados
  const handleRefreshAll = async () => {
    await Promise.all([refreshVendas(), refreshMetas()]);
  };

  // Meta da unidade calculada como soma das metas dos consultores do mês
  const metaUnidade = useMemo(() => {
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    const somaMetasConsultores = metasDoMes.reduce((soma, meta) => {
      return soma + Number(meta.meta || 0);
    }, 0);
    return somaMetasConsultores;
  }, [metas, selectedMonth]);

  // Lista de responsáveis oficiais da unidade (APENAS DO MÊS ATUAL)
  const responsaveisOficiais = useMemo(() => {
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    const responsaveis = metasDoMes.map(m => m.responsavel.trim().toLowerCase());
    return [...new Set(responsaveis)]; // Remove duplicatas
  }, [metas, selectedMonth]);

  // Filtra vendas pelos produtos selecionados na página de metas
  const vendasFiltradas = useMemo(() => {
    if (!vendas.length || !produtosLoaded) return vendas;
    
    // Se não há produtos selecionados, inclui todas as vendas
    if (produtosSelecionados.length === 0) return vendas;
    
    // Filtra apenas vendas dos produtos selecionados
    return vendas.filter(venda => {
      const produtoVenda = (venda.produto || "").trim().toLowerCase();
      return produtosSelecionados.some(produtoSelecionado => 
        produtoSelecionado.toLowerCase() === produtoVenda
      );
    });
  }, [vendas, produtosSelecionados, produtosLoaded]);

  // Vendas excluídas (para mostrar no card adicional)
  const vendasExcluidas = useMemo(() => {
    if (!vendas.length || !produtosLoaded || produtosSelecionados.length === 0) return [];
    
    return vendas.filter(venda => {
      const produtoVenda = (venda.produto || "").trim().toLowerCase();
      return !produtosSelecionados.some(produtoSelecionado => 
        produtoSelecionado.toLowerCase() === produtoVenda
      );
    });
  }, [vendas, produtosSelecionados, produtosLoaded]);

  // 🎯 NOVA LÓGICA: Dois tipos de faturamento

  // 1. Faturamento DA UNIDADE (TODAS as vendas realizadas na unidade atual)
  const faturamentoUnidade = useMemo(() => {
    const unidadeLower = (unidade || "").toLowerCase();
    
    // TODAS as vendas da unidade (não filtra por responsáveis oficiais)
    const vendasDaUnidade = vendasFiltradas.filter(v => 
      (v.unidade || "").toLowerCase() === unidadeLower
    );
    
    const vendasMesAtual = vendasDaUnidade.filter(v => 
      dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === selectedMonth
    );

    const prevMonth = dayjs(`${selectedMonth}-01`).subtract(1, 'month').format('YYYY-MM');
    const vendasMesAnterior = vendasDaUnidade.filter(v => 
      dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === prevMonth
    );

    const totalAtual = vendasMesAtual.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
    const totalAnterior = vendasMesAnterior.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
    const percentChange = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0;

    return { 
      totalAtual, 
      totalAnterior, 
      percentChange,
      meta: metaUnidade 
    };
  }, [vendasFiltradas, unidade, selectedMonth, metaUnidade]);

  // 2. Faturamento DOS CONSULTORES (apenas vendas dos consultores COM META)
  const faturamentoConsultores = useMemo(() => {
    const vendasMesAtual = vendasFiltradas.filter(v => {
      const resp = (v.responsavel || '').trim().toLowerCase();
      const mesCorreto = dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === selectedMonth;
      return mesCorreto && responsaveisOficiais.includes(resp);
    });

    const prevMonth = dayjs(`${selectedMonth}-01`).subtract(1, 'month').format('YYYY-MM');
    const vendasMesAnterior = vendasFiltradas.filter(v => {
      const resp = (v.responsavel || '').trim().toLowerCase();
      const mesCorreto = dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === prevMonth;
      return mesCorreto && responsaveisOficiais.includes(resp);
    });

    const totalAtual = vendasMesAtual.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
    const totalAnterior = vendasMesAnterior.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
    const percentChange = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0;

    return { 
      totalAtual, 
      totalAnterior, 
      percentChange,
      meta: metaUnidade 
    };
  }, [vendasFiltradas, selectedMonth, responsaveisOficiais, metaUnidade]);

  // Aplica filtros usando vendas filtradas por produtos
  const {
    filters,
    dispatchFilters,
    filteredVendas,
    paginatedVendas,
    currentPage,
    setCurrentPage,
    somaPorResponsavel,
    chartTimeRange,
    setChartTimeRange,
    countAtual,
    countAnterior,
    mediaAtual,
    mediaAnterior,
    pctVendas,
    pctMedia,
    estatisticasPlanos,
    estatisticasOutros,
    totalFiltrado,
  } = useFilters(
    vendasFiltradas, // Usa vendas já filtradas por produtos
    responsaveisOficiais,
    selectedMonth
  );

  // Calcula % de consultores batendo meta (usando faturamento da unidade)
  const pctConsultoresBatendoMeta = useMemo(() => {
    if (!metas.length) return 0;
    
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    if (!metasDoMes.length) return 0;

    const vendasDaUnidade = vendasFiltradas.filter(v => 
      (v.unidade || "").toLowerCase() === (unidade || "").toLowerCase() &&
      dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === selectedMonth
    );

    const consultoresBatendoMeta = metasDoMes.filter(m => {
      const vendasDoConsultor = vendasDaUnidade.filter(
        v => v.responsavel.trim().toLowerCase() === m.responsavel.trim().toLowerCase()
      );
      const totalVendas = vendasDoConsultor.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
      return totalVendas >= Number(m.meta);
    });

    return (consultoresBatendoMeta.length / metasDoMes.length) * 100;
  }, [metas, selectedMonth, vendasFiltradas, unidade]);

  // Calcula métricas dos produtos excluídos para o mês selecionado
  const metricasExcluidas = useMemo(() => {
    if (!vendasExcluidas.length) return { valor: 0, quantidade: 0, media: 0 };

    const vendasExcluidasMes = vendasExcluidas.filter(venda => {
      const dataVenda = dayjs(venda.dataFormatada, "YYYY-MM-DD");
      const resp = (venda.responsavel || '').trim().toLowerCase();
      
      return dataVenda.format("YYYY-MM") === selectedMonth && 
             responsaveisOficiais.includes(resp);
    });

    const valor = vendasExcluidasMes.reduce((sum, venda) => sum + (Number(venda.valor) || 0), 0);
    const quantidade = vendasExcluidasMes.length;
    const media = quantidade > 0 ? valor / quantidade : 0;

    return { valor, quantidade, media };
  }, [vendasExcluidas, selectedMonth, responsaveisOficiais]);

  const loading = vendasLoading || metasLoading || !produtosLoaded;
  const error = vendasError || metasError;


  // Sincroniza filtro de mês
  useEffect(() => {
    dispatchFilters({ type: 'SET_SELECTED_MONTH', payload: selectedMonth });
  }, [selectedMonth, dispatchFilters]);

  // Troca de mês
  const handleMonthChange = (newMonth) => setSelectedMonth(newMonth);

  if (!unidade) return <div>Redirecionando...</div>;
  
  if (loading) {
    return (
      <div className="loading-center">
        <Loading3D size={120} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <NavBar />
        <div className="error-container">
          <h2>Erro ao carregar dados</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const formattedMonth = dayjs(`${selectedMonth}-01`).format('MMMM [de] YYYY');

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>GestãoApp</h2>
        </div>
        <NavBar />
      </aside>
      <main className="main-content">
        <header className="page-header">
          <div className="header-content">
            <div className="badge">{unidade.toUpperCase()}</div>
          </div>
          <div className="header-actions">
            <button 
              onClick={handleRefreshAll}
              disabled={loading}
              title="Atualizar dados"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.75rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 21h5v-5"/>
              </svg>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <div className="last-update">
              Última atualização: {dayjs().format('DD/MM/YYYY, HH:mm:ss')}
            </div>
          </div>
        </header>

        {error && (
          <div className="alert error">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        <div className="dashboard-section">
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <MonthSelector
              value={selectedMonth}
              onChange={handleMonthChange}
            />
          </div>
          
          <MetricCards
            // Novos dados separados de faturamento
            faturamentoUnidade={faturamentoUnidade}
            faturamentoConsultores={faturamentoConsultores}
            
            // Métricas existentes
            countAtual={countAtual}
            countAnterior={countAnterior}
            pctVendas={pctVendas}
            mediaAtual={mediaAtual}
            mediaAnterior={mediaAnterior}
            pctMedia={pctMedia}
            selectedMonth={selectedMonth}
            pctConsultoresBatendoMeta={pctConsultoresBatendoMeta}
            
            // Card de produtos excluídos
            metricasExcluidas={metricasExcluidas}
            produtosSelecionados={produtosSelecionados}
          />
        </div>

        <div className="dashboard-section">
          <PerformanceChart
            filteredVendas={filteredVendas}
            chartTimeRange={chartTimeRange}
            setChartTimeRange={setChartTimeRange}
            selectedMonth={selectedMonth}
          />
        </div>
        
        <FilterControls
          filters={filters}
          dispatchFilters={dispatchFilters}
          responsaveis={responsaveis}
          produtos={produtos}
          totalVendas={filteredVendas.length}
          totalFaturado={totalFiltrado}
          mediaVenda={mediaAtual}
          estatisticasPlanos={estatisticasPlanos}
          estatisticasOutros={estatisticasOutros}
        />

        <div className="dashboard-section">
          <VendasTable
            vendas={paginatedVendas}
            totalVendas={filteredVendas.length}
            loading={loading}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            filters={filters}
            dispatchFilters={dispatchFilters}
            updateVenda={updateVenda}
            produtos={produtos}
            responsaveis={responsaveis}
          />
        </div>

        {role === 'admin' && (
          <div className="dashboard-section">
            <FileUploader
              file={file}
              setFile={setFile}
              handleUpload={handleUpload}
              uploading={uploading}
              autoConvertAdmin={autoConvertAdmin}
              setAutoConvertAdmin={setAutoConvertAdmin}
              processedData={processedData} 
              successMessage={successMessage}
            />
          </div>
        )}
      </main>

      <style>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }
        .sidebar {
          width: 260px;
          background: white;
          border-right: 1px solid #e5e7eb;
          position: fixed;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .sidebar-header { 
          padding: 1.25rem 1rem; 
          border-bottom: 1px solid #f3f4f6; 
        }
        .sidebar-header h2 { 
          font-size: 1rem; 
          font-weight: 600; 
          color: #3b82f6; 
          margin: 0; 
        }
        .main-content { 
          flex: 1; 
          margin-left: 260px; 
          padding: 1.5rem; 
        }
        .page-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 1.5rem; 
        }
        .badge { 
          background: #eff6ff; 
          color: #2563eb; 
          padding: 0.25rem 0.75rem; 
          border-radius: 4px; 
          font-weight: 500; 
          font-size: 0.75rem; 
        }
        .header-actions { 
          display: flex; 
          align-items: center; 
          gap: 1rem; 
        }
        .last-update { 
          font-size: 0.75rem; 
          color: #9ca3af; 
        }
        .dashboard-section { 
          margin-bottom: 1.5rem; 
        }
        .alert { 
          display: flex; 
          align-items: center; 
          gap: 0.5rem; 
          padding: 0.75rem; 
          border-radius: 6px; 
          margin-bottom: 1rem; 
          font-size: 0.875rem;
        }
        .alert.error { 
          background: #fef2f2; 
          color: #dc2626; 
        }
        .loading-center {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          position: fixed;
          top: 0;
          left: 0;
          background: #f8fafc;
          z-index: 9999;
        }
        .loading-spinner { 
          width: 32px; 
          height: 32px; 
          border: 3px solid #e5e7eb; 
          border-radius: 50%; 
          border-top-color: #3b82f6; 
          animation: spin 0.8s linear infinite; 
        }
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }

        .dark .dashboard-layout {
          background: #111827;
        }
        .dark .sidebar {
          background: #1f2937;
          border-color: #374151;
        }
        .dark .sidebar-header {
          border-color: #374151;
        }
        .dark .badge {
          background: #1e3a8a;
          color: #93c5fd;
        }
        .dark .last-update {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;