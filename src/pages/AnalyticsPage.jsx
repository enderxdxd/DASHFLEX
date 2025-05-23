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
                    onClick={() => setActiveTab('dashboard')} 
                    className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                  >
                    Dashboard
                  </button>
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
        }

        .filter-button,
        .export-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .filter-button {
          background-color: #f3f4f6;
          color: #374151;
        }

        .filter-button:hover {
          background-color: #e5e7eb;
        }

        .filter-button.active {
          background-color: #e0e7ff;
          color: #3730a3;
        }

        .filter-count {
          background-color: #3730a3;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          min-width: 1.5rem;
          text-align: center;
        }

        .export-button {
          background-color: #3730a3;
          color: white;
        }

        .export-button:hover {
          background-color: #312e81;
        }

        .export-icon {
          width: 1rem;
          height: 1rem;
        }

        .details-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          background-color: #f9fafb;
          border-radius: 1rem;
          text-align: center;
          margin-top: 2rem;
        }

        .placeholder-icon {
          color: #9ca3af;
          margin-bottom: 1.5rem;
        }

        .placeholder-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.75rem;
        }

        .placeholder-text {
          font-size: 0.875rem;
          color: #6b7280;
          max-width: 32rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .setup-filters-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background-color: #3730a3;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .setup-filters-button:hover {
          background-color: #312e81;
        }

        @media (max-width: 640px) {
          .details-controls {
            flex-direction: column;
            width: 100%;
          }

          .filter-button,
          .export-button {
            width: 100%;
            justify-content: center;
          }
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
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }

        .export-loading {
          background-color: #f3f4f6;
          color: #374151;
        }

        .export-success {
          background-color: #dcfce7;
          color: #166534;
        }

        .export-error {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .loading-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid #374151;
          border-top-color: transparent;
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
        }

        .success-icon {
          background-color: #166534;
          color: white;
        }

        .error-icon {
          background-color: #991b1b;
          color: white;
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

        .empty-state-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          padding: 2.5rem 2rem;
          max-width: 480px;
          margin: 2rem auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .empty-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .empty-header svg {
          color: #6366f1;
          flex-shrink: 0;
        }
        .empty-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        .empty-description {
          color: #475569;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .setup-filters-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background-color: #6366f1;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1.5rem;
          margin-top: 0.5rem;
          box-shadow: 0 2px 8px rgba(99,102,241,0.08);
        }
        .setup-filters-button:hover {
          background-color: #4f46e5;
        }
        .suggestions-card {
          background: #f3f4f6;
          border-radius: 12px;
          padding: 1rem 1.5rem;
          margin-top: 1.5rem;
          width: 100%;
        }
        .suggestions-card h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          color: #6366f1;
          font-weight: 600;
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
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.98rem;
        }
      `}</style>
    </div>
  );
}