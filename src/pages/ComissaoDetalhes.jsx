// src/pages/ComissaoDetalhes.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Calculator, Users, AlertCircle, RefreshCw, Sun, Moon } from 'lucide-react';
import NavBar from '../components/NavBar';
import ConsultorCard from '../components/comissao/ConsultorCard';
import ComissaoFilters from '../components/comissao/ComissaoFilters';
import ComissaoTable from '../components/comissao/ComissaoTable';
import ComissaoStats from '../components/comissao/ComissaoStats';
import { useVendas } from '../hooks/useVendas';
import { useMetas } from '../hooks/useMetas';
import { useDescontos } from '../hooks/useDescontos';
import useDarkMode from '../hooks/useDarkMode';
import '../styles/ComissaoComponents.css';

// Função para aplicar correção de diárias (baseada no sistema real - COPIADA DO ORIGINAL)
const corrigirClassificacaoDiarias = (venda) => {
  if (!venda) return venda;
  
  const vendaCorrigida = { ...venda };
  const planoValue = String(venda.plano || '').toLowerCase().trim();
  
  const padroesDiarias = [
    'diária', 'diárias', 'diaria', 'diarias',
    'plano.*diária', 'plano.*diárias',
    '\\d+\\s*diária', '\\d+\\s*diárias'
  ];
  
  const temDiariaNoPlano = padroesDiarias.some(padrao => {
    const regex = new RegExp(padrao, 'i');
    return regex.test(planoValue);
  });
  
  if (temDiariaNoPlano) {
    vendaCorrigida.produto = venda.plano;
    vendaCorrigida.plano = '';
    vendaCorrigida.correcaoAplicada = 'diaria_reclassificada';
    vendaCorrigida.motivoCorrecao = `Diária movida de "plano" para "produto": ${venda.plano}`;
  }
  
  return vendaCorrigida;
};

// Função para verificar se é plano após correção (baseada no sistema real - COPIADA DO ORIGINAL)
const ehPlanoAposCorrecao = (venda) => {
  if (!venda) return false;
  
  const vendaCorrigida = corrigirClassificacaoDiarias(venda);
  
  if (vendaCorrigida.correcaoAplicada === 'diaria_reclassificada') {
    return false;
  }
  
  const produto = String(vendaCorrigida.produto || '').toLowerCase().trim();
  
  if (produto.includes('diária') || produto.includes('diaria')) {
    return false;
  }
  
  if (produto !== 'plano') {
    return false;
  }
  
  if (vendaCorrigida.duracaoMeses && typeof vendaCorrigida.duracaoMeses === 'number') {
    return vendaCorrigida.duracaoMeses >= 1;
  }
  
  if (vendaCorrigida.dataInicio && vendaCorrigida.dataFim) {
    const inicio = new Date(vendaCorrigida.dataInicio);
    const fim = new Date(vendaCorrigida.dataFim);
    const diasReais = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
    return diasReais >= 25;
  }
  
  return false;
};

// Função para calcular comissão (baseada no sistema real - COPIADA DO ORIGINAL)
const calcularComissaoReal = (venda, ehPlano, temDesconto, bateuMetaIndividual, unidadeBatida) => {
  const valor = Number(venda.valor || 0);
  
  if (valor <= 0) return 0;
  
  if (!ehPlano) {
    const taxa = bateuMetaIndividual ? 0.015 : 0.012;
    return valor * taxa;
  }
  
  const duracao = venda.duracaoMeses || 1;
  const duracaoMap = { 1: 0, 3: 1, 6: 2, 8: 3, 12: 4, 24: 5 };
  const indice = duracaoMap[duracao] || 0;
  
  let tabela;
  if (unidadeBatida) {
    tabela = temDesconto ? [9, 20, 25, 34, 45, 71] : [15, 28, 43, 51, 65, 107];
  } else if (bateuMetaIndividual) {
    tabela = temDesconto ? [6, 16, 23, 30, 42, 67] : [12, 24, 37, 47, 60, 103];
  } else {
    tabela = temDesconto ? [3, 11, 21, 25, 38, 61] : [9, 18, 28, 42, 53, 97];
  }
  
  return tabela[indice] || 0;
};

export default function ComissaoDetalhes() {
  // Estados principais
  const { unidade: unidadeParam } = useParams();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(unidadeParam || 'alphaville');
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [mesAtual, setMesAtual] = useState('2025-08');
  const [showDetails, setShowDetails] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [resultadosAnalise, setResultadosAnalise] = useState(null);
  const [mostrarEstatisticas, setMostrarEstatisticas] = useState(true);

  // Hooks do sistema
  const [theme, toggleTheme] = useDarkMode();
  const { 
    vendas, 
    loading: loadingVendas, 
    responsaveis,
    selectedMonth,
    setSelectedMonth 
  } = useVendas(unidadeSelecionada);
  
  const { 
    metas, 
    loading: loadingMetas 
  } = useMetas(unidadeSelecionada);
  
  const { 
    todasVendasProcessadas: vendasComDesconto,
    loading: loadingDescontos
  } = useDescontos(unidadeSelecionada, vendas, metas);

  // Loading combinado
  const loading = loadingVendas || loadingMetas || loadingDescontos;

  // Sincronização do mês
  useEffect(() => {
    if (selectedMonth) {
      setMesAtual(selectedMonth);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (setSelectedMonth && mesAtual !== selectedMonth) {
      setSelectedMonth(mesAtual);
    }
  }, [mesAtual, selectedMonth, setSelectedMonth]);

  // FILTRAR APENAS CONSULTORES QUE TÊM META (ÚNICA MUDANÇA DO ORIGINAL)
  const consultores = useMemo(() => {
    const metasDoMes = metas.filter(m => m.periodo === mesAtual);
    const consultoresComMeta = metasDoMes.map(m => m.responsavel);
    return [...new Set(consultoresComMeta)].sort();
  }, [metas, mesAtual]);

  // Executar análise do consultor (COPIADO DO ORIGINAL - SEM ALTERAÇÕES)
  const analisarConsultor = (consultor) => {
    if (!consultor) return;
    
    const vendasDoConsultor = vendas.filter(v => 
      v.responsavel === consultor && 
      v.dataFormatada && v.dataFormatada.startsWith(mesAtual)
    );
    
    const metaConsultor = metas.find(m => 
      m.responsavel === consultor && m.periodo === mesAtual
    );
    
    const totalVendasConsultor = vendasDoConsultor.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    
    const vendasUnidadeNoMes = vendas.filter(v => 
      v.dataFormatada && v.dataFormatada.startsWith(mesAtual)
    );
    const totalVendasUnidade = vendasUnidadeNoMes.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    
    const metaUnidadeCalculada = metas
      .filter(m => m.periodo === mesAtual)
      .reduce((sum, m) => sum + Number(m.meta || 0), 0);
    
    const metaIndividual = Number(metaConsultor?.meta || 0);
    const bateuMetaIndividual = totalVendasConsultor >= metaIndividual;
    const unidadeBatida = totalVendasUnidade >= metaUnidadeCalculada;
    
    const resultados = vendasDoConsultor.map(venda => {
      const vendaCorrigida = corrigirClassificacaoDiarias(venda);
      const ehPlano = ehPlanoAposCorrecao(vendaCorrigida);
      
      const vendaComDesconto = vendasComDesconto?.find(v => v.matricula === venda.matricula);
      const desconto = vendaComDesconto ? {
        descontoPlano: vendaComDesconto.descontoPlano || 0,
        descontoMatricula: vendaComDesconto.descontoMatricula || 0
      } : null;
      const temDescontoPlano = Number(desconto?.descontoPlano || 0) > 0;
      const temDescontoMatricula = Number(desconto?.descontoMatricula || 0) > 0;
      const temDesconto = ehPlano ? temDescontoPlano : temDescontoMatricula;
      
      const comissao = calcularComissaoReal(vendaCorrigida, ehPlano, temDesconto, bateuMetaIndividual, unidadeBatida);
      
      let classificacaoEsperada = 'PRODUTO';
      
      // Planos verdadeiros (não-diárias) com duração definida devem ser PLANO (LÓGICA DO ORIGINAL)
      if (venda.produto === 'Plano' && 
          !venda.plano.toLowerCase().includes('diária') && 
          !venda.plano.toLowerCase().includes('diarias')) {
        // Se tem duração em meses definida OU período de datas que indica plano longo
        if (venda.duracaoMeses >= 1 || 
            (venda.dataInicio && venda.dataFim && 
             Math.ceil((new Date(venda.dataFim) - new Date(venda.dataInicio)) / (1000 * 60 * 60 * 24)) >= 25)) {
          classificacaoEsperada = 'PLANO';
        }
      }
      
      if (['Taxa de Matrícula', 'Estorno', 'Ajuste Contábil'].includes(venda.produto)) {
        classificacaoEsperada = 'NÃO COMISSIONÁVEL';
      }
      
      const classificacaoAtual = ehPlano ? 'PLANO' : (comissao > 0 ? 'PRODUTO' : 'NÃO COMISSIONÁVEL');
      const statusCorreto = classificacaoAtual === classificacaoEsperada;
      
      return {
        ...venda,
        vendaCorrigida,
        ehPlano,
        temDesconto,
        classificacaoAtual,
        classificacaoEsperada,
        statusCorreto,
        comissao,
        desconto
      };
    });
    
    const planos = resultados.filter(r => r.ehPlano);
    const produtos = resultados.filter(r => !r.ehPlano && r.comissao > 0);
    const naoComissionaveis = resultados.filter(r => r.comissao <= 0);
    
    const estatisticas = {
      totalVendas: resultados.length,
      planos: planos.length,
      produtos: produtos.length,
      naoComissionaveis: naoComissionaveis.length,
      valorTotal: totalVendasConsultor,
      comissaoPlanos: planos.reduce((sum, p) => sum + p.comissao, 0),
      comissaoProdutos: produtos.reduce((sum, p) => sum + p.comissao, 0),
      totalComissao: resultados.reduce((sum, r) => sum + r.comissao, 0),
      corretos: resultados.filter(r => r.statusCorreto).length,
      incorretos: resultados.filter(r => !r.statusCorreto).length,
      metaIndividual,
      bateuMetaIndividual,
      metaUnidadeCalculada,
      unidadeBatida,
      percentualMeta: metaIndividual > 0 ? (totalVendasConsultor / metaIndividual * 100) : 0
    };
    
    setResultadosAnalise({
      resultados,
      estatisticas,
      consultor
    });
  };

  // Calcular dados de todos os consultores para os cards (usando a mesma lógica)
  const dadosConsultores = useMemo(() => {
    if (!vendas.length || !metas.length) return [];
    
    const vendasUnidadeNoMes = vendas.filter(v => 
      v.dataFormatada && v.dataFormatada.startsWith(mesAtual)
    );
    const totalVendasUnidade = vendasUnidadeNoMes.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    
    const metaUnidadeCalculada = metas
      .filter(m => m.periodo === mesAtual)
      .reduce((sum, m) => sum + Number(m.meta || 0), 0);
    
    const unidadeBatida = totalVendasUnidade >= metaUnidadeCalculada;
    
    return consultores.map(consultor => {
      const vendasDoConsultor = vendas.filter(v => 
        v.responsavel === consultor && 
        v.dataFormatada && v.dataFormatada.startsWith(mesAtual)
      );
      
      const metaConsultor = metas.find(m => 
        m.responsavel === consultor && m.periodo === mesAtual
      );
      
      const totalVendasConsultor = vendasDoConsultor.reduce((sum, v) => sum + Number(v.valor || 0), 0);
      const metaIndividual = Number(metaConsultor?.meta || 0);
      const bateuMetaIndividual = totalVendasConsultor >= metaIndividual;
      
      let totalComissao = 0;
      let planosCount = 0;
      let produtosCount = 0;
      
      vendasDoConsultor.forEach(venda => {
        const vendaCorrigida = corrigirClassificacaoDiarias(venda);
        const ehPlano = ehPlanoAposCorrecao(vendaCorrigida);
        
        const vendaComDesconto = vendasComDesconto?.find(v => v.matricula === venda.matricula);
        const desconto = vendaComDesconto ? {
          descontoPlano: vendaComDesconto.descontoPlano || 0,
          descontoMatricula: vendaComDesconto.descontoMatricula || 0
        } : null;
        const temDescontoPlano = Number(desconto?.descontoPlano || 0) > 0;
        const temDescontoMatricula = Number(desconto?.descontoMatricula || 0) > 0;
        const temDesconto = ehPlano ? temDescontoPlano : temDescontoMatricula;
        
        const comissao = calcularComissaoReal(vendaCorrigida, ehPlano, temDesconto, bateuMetaIndividual, unidadeBatida);
        totalComissao += comissao;
        
        if (ehPlano) planosCount++;
        else if (comissao > 0) produtosCount++;
      });
      
      return {
        consultor,
        dados: {
          totalVendas: totalVendasConsultor,
          totalComissao,
          metaIndividual,
          bateuMetaIndividual,
          percentualMeta: metaIndividual > 0 ? (totalVendasConsultor / metaIndividual * 100) : 0,
          vendasCount: vendasDoConsultor.length,
          planosCount,
          produtosCount
        }
      };
    });
  }, [consultores, vendas, metas, vendasComDesconto, mesAtual]);

  // Filtrar resultados da análise (COPIADO DO ORIGINAL)
  const resultadosFiltrados = useMemo(() => {
    if (!resultadosAnalise) return [];
    
    let resultados = resultadosAnalise.resultados;
    
    if (filtroTipo !== 'todos') {
      resultados = resultados.filter(resultado => {
        if (filtroTipo === 'corretos') return resultado.statusCorreto;
        if (filtroTipo === 'incorretos') return !resultado.statusCorreto;
        if (filtroTipo === 'planos') return resultado.ehPlano;
        if (filtroTipo === 'produtos') return !resultado.ehPlano && resultado.comissao > 0;
        if (filtroTipo === 'nao_comissionaveis') return resultado.comissao <= 0;
        return true;
      });
    }
    
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      resultados = resultados.filter(r => 
        r.matricula.toLowerCase().includes(termo) ||
        r.nome.toLowerCase().includes(termo) ||
        r.produto.toLowerCase().includes(termo) ||
        (r.plano && r.plano.toLowerCase().includes(termo))
      );
    }
    
    return resultados;
  }, [resultadosAnalise, filtroTipo, searchTerm]);

  // Handlers
  const handleConsultorClick = (consultor) => {
    setConsultorSelecionado(consultor);
    analisarConsultor(consultor);
  };

  const handleRefresh = () => {
    if (consultorSelecionado) {
      analisarConsultor(consultorSelecionado);
    }
  };

  const handleExportar = () => {
    if (!resultadosAnalise) return;
    
    const dadosExport = resultadosFiltrados.map(r => ({
      Matrícula: r.matricula,
      Nome: r.nome,
      Produto: r.produto,
      Plano: r.plano || '',
      Valor: r.valor,
      'Classificação Atual': r.classificacaoAtual,
      'Classificação Esperada': r.classificacaoEsperada,
      Status: r.statusCorreto ? 'Correto' : 'Incorreto',
      'É Plano': r.ehPlano ? 'Sim' : 'Não',
      'Tem Desconto': r.temDesconto ? 'Sim' : 'Não',
      Comissão: r.comissao.toFixed(2)
    }));
    
    const csvContent = [
      Object.keys(dadosExport[0]).join(','),
      ...dadosExport.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analise_comissoes_${consultorSelecionado}_${mesAtual}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="comissao-detalhes-layout">
      {/* Theme Toggle Button */}
      <button 
        className="theme-toggle" 
        onClick={toggleTheme}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      {/* Sidebar com NavBar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>GestãoApp</h2>
        </div>
        <NavBar />
      </aside>

      {/* Conteúdo Principal */}
      <main className="comissao-detalhes-main">
        {/* Header da Página */}
        <header className="page-header">
          <div className="header-content">
            <div className="header-title">
              <Calculator size={32} />
              <div>
                <h1>Análise de Comissões</h1>
                <p>Classificação automática e análise detalhada por consultor - {unidadeSelecionada.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <ComissaoFilters
          unidadeSelecionada={unidadeSelecionada}
          setUnidadeSelecionada={setUnidadeSelecionada}
          mesAtual={mesAtual}
          setMesAtual={setMesAtual}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          mostrarEstatisticas={mostrarEstatisticas}
          setMostrarEstatisticas={setMostrarEstatisticas}
          onExportar={handleExportar}
          onRefresh={handleRefresh}
          loading={loading}
          hasResults={!!resultadosAnalise}
        />

        {/* Loading State */}
        {loading && (
          <div className="loading-section">
            <div className="loading-content">
              <RefreshCw size={48} className="spinning" />
              <h3>Carregando dados...</h3>
              <p>Analisando vendas, metas e descontos da unidade {unidadeSelecionada}.</p>
            </div>
          </div>
        )}

        {/* Grid de Consultores */}
        {!loading && dadosConsultores.length > 0 && (
          <section className="consultores-section">
            <div className="section-header">
              <h2>
                <Users size={24} />
                Consultores com Meta em {mesAtual}
              </h2>
              <p>Clique em um consultor para ver a análise detalhada das comissões</p>
            </div>
            
            <div className="consultores-grid">
              {dadosConsultores.map(({ consultor, dados }) => (
                <ConsultorCard
                  key={consultor}
                  consultor={consultor}
                  dados={dados}
                  onClick={() => handleConsultorClick(consultor)}
                  isSelected={consultorSelecionado === consultor}
                  isExpanded={consultorSelecionado === consultor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Estatísticas */}
        {!loading && mostrarEstatisticas && resultadosAnalise && (
          <ComissaoStats 
            estatisticas={resultadosAnalise.estatisticas}
            consultor={resultadosAnalise.consultor}
          />
        )}

        {/* Tabela de Resultados */}
        {!loading && (
          <ComissaoTable
            resultados={resultadosFiltrados}
            consultor={resultadosAnalise?.consultor || ''}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails(!showDetails)}
          />
        )}

        {/* Estado Vazio - Nenhum Consultor */}
        {!loading && dadosConsultores.length === 0 && (
          <div className="empty-state">
            <AlertCircle size={64} />
            <h3>Nenhum consultor encontrado</h3>
            <p>
              Não foram encontrados consultores com meta definida para o período {mesAtual} 
              na unidade {unidadeSelecionada}.
            </p>
            <p>Verifique se as metas estão cadastradas corretamente.</p>
          </div>
        )}
      </main>

      {/* Estilos da Página */}
      <style jsx>{`
        .comissao-detalhes-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg-gradient);
        }

        .sidebar {
          width: 280px;
          background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
          border-right: 1px solid var(--border-medium);
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 100;
          overflow-y: auto;
        }

        .sidebar-header {
          padding: 1.5rem 1.25rem;
          border-bottom: 1px solid var(--border-light);
        }

        .sidebar-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .comissao-detalhes-main {
          flex: 1;
          margin-left: 280px;
          padding: 0;
          overflow-x: hidden;
        }

        .page-header {
          background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
          color: var(--text-inverse);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-title h1 {
          margin: 0 0 0.25rem 0;
          font-size: 2rem;
          font-weight: 800;
        }

        .header-title p {
          margin: 0;
          font-size: 1rem;
          opacity: 0.9;
        }

        .consultores-section {
          padding: 0 2rem 2rem;
        }

        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .section-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .consultores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .loading-section {
          padding: 4rem 2rem;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-secondary);
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 3rem;
          border: 1px solid var(--border-medium);
          box-shadow: var(--shadow-md);
        }

        .loading-content svg {
          margin-bottom: 1rem;
          color: var(--accent-blue);
        }

        .loading-content h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
          font-weight: 700;
        }

        .loading-content p {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          color: var(--text-secondary);
          background: var(--bg-primary);
          border-radius: 12px;
          border: 1px solid var(--border-medium);
          box-shadow: var(--shadow-md);
          margin: 0 2rem 2rem;
        }

        .empty-state svg {
          margin-bottom: 1rem;
          color: var(--border-dark);
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
          font-weight: 700;
        }

        .empty-state p {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          line-height: 1.5;
          max-width: 500px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Theme Toggle Button */
        .theme-toggle {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1000;
          background: var(--bg-primary);
          border: 1px solid var(--border-medium);
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
        }

        .theme-toggle:hover {
          background: var(--bg-secondary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-lg);
        }

        .theme-toggle svg {
          width: 20px;
          height: 20px;
          color: var(--text-primary);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .comissao-detalhes-main {
            margin-left: 0;
          }

          .sidebar {
            transform: translateX(-100%);
          }

          .consultores-grid {
            grid-template-columns: 1fr;
          }

          .page-header {
            padding: 1.5rem 1rem;
          }

          .header-title h1 {
            font-size: 1.75rem;
          }

          .consultores-section {
            padding: 0 1rem 2rem;
          }
        }

        @media (max-width: 768px) {
          .header-title {
            flex-direction: column;
            text-align: center;
            gap: 0.5rem;
          }

          .consultores-grid {
            gap: 1rem;
          }

          .loading-section,
          .empty-state {
            padding: 2rem 1rem;
          }
        }

        @media (max-width: 480px) {
          .page-header {
            padding: 1rem 0.75rem;
          }

          .header-title h1 {
            font-size: 1.5rem;
          }

          .consultores-section {
            padding: 0 0.75rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
} 