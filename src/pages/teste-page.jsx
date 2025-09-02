import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle, Package, Calculator, Filter, Eye, EyeOff, Database, TrendingUp, Users, RefreshCw, Search, ArrowRight } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useVendas } from '../hooks/useVendas';
import { useMetas } from '../hooks/useMetas';
import { useDescontos } from '../hooks/useDescontos';
import { useGlobalProdutos } from '../hooks/useGlobalProdutos';

// Função para aplicar correção de diárias (baseada no sistema real)
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

// Função para verificar se é plano após correção (baseada no sistema real)
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

// Função para calcular comissão (baseada no sistema real)
const calcularComissaoReal = (venda, ehPlano, temDesconto, bateuMetaIndividual, unidadeBatida, produtosSelecionados = []) => {
  const valor = Number(venda.valor || 0);
  
  if (valor <= 0) return 0;
  
  // Produtos não comissionáveis (hardcoded + configuração global)
  const produtosNaoComissionaveisFixos = [
    'Taxa de Matrícula', 
    'Estorno', 
    'Ajuste Contábil',
    'QUITAÇÃO DE DINHEIRO - CANCELAMENTO'
  ];
  
  // Se produto está na lista fixa de não comissionáveis, retorna 0
  if (produtosNaoComissionaveisFixos.includes(venda.produto)) {
    return 0;
  }
  
  // Se há configuração global e produto não está selecionado, retorna 0
  // EXCEÇÃO: Diárias sempre são comissionáveis (original ou após correção)
  const isDiariaOriginal = venda.produto === 'Plano' && 
    venda.plano && 
    (venda.plano.toLowerCase().includes('diária') || venda.plano.toLowerCase().includes('diarias'));
  
  const isDiariaCorrigida = venda.produto && 
    (venda.produto.toLowerCase().includes('diária') || venda.produto.toLowerCase().includes('diarias'));
  
  const isDiaria = isDiariaOriginal || isDiariaCorrigida;
  
  if (produtosSelecionados.length > 0 && !produtosSelecionados.includes(venda.produto) && !isDiaria) {
    return 0;
  }
  
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

const TesteClassificacaoCompleto = () => {
  // Pegar unidade da URL ou usar padrão
  const { unidade: unidadeParam } = useParams();
  
  // Estados principais
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(unidadeParam || 'alphaville');
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [mesAtual, setMesAtual] = useState('2025-08');
  const [showDetails, setShowDetails] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [resultadosAnalise, setResultadosAnalise] = useState(null);

  // Hooks reais do sistema
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
  
  // Hook para produtos selecionados globalmente
  const { produtosSelecionados, loaded: produtosLoaded } = useGlobalProdutos();
  
  const { 
    todasVendasProcessadas: vendasComDesconto,
    loading: loadingDescontos
  } = useDescontos(unidadeSelecionada, vendas, metas);

  // Extrair consultores dos responsáveis do hook useVendas
  const consultores = responsaveis || [];

  // Estado de loading combinado
  const loading = loadingVendas || loadingMetas || loadingDescontos || !produtosLoaded;

  // Sincronizar mês atual com o selectedMonth do hook
  useEffect(() => {
    if (selectedMonth) {
      setMesAtual(selectedMonth);
    }
  }, [selectedMonth]);

  // Sincronizar selectedMonth quando mesAtual mudar
  useEffect(() => {
    if (setSelectedMonth && mesAtual !== selectedMonth) {
      setSelectedMonth(mesAtual);
    }
  }, [mesAtual, selectedMonth, setSelectedMonth]);

  // Executar análise do consultor
  const analisarConsultor = () => {
    if (!consultorSelecionado) return;
    
    const vendasDoConsultor = vendas.filter(v => 
      v.responsavel === consultorSelecionado && 
      v.dataFormatada && v.dataFormatada.startsWith(mesAtual)
    );
    
    const metaConsultor = metas.find(m => 
      m.responsavel === consultorSelecionado && m.periodo === mesAtual
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
      
      const comissao = calcularComissaoReal(vendaCorrigida, ehPlano, temDesconto, bateuMetaIndividual, unidadeBatida, produtosSelecionados);
      
      let classificacaoEsperada = 'PRODUTO';
      
      // Planos verdadeiros (não-diárias) com duração definida devem ser PLANO
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
      consultor: consultorSelecionado
    });
  };

  // Filtrar resultados
  const resultadosFiltrados = useMemo(() => {
    if (!resultadosAnalise) return [];
    
    let resultados = resultadosAnalise.resultados;
    
    // Aplicar filtro por tipo
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
    
    // Aplicar busca por texto
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

  // Auto-analisar quando consultor mudar
  useEffect(() => {
    if (consultorSelecionado && vendas.length > 0 && metas.length > 0) {
      analisarConsultor();
    }
  }, [consultorSelecionado, vendas, metas, vendasComDesconto]);

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      padding: '24px', 
      maxWidth: '1400px', 
      margin: '0 auto', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)', 
      minHeight: '100vh' 
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Database style={{ width: '40px', height: '40px', color: '#3b82f6' }} />
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: '700', 
                color: '#111827', 
                margin: '0',
                lineHeight: '1.2'
              }}>
                Análise de Classificação - Sistema Real
              </h1>
              <p style={{ 
                color: '#6b7280', 
                margin: '8px 0 0 0',
                fontSize: '16px'
              }}>
                Teste detalhado com consultores e vendas da unidade {unidadeSelecionada.toUpperCase()}
              </p>
            </div>
          </div>
          
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7280' }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ fontSize: '16px' }}>Carregando dados...</span>
            </div>
          )}
        </div>

        {/* Controles */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '20px', 
          marginBottom: '24px' 
        }}>
          <div>
            <label style={{ 
              display: 'block',
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Unidade
            </label>
            <select
              value={unidadeSelecionada}
              onChange={(e) => setUnidadeSelecionada(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="alphaville">Alphaville</option>
              <option value="buena vista">Buena Vista</option>
              <option value="marista">Marista</option>
            </select>
          </div>
          
          <div>
            <label style={{ 
              display: 'block',
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Mês de Análise
            </label>
            <input
              type="month"
              value={mesAtual}
              onChange={(e) => setMesAtual(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block',
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Consultor
            </label>
            <select
              value={consultorSelecionado}
              onChange={(e) => setConsultorSelecionado(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Selecione um consultor</option>
              {consultores.map(consultor => (
                <option key={consultor} value={consultor}>{consultor}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ 
              display: 'block',
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Filtrar por Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="todos">Todas as vendas</option>
              <option value="planos">Apenas planos</option>
              <option value="produtos">Apenas produtos</option>
              <option value="nao_comissionaveis">Não comissionáveis</option>
              <option value="corretos">Classificação correta</option>
              <option value="incorretos">Classificação incorreta</option>
            </select>
          </div>
        </div>

        {/* Busca e Ações */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: '#9ca3af'
              }} />
              <input
                type="text"
                placeholder="Buscar por matrícula, nome, produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: '#374151',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            Recarregar
          </button>
          
          <button
            onClick={analisarConsultor}
            disabled={loading || !consultorSelecionado}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              cursor: (loading || !consultorSelecionado) ? 'not-allowed' : 'pointer',
              opacity: (loading || !consultorSelecionado) ? 0.6 : 1
            }}
          >
            <Calculator style={{ width: '16px', height: '16px' }} />
            Analisar
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            {showDetails ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
            {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
          </button>
        </div>
      </div>

      {/* Lista de Consultores */}
      {consultores.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#111827', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Users style={{ width: '20px', height: '20px' }} />
            Consultores da Unidade {unidadeSelecionada.toUpperCase()} ({consultores.length})
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '16px' 
          }}>
            {consultores.map(consultor => {
              const meta = metas.find(m => m.responsavel === consultor && m.periodo === mesAtual);
              const vendasConsultor = vendas.filter(v => 
                v.responsavel === consultor && 
                v.dataFormatada && 
                v.dataFormatada.startsWith(mesAtual)
              );
              const totalVendas = vendasConsultor.reduce((sum, v) => sum + Number(v.valor || 0), 0);
              const isSelected = consultorSelecionado === consultor;
              const bateuMeta = meta && totalVendas >= Number(meta.meta);
              
              return (
                <div
                  key={consultor}
                  onClick={() => setConsultorSelecionado(consultor)}
                  style={{
                    padding: '20px',
                    border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : 'white',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
                  }}
                >
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#111827', 
                    marginBottom: '12px', 
                    fontSize: '15px',
                    lineHeight: '1.3'
                  }}>
                    {consultor}
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                    <div>Meta: R$ {Number(meta?.meta || 0).toLocaleString('pt-BR')}</div>
                    <div>Vendas: R$ {totalVendas.toLocaleString('pt-BR')}</div>
                    <div>Quantidade: {vendasConsultor.length} vendas</div>
                    {meta && totalVendas > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        Percentual: {((totalVendas / Number(meta.meta)) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  
                  {meta && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: bateuMeta ? '#d1fae5' : '#fed7aa',
                        color: bateuMeta ? '#065f46' : '#9a3412'
                      }}>
                        {bateuMeta ? 'Meta OK' : 'Abaixo da meta'}
                      </span>
                      
                      {isSelected && (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: '#dbeafe',
                          color: '#1e40af'
                        }}>
                          Selecionado
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estatísticas do Consultor */}
      {resultadosAnalise && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            marginBottom: '32px',
            flexWrap: 'wrap',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: '0' }}>
                {resultadosAnalise.consultor}
              </h2>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                background: resultadosAnalise.estatisticas.bateuMetaIndividual ? '#d1fae5' : '#fed7aa',
                color: resultadosAnalise.estatisticas.bateuMetaIndividual ? '#065f46' : '#9a3412'
              }}>
                {resultadosAnalise.estatisticas.bateuMetaIndividual ? 'Meta Individual Atingida' : 'Meta Individual Não Atingida'}
              </span>
              
              <span style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                background: resultadosAnalise.estatisticas.unidadeBatida ? '#d1fae5' : '#fef3c7',
                color: resultadosAnalise.estatisticas.unidadeBatida ? '#065f46' : '#92400e'
              }}>
                {resultadosAnalise.estatisticas.unidadeBatida ? 'TME Ativo' : 'TME Inativo'}
              </span>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px',
            marginBottom: '32px'
          }}>
            {[
              { 
                icon: Package, 
                value: resultadosAnalise.estatisticas.totalVendas, 
                label: 'Total de Vendas', 
                color: '#3b82f6',
                bg: '#eff6ff',
                border: '#bfdbfe'
              },
              { 
                icon: Calculator, 
                value: resultadosAnalise.estatisticas.planos, 
                label: 'Planos', 
                color: '#7c3aed',
                bg: '#faf5ff',
                border: '#d8b4fe'
              },
              { 
                icon: Database, 
                value: resultadosAnalise.estatisticas.produtos, 
                label: 'Produtos', 
                color: '#ea580c',
                bg: '#fff7ed',
                border: '#fed7aa'
              },
              { 
                icon: AlertCircle, 
                value: resultadosAnalise.estatisticas.naoComissionaveis, 
                label: 'Não Comissionáveis', 
                color: '#6b7280',
                bg: '#f9fafb',
                border: '#e5e7eb'
              },
              { 
                icon: CheckCircle, 
                value: resultadosAnalise.estatisticas.corretos, 
                label: 'Classificações OK', 
                color: '#059669',
                bg: '#f0fdf4',
                border: '#bbf7d0'
              },
              { 
                icon: AlertCircle, 
                value: resultadosAnalise.estatisticas.incorretos, 
                label: 'Problemas', 
                color: '#dc2626',
                bg: '#fef2f2',
                border: '#fecaca'
              }
            ].map((stat, index) => (
              <div key={index} style={{
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                border: `2px solid ${stat.border}`,
                background: stat.bg
              }}>
                <stat.icon style={{ 
                  width: '32px', 
                  height: '32px', 
                  color: stat.color,
                  margin: '0 auto 12px auto'
                }} />
                <div style={{ fontSize: '32px', fontWeight: '700', color: stat.color, marginBottom: '8px' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Resumo Financeiro */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px' 
          }}>
            <div style={{ 
              background: '#eff6ff', 
              border: '1px solid #bfdbfe', 
              borderRadius: '16px', 
              padding: '24px' 
            }}>
              <h4 style={{ 
                color: '#1e40af', 
                fontWeight: '600', 
                margin: '0 0 16px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '16px'
              }}>
                <Package style={{ width: '20px', height: '20px' }} />
                Comissão Planos
              </h4>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: '#1e40af', 
                marginBottom: '8px' 
              }}>
                R$ {resultadosAnalise.estatisticas.comissaoPlanos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {resultadosAnalise.estatisticas.planos} planos válidos
              </div>
            </div>
            
            <div style={{ 
              background: '#fff7ed', 
              border: '1px solid #fed7aa', 
              borderRadius: '16px', 
              padding: '24px' 
            }}>
              <h4 style={{ 
                color: '#ea580c', 
                fontWeight: '600', 
                margin: '0 0 16px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '16px'
              }}>
                <Database style={{ width: '20px', height: '20px' }} />
                Comissão Produtos
              </h4>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: '#ea580c', 
                marginBottom: '8px' 
              }}>
                R$ {resultadosAnalise.estatisticas.comissaoProdutos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                {resultadosAnalise.estatisticas.produtos} produtos comissionáveis
              </div>
            </div>
            
            <div style={{ 
              background: '#f0fdf4', 
              border: '1px solid #bbf7d0', 
              borderRadius: '16px', 
              padding: '24px' 
            }}>
              <h4 style={{ 
                color: '#059669', 
                fontWeight: '600', 
                margin: '0 0 16px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '16px'
              }}>
                <TrendingUp style={{ width: '20px', height: '20px' }} />
                Total Comissão
              </h4>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: '#059669', 
                marginBottom: '8px' 
              }}>
                R$ {resultadosAnalise.estatisticas.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                Meta: {resultadosAnalise.estatisticas.percentualMeta.toFixed(1)}% | R$ {resultadosAnalise.estatisticas.valorTotal.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela Detalhada */}
      {resultadosAnalise && resultadosFiltrados.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '24px', 
            borderBottom: '1px solid #e5e7eb', 
            background: '#f9fafb' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#111827', 
                margin: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Filter style={{ width: '20px', height: '20px' }} />
                Análise Detalhada ({resultadosFiltrados.length} vendas)
              </h3>
              <div style={{ fontSize: '16px', color: '#6b7280', fontWeight: '500' }}>
                Total: R$ {resultadosAnalise.estatisticas.valorTotal.toLocaleString('pt-BR')}
              </div>
            </div>
          </div>

          <div style={{ 
            overflowX: 'auto', 
            maxHeight: '600px', 
            overflowY: 'auto' 
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '60px'
                  }}>Status</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '80px'
                  }}>Matrícula</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '180px'
                  }}>Nome</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '120px'
                  }}>Produto</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '160px'
                  }}>Plano</th>
                  
                  {showDetails && (
                    <>
                      <th style={{ 
                        padding: '16px 12px', 
                        textAlign: 'left', 
                        fontWeight: '600', 
                        color: '#374151',
                        borderBottom: '1px solid #e5e7eb',
                        position: 'sticky',
                        top: '0',
                        background: '#f9fafb',
                        zIndex: 10,
                        width: '140px'
                      }}>Produto Corrigido</th>
                      <th style={{ 
                        padding: '16px 12px', 
                        textAlign: 'left', 
                        fontWeight: '600', 
                        color: '#374151',
                        borderBottom: '1px solid #e5e7eb',
                        position: 'sticky',
                        top: '0',
                        background: '#f9fafb',
                        zIndex: 10,
                        width: '80px'
                      }}>Correção</th>
                    </>
                  )}
                  
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '100px'
                  }}>Esperado</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '100px'
                  }}>Atual</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '80px'
                  }}>Duração</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '70px'
                  }}>Desconto</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'right', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '120px'
                  }}>Valor</th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'right', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    position: 'sticky',
                    top: '0',
                    background: '#f9fafb',
                    zIndex: 10,
                    width: '120px'
                  }}>Comissão</th>
                </tr>
              </thead>
              
              <tbody>
                {resultadosFiltrados.map((resultado, index) => (
                  <tr 
                    key={index} 
                    style={{
                      background: resultado.statusCorreto ? '#f0fdf4' : '#fef2f2',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                  >
                    <td style={{ padding: '14px 12px' }}>
                      {resultado.statusCorreto ? (
                        <CheckCircle style={{ width: '16px', height: '16px', color: '#059669' }} />
                      ) : (
                        <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                      )}
                    </td>
                    
                    <td style={{ 
                      padding: '14px 12px', 
                      fontFamily: 'monospace', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      {resultado.matricula}
                    </td>
                    
                    <td style={{ padding: '14px 12px', fontSize: '13px' }}>
                      <div 
                        style={{ 
                          maxWidth: '160px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          color: '#111827',
                          fontWeight: '500'
                        }} 
                        title={resultado.nome}
                      >
                        {resultado.nome}
                      </div>
                    </td>
                    
                    <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                      {resultado.produto}
                    </td>
                    
                    <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                      {resultado.plano || '-'}
                    </td>
                    
                    {showDetails && (
                      <>
                        <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                          {resultado.vendaCorrigida.produto || resultado.produto}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          {resultado.vendaCorrigida.correcaoAplicada ? (
                            <span style={{
                              padding: '3px 6px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '600',
                              background: '#fff7ed',
                              color: '#ea580c'
                            }}>
                              SIM
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '11px' }}>-</span>
                          )}
                        </td>
                      </>
                    )}
                    
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '16px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: resultado.classificacaoEsperada === 'PLANO' ? '#faf5ff' : 
                                   resultado.classificacaoEsperada === 'PRODUTO' ? '#fff7ed' : '#f9fafb',
                        color: resultado.classificacaoEsperada === 'PLANO' ? '#7c3aed' : 
                               resultado.classificacaoEsperada === 'PRODUTO' ? '#ea580c' : '#6b7280'
                      }}>
                        {resultado.classificacaoEsperada}
                      </span>
                    </td>
                    
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '16px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: resultado.classificacaoAtual === 'PLANO' ? '#faf5ff' : 
                                   resultado.classificacaoAtual === 'PRODUTO' ? '#fff7ed' : '#f9fafb',
                        color: resultado.classificacaoAtual === 'PLANO' ? '#7c3aed' : 
                               resultado.classificacaoAtual === 'PRODUTO' ? '#ea580c' : '#6b7280'
                      }}>
                        {resultado.classificacaoAtual}
                      </span>
                    </td>
                    
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      {resultado.duracaoMeses ? (
                        <span style={{
                          padding: '3px 6px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: '#e0e7ff',
                          color: '#3730a3'
                        }}>
                          {resultado.duracaoMeses}m
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>-</span>
                      )}
                    </td>
                    
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      {resultado.temDesconto ? (
                        <span style={{
                          padding: '3px 6px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: '#fef3c7',
                          color: '#92400e'
                        }}>
                          SIM
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>-</span>
                      )}
                    </td>
                    
                    <td style={{ 
                      padding: '14px 12px', 
                      textAlign: 'right',
                      fontWeight: '600',
                      color: resultado.valor >= 0 ? '#059669' : '#dc2626'
                    }}>
                      R$ {Number(resultado.valor || 0).toLocaleString('pt-BR')}
                    </td>
                    
                    <td style={{ 
                      padding: '14px 12px', 
                      textAlign: 'right',
                      fontWeight: '600',
                      color: resultado.comissao > 0 ? '#3b82f6' : '#6b7280'
                    }}>
                      R$ {Number(resultado.comissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumo de Problemas Identificados */}
      {resultadosAnalise && resultadosAnalise.estatisticas.incorretos > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '2px solid #fecaca'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#dc2626', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle style={{ width: '24px', height: '24px' }} />
            Problemas de Classificação Identificados ({resultadosAnalise.estatisticas.incorretos})
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '20px' 
          }}>
            {resultadosAnalise.resultados
              .filter(r => !r.statusCorreto)
              .map((problema, index) => (
                <div 
                  key={index}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '20px'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '16px' 
                  }}>
                    <AlertCircle style={{ width: '16px', height: '16px', color: '#dc2626' }} />
                    <span style={{ 
                      fontWeight: '600', 
                      color: '#dc2626',
                      fontSize: '14px'
                    }}>
                      Matrícula {problema.matricula} - {problema.nome.split(' ')[0]} {problema.nome.split(' ')[1]}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                    <div><strong>Produto:</strong> {problema.produto}</div>
                    {problema.plano && <div><strong>Plano:</strong> {problema.plano}</div>}
                    <div><strong>Valor:</strong> R$ {Number(problema.valor).toLocaleString('pt-BR')}</div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                        Classificação Atual
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: problema.classificacaoAtual === 'PLANO' ? '#faf5ff' : 
                                   problema.classificacaoAtual === 'PRODUTO' ? '#fff7ed' : '#f9fafb',
                        color: problema.classificacaoAtual === 'PLANO' ? '#7c3aed' : 
                               problema.classificacaoAtual === 'PRODUTO' ? '#ea580c' : '#6b7280'
                      }}>
                        {problema.classificacaoAtual}
                      </span>
                    </div>
                    
                    <ArrowRight style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                    
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                        Deveria Ser
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: problema.classificacaoEsperada === 'PLANO' ? '#faf5ff' : 
                                   problema.classificacaoEsperada === 'PRODUTO' ? '#fff7ed' : '#f9fafb',
                        color: problema.classificacaoEsperada === 'PLANO' ? '#7c3aed' : 
                               problema.classificacaoEsperada === 'PRODUTO' ? '#ea580c' : '#6b7280'
                      }}>
                        {problema.classificacaoEsperada}
                      </span>
                    </div>
                  </div>
                  
                  {problema.vendaCorrigida.motivoCorrecao && (
                    <div style={{
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '12px',
                      color: '#9a3412'
                    }}>
                      <strong>Correção Aplicada:</strong><br />
                      {problema.vendaCorrigida.motivoCorrecao}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Footer com Informações do Sistema */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          <Database style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0' }}>
            Sistema de Teste - Classificação de Vendas
          </h4>
        </div>
        
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 16px 0' }}>
          Este sistema simula o comportamento real das funções de classificação e cálculo de comissão.
          Baseado nas regras de negócio implementadas no sistema de produção.
        </p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '32px',
          fontSize: '13px',
          color: '#9ca3af'
        }}>
          <div>
            <strong>Versão:</strong> 1.0.0
          </div>
          <div>
            <strong>Última Atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
          </div>
          <div>
            <strong>Ambiente:</strong> Teste
          </div>
        </div>
      </div>

      {/* CSS para animações */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          table tr:hover {
            background: rgba(59, 130, 246, 0.05) !important;
          }
          
          button:hover {
            transform: translateY(-1px);
            transition: all 0.2s ease;
          }
          
          .consultor-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }
        `}
      </style>
    </div>
  );
};

export default TesteClassificacaoCompleto;