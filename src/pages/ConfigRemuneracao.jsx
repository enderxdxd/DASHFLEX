import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { useVendas } from '../hooks/useVendas';
import { useConfigRem } from '../hooks/useConfigRem';
import { useMetas } from '../hooks/useMetas';
import { 
  Settings, 
  Target, 
  DollarSign, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Award,
  Calculator,
  Eye,
  BarChart3,
  Info,
  Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../styles/ConfigRemuneracao.css';
import Navbar from '../components/NavBar';
// Dark mode is handled globally by useDarkMode hook

const gerarPlanosPadraoLocal = (unidade) => {
  if (!unidade) return [];
  
  switch (unidade.toLowerCase()) {
    case "alphaville":
      return [
        { plano: "Semestral", min: 2700, max: 3474, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Bianual", min: 10000, max: 11496, semMeta: 61, comMeta: 67, metaTME: 71 },
        { plano: "Octomestral", min: 4000, max: 4432, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1300, max: 1887, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Anual", min: 5200, max: 6264, semMeta: 38, comMeta: 42, metaTME: 45 },
      ];
    case "buena vista":
      return [
        { plano: "Semestral", min: 2300, max: 2496, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Bianual", min: 7364, max: 8112, semMeta: 61, comMeta: 67, metaTME: 71 },
        { plano: "Octomestral", min: 3000, max: 3224, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 3, comMeta: 6, metaTME: 9 },
        { plano: "Trimestral", min: 1200, max: 1368, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Anual", min: 4000, max: 4356, semMeta: 38, comMeta: 42, metaTME: 45 },
      ];
    case "marista":
      return [
        { plano: "Semestral", min: 3000, max: 3324, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Bianual", min: 9000, max: 9816, semMeta: 61, comMeta: 67, metaTME: 71 },
        { plano: "Octomestral", min: 4072, max: 6264, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1500, max: 1794, semMeta: 18, comMeta: 24, metaTME: 28 },
        { plano: "Anual", min: 5000, max: 5508, semMeta: 38, comMeta: 42, metaTME: 45 },
      ];
    default:
      return [];
  }
};

const gerarFaixasPremiacaoLocal = (unidade) => {
  if (!unidade) return [];
  
  const isAlphaville = unidade.toLowerCase() === 'alphaville';
  const faixas = [];
  const inicio = 35;
  const incremento = 5;
  const valorBase = isAlphaville ? 200 : 180;
  const valorMeta = isAlphaville ? 220 : 200;
  
  for (let percentual = inicio; percentual < 100; percentual += incremento) {
    faixas.push({ percentual: percentual, premio: valorBase });
  }
  
  faixas.push({ percentual: 100, premio: valorMeta });
  
  for (let percentual = 105; percentual <= 200; percentual += incremento) {
    faixas.push({ percentual: percentual, premio: valorMeta });
  }
  
  return faixas;
};

const PlanosVisualizerIntegrado = ({ comissaoPlanos, configRem, unidade, vendas, responsaveis, metas }) => {
  const [selectedConsultor, setSelectedConsultor] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [activeView, setActiveView] = useState('overview');

  const vendasDoMes = vendas.filter(v => {
    const dataVenda = dayjs(v.dataFormatada, 'YYYY-MM-DD');
    return dataVenda.format('YYYY-MM') === selectedMonth;
  });
  
  const totalUnidade = vendasDoMes.reduce((soma, v) => soma + Number(v.valor || 0), 0);
  const unidadeBatida = totalUnidade >= Number(configRem?.metaUnidade || 0);

  const vendasFiltradas = vendasDoMes.filter(venda => {
    if (selectedConsultor && venda.responsavel !== selectedConsultor) return false;
    return true;
  });

  const calcularRemuneracaoDetalhada = (metaValor, vendasArr, unidadeBatida, configRem) => {
    const { comissaoPlanos = [], taxaSem = 0.012, taxaCom = 0.015 } = configRem || {};
    
    let totalComissaoPlanos = 0;
    let totalComissaoOutros = 0;
    let vendasPlanos = [];
    let vendasOutros = [];
    
    const totalVendas = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
    const metaIndividualBatida = totalVendas >= metaValor;
    
    vendasArr.forEach(venda => {
      const valorVenda = Number(venda.valor || 0);
      
      // 🔧 CORREÇÃO: Identifica planos por NOME "plano" E valor dentro do intervalo
      // Evita confusão com outros produtos (ex: taxa de personal) que podem ter valores similares
      const plano = (venda.produto.trim().toLowerCase() === "plano" && Array.isArray(comissaoPlanos)) 
        ? comissaoPlanos.find(p => 
            valorVenda >= (p.min || 0) && 
            valorVenda <= (p.max || Infinity)
          )
        : null;
      
      if (plano) {
        // ✅ VENDA É UM PLANO: Usar valor fixo baseado nas metas
        let comissaoVenda;
        if (unidadeBatida) {
          comissaoVenda = plano.metaTME || 0; // Meta da unidade batida
        } else if (metaIndividualBatida) {
          comissaoVenda = plano.comMeta || 0; // Meta individual batida
        } else {
          comissaoVenda = plano.semMeta || 0; // Meta individual não batida
        }
        
        totalComissaoPlanos += comissaoVenda;
        vendasPlanos.push({
          ...venda,
          comissao: comissaoVenda,
          planoConfig: plano,
          tipoComissao: unidadeBatida ? 'TME' : (metaIndividualBatida ? 'comMeta' : 'semMeta')
        });
      } else {
        // ✅ VENDA NÃO É UM PLANO: Usar taxa percentual
        const taxa = metaIndividualBatida ? taxaCom : taxaSem;
        const comissaoVenda = valorVenda * taxa;
        
        totalComissaoOutros += comissaoVenda;
        vendasOutros.push({
          ...venda,
          comissao: comissaoVenda,
          taxa: taxa,
          tipoComissao: metaIndividualBatida ? 'comMeta' : 'semMeta'
        });
      }
    });
    
    return {
      totalComissaoPlanos,
      totalComissaoOutros,
      totalComissao: totalComissaoPlanos + totalComissaoOutros,
      vendasPlanos,
      vendasOutros,
      metaIndividualBatida,
      totalVendas
    };
  };

  const analiseConsultores = () => {
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    
    return metasDoMes.map(meta => {
      const vendasDoConsultor = vendasFiltradas.filter(v => 
        v.responsavel.trim().toLowerCase() === meta.responsavel.trim().toLowerCase()
      );
      
      const analise = calcularRemuneracaoDetalhada(
        Number(meta.meta),
        vendasDoConsultor,
        unidadeBatida,
        configRem
      );
      
      return {
        ...meta,
        ...analise,
        percentualMeta: meta.meta > 0 ? (analise.totalVendas / meta.meta) * 100 : 0
      };
    });
  };

  const estatisticasGerais = () => {
    const totalVendasPlanos = vendasFiltradas.filter(v => v.produto.trim().toLowerCase() === "plano");
    const totalVendasOutros = vendasFiltradas.filter(v => v.produto.trim().toLowerCase() !== "plano");
    
    const valorPlanos = totalVendasPlanos.reduce((s, v) => s + Number(v.valor || 0), 0);
    const valorOutros = totalVendasOutros.reduce((s, v) => s + Number(v.valor || 0), 0);
    
    return {
      totalVendas: vendasFiltradas.length,
      totalValor: valorPlanos + valorOutros,
      planos: {
        quantidade: totalVendasPlanos.length,
        valor: valorPlanos,
        percentual: vendasFiltradas.length > 0 ? (totalVendasPlanos.length / vendasFiltradas.length) * 100 : 0
      },
      outros: {
        quantidade: totalVendasOutros.length,
        valor: valorOutros,
        percentual: vendasFiltradas.length > 0 ? (totalVendasOutros.length / vendasFiltradas.length) * 100 : 0
      }
    };
  };

  const dadosConsultores = analiseConsultores();
  const estatisticas = estatisticasGerais();

  return (
    <div className="planos-visualizer">
      <div className={`meta-status ${unidadeBatida ? 'success' : 'warning'}`}>
        <h4>
          {unidadeBatida ? '🎯 Meta da Unidade ATINGIDA!' : '⚠️ Meta da Unidade NÃO atingida'}
        </h4>
        <p>
          Meta: R$ {(configRem?.metaUnidade || 0).toLocaleString('pt-BR')} | 
          Realizado: R$ {totalUnidade.toLocaleString('pt-BR')} | 
          {configRem?.metaUnidade > 0 ? `${(totalUnidade / configRem.metaUnidade * 100).toFixed(1)}%` : '0%'}
        </p>
        <small>
          <strong>Impacto:</strong> {unidadeBatida ? 'Comissões dos planos usando valores TME (mais altos)' : 'Comissões dos planos usando valores padrão'}
        </small>
      </div>

      <div className="filters-section">
        <h4><Filter size={16} /> Filtros de Análise</h4>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Mês:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Consultor:</label>
            <select
              value={selectedConsultor}
              onChange={(e) => setSelectedConsultor(e.target.value)}
            >
              <option value="">Todos</option>
              {responsaveis.map(consultor => (
                <option key={consultor} value={consultor}>{consultor}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="view-tabs">
        <button 
          className={`view-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          <BarChart3 size={16} />
          Visão Geral
        </button>
        <button 
          className={`view-tab ${activeView === 'consultores' ? 'active' : ''}`}
          onClick={() => setActiveView('consultores')}
        >
          <Eye size={16} />
          Por Consultor
        </button>
      </div>

      {activeView === 'overview' && (
        <div className="overview-content">
          <div className="stats-grid">
            <div className="stat-card">
              <h5>Total de Vendas</h5>
              <span className="stat-number">{estatisticas.totalVendas}</span>
            </div>
            <div className="stat-card">
              <h5>Valor Total</h5>
              <span className="stat-value">R$ {estatisticas.totalValor.toLocaleString('pt-BR')}</span>
            </div>
            <div className="stat-card">
              <h5>Vendas de Planos</h5>
              <span className="stat-number">{estatisticas.planos.quantidade}</span>
              <small>{estatisticas.planos.percentual.toFixed(1)}% do total</small>
            </div>
            <div className="stat-card">
              <h5>Outros Produtos</h5>
              <span className="stat-number">{estatisticas.outros.quantidade}</span>
              <small>{estatisticas.outros.percentual.toFixed(1)}% do total</small>
            </div>
          </div>

          <div className="charts-section">
            <div className="chart-container">
              <h4><Info size={16} /> Planos vs Outros Produtos</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Planos', value: estatisticas.planos.valor, fill: '#4f46e5' },
                      { name: 'Outros', value: estatisticas.outros.valor, fill: '#dc2626' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  />
                  <Tooltip formatter={(value) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeView === 'consultores' && (
        <div className="consultores-content">
          <div className="consultores-grid">
            {dadosConsultores.map((consultor, index) => (
              <div key={consultor.id || index} className="consultor-card">
                <div className="consultor-header">
                  <h4>{consultor.responsavel}</h4>
                  <div className={`status-badge ${consultor.metaIndividualBatida ? 'success' : 'warning'}`}>
                    {consultor.metaIndividualBatida ? 'Meta Atingida' : 'Meta Não Atingida'}
                  </div>
                </div>
                
                <div className="consultor-stats">
                  <div className="stat-row">
                    <span className="label">Meta:</span>
                    <span className="value">R$ {Number(consultor.meta).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Vendas:</span>
                    <span className="value">R$ {consultor.totalVendas.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">% Meta:</span>
                    <span className={`value ${consultor.percentualMeta >= 100 ? 'success' : 'warning'}`}>
                      {consultor.percentualMeta.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="remuneracao-breakdown">
                  <h5>Remuneração Detalhada</h5>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Comissão Planos:</span>
                    <span className="breakdown-value success">R$ {consultor.totalComissaoPlanos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Comissão Outros:</span>
                    <span className="breakdown-value">R$ {consultor.totalComissaoOutros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="breakdown-item total">
                    <span className="breakdown-label"><strong>Total Comissão:</strong></span>
                    <span className="breakdown-value"><strong>R$ {consultor.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                </div>

                <div className="vendas-details">
                  <div className="vendas-summary">
                    <div className="vendas-type">
                      <span className="type-label">Planos:</span>
                      <span className="type-count">{consultor.vendasPlanos.length} vendas</span>
                    </div>
                    <div className="vendas-type">
                      <span className="type-label">Outros:</span>
                      <span className="type-count">{consultor.vendasOutros.length} vendas</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ConfigRemuneracao = () => {
  const { unidade } = useParams();
  // Dark mode is handled globally
  
  const { vendas, loading: vendasLoading, responsaveis } = useVendas(unidade);
  const { metas, loading: metasLoading } = useMetas(unidade);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const { configRem, loading: configLoading } = useConfigRem(unidade, selectedMonth);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('meta');

  const [metaUnidade, setMetaUnidade] = useState('');
  const [faixas, setFaixas] = useState([]);
  const [comissaoPlanos, setComissaoPlanos] = useState([]);
  const [taxaSem, setTaxaSem] = useState('1.2');
  const [taxaCom, setTaxaCom] = useState('1.5');

  useEffect(() => {
    if (configRem && !configLoading) {
      setMetaUnidade(configRem.metaUnidade?.toString() || '');
      setFaixas(configRem.premiacao || []);
      setComissaoPlanos(configRem.comissaoPlanos || []);
      setTaxaSem(((configRem.taxaSem || 0.012) * 100).toString());
      setTaxaCom(((configRem.taxaCom || 0.015) * 100).toString());
    }
  }, [configRem, configLoading]);

  if (!unidade) {
    return (
      <div className="config-wrapper">
        <div className="loading-state">
          <RefreshCw className="spinner" size={24} />
          <p>Aguardando dados da unidade...</p>
        </div>
      </div>
    );
  }

  if (vendasLoading || metasLoading || configLoading) {
    return (
      <div className="config-wrapper">
        <div className="loading-state">
          <RefreshCw className="spinner" size={24} />
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  const addFaixa = () => {
    setFaixas([...faixas, { percentual: '', premio: '' }]);
  };

  const updateFaixa = (index, field, value) => {
    const novasFaixas = [...faixas];
    novasFaixas[index][field] = value;
    setFaixas(novasFaixas);
  };

  const removeFaixa = (index) => {
    setFaixas(faixas.filter((_, i) => i !== index));
  };

  const gerarFaixasPadrao = () => {
    if (!unidade) return;
    const novasFaixas = gerarFaixasPremiacaoLocal(unidade);
    setFaixas(novasFaixas);
    setSuccessMessage('Faixas de premiação geradas!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const addPlano = () => {
    setComissaoPlanos([
      ...comissaoPlanos,
      { plano: '', min: '', max: '', semMeta: '', comMeta: '', metaTME: '' }
    ]);
  };

  const updatePlano = (index, field, value) => {
    const novosPlanos = [...comissaoPlanos];
    novosPlanos[index][field] = value;
    setComissaoPlanos(novosPlanos);
  };

  const removePlano = (index) => {
    setComissaoPlanos(comissaoPlanos.filter((_, i) => i !== index));
  };

  const carregarPlanosPadrao = () => {
    if (!unidade) return;
    const planosPadrao = gerarPlanosPadraoLocal(unidade);
    setComissaoPlanos(planosPadrao);
    setSuccessMessage('Planos padrão carregados!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const salvarConfiguracao = async () => {
    try {
      setIsLoading(true);
      setError('');

      const configData = {
        metaUnidade: parseInt(metaUnidade, 10) || 0,
        premiacao: faixas.map(f => ({
          percentual: parseFloat(f.percentual) || 0,
          premio: parseFloat(f.premio) || 0
        })),
        comissaoPlanos: comissaoPlanos.map(p => ({
          plano: p.plano,
          min: parseFloat(p.min) || 0,
          max: parseFloat(p.max) || 0,
          semMeta: parseFloat(p.semMeta) || 0,
          comMeta: parseFloat(p.comMeta) || 0,
          metaTME: parseFloat(p.metaTME) || 0
        })),
        taxaSem: parseFloat(taxaSem) / 100 || 0.012,
        taxaCom: parseFloat(taxaCom) / 100 || 0.015,
        updatedAt: dayjs().toISOString()
      };

      const docRef = doc(
        db,
        'faturamento',
        unidade?.toLowerCase() || 'default',
        'configRemuneracao',
        `premiacao-${selectedMonth}`
      );

      await setDoc(docRef, configData);

      setSuccessMessage('Configuração salva com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar configuração. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const configParaVisualizer = {
    metaUnidade: parseInt(metaUnidade, 10) || 0,
    premiacao: faixas,
    comissaoPlanos: comissaoPlanos,
    taxaSem: parseFloat(taxaSem) / 100 || 0.012,
    taxaCom: parseFloat(taxaCom) / 100 || 0.015
  };

  return (
    <div className="config-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <Settings size={24} />
            <h1>Configuração de Remuneração</h1>
            <span className="unidade-badge">{unidade?.toUpperCase()}</span>
          </div>
          
          <div className="header-controls">
            <div className="month-selector">
              <label>Período:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert success">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'meta' ? 'active' : ''}`}
          onClick={() => setActiveTab('meta')}
        >
          <Target size={20} />
          Meta da Unidade
        </button>
        <button 
          className={`tab ${activeTab === 'planos' ? 'active' : ''}`}
          onClick={() => setActiveTab('planos')}
        >
          <DollarSign size={20} />
          Planos de Comissão
        </button>
        <button 
          className={`tab ${activeTab === 'premiacao' ? 'active' : ''}`}
          onClick={() => setActiveTab('premiacao')}
        >
          <Award size={20} />
          Faixas de Premiação
        </button>
        <button 
          className={`tab ${activeTab === 'outros' ? 'active' : ''}`}
          onClick={() => setActiveTab('outros')}
        >
          <Calculator size={20} />
          Outros Produtos
        </button>
        <button 
          className={`tab ${activeTab === 'visualizador' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualizador')}
        >
          <BarChart3 size={20} />
          Visualizador
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'meta' && (
          <div className="tab-panel">
            <h2>Meta da Unidade</h2>
            <div className="form-section">
              <div className="input-group">
                <label>Valor da Meta Mensal (R$)</label>
                <div className="currency-input">
                  <span className="currency-symbol">R$</span>
                  <input
                    type="number"
                    value={metaUnidade}
                    onChange={(e) => setMetaUnidade(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <small>Meta mensal da unidade. Quando atingida, aplica valores TME nos planos.</small>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planos' && (
          <div className="tab-panel">
            <div className="section-header">
              <h2>Planos de Comissão</h2>
              <div className="section-actions">
                <button className="btn secondary" onClick={addPlano}>
                  <Plus size={16} />
                  Adicionar
                </button>
                <button className="btn secondary" onClick={carregarPlanosPadrao}>
                  <RefreshCw size={16} />
                  Carregar Padrão
                </button>
              </div>
            </div>
            
            {comissaoPlanos.length === 0 ? (
              <div className="empty-state">
                <DollarSign size={48} />
                <p>Nenhum plano configurado</p>
                <button className="btn primary" onClick={carregarPlanosPadrao}>
                  Carregar Planos Padrão
                </button>
              </div>
            ) : (
              <div className="planos-grid">
                {comissaoPlanos.map((plano, index) => (
                  <div key={index} className="plano-card">
                    <div className="card-header">
                      <input
                        type="text"
                        value={plano.plano}
                        onChange={(e) => updatePlano(index, 'plano', e.target.value)}
                        placeholder="Nome do plano"
                        className="plano-name-input"
                      />
                      <button 
                        className="btn-icon danger"
                        onClick={() => removePlano(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="card-content">
                      <div className="input-row">
                        <div className="input-group">
                          <label>Valor Mínimo</label>
                          <input
                            type="number"
                            value={plano.min}
                            onChange={(e) => updatePlano(index, 'min', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="input-group">
                          <label>Valor Máximo</label>
                          <input
                            type="number"
                            value={plano.max}
                            onChange={(e) => updatePlano(index, 'max', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="comissao-values">
                        <div className="input-group">
                          <label>Sem Meta (R$)</label>
                          <input
                            type="number"
                            value={plano.semMeta}
                            onChange={(e) => updatePlano(index, 'semMeta', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="input-group">
                          <label>Com Meta (R$)</label>
                          <input
                            type="number"
                            value={plano.comMeta}
                            onChange={(e) => updatePlano(index, 'comMeta', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="input-group">
                          <label>Meta TME (R$)</label>
                          <input
                            type="number"
                            value={plano.metaTME}
                            onChange={(e) => updatePlano(index, 'metaTME', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'premiacao' && (
          <div className="tab-panel">
            <div className="section-header">
              <h2>Faixas de Premiação</h2>
              <div className="section-actions">
                <button className="btn secondary" onClick={addFaixa}>
                  <Plus size={16} />
                  Adicionar
                </button>
                <button className="btn secondary" onClick={gerarFaixasPadrao}>
                  <RefreshCw size={16} />
                  Gerar Padrão
                </button>
              </div>
            </div>
            
            {faixas.length === 0 ? (
              <div className="empty-state">
                <Award size={48} />
                <p>Nenhuma faixa de premiação configurada</p>
                <button className="btn primary" onClick={gerarFaixasPadrao}>
                  Gerar Faixas Padrão
                </button>
              </div>
            ) : (
              <div className="faixas-grid">
                {faixas.map((faixa, index) => (
                  <div key={index} className="faixa-card">
                    <div className="card-header">
                      <span className="faixa-number">#{index + 1}</span>
                      <button 
                        className="btn-icon danger"
                        onClick={() => removeFaixa(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="card-content">
                      <div className="input-group">
                        <label>Percentual da Meta (%)</label>
                        <input
                          type="number"
                          value={faixa.percentual}
                          onChange={(e) => updateFaixa(index, 'percentual', e.target.value)}
                          placeholder="0"
                          min="0"
                          max="500"
                        />
                      </div>
                      <div className="input-group">
                        <label>Prêmio (R$)</label>
                        <input
                          type="number"
                          value={faixa.premio}
                          onChange={(e) => updateFaixa(index, 'premio', e.target.value)}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'outros' && (
          <div className="tab-panel">
            <h2>Outros Produtos (Taxas %)</h2>
            <div className="taxas-grid">
              <div className="taxa-card">
                <div className="taxa-header">
                  <TrendingUp size={20} />
                  <h4>Meta NÃO Atingida</h4>
                </div>
                <div className="taxa-input">
                  <input
                    type="number"
                    value={taxaSem}
                    onChange={(e) => setTaxaSem(e.target.value)}
                    placeholder="1.2"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                  <span className="taxa-symbol">%</span>
                </div>
                <small>Taxa aplicada quando meta individual não é atingida</small>
              </div>
              
              <div className="taxa-card success">
                <div className="taxa-header">
                  <TrendingUp size={20} />
                  <h4>Meta Atingida</h4>
                </div>
                <div className="taxa-input">
                  <input
                    type="number"
                    value={taxaCom}
                    onChange={(e) => setTaxaCom(e.target.value)}
                    placeholder="1.5"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                  <span className="taxa-symbol">%</span>
                </div>
                <small>Taxa aplicada quando meta individual é atingida</small>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visualizador' && (
          <div className="tab-panel">
            <h2>Visualização dos Planos</h2>
            <PlanosVisualizerIntegrado 
              comissaoPlanos={comissaoPlanos}
              configRem={configParaVisualizer}
              unidade={unidade}
              vendas={vendas}
              responsaveis={responsaveis}
              metas={metas}
            />
          </div>
        )}
      </div>

      <div className="page-footer">
        <button 
          className="btn primary large"
          onClick={salvarConfiguracao}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw size={20} className="spinning" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={20} />
              Salvar Configuração
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfigRemuneracao;