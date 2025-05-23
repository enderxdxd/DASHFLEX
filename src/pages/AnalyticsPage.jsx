// src/pages/AnalyticsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';
import {
  TrendingUp, BarChart2, PieChart, Users, Calendar, ChevronDown,
  AlertCircle, RefreshCw, Download, FileText, Filter,
  ArrowUpRight, ArrowDownRight, DollarSign, Percent, User, Package
} from "lucide-react";
import "../styles/AnalyticsPage.css";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Loading3D from '../components/ui/Loading3D';

// Componentes
import NavBar from "../components/NavBar";
import MonthSelector from "../components/dashboard/MonthSelector";
import HeatmapChart from "../components/dashboard/HeatmapChart";
import ProjectionCard from "../components/dashboard/ProjectionCard";
import TopPerformersChart from "../components/analytics/TopPerformersChart";
import ProductPieChart from "../components/analytics/ProductPieChart";
import LineChart from "../components/dashboard/LineChart";
import FiltersPanel from "../components/ui/FiltersPanel";
import PDFExporter from "../components/export/PDFExporter";
import QuickStats from "../components/analytics/QuickStats";
import AppliedFiltersSection from "../components/analytics/AppliedFiltersSection";
import EnhancedTable from "../components/analytics/EnhancedTable";

// Hooks
import { useVendas } from "../hooks/useVendas";
import { useMetas } from "../hooks/useMetas";
import { useConfigRem } from "../hooks/useConfigRem";
import {
  useMonthlyTrend,
  useDailyProductivity,
  useTopPerformers,
  useProductBreakdown
} from "../hooks/useAnalytics";
import { useProjectionFromFiltered } from "../hooks/useProjectionFromFiltered";
import { ExpandButton, ChartModal } from "../components/ui/ExpandableChart";

// Configurar dayjs para português
dayjs.locale('pt-br');

export default function AnalyticsPage() {
  const { unidade } = useParams();
  const lowerUni = unidade?.toLowerCase() || "";
  const [selMonth, setSelMonth] = useState(dayjs().format("YYYY-MM"));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  //UI-EXPANDABLECHART
  const [trendModalOpen, setTrendModalOpen] = useState(false);
  const [pieModalOpen, setPieModalOpen] = useState(false);
  const [performersModalOpen, setPerformersModalOpen] = useState(false);
  const [heatmapModalOpen, setHeatmapModalOpen] = useState(false);

  //UI-FILTERS
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [filteredData, setFilteredData] = useState(null);

  // Carrega vendas, metas e configRem
  const {
    vendas: vendasRaw,
    loading: loadingVendas,
    error: errorVendas
  } = useVendas(unidade || "");

  const {
    metas,
    isLoading: loadingMetas,
    error: errorMetas
  } = useMetas(unidade || "");

  const {
    configRem,
    loading: loadingConfig,
    error: errorConfig
  } = useConfigRem(unidade, selMonth);

  const metaUnidade = configRem.metaUnidade || 0;
  const comissaoPlanos = configRem.comissaoPlanos || [];
  const premiacao = configRem.premiacao || [];

  // Filtra só as vendas da unidade
  const vendasUnidade = useMemo(
    () =>
      Array.isArray(vendasRaw)
        ? vendasRaw.filter(v => (v.unidade || "").toLowerCase() === lowerUni)
        : [],
    [vendasRaw, lowerUni]
  );

  // Clientes oficiais
  const responsaveisOficiais = useMemo(
    () => metas.map(m => m.responsavel.trim().toLowerCase()),
    [metas]
  );

  // Dados de análise
  const trend      = useMonthlyTrend(vendasUnidade, metas, configRem);
  const heat       = useDailyProductivity(vendasUnidade, metas, selMonth);
  const proj       = useProjectionFromFiltered(vendasUnidade, metaUnidade, selMonth);
  const top5       = useTopPerformers(vendasUnidade, metas, selMonth,5);
  const breakdown  = useProductBreakdown(vendasUnidade, selMonth);

  // KPIs
  const totalVendasMes = useMemo(() => {
    return vendasUnidade
      .filter(v => 
        v.dataFormatada?.startsWith(selMonth) &&
        responsaveisOficiais.includes((v.responsavel||"").trim().toLowerCase())
      )
      .reduce((sum, v) => sum + Number(v.valor||0), 0);
  }, [vendasUnidade, selMonth, responsaveisOficiais]);

  const totalVendasMesAnterior = useMemo(() => {
    const mesAnt = dayjs(selMonth + "-01","YYYY-MM-DD").subtract(1,"month").format("YYYY-MM");
    return vendasUnidade
      .filter(v => v.dataFormatada?.startsWith(mesAnt))
      .reduce((sum, v) => sum + Number(v.valor||0), 0);
  }, [vendasUnidade, selMonth]);

  const crescimentoPercentual = totalVendasMesAnterior > 0
    ? ((totalVendasMes - totalVendasMesAnterior) / totalVendasMesAnterior) * 100
    : 0;

  const metaAtingidaPercent = metaUnidade > 0
    ? (totalVendasMes / metaUnidade) * 100
    : 0;

  // Loading / error geral
  useEffect(() => {
    if (!loadingVendas && !loadingMetas && !loadingConfig) {
      setIsLoading(false);
    }
    if (errorVendas || errorMetas || errorConfig) {
      setError(errorVendas || errorMetas || errorConfig);
    }
  }, [loadingVendas, loadingMetas, loadingConfig, errorVendas, errorMetas, errorConfig]);

  if (!unidade) return <Navigate to="/" replace />;
  if (isLoading)  return <Loading3D />;
  if (error)      return <div>Erro: {error}</div>;

  // Prepara dados para o gráfico de linha
  const labels     = trend.map(t => dayjs(`${t.mes}-01`).format("MMM/YY"));
  const dataValues = trend.map(t => t.vendas);
  const lineData = { labels, datasets: [{ label:"Vendas", data:dataValues }] };
  // Mostra estado de carregamento

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  // Função para aplicar os filtros aos dados
const applyFilters = (filters) => {
  let filtered = vendasUnidade;

  // Filtro por responsável
  if (filters.responsavel) {
    filtered = filtered.filter(v => 
      (v.responsavel || '').toLowerCase().includes(filters.responsavel.toLowerCase())
    );
  }

  // Filtro por produto
  if (filters.produto) {
    filtered = filtered.filter(v => 
      (v.produto || '').toLowerCase().includes(filters.produto.toLowerCase())
    );
  }

  // Filtro por valor mínimo
  if (filters.valorMin) {
    filtered = filtered.filter(v => Number(v.valor || 0) >= Number(filters.valorMin));
  }

  // Filtro por valor máximo
  if (filters.valorMax) {
    filtered = filtered.filter(v => Number(v.valor || 0) <= Number(filters.valorMax));
  }

  // Filtro por data de início
  if (filters.dataInicio) {
    filtered = filtered.filter(v => 
      v.dataFormatada && v.dataFormatada >= filters.dataInicio
    );
  }

  // Filtro por data fim
  if (filters.dataFim) {
    filtered = filtered.filter(v => 
      v.dataFormatada && v.dataFormatada <= filters.dataFim
    );
  }

  // Aplicar ordenação
  if (filters.ordenacao) {
    filtered = filtered.sort((a, b) => {
      switch (filters.ordenacao) {
        case 'data_desc':
          return new Date(b.dataFormatada || 0) - new Date(a.dataFormatada || 0);
        case 'data_asc':
          return new Date(a.dataFormatada || 0) - new Date(b.dataFormatada || 0);
        case 'valor_desc':
          return Number(b.valor || 0) - Number(a.valor || 0);
        case 'valor_asc':
          return Number(a.valor || 0) - Number(b.valor || 0);
        case 'responsavel_asc':
          return (a.responsavel || '').localeCompare(b.responsavel || '');
        case 'produto_asc':
          return (a.produto || '').localeCompare(b.produto || '');
        default:
          return 0;
      }
    });
  }

  setActiveFilters(filters);
  setFilteredData(filtered);
};

  
  if (isLoading) {
    return (
      <div className="app-container">
        <NavBar />
        <div className="main-content">
          <div className="loading-state">
            <Loading3D size={180} />
            <h2 className="loading-text">Carregando dashboard...</h2>
          </div>
        </div>
      </div>
    );
  }

  // Mostra estado de erro
  if (error) {
    return (
      <div className="app-container">
        <NavBar />
        <div className="main-content">
          <div className="error-state">
            <div className="error-card">
              <AlertCircle className="error-icon" />
              <h2 className="error-title">Erro ao carregar dados</h2>
              <p className="error-message">{error.message || "Ocorreu um erro ao carregar os dados. Tente novamente mais tarde."}</p>
              <button className="retry-button" onClick={() => window.location.reload()}>
                <RefreshCw className="retry-icon" />
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Função para exportar para PDF
  const exportToPDF = async () => {
    try {
      // Elemento que será convertido em PDF
      const element = document.querySelector('.details-content');
      if (!element) return;

      // Mostrar loading
      const loadingToast = document.createElement('div');
      loadingToast.className = 'export-loading';
      loadingToast.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Gerando PDF...</span>
      `;
      document.body.appendChild(loadingToast);

      // Capturar o elemento como imagem
      const canvas = await html2canvas(element, {
        scale: 2, // Melhor qualidade
        useCORS: true, // Permitir imagens de outros domínios
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Criar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Calcular dimensões para ajustar ao PDF
      const imgWidth = 210; // Largura A4
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Adicionar imagem ao PDF
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        imgWidth,
        imgHeight
      );

      // Gerar nome do arquivo com data
      const fileName = `relatorio_${unidade}_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`;

      // Salvar PDF
      pdf.save(fileName);

      // Remover loading
      document.body.removeChild(loadingToast);

      // Mostrar mensagem de sucesso
      const successToast = document.createElement('div');
      successToast.className = 'export-success';
      successToast.innerHTML = `
        <div class="success-icon">✓</div>
        <span>PDF gerado com sucesso!</span>
      `;
      document.body.appendChild(successToast);
      setTimeout(() => {
        document.body.removeChild(successToast);
      }, 3000);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      // Mostrar mensagem de erro
      const errorToast = document.createElement('div');
      errorToast.className = 'export-error';
      errorToast.innerHTML = `
        <div class="error-icon">✕</div>
        <span>Erro ao gerar PDF. Tente novamente.</span>
      `;
      document.body.appendChild(errorToast);
      setTimeout(() => {
        document.body.removeChild(errorToast);
      }, 3000);
    }
  };

  // Componente principal
  return (
    <div className="dashboard-container">
      <NavBar />
      
      <div className="main-wrapper">
        <header className="header">
          <div className="header-container">
            <div className="header-content">
              <div className="title-area">
                <h1 className="page-title">

                </h1>
                <span className={`status-badge ${metaAtingidaPercent >= 100 ? 'success' : 'pending'}`}>
                  {metaAtingidaPercent >= 100 ? 'Meta atingida' : 'Em andamento'}
                </span>
              </div>
              
              <div className="header-controls">
                <div className="tab-selector">
                  
                  <button 
                    onClick={() => setActiveTab('detalhes')} 
                    className={`tab-button ${activeTab === 'detalhes' ? 'active' : ''}`}
                  >
                    Detalhes
                  </button>
                </div>
                
                <div className="month-selector-desktop">
                  <MonthSelector value={selMonth} onChange={setSelMonth} />
                </div>
                
                <div className="action-buttons">
                  <button 
                    className={`icon-button ${Object.keys(activeFilters).length > 0 ? 'active' : ''}`}
                    onClick={() => setFiltersOpen(true)}
                  >
                    <Filter className="button-icon" />
                    {Object.keys(activeFilters).length > 0 && (
                      <span className="filter-badge">{Object.keys(activeFilters).length}</span>
                    )}
                  </button>
                  <button className="icon-button">
                    <Download className="button-icon" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="month-selector-mobile">
              <MonthSelector value={selMonth} onChange={setSelMonth} />
            </div>
          </div>
        </header>

        <main className="main-content">
          {activeTab === 'dashboard' && (
            <>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-header">
                    <div className="kpi-info">
                      <p className="kpi-label">Total de Vendas</p>
                      <h3 className="kpi-value">{formatMoney(totalVendasMes)}</h3>
                    </div>
                    <div className={`trend-indicator ${crescimentoPercentual >= 0 ? 'positive' : 'negative'}`}>
                      {crescimentoPercentual >= 0 ? (
                        <ArrowUpRight className="trend-icon" />
                      ) : (
                        <ArrowDownRight className="trend-icon" />
                      )}
                      <span className="trend-value">
                        {Math.abs(crescimentoPercentual).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="kpi-footer">
                    <div className="kpi-details">
                      <span className="details-text">vs. período anterior</span>
                      <span className={`details-badge ${crescimentoPercentual >= 0 ? 'positive' : 'negative'}`}>
                        {crescimentoPercentual >= 0 ? 'crescimento' : 'queda'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <div className="kpi-info">
                      <p className="kpi-label">Projeção de Fechamento</p>
                      <h3 className="kpi-value">{formatMoney(proj.projectedTotal || 0)}</h3>
                    </div>
                    <div className="icon-container projection">
                      <TrendingUp className="kpi-icon" />
                    </div>
                  </div>
                  <div className="kpi-footer">
                    <div className="progress-info">
                      <div className="progress-header">
                        <span className="progress-label">Progresso</span>
                        <span className="progress-value">{metaAtingidaPercent.toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar-container">
                        <div 
                          className={`progress-bar ${
                            metaAtingidaPercent >= 100
                              ? 'success'
                              : metaAtingidaPercent >= 75
                                ? 'good'
                                : 'warning'
                          }`}
                          style={{ width: `${Math.min(metaAtingidaPercent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <div className="kpi-info">
                      <p className="kpi-label">Média Diária</p>
                      <h3 className="kpi-value">{formatMoney(proj.avgDaily || 0)}</h3>
                    </div>
                    <div className="icon-container average">
                      <BarChart2 className="kpi-icon" />
                    </div>
                  </div>
                  <div className="kpi-footer">
                    <div className="kpi-details date-details">
                      <Calendar className="date-icon" />
                      <span className="date-text">
                        {dayjs(selMonth).format("MMMM [de] YYYY")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <div className="kpi-info">
                      <p className="kpi-label">Meta da Unidade</p>
                      <h3 className="kpi-value">{formatMoney(metaUnidade)}</h3>
                    </div>
                    <div className={`trend-indicator ${metaAtingidaPercent >= 100 ? 'success' : 'warning'}`}>
                      {metaAtingidaPercent >= 100 ? (
                        <DollarSign className="trend-icon" />
                      ) : (
                        <Percent className="trend-icon" />
                      )}
                      <span className="trend-value">
                        {metaAtingidaPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="kpi-footer">
                    <div className="remaining-info">
                      <span className="remaining-label">Falta</span>
                      <span className="remaining-value">
                        {formatMoney(Math.max(0, metaUnidade - totalVendasMes))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="projection-section">
                <ProjectionCard
                  soldToDate={totalVendasMes}
                  avgDaily={proj.avgDaily || 0}
                  projectedTotal={proj.projectedTotal || 0}
                  pctOfMeta={metaAtingidaPercent}
                  metaUnidade={metaUnidade}
                />
              </div>

              <div className="charts-grid">
                <div className="chart-container trend-chart">
                  <div className="chart-header">
                    <div className="chart-title-container">
                      <TrendingUp className="chart-icon trend" />
                      <h2 className="chart-title">Tendência Mensal</h2>
                    </div>
                    <div className="chart-controls">
                      <button className="chart-button">
                        <ExpandButton onClick={() => setTrendModalOpen(true)} />
                        <span>Ver detalhes</span>
                        <ChevronDown className="chart-button-icon" />
                      </button>
                    </div>
                  </div>
                  <div className="chart-body">
                    <LineChart 
                      data={lineData} 
                      height="100%" 
                      theme="primary"
                      smooth={true}
                      gradientFill={true}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        scales: {
                          y: {
                            ticks: {
                              callback: v => `R$ ${v.toLocaleString("pt-BR")}`
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="chart-container pie-chart">
                  <div className="chart-header">
                    <div className="chart-title-container">
                      <PieChart className="chart-icon pie" />
                      <h2 className="chart-title">Distribuição por Produto</h2>
                    </div>
                    <ExpandButton onClick={() => setPieModalOpen(true)} />
                    <Link to={`/dashboard/${unidade}`} className="chart-link">
                      Ver todos →
                    </Link>
                  </div>
                  <div className="chart-body">
                    <ProductPieChart data={breakdown || []} />
                  </div>
                </div>
              </div>

              <div className="bottom-grid">
                <div className="chart-container performers-chart">
                  <div className="chart-header">
                    <div className="chart-title-container">
                      <Users className="chart-icon performers" />
                      <h2 className="chart-title">Top Consultores</h2>
                    </div>
                    <ExpandButton onClick={() => setPerformersModalOpen(true)} />
                    <Link to={`/metas/${unidade}`} className="chart-link">
                      Ver todos →
                    </Link>
                  </div>
                  <div className="chart-body">
                    <TopPerformersChart data={top5 || []} />
                  </div>
                </div>

                <div className="chart-container heatmap-chart">
                  <div className="chart-header">
                    <div className="chart-title-container">
                      <Calendar className="chart-icon calendar" />
                      <h2 className="chart-title">
                        Produtividade Diária
                      </h2>
                    </div>
                    <ExpandButton onClick={() => setHeatmapModalOpen(true)} />
                    <div className="chart-date">
                      {dayjs(`${selMonth}-01`).format("MMMM [de] YYYY")}
                    </div>
                  </div>
                  <div className="chart-body heatmap-body">
                    <div className="heatmap-scroll">
                      <HeatmapChart days={heat?.days || []} data={heat?.data || {}} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'detalhes' && (
            <div className="details-container">
              <div className="details-header">
                <div className="header-left">
                  <h2 className="details-title">📊 Relatório Detalhado</h2>
                  <p className="details-subtitle">Análise completa dos dados filtrados</p>
                </div>
                <div className="details-controls">
                  <button 
                    className={`filter-button ${Object.keys(activeFilters).length > 0 ? 'active' : ''}`}
                    onClick={() => setFiltersOpen(true)}
                  >
                    <Filter size={16} />
                    <span>Filtros</span>
                    {Object.keys(activeFilters).length > 0 && (
                      <span className="filter-count">{Object.keys(activeFilters).length}</span>
                    )}
                  </button>
                  <PDFExporter
                    unidade={unidade}
                    selMonth={selMonth}
                    activeFilters={activeFilters}
                    filteredData={filteredData}
                    metaUnidade={metaUnidade}
                    totalVendasMes={totalVendasMes}
                    metaAtingidaPercent={metaAtingidaPercent}
                    trend={trend}
                    breakdown={breakdown}
                    top5={top5}
                  />
                </div>
              </div>
              {Object.keys(activeFilters).length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-header">
                    <Filter size={48} />
                    <div>
                      <h3 className="empty-title">Configure os filtros para começar</h3>
                      <p className="empty-description">
                        Selecione parâmetros específicos para gerar relatórios detalhados e análises personalizadas dos seus dados de vendas.
                      </p>
                    </div>
                  </div>
                  <button 
                    className="setup-filters-button"
                    onClick={() => setFiltersOpen(true)}
                  >
                    <Filter size={20} />
                    <span>Configurar Filtros</span>
                  </button>
                  <div className="suggestions-card">
                    <h4>💡 Sugestões de análises:</h4>
                    <ul>
                      <li><Calendar size={16} /> Vendas por período</li>
                      <li><User size={16} /> Performance por vendedor</li>
                      <li><Package size={16} /> Análise por produto</li>
                      <li><DollarSign size={16} /> Vendas por faixa de valor</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="details-content">
                  <AppliedFiltersSection 
                    activeFilters={activeFilters} 
                    onClearAll={() => setActiveFilters({})}
                    onRemoveFilter={(key) => setActiveFilters(prev => ({ ...prev, [key]: undefined }))}
                  />
                  <QuickStats filteredData={filteredData} />
                  <EnhancedTable 
                    filteredData={filteredData} 
                    formatMoney={formatMoney}
                  />
                </div>
              )}
            </div>
          )}
        </main>
        
        <footer className="footer">
          FlexApp Analytics • Dados atualizados em {dayjs().format("DD/MM/YYYY [às] HH:mm")}
        </footer>
      </div>

      {/* Modais para gráficos expandidos */}
      <ChartModal 
        isOpen={trendModalOpen}
        onClose={() => setTrendModalOpen(false)}
        title="Tendência Mensal"
      >
        <div style={{ height: '100%' }}>
          <LineChart 
            data={lineData} 
            height="100%" 
            theme="primary"
            smooth={true}
            gradientFill={true}
            options={{
              maintainAspectRatio: false,
              responsive: true,
              scales: {
                y: {
                  ticks: {
                    callback: v => `R$ ${v.toLocaleString("pt-BR")}`
                  }
                }
              }
            }}
          />
        </div>
      </ChartModal>

      <ChartModal 
        isOpen={pieModalOpen}
        onClose={() => setPieModalOpen(false)}
        title="Distribuição por Produto"
      >
        <div style={{ height: '100%' }}>
          <ProductPieChart data={breakdown || []} />
        </div>
      </ChartModal>

      <ChartModal 
        isOpen={performersModalOpen}
        onClose={() => setPerformersModalOpen(false)}
        title="Top Consultores"
      >
        <div style={{ height: '100%' }}>
          <TopPerformersChart data={top5 || []} />
        </div>
      </ChartModal>

      <ChartModal 
        isOpen={heatmapModalOpen}
        onClose={() => setHeatmapModalOpen(false)}
        title="Produtividade Diária"
      >
        <div style={{ height: '100%' }}>
          <HeatmapChart days={heat?.days || []} data={heat?.data || {}} />
        </div>
      </ChartModal>

      <FiltersPanel
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApplyFilters={applyFilters}
        vendas={vendasUnidade}
        metas={metas}
        currentFilters={activeFilters}
      />

<style jsx>{`
        .details-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
          padding: 8px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--bg-controls, #f8fafc) 0%, var(--bg-controls-light, #f1f5f9) 100%);
          box-shadow: var(--shadow-controls, 0 2px 8px rgba(0, 0, 0, 0.05));
          border: 1px solid var(--border-controls, #e2e8f0);
        }

        .filter-button,
        .export-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow-button, 0 2px 4px rgba(0, 0, 0, 0.05));
        }

        .filter-button::before,
        .export-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: currentColor;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .filter-button:hover::before,
        .export-button:hover::before {
          opacity: 0.1;
        }

        .filter-button {
          background: linear-gradient(135deg, var(--bg-filter, #f3f4f6) 0%, var(--bg-filter-light, #e5e7eb) 100%);
          color: var(--text-primary, #374151);
          border: 1px solid var(--border-filter, #d1d5db);
        }

        .filter-button:hover {
          background: linear-gradient(135deg, var(--bg-filter-hover, #e5e7eb) 0%, var(--bg-filter-hover-light, #d1d5db) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-button-hover, 0 4px 12px rgba(0, 0, 0, 0.1));
        }

        .filter-button.active {
          background: linear-gradient(135deg, var(--bg-filter-active, #e0e7ff) 0%, var(--bg-filter-active-light, #c7d2fe) 100%);
          color: var(--primary-dark, #3730a3);
          border: 1px solid var(--border-filter-active, #a5b4fc);
          transform: translateY(-1px);
          box-shadow: var(--shadow-button-active, 0 4px 12px rgba(99, 102, 241, 0.2));
        }

        .filter-count {
          background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dark, #4f46e5) 100%);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          min-width: 1.5rem;
          text-align: center;
          box-shadow: var(--shadow-count, 0 2px 4px rgba(99, 102, 241, 0.3));
          animation: pulse 2s ease-in-out infinite alternate;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.05); opacity: 1; }
        }

        .export-button {
          background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dark, #4f46e5) 100%);
          color: white;
          border: 1px solid var(--primary-dark, #4f46e5);
        }

        .export-button:hover {
          background: linear-gradient(135deg, var(--primary-dark, #4f46e5) 0%, var(--primary-darker, #4338ca) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-export-hover, 0 4px 12px rgba(99, 102, 241, 0.3));
        }

        .export-button:active {
          transform: translateY(0);
        }

        .export-icon {
          width: 1rem;
          height: 1rem;
          transition: transform 0.2s ease;
        }

        .export-button:hover .export-icon {
          transform: scale(1.1);
        }

        .details-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          background: linear-gradient(135deg, var(--bg-placeholder, #f9fafb) 0%, var(--bg-placeholder-light, #f3f4f6) 100%);
          border-radius: 1rem;
          text-align: center;
          margin-top: 2rem;
          border: 1px solid var(--border-placeholder, #e5e7eb);
          box-shadow: var(--shadow-placeholder, 0 4px 12px rgba(0, 0, 0, 0.05));
        }

        .placeholder-icon {
          color: var(--text-muted, #9ca3af);
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
          opacity: 0.7;
        }

        .details-placeholder:hover .placeholder-icon {
          opacity: 1;
          transform: scale(1.1);
        }

        .placeholder-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary, #374151);
          margin-bottom: 0.75rem;
          background: linear-gradient(135deg, var(--text-primary, #374151) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .placeholder-text {
          font-size: 0.875rem;
          color: var(--text-secondary, #6b7280);
          max-width: 32rem;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          font-weight: 500;
        }

        .setup-filters-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dark, #4f46e5) 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-setup-button, 0 4px 12px rgba(99, 102, 241, 0.3));
        }

        .setup-filters-button:hover {
          background: linear-gradient(135deg, var(--primary-dark, #4f46e5) 0%, var(--primary-darker, #4338ca) 100%);
          transform: translateY(-2px);
          box-shadow: var(--shadow-setup-button-hover, 0 6px 16px rgba(99, 102, 241, 0.4));
        }

        .setup-filters-button:active {
          transform: translateY(0);
        }

        .export-loading,
        .export-success,
        .export-error {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          z-index: 9999;
          animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
          border: 1px solid transparent;
          box-shadow: var(--shadow-toast, 0 8px 25px rgba(0, 0, 0, 0.15));
        }

        .export-loading {
          background: linear-gradient(135deg, var(--bg-loading, #f3f4f6) 0%, var(--bg-loading-light, #e5e7eb) 100%);
          color: var(--text-primary, #374151);
          border-color: var(--border-loading, #d1d5db);
        }

        .export-success {
          background: linear-gradient(135deg, var(--bg-success, #dcfce7) 0%, var(--bg-success-light, #bbf7d0) 100%);
          color: var(--success-text, #166534);
          border-color: var(--border-success, #86efac);
        }

        .export-error {
          background: linear-gradient(135deg, var(--bg-error, #fee2e2) 0%, var(--bg-error-light, #fecaca) 100%);
          color: var(--error-text, #991b1b);
          border-color: var(--border-error, #fca5a5);
        }

        .loading-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid var(--spinner-bg, rgba(55, 65, 81, 0.2));
          border-top-color: var(--text-primary, #374151);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .success-icon,
        .error-icon {
          width: 1.25rem;
          height: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        .success-icon {
          background: linear-gradient(135deg, var(--success, #22c55e) 0%, var(--success-dark, #16a34a) 100%);
          color: white;
          box-shadow: var(--shadow-success-icon, 0 2px 8px rgba(34, 197, 94, 0.3));
        }

        .error-icon {
          background: linear-gradient(135deg, var(--danger, #ef4444) 0%, var(--danger-dark, #dc2626) 100%);
          color: white;
          box-shadow: var(--shadow-error-icon, 0 2px 8px rgba(239, 68, 68, 0.3));
        }

        .empty-state-card {
          background: linear-gradient(135deg, var(--card, #fff) 0%, var(--card-light, #f8fafc) 100%);
          border-radius: 16px;
          box-shadow: var(--shadow-card, 0 8px 25px rgba(0,0,0,0.08));
          border: 1px solid var(--border-card, #e2e8f0);
          padding: 2.5rem 2rem;
          max-width: 480px;
          margin: 2rem auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: all 0.3s ease;
        }

        .empty-state-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-card-hover, 0 12px 30px rgba(0,0,0,0.12));
        }

        .empty-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .empty-header svg {
          color: var(--primary, #6366f1);
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .empty-state-card:hover .empty-header svg {
          transform: scale(1.1);
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin-bottom: 0.25rem;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .empty-description {
          color: var(--text-secondary, #475569);
          font-size: 1rem;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .suggestions-card {
          background: linear-gradient(135deg, var(--bg-suggestions, #f3f4f6) 0%, var(--bg-suggestions-light, #e5e7eb) 100%);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          margin-top: 1.5rem;
          width: 100%;
          border: 1px solid var(--border-suggestions, #d1d5db);
          box-shadow: var(--shadow-suggestions, 0 2px 8px rgba(0, 0, 0, 0.05));
        }

        .suggestions-card h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          color: var(--primary, #6366f1);
          font-weight: 700;
          background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dark, #4f46e5) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .suggestions-card ul {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0 0 0;
        }

        .suggestions-card li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-primary, #374151);
          margin-bottom: 0.5rem;
          font-size: 0.98rem;
          font-weight: 500;
          position: relative;
          padding-left: 1rem;
        }

        .suggestions-card li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--primary, #6366f1);
          font-weight: bold;
        }

        /* Manual Dark Mode Classes */
        .dark .details-controls,
        [data-theme="dark"] .details-controls {
          --bg-controls: #334155;
          --bg-controls-light: #475569;
          --border-controls: #475569;
          --bg-filter: #1e293b;
          --bg-filter-light: #334155;
          --bg-filter-hover: #334155;
          --bg-filter-hover-light: #475569;
          --bg-filter-active: #1e40af40;
          --bg-filter-active-light: #3b82f640;
          --border-filter: #475569;
          --border-filter-active: #6366f1;
          --bg-placeholder: #0f172a;
          --bg-placeholder-light: #1e293b;
          --border-placeholder: #334155;
          --bg-loading: #334155;
          --bg-loading-light: #475569;
          --border-loading: #64748b;
          --bg-success: #06402520;
          --bg-success-light: #05803020;
          --border-success: #22c55e;
          --bg-error: #99182020;
          --bg-error-light: #dc262620;
          --border-error: #ef4444;
          --card: #1e293b;
          --card-light: #334155;
          --border-card: #475569;
          --bg-suggestions: #334155;
          --bg-suggestions-light: #475569;
          --border-suggestions: #64748b;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --primary: #6366f1;
          --primary-dark: #4f46e5;
          --primary-darker: #4338ca;
          --success: #22c55e;
          --success-dark: #16a34a;
          --success-text: #22c55e;
          --danger: #ef4444;
          --danger-dark: #dc2626;
          --error-text: #ef4444;
          --spinner-bg: rgba(241, 245, 249, 0.2);
          --shadow-controls: 0 2px 8px rgba(0, 0, 0, 0.2);
          --shadow-button: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-button-hover: 0 4px 12px rgba(0, 0, 0, 0.3);
          --shadow-button-active: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-count: 0 2px 4px rgba(99, 102, 241, 0.4);
          --shadow-export-hover: 0 4px 12px rgba(99, 102, 241, 0.4);
          --shadow-setup-button: 0 4px 12px rgba(99, 102, 241, 0.4);
          --shadow-setup-button-hover: 0 6px 16px rgba(99, 102, 241, 0.5);
          --shadow-placeholder: 0 4px 12px rgba(0, 0, 0, 0.2);
          --shadow-toast: 0 8px 25px rgba(0, 0, 0, 0.4);
          --shadow-success-icon: 0 2px 8px rgba(34, 197, 94, 0.4);
          --shadow-error-icon: 0 2px 8px rgba(239, 68, 68, 0.4);
          --shadow-card: 0 8px 25px rgba(0,0,0,0.3);
          --shadow-card-hover: 0 12px 30px rgba(0,0,0,0.4);
          --shadow-suggestions: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        /* Light Mode Default Values */
        :root {
          --bg-controls: #f8fafc;
          --bg-controls-light: #f1f5f9;
          --border-controls: #e2e8f0;
          --bg-filter: #f3f4f6;
          --bg-filter-light: #e5e7eb;
          --bg-filter-hover: #e5e7eb;
          --bg-filter-hover-light: #d1d5db;
          --bg-filter-active: #e0e7ff;
          --bg-filter-active-light: #c7d2fe;
          --border-filter: #d1d5db;
          --border-filter-active: #a5b4fc;
          --bg-placeholder: #f9fafb;
          --bg-placeholder-light: #f3f4f6;
          --border-placeholder: #e5e7eb;
          --bg-loading: #f3f4f6;
          --bg-loading-light: #e5e7eb;
          --border-loading: #d1d5db;
          --bg-success: #dcfce7;
          --bg-success-light: #bbf7d0;
          --border-success: #86efac;
          --bg-error: #fee2e2;
          --bg-error-light: #fecaca;
          --border-error: #fca5a5;
          --card: #fff;
          --card-light: #f8fafc;
          --border-card: #e2e8f0;
          --bg-suggestions: #f3f4f6;
          --bg-suggestions-light: #e5e7eb;
          --border-suggestions: #d1d5db;
          --text-primary: #374151;
          --text-secondary: #6b7280;
          --text-muted: #9ca3af;
          --primary: #6366f1;
          --primary-dark: #4f46e5;
          --primary-darker: #4338ca;
          --success: #22c55e;
          --success-dark: #16a34a;
          --success-text: #166534;
          --danger: #ef4444;
          --danger-dark: #dc2626;
          --error-text: #991b1b;
          --spinner-bg: rgba(55, 65, 81, 0.2);
          --shadow-controls: 0 2px 8px rgba(0, 0, 0, 0.05);
          --shadow-button: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-button-hover: 0 4px 12px rgba(0, 0, 0, 0.1);
          --shadow-button-active: 0 4px 12px rgba(99, 102, 241, 0.2);
          --shadow-count: 0 2px 4px rgba(99, 102, 241, 0.3);
          --shadow-export-hover: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-setup-button: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-setup-button-hover: 0 6px 16px rgba(99, 102, 241, 0.4);
          --shadow-placeholder: 0 4px 12px rgba(0, 0, 0, 0.05);
          --shadow-toast: 0 8px 25px rgba(0, 0, 0, 0.15);
          --shadow-success-icon: 0 2px 8px rgba(34, 197, 94, 0.3);
          --shadow-error-icon: 0 2px 8px rgba(239, 68, 68, 0.3);
          --shadow-card: 0 8px 25px rgba(0,0,0,0.08);
          --shadow-card-hover: 0 12px 30px rgba(0,0,0,0.12);
          --shadow-suggestions: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        /* Enhanced interactions */
        .filter-button:focus,
        .export-button:focus,
        .setup-filters-button:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: 2px;
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .filter-button,
          .export-button,
          .setup-filters-button,
          .export-loading,
          .export-success,
          .export-error,
          .loading-spinner,
          .filter-count,
          .placeholder-icon,
          .empty-header svg,
          .empty-state-card {
            transition: none;
            animation: none;
            transform: none;
          }
          
          @keyframes slideIn,
          @keyframes spin,
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: none; }
          }
        }

        /* Print styles */
        @media print {
          .details-controls,
          .export-loading,
          .export-success,
          .export-error {
            display: none;
          }
          
          .empty-state-card {
            background: white;
            border: 1px solid #ccc;
            box-shadow: none;
          }
        }

        /* Responsive improvements */
        @media (max-width: 640px) {
          .details-controls {
            flex-direction: column;
            width: 100%;
            gap: 0.75rem;
            padding: 12px;
          }

          .filter-button,
          .export-button {
            width: 100%;
            justify-content: center;
          }

          .empty-state-card {
            margin: 1rem;
            padding: 2rem 1.5rem;
          }

          .empty-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .export-loading,
          .export-success,
          .export-error {
            bottom: 1rem;
            right: 1rem;
            left: 1rem;
            width: auto;
          }
        }

        @media (max-width: 480px) {
          .details-controls {
            padding: 8px;
            gap: 0.5rem;
          }

          .filter-button,
          .export-button,
          .setup-filters-button {
            padding: 0.625rem 1rem;
            font-size: 0.8125rem;
          }

          .empty-title {
            font-size: 1.125rem;
          }

          .placeholder-text {
            font-size: 0.8125rem;
          }

          .suggestions-card {
            padding: 0.75rem 1rem;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .tab-selector {
          display: flex;
          gap: 0.5rem;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.95rem;
          font-weight: 700;
          margin-left: 1rem;
          background: var(--badge-bg, #f3f4f6);
          color: var(--badge-text, #64748b);
          border: 1px solid var(--badge-border, #e5e7eb);
          transition: background 0.2s, color 0.2s;
        }
        .status-badge.success {
          background: var(--badge-success-bg, #dcfce7);
          color: var(--badge-success-text, #166534);
          border-color: var(--badge-success-border, #22c55e);
        }
        .status-badge.pending {
          background: var(--badge-pending-bg, #fef9c3);
          color: var(--badge-pending-text, #b45309);
          border-color: var(--badge-pending-border, #fde68a);
        }

        /* Light mode */
        :root {
          --tab-bg: #fff;
          --tab-text: #374151;
          --tab-border: #e2e8f0;
          --tab-shadow: 0 1px 2px rgba(0,0,0,0.03);
          --tab-bg-hover: #f3f4f6;
          --tab-text-hover: #6366f1;
          --tab-shadow-hover: 0 2px 8px rgba(99,102,241,0.08);
          --tab-bg-active: #6366f1;
          --tab-text-active: #fff;
          --tab-border-active: #6366f1;
          --tab-shadow-active: 0 4px 12px rgba(99,102,241,0.15);
          --badge-bg: #f3f4f6;
          --badge-text: #64748b;
          --badge-border: #e5e7eb;
          --badge-success-bg: #dcfce7;
          --badge-success-text: #166534;
          --badge-success-border: #22c55e;
          --badge-pending-bg: #fef9c3;
          --badge-pending-text: #b45309;
          --badge-pending-border: #fde68a;
        }

        /* Dark mode */
        .dark {
          --tab-bg: #1e293b;
          --tab-text: #f1f5f9;
          --tab-border: #334155;
          --tab-shadow: 0 1px 2px rgba(0,0,0,0.12);
          --tab-bg-hover: #334155;
          --tab-text-hover: #6366f1;
          --tab-shadow-hover: 0 2px 8px rgba(99,102,241,0.18);
          --tab-bg-active: #6366f1;
          --tab-text-active: #fff;
          --tab-border-active: #6366f1;
          --tab-shadow-active: 0 4px 12px rgba(99,102,241,0.25);
          --badge-bg: #334155;
          --badge-text: #94a3b8;
          --badge-border: #475569;
          --badge-success-bg: #06402520;
          --badge-success-text: #22c55e;
          --badge-success-border: #22c55e;
          --badge-pending-bg: #fde04720;
          --badge-pending-text: #fde047;
          --badge-pending-border: #fde047;
        }
      `}</style>
    </div>
  );
}