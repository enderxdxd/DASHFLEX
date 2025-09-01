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
  const metaUnidade = Number(configRem?.metaUnidade) || 0;

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
  } = useVendas(unidade);

  const {
    metas,
    loading: metasLoading,
    error: metasError,
  } = useMetas(unidade);

  // Lista de responsáveis oficiais da unidade
  const responsaveisOficiais = useMemo(
    () => metas.map(m => m.responsavel.trim().toLowerCase()),
    [metas]
  );

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
    console.log('🏢 Calculando faturamento da unidade:', unidade);
    console.log('📊 Vendas filtradas total:', vendasFiltradas.length);
    
    // TODAS as vendas da unidade (não filtra por responsáveis oficiais)
    const vendasDaUnidade = vendasFiltradas.filter(v => 
      (v.unidade || "").toLowerCase() === (unidade || "").toLowerCase()
    );
    
    const vendasMesAtual = vendasDaUnidade.filter(v => {
      const mesCorreto = dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === selectedMonth;
      return mesCorreto; // Remove filtro de responsáveis oficiais
    });

    const vendasMesAnterior = vendasDaUnidade.filter(v => {
      const prevMonth = dayjs(`${selectedMonth}-01`).subtract(1, 'month').format('YYYY-MM');
      const mesCorreto = dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === prevMonth;
      return mesCorreto; // Remove filtro de responsáveis oficiais
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
  }, [vendasFiltradas, unidade, selectedMonth, metaUnidade]);

  // 2. Faturamento DOS CONSULTORES (todas as vendas dos consultores da unidade, mesmo que de outras unidades)
  const faturamentoConsultores = useMemo(() => {
    
    const vendasMesAtual = vendasFiltradas.filter(v => {
      const resp = (v.responsavel || '').trim().toLowerCase();
      const mesCorreto = dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === selectedMonth;
      const respOficial = responsaveisOficiais.includes(resp);
      
      return mesCorreto && respOficial;
    });

    const vendasMesAnterior = vendasFiltradas.filter(v => {
      const prevMonth = dayjs(`${selectedMonth}-01`).subtract(1, 'month').format('YYYY-MM');
      const resp = (v.responsavel || '').trim().toLowerCase();
      const mesCorreto = dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === prevMonth;
      const respOficial = responsaveisOficiais.includes(resp);
      
      return mesCorreto && respOficial;
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

  // Debug: Verificar filtros ativos
  useEffect(() => {
    
    
    if (vendas.length > 0) {
      const somaTotal = vendas
        .filter(v => (v.unidade || "").toLowerCase() === (unidade || "").toLowerCase())
        .filter(v => dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === selectedMonth)
        .reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
      
    }
  }, [vendas, vendasFiltradas, produtosSelecionados, responsaveisOficiais, unidade, selectedMonth]);

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
          background-color: var(--bg-primary, #f8fafc);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .sidebar {
          width: 250px;
          background-color: var(--card, white);
          border-right: 1px solid var(--border, #e2e8f0);
          position: fixed;
          height: 100vh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
        }
        .sidebar-header { 
          padding: 1.5rem; 
          border-bottom: 1px solid var(--border, #e2e8f0); 
        }
        .sidebar-header h2 { 
          font-size: 1.25rem; 
          font-weight: 600; 
          color: var(--primary, #4f46e5); 
          margin: 0; 
        }
        .main-content { 
          flex: 1; 
          margin-left: 250px; 
          padding: 2rem; 
        }
        .page-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 2rem; 
        }
        .header-content h1 { 
          font-size: 1.75rem; 
          font-weight: 600; 
          margin: 0 1rem 0 0; 
          color: var(--text-primary, #1e293b);
        }
        .badge { 
          background-color: var(--primary-light, #eef2ff); 
          color: var(--primary, #4f46e5); 
          padding: 0.25rem 0.75rem; 
          border-radius: 0.25rem; 
          font-weight: 600; 
          font-size: 0.875rem; 
        }
        .header-actions { 
          display: flex; 
          align-items: center; 
          gap: 1.5rem; 
        }
        .last-update { 
          font-size: 0.875rem; 
          color: var(--text-secondary, #64748b); 
        }
        .dashboard-section { 
          margin-bottom: 2rem; 
        }
        .section-title { 
          font-size: 1.25rem; 
          font-weight: 600; 
          margin-bottom: 1rem; 
          color: var(--text-primary, #1e293b); 
        }
        .alert { 
          display: flex; 
          align-items: center; 
          gap: 0.75rem; 
          padding: 1rem; 
          border-radius: 0.5rem; 
          margin-bottom: 1.5rem; 
        }
        .alert.error { 
          background-color: var(--danger-light, #fee2e2); 
          color: var(--danger, #ef4444); 
        }
        .loading-center {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          background: var(--bg-primary, #f8fafc);
          z-index: 9999;
        }
        .loading-spinner { 
          width: 40px; 
          height: 40px; 
          border: 3px solid var(--border, #e2e8f0); 
          border-radius: 50%; 
          border-top-color: var(--primary, #4f46e5); 
          animation: spin 1s linear infinite; 
        }
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }

        /* Light Mode Fallback */
        :root {
          --bg-primary: #f8fafc;
          --card: white;
          --border: #e2e8f0;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --primary: #4f46e5;
          --primary-light: #eef2ff;
          --danger: #ef4444;
          --danger-light: #fee2e2;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        /* Dark Mode Styles */
        .dark .dashboard-layout {
          --bg-primary: #0f172a;
          --card: #1e293b;
          --border: #334155;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --primary: #6366f1;
          --primary-light: #1e3a8a20;
          --danger: #ef4444;
          --danger-light: #99182020;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;