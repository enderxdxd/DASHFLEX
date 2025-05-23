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
import Loading3D from '../components/ui/Loading3D';

import dayjs from "dayjs";
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const Dashboard = () => {
  const { unidade } = useParams();
  const configRem = useConfigRem(unidade) || {};
  const metaUnidade = Number(configRem.metaUnidade) || 0;




  const navigate = useNavigate();
   



  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('selectedMonth');
    return saved || dayjs().format('YYYY-MM');
  });

  useEffect(() => {
    localStorage.setItem('selectedMonth', selectedMonth);
  }, [selectedMonth]);

  // Carrega vendas e metas
  const {
    vendas,
    loading: vendasLoading,
    error: vendasError,
    handleUpload,
    file,
    setFile,
    processedData,
    successMessage,
    uploading,
    updateVenda,
    responsaveis,
    produtos,
  } = useVendas(unidade);

  const {
    metas,
    loading: metasLoading,
    error: metasError,
  } = useMetas(unidade);

  // Aplica filtros e extrai métricas
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
  } = useFilters(
    vendas,
    metas.map(m => m.responsavel),
    selectedMonth
  );

  // Faturamento mês atual
  const totalAtual = useMemo(
    () => filteredVendas.reduce((sum, v) => sum + (Number(v.valor) || 0), 0),
    [filteredVendas]
  );

  // Faturamento mês anterior (mesmos consultores)
  const totalAnterior = useMemo(() => {
    const prevMonth = dayjs(`${selectedMonth}-01`).subtract(1, 'month').format('YYYY-MM');
    const responsaveisLower = metas.map(m => m.responsavel.trim().toLowerCase());
    return vendas
      .filter(v => {
        if (!v.dataFormatada) return false;
        const resp = (v.responsavel || '').trim().toLowerCase();
        return (
          responsaveisLower.includes(resp) &&
          dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === prevMonth
        );
      })
      .reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
  }, [vendas, metas, selectedMonth]);

  // Variação percentual
  const percentChange = useMemo(
    () => (totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0),
    [totalAtual, totalAnterior]
  );

  // Calcula % de consultores batendo meta
  const pctConsultoresBatendoMeta = useMemo(() => {
    if (!metas.length) return 0;
    
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    if (!metasDoMes.length) return 0;

    const consultoresBatendoMeta = metasDoMes.filter(m => {
      const vendasDoConsultor = filteredVendas.filter(
        v => v.responsavel.trim().toLowerCase() === m.responsavel.trim().toLowerCase()
      );
      const totalVendas = vendasDoConsultor.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
      return totalVendas >= Number(m.meta);
    });

    return (consultoresBatendoMeta.length / metasDoMes.length) * 100;
  }, [metas, selectedMonth, filteredVendas]);

  const loading = vendasLoading || metasLoading;
  const error = vendasError || metasError;

  // Redireciona se sem unidade
  useEffect(() => {
    if (!unidade) navigate("/login");
  }, [unidade, navigate]);

  // Sincroniza filtro de mês
  useEffect(() => {
    dispatchFilters({ type: 'SET_SELECTED_MONTH', payload: selectedMonth });
  }, [selectedMonth, dispatchFilters]);

  // Troca de mês
  const handleMonthChange = (newMonth) => setSelectedMonth(newMonth);

  if (!unidade) return <div>Redirecionando...</div>;
  if (loading) {
    return (
      <div className="loading-container">
        <Loading3D size={120} />
        
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
            totalFaturado={totalAtual}
            totalCurrent={totalAtual}
            totalPrevious={totalAnterior}
            percentChange={percentChange}
            countAtual={countAtual}
            countAnterior={countAnterior}
            pctVendas={pctVendas}
            mediaAtual={mediaAtual}
            mediaAnterior={mediaAnterior}
            pctMedia={pctMedia}
            selectedMonth={selectedMonth}
            pctConsultoresBatendoMeta={pctConsultoresBatendoMeta}
          />
          
        </div>
        {/* Resumo de Análises (tendência + projeção) */}
        


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
          totalFaturado={totalAtual}
          mediaVenda={mediaAtual}
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

        <div className="dashboard-section">
          <FileUploader
            file={file}
            setFile={setFile}
            handleUpload={handleUpload}
            uploading={uploading}
            processedData={processedData} // Adicionar esta prop
            successMessage={successMessage}
          />
        </div>
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
        .loading-container { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          gap: 1rem; 
          color: var(--text-primary, #1e293b);
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
