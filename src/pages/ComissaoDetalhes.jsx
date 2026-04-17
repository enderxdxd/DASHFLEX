// src/pages/ComissaoDetalhes.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Calculator, Users, AlertCircle, RefreshCw, CheckCircle, Target, DollarSign, BarChart3, Trophy } from 'lucide-react';
import * as XLSX from 'xlsx';
import NavBar from '../components/NavBar';
import ConsultorCard from '../components/comissao/ConsultorCard';
import ComissaoFilters from '../components/comissao/ComissaoFilters';
import ComissaoTable from '../components/comissao/ComissaoTable';
import ComissaoStats from '../components/comissao/ComissaoStats';
import { useVendas } from '../hooks/useVendas';
import { useMetas } from '../hooks/useMetas';
import { useDescontos } from '../hooks/useDescontos';
import { useGlobalProdutos } from '../hooks/useGlobalProdutos';
import { useConfigRem } from '../hooks/useConfigRem';
import { calcularRemuneracao } from '../utils/remuneracao';
import { calcularRemuneracaoPorDuracao } from '../utils/calculoRemuneracaoDuracao';
import { gerarPDFComissoes, gerarPDFResumo } from '../utils/pdfGenerator';
import '../styles/ComissaoComponents.css';

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

// Função para verificar se é plano após correção
const ehPlanoAposCorrecao = (venda) => {
  if (!venda) return false;
  
  const vendaCorrigida = corrigirClassificacaoDiarias(venda);
  
  if (vendaCorrigida.correcaoAplicada === 'diaria_reclassificada') {
    return false;
  }
  
  const produto = String(vendaCorrigida.produto || '').trim();
  const produtoLower = produto.toLowerCase();
  
  if (produtoLower.includes('diária') || produtoLower.includes('diaria')) {
    return false;
  }
  
  if (produtoLower !== 'plano') {
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

// Função para calcular comissão 
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
    // Meta Time (unidade bateu meta)
    tabela = temDesconto ? [9, 20, 25, 34, 45, 71] : [15, 28, 43, 51, 65, 107];
  } else if (bateuMetaIndividual) {
    // Com Meta (só consultor bateu meta)
    tabela = temDesconto ? [6, 16, 23, 30, 42, 67] : [12, 24, 37, 47, 60, 103];
  } else {
    // Sem Meta (nem consultor nem unidade bateram meta)
    tabela = temDesconto ? [3, 11, 21, 25, 38, 61] : [9, 18, 28, 42, 53, 97];
  }
  
  return tabela[indice] || 0;
};

export default function ComissaoDetalhes() {
  // Estados principais
  const { unidade: unidadeParam } = useParams();
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(unidadeParam || 'alphaville');
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [resultadosAnalise, setResultadosAnalise] = useState(null);
  const [mostrarEstatisticas, setMostrarEstatisticas] = useState(true);
  
  // Estados para PDF
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [progressoPDF, setProgressoPDF] = useState({ porcentagem: 0, mensagem: '' });

  // Hooks do sistema
  const {
    vendas, 
    loading: loadingVendas, 
    selectedMonth,
    setSelectedMonth 
  } = useVendas(unidadeSelecionada);
  
  const { 
    metas, 
    loading: loadingMetas 
  } = useMetas(unidadeSelecionada);
  
  // Hook para produtos selecionados globalmente
  const { produtosSelecionados, loaded: produtosLoaded } = useGlobalProdutos();
  
  // Hook para configuração de remuneração (premiação)
  const { configRem, loading: loadingConfigRem } = useConfigRem(unidadeSelecionada, selectedMonth);
  
  // CORREÇÃO: Passar selectedMonth para useDescontos
  const { 
    todasVendasProcessadas: vendasComDesconto,
    loading: loadingDescontos
  } = useDescontos(unidadeSelecionada, vendas, metas, true, selectedMonth);

  // Loading combinado
  const loading = loadingVendas || loadingMetas || loadingDescontos || loadingConfigRem || !produtosLoaded;

  // CORREÇÃO: Usar selectedMonth diretamente do hook useVendas
  const mesAtual = selectedMonth;

  // FILTRAR APENAS CONSULTORES QUE TÊM META
  const consultores = useMemo(() => {
    if (!metas?.length || !mesAtual) return [];
    
    const metasDoMes = metas.filter(m => m.periodo === mesAtual);
    const consultoresComMeta = metasDoMes.map(m => m.responsavel).filter(Boolean);
    return [...new Set(consultoresComMeta)].sort();
  }, [metas, mesAtual]);

  // ===== OTIMIZAÇÃO: Memoizar função de análise =====
  const analisarConsultor = useCallback((consultor) => {
    if (!consultor || !mesAtual) {
      console.warn('Consultor ou mês não informados para análise');
      return;
    }
    
    // Filtrar vendas do consultor no mês
    const vendasDoConsultor = vendas.filter(v => 
      v.responsavel === consultor && 
      v.dataFormatada && v.dataFormatada.startsWith(mesAtual)
    );
    
    // Encontrar meta do consultor
    const metaConsultor = metas.find(m => 
      (m.responsavel === consultor || m.nome === consultor || m.nomeConsultor === consultor) && 
      m.periodo === mesAtual
    );
    
    if (!metaConsultor) {
      console.warn(`Meta não encontrada para consultor ${consultor} no período ${mesAtual}`);
      return;
    }
    
    // Calcular totais
    const totalVendasConsultor = vendasDoConsultor.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    
    // CORREÇÃO: Filtrar vendas da unidade apenas por consultores com meta + produtos comissionáveis
    const metasUnidade = metas.filter(m => m.periodo === mesAtual);
    const consultoresComMeta = metasUnidade.map(m => m.responsavel || m.nome || m.nomeConsultor || m.consultor).filter(Boolean);
    
    const vendasUnidadeNoMes = vendas.filter(v => {
      if (!v.dataFormatada || !v.dataFormatada.startsWith(mesAtual)) return false;
      
      // FILTRO CRÍTICO: Apenas consultores que têm meta cadastrada
      if (!consultoresComMeta.includes(v.responsavel || v.consultor)) return false;
      
      // Aplicar mesma lógica de filtro de produtos
      const produtosNaoComissionaveisFixos = [
        'Taxa de Matrícula', 
        'Estorno', 
        'Ajuste Contábil',
        'QUITAÇÃO DE DINHEIRO - CANCELAMENTO'
      ];
      
      if (produtosNaoComissionaveisFixos.includes(v.produto)) return false;
      
      // Exceção para diárias
      const isDiariaOriginal = v.produto === 'Plano' && 
        v.plano && 
        (v.plano.toLowerCase().includes('diária') || v.plano.toLowerCase().includes('diarias'));
      
      const isDiariaCorrigida = v.produto && 
        (v.produto.toLowerCase().includes('diária') || v.produto.toLowerCase().includes('diarias'));
      
      const isDiaria = isDiariaOriginal || isDiariaCorrigida;
      
      if (produtosSelecionados.length > 0 && !produtosSelecionados.includes(v.produto) && !isDiaria) {
        return false;
      }
      
      return true;
    });
    
    const totalVendasUnidade = vendasUnidadeNoMes.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    const metaUnidadeCalculada = metasUnidade.reduce((sum, m) => sum + Number(m.meta || 0), 0);
    
    
    
    const metaIndividual = Number(metaConsultor?.meta || 0);
    const bateuMetaIndividual = totalVendasConsultor >= metaIndividual;
    const unidadeBatida = totalVendasUnidade >= metaUnidadeCalculada;
    
    
    
    // Processar cada venda
    const resultados = vendasDoConsultor.map(venda => {
      const vendaCorrigida = corrigirClassificacaoDiarias(venda);
      const ehPlano = ehPlanoAposCorrecao(vendaCorrigida);
      
      // CORREÇÃO: Buscar desconto por matrícula normalizada
      const matriculaNorm = String(venda.matricula || '').replace(/\D/g, '').padStart(6, '0');
      const vendaComDesconto = vendasComDesconto?.find(v => {
        const vMatriculaNorm = String(v.matricula || '').replace(/\D/g, '').padStart(6, '0');
        return vMatriculaNorm === matriculaNorm;
      });
      
      const desconto = vendaComDesconto ? {
        descontoPlano: Number(vendaComDesconto.descontoPlano || 0),
        descontoMatricula: Number(vendaComDesconto.descontoMatricula || 0)
      } : { descontoPlano: 0, descontoMatricula: 0 };
      
      const temDescontoPlano = desconto.descontoPlano > 0;
      const temDescontoMatricula = desconto.descontoMatricula > 0;
      const temDesconto = ehPlano ? temDescontoPlano : temDescontoMatricula;
      
      const comissao = calcularComissaoReal(vendaCorrigida, ehPlano, temDesconto, bateuMetaIndividual, unidadeBatida, produtosSelecionados);
     
      
      // Determinar classificação esperada baseada na análise já feita
      let classificacaoEsperada;
      
      // Produtos não comissionáveis
      if (['Taxa de Matrícula', 'Estorno', 'Ajuste Contábil', 'QUITAÇÃO DE DINHEIRO - CANCELAMENTO'].includes(vendaCorrigida.produto)) {
        classificacaoEsperada = 'NÃO COMISSIONÁVEL';
      } 
      // Se ehPlano é true, então a função ehPlanoAposCorrecao já validou que é um plano válido
      else if (ehPlano) {
        classificacaoEsperada = 'PLANO';
      } 
      // Caso contrário, é produto
      else {
        classificacaoEsperada = 'PRODUTO';
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
    
    // Categorizar resultados
    const planos = resultados.filter(r => r.ehPlano);
    const produtos = resultados.filter(r => !r.ehPlano && r.comissao > 0);
    const naoComissionaveis = resultados.filter(r => r.comissao <= 0);
    
    // Calcular valores totais por categoria
    const valorTotalPlanos = planos.reduce((sum, p) => sum + Number(p.valor || 0), 0);
    const valorTotalProdutos = produtos.reduce((sum, p) => sum + Number(p.valor || 0), 0);
    const valorTotalNaoComissionaveis = naoComissionaveis.reduce((sum, p) => sum + Number(p.valor || 0), 0);
    
    // Calcular estatísticas
    const estatisticas = {
      totalVendas: resultados.length,
      planos: planos.length,
      produtos: produtos.length,
      naoComissionaveis: naoComissionaveis.length,
      valorTotal: totalVendasConsultor,
      valorTotalPlanos,
      valorTotalProdutos,
      valorTotalNaoComissionaveis,
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
    
    
  }, [vendas, metas, mesAtual, vendasComDesconto, produtosSelecionados]);

  // ===== OTIMIZAÇÃO: Memoizar filtros custosos =====
  const filtrosOtimizados = useMemo(() => {
    const produtosNaoComissionaveisFixos = new Set([
      'Taxa de Matrícula', 
      'Estorno', 
      'Ajuste Contábil',
      'QUITAÇÃO DE DINHEIRO - CANCELAMENTO'
    ]);
    
    const produtosSelecionadosSet = new Set(produtosSelecionados);
    
    return {
      produtosNaoComissionaveisFixos,
      produtosSelecionadosSet,
      temProdutosSelecionados: produtosSelecionados.length > 0
    };
  }, [produtosSelecionados]);
  
  // ===== OTIMIZAÇÃO: Pré-filtrar vendas uma única vez =====
  const vendasFiltradas = useMemo(() => {
    if (!vendas?.length || !mesAtual) return [];
    
    return vendas.filter(v => {
      // Filtro básico de data
      if (!v.dataFormatada || !v.dataFormatada.startsWith(mesAtual)) return false;
      
      // Filtro de produtos não comissionáveis
      if (filtrosOtimizados.produtosNaoComissionaveisFixos.has(v.produto)) return false;
      
      // Verificar se é diária (exceção)
      const isDiariaOriginal = v.produto === 'Plano' && 
        v.plano && 
        (v.plano.toLowerCase().includes('diária') || v.plano.toLowerCase().includes('diarias'));
      
      const isDiariaCorrigida = v.produto && 
        (v.produto.toLowerCase().includes('diária') || v.produto.toLowerCase().includes('diarias'));
      
      const isDiaria = isDiariaOriginal || isDiariaCorrigida;
      
      // Filtro de produtos selecionados
      if (filtrosOtimizados.temProdutosSelecionados && 
          !filtrosOtimizados.produtosSelecionadosSet.has(v.produto) && 
          !isDiaria) {
        return false;
      }
      
      return true;
    });
  }, [vendas, mesAtual, filtrosOtimizados]);
  
  // ===== OTIMIZAÇÃO: Agrupar vendas por consultor uma única vez =====
  const vendasPorConsultor = useMemo(() => {
    const grupos = new Map();
    
    vendasFiltradas.forEach(venda => {
      const consultor = venda.responsavel;
      if (!consultor) return;
      
      if (!grupos.has(consultor)) {
        grupos.set(consultor, []);
      }
      grupos.get(consultor).push(venda);
    });
    
    return grupos;
  }, [vendasFiltradas]);

  // ===== OTIMIZAÇÃO: Pré-processar descontos por matrícula =====
  const descontosPorMatricula = useMemo(() => {
    if (!vendasComDesconto?.length) return new Map();
    
    const mapa = new Map();
    vendasComDesconto.forEach(desconto => {
      const matriculaNorm = String(desconto.matricula || '').replace(/\D/g, '').padStart(6, '0');
      mapa.set(matriculaNorm, desconto);
    });
    return mapa;
  }, [vendasComDesconto]);

  // Dados dos consultores para os cards
  const dadosConsultores = useMemo(() => {
    if (!metas?.length || !vendasFiltradas?.length || !mesAtual) return [];
    
    const metasDoMes = metas.filter(m => m.periodo === mesAtual);
    
    // Calcular totais da unidade otimizado
    const consultoresComMetaCard = new Set(
      metasDoMes.map(m => m.responsavel || m.nome || m.nomeConsultor || m.consultor).filter(Boolean)
    );
    
    const vendasUnidadeNoMes = vendasFiltradas.filter(v => 
      consultoresComMetaCard.has(v.responsavel || v.consultor)
    );
    
    const totalVendasUnidade = vendasUnidadeNoMes.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    const metaUnidadeCalculada = metasDoMes.reduce((sum, m) => sum + Number(m.meta || 0), 0);
    const unidadeBatida = totalVendasUnidade >= metaUnidadeCalculada;
    
    return metasDoMes.map(meta => {
      const consultor = meta.responsavel;
      const vendasConsultor = vendasPorConsultor.get(consultor) || [];
      
      const totalVendas = vendasConsultor.reduce((sum, v) => sum + Number(v.valor || 0), 0);
      const metaIndividual = Number(meta.meta || 0);
      const percentualMeta = metaIndividual > 0 ? (totalVendas / metaIndividual * 100) : 0;
      const bateuMetaIndividual = totalVendas >= metaIndividual;
      
      // ===== OTIMIZAÇÃO: Calcular comissão e categorizar em uma única passada =====
      let totalComissaoReal = 0;
      let planosCount = 0;
      let produtosCount = 0;
      
      const categorias = {
        'Octomestral': { comDesconto: 0, semDesconto: 0 },
        'Mensal': { comDesconto: 0, semDesconto: 0 },
        'Trimestral': { comDesconto: 0, semDesconto: 0 },
        'Semestral': { comDesconto: 0, semDesconto: 0 },
        'Anual': { comDesconto: 0, semDesconto: 0 },
        'Bianual': { comDesconto: 0, semDesconto: 0 }
      };
      
      // Processar todas as vendas em uma única passada
      vendasConsultor.forEach(venda => {
        const vendaCorrigida = corrigirClassificacaoDiarias(venda);
        const ehPlano = ehPlanoAposCorrecao(vendaCorrigida);
        
        // Buscar desconto otimizado
        const matriculaNorm = String(venda.matricula || '').replace(/\D/g, '').padStart(6, '0');
        const vendaComDesconto = descontosPorMatricula.get(matriculaNorm);
        
        if (ehPlano) {
          planosCount++;
          
          // Categorizar plano
          const duracao = Number(venda.duracaoMeses || 0);
          let categoria = 'Mensal';
          
          if (duracao >= 24) categoria = 'Bianual';
          else if (duracao >= 12) categoria = 'Anual';
          else if (duracao >= 8) categoria = 'Octomestral';
          else if (duracao >= 6) categoria = 'Semestral';
          else if (duracao >= 3) categoria = 'Trimestral';
          
          // Verificar desconto
          const temDesconto = vendaComDesconto && 
            (Number(vendaComDesconto.descontoPlano || 0) > 0 || 
             Number(vendaComDesconto.descontoMatricula || 0) > 0);
          
          if (temDesconto) {
            categorias[categoria].comDesconto++;
          } else {
            categorias[categoria].semDesconto++;
          }
          
          // Calcular comissão para plano
          const temDescontoPlano = vendaComDesconto && Number(vendaComDesconto.descontoPlano || 0) > 0;
          const comissao = calcularComissaoReal(vendaCorrigida, true, temDescontoPlano, bateuMetaIndividual, unidadeBatida, produtosSelecionados);
          totalComissaoReal += comissao;
        } else {
          // Produto
          const temDescontoMatricula = vendaComDesconto && Number(vendaComDesconto.descontoMatricula || 0) > 0;
          const comissao = calcularComissaoReal(vendaCorrigida, false, temDescontoMatricula, bateuMetaIndividual, unidadeBatida, produtosSelecionados);
          
          if (comissao > 0) {
            produtosCount++;
            totalComissaoReal += comissao;
          }
        }
      });
      
      const planosDetalhados = categorias;
      const totalComDesconto = Object.values(planosDetalhados).reduce((sum, cat) => sum + cat.comDesconto, 0);
      const totalSemDesconto = Object.values(planosDetalhados).reduce((sum, cat) => sum + cat.semDesconto, 0);
      const percentualDesconto = planosCount > 0 ? ((totalComDesconto / planosCount) * 100).toFixed(1) : 0;
      
      // ===== CÁLCULO DE REMUNERAÇÃO BASEADO NO TIPO =====
      const remuneracaoType = meta.remuneracaoType || 'comissao';
      let valorRemuneracao = totalComissaoReal;
      let bonus = 0;
      
      // ✅ CALCULAR BÔNUS DE 10% PARA COMISSIONADOS
      if (remuneracaoType === 'comissao' && metaIndividual > 0 && percentualMeta >= 110) {
        const faixas = Math.floor((percentualMeta - 100) / 10);
        bonus = faixas * 100;
        valorRemuneracao = totalComissaoReal + bonus;
      }
      
      if (remuneracaoType === 'premiacao') {
        // ✅ CORREÇÃO: Usar calcularRemuneracaoPorDuracao igual ao Metas.jsx
        const totalVendasIndividual = vendasConsultor.reduce((s, v) => s + Number(v.valor || 0), 0);
        const totalVendasTime = vendasFiltradas.reduce((s, v) => s + Number(v.valor || 0), 0);

        // ✅ CALCULAR MAIOR META DO PERÍODO
        const metasDoMes = metas.filter(m => m.periodo === mesAtual);
        const maiorMeta = metasDoMes.reduce((max, m) => {
          const metaValor = Number(m.meta || 0);
          return metaValor > max ? metaValor : max;
        }, 0);

        const resultado = calcularRemuneracaoPorDuracao({
          vendas: vendasConsultor,
          metaIndividual: metaIndividual,
          metaTime: metaUnidadeCalculada,
          totalVendasIndividual,
          totalVendasTime,
          premiacao: configRem.premiacao || [],
          tipo: 'premiacao',
          produtosSelecionados,
          descontos: descontosPorMatricula ? Array.from(descontosPorMatricula.values()) : [],
          maiorMeta // ✅ NOVO: passa maior meta para proporcionalidade
        });

        valorRemuneracao = resultado.totalPremiacao;
      }
      
      return {
        consultor,
        remuneracaoType,
        dados: {
          totalVendas,
          totalComissao: valorRemuneracao,
          comissaoBase: totalComissaoReal, // ✅ Base sem bônus
          bonus, // ✅ Valor do bônus
          metaIndividual,
          bateuMetaIndividual,
          percentualMeta,
          vendasCount: vendasConsultor.length,
          planosCount,
          produtosCount,
          planosDetalhados,
          totalComDesconto,
          totalSemDesconto,
          percentualDesconto
        }
      };
    });
  }, [vendasFiltradas, metas, mesAtual, vendasComDesconto, produtosSelecionados, configRem, vendasPorConsultor, descontosPorMatricula]);

  // ===== CÁLCULO DA PREMIAÇÃO DO SUPERVISOR =====
  const premiacaoSupervisor = useMemo(() => {
    // ✅ CORRIGIDO: Usar premiacaoSupervisor em vez de premiacao
    if (!metas?.length || !vendasFiltradas?.length || !mesAtual || !configRem?.premiacaoSupervisor) return null;
    
    const metasDoMes = metas.filter(m => m.periodo === mesAtual);
    
    // Calcular totais da unidade
    const consultoresComMeta = new Set(
      metasDoMes.map(m => m.responsavel || m.nome || m.nomeConsultor || m.consultor).filter(Boolean)
    );
    
    const vendasUnidadeNoMes = vendasFiltradas.filter(v => 
      consultoresComMeta.has(v.responsavel || v.consultor)
    );
    
    const totalVendasUnidade = vendasUnidadeNoMes.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    const metaUnidadeCalculada = metasDoMes.reduce((sum, m) => sum + Number(m.meta || 0), 0);
    
    // Calcular percentual de atingimento
    const percentualMeta = metaUnidadeCalculada > 0 ? (totalVendasUnidade / metaUnidadeCalculada) * 100 : 0;
    
    // ✅ CORRIGIDO: Usar premiacaoSupervisor em vez de premiacao
    const faixasAtingidas = (configRem.premiacaoSupervisor || [])
      .filter(faixa => Number(faixa.percentual || 0) <= percentualMeta)
      .sort((a, b) => Number(a.percentual || 0) - Number(b.percentual || 0));
    
    // ✅ CORRIGIDO: NÃO CUMULATIVO - Usar apenas a MAIOR faixa atingida
    const premiacaoTotal = faixasAtingidas.length > 0 
      ? Number(faixasAtingidas[faixasAtingidas.length - 1].premio || 0)
      : 0;
    
    return {
      totalVendasUnidade,
      metaUnidadeCalculada,
      percentualMeta,
      faixasAtingidas,
      premiacaoTotal,
      consultoresCount: consultoresComMeta.size
    };
  }, [vendasFiltradas, metas, mesAtual, configRem]);

  // ===== OTIMIZAÇÃO: Filtros com memoização =====
  const resultadosFiltrados = useMemo(() => {
    if (!resultadosAnalise?.resultados) return [];
    
    let resultados = resultadosAnalise.resultados;
    
    if (filtroTipo !== 'todos') {
      resultados = resultados.filter(resultado => {
        switch(filtroTipo) {
          case 'corretos': return resultado.statusCorreto;
          case 'incorretos': return !resultado.statusCorreto;
          case 'planos': return resultado.ehPlano;
          case 'produtos': return !resultado.ehPlano && resultado.comissao > 0;
          case 'nao_comissionaveis': return resultado.comissao <= 0;
          default: return true;
        }
      });
    }
    
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      resultados = resultados.filter(r => 
        String(r.matricula || '').toLowerCase().includes(termo) ||
        String(r.nome || '').toLowerCase().includes(termo) ||
        String(r.produto || '').toLowerCase().includes(termo) ||
        String(r.plano || '').toLowerCase().includes(termo)
      );
    }
    
    return resultados;
  }, [resultadosAnalise, filtroTipo, searchTerm]);
  
  // ===== OTIMIZAÇÃO: Callbacks para evitar re-renders =====
  const handleConsultorClick = useCallback((consultor) => {
    setConsultorSelecionado(consultor);
    analisarConsultor(consultor);
  }, [analisarConsultor]);
  
  const handleFiltroChange = useCallback((novoFiltro) => {
    setFiltroTipo(novoFiltro);
  }, []);
  
  const handleSearchChange = useCallback((termo) => {
    setSearchTerm(termo);
  }, []);
  
  const handleToggleDetails = useCallback(() => {
    setShowDetails(prev => !prev);
  }, []);
  
  const handleToggleStats = useCallback(() => {
    setMostrarEstatisticas(prev => !prev);
  }, []);

  // Handlers otimizados já definidos acima

  const handleRefresh = () => {
    if (consultorSelecionado) {
      analisarConsultor(consultorSelecionado);
    }
  };

  const handleExportar = () => {
    if (!resultadosAnalise || resultadosFiltrados.length === 0) {
      alert('Não há dados para exportar com os filtros aplicados.');
      return;
    }
    
    try {
      const dadosExport = resultadosFiltrados.map(r => {
        const formatarData = (data) => {
          if (!data) return '';
          try {
            const dataObj = new Date(data);
            return dataObj.toLocaleDateString('pt-BR');
          } catch {
            return data;
          }
        };

        return {
          'Matrícula': r.matricula || '',
          'Nome': r.nome || '',
          'Produto': r.produto || '',
          'Plano': r.plano || '',
          'Data Início': formatarData(r.dataInicio),
          'Data Término': formatarData(r.dataFim || r.dataTermino),
          'Valor': parseFloat(r.valor || 0),
          'Classificação Atual': r.classificacaoAtual || '',
          'Classificação Esperada': r.classificacaoEsperada || '',
          'Status': r.statusCorreto ? 'Correto' : 'Incorreto',
          'É Plano': r.ehPlano ? 'Sim' : 'Não',
          'Tem Desconto': r.temDesconto ? 'Sim' : 'Não',
          'Comissão': parseFloat((r.comissao || 0).toFixed(2)),
          'Duração (Meses)': r.duracaoMeses || '',
          'Observações': r.vendaCorrigida?.motivoCorrecao || ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(dadosExport);
      
      const colWidths = [
        { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 10 },
        { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Análise Comissões');

      const agora = new Date();
      const timestamp = agora.toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const nomeArquivo = `analise_comissoes_${consultorSelecionado}_${mesAtual}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, nomeArquivo);
      
      console.log(`✅ Exportação concluída: ${dadosExport.length} registros exportados para ${nomeArquivo}`);
      
    } catch (error) {
      console.error('❌ Erro ao exportar para Excel:', error);
      alert('Erro ao exportar dados. Verifique o console para mais detalhes.');
    }
  };

  // Handler para exportar PDF completo
  const handleExportarPDF = async () => {
    if (!resultadosAnalise) {
      alert('Selecione um consultor para gerar o PDF.');
      return;
    }

    if (gerandoPDF) {
      alert('PDF já está sendo gerado. Aguarde a conclusão.');
      return;
    }

    try {
      setGerandoPDF(true);
      setProgressoPDF({ porcentagem: 0, mensagem: 'Iniciando...' });
      
      console.log('🔄 Iniciando geração de PDF completo...');
      
      const dadosParaPDF = {
        resultados: resultadosFiltrados.length > 0 ? resultadosFiltrados : resultadosAnalise.resultados,
        estatisticas: resultadosAnalise.estatisticas
      };

      // Callback de progresso
      const onProgress = (porcentagem, mensagem) => {
        setProgressoPDF({ porcentagem, mensagem });
      };

      const resultado = await gerarPDFComissoes(
        dadosParaPDF,
        consultorSelecionado,
        unidadeSelecionada,
        mesAtual,
        onProgress
      );

      if (resultado.success) {
        console.log('✅ PDF gerado com sucesso:', resultado.filename);
        alert(`PDF gerado com sucesso!\n\nRelatório executivo criado com ${resultado.totalVendas} vendas analisadas.\n\nArquivo: ${resultado.filename}`);
      } else {
        console.error('❌ Erro na geração do PDF:', resultado.error);
        alert(`Erro ao gerar PDF: ${resultado.error}`);
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao gerar PDF:', error);
      alert('Erro inesperado ao gerar PDF. Verifique o console para mais detalhes.');
    } finally {
      setGerandoPDF(false);
      setProgressoPDF({ porcentagem: 0, mensagem: '' });
    }
  };

  // Handler para exportar PDF resumido (apenas estatísticas)
  const handleExportarPDFResumo = async () => {
    if (!resultadosAnalise) {
      alert('Selecione um consultor para gerar o PDF resumido.');
      return;
    }

    if (gerandoPDF) {
      alert('PDF já está sendo gerado. Aguarde a conclusão.');
      return;
    }

    try {
      setGerandoPDF(true);
      setProgressoPDF({ porcentagem: 0, mensagem: 'Gerando resumo...' });
      
      
      const resultado = await gerarPDFResumo(
        resultadosAnalise.estatisticas,
        consultorSelecionado,
        unidadeSelecionada,
        mesAtual
      );

      if (resultado.success) {
        console.log('✅ PDF resumido gerado com sucesso:', resultado.filename);
        alert(`PDF resumido gerado com sucesso: ${resultado.filename}`);
      } else {
        console.error('❌ Erro na geração do PDF resumido:', resultado.error);
        alert(`Erro ao gerar PDF resumido: ${resultado.error}`);
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao gerar PDF resumido:', error);
      alert('Erro inesperado ao gerar PDF resumido. Verifique o console para mais detalhes.');
    } finally {
      setGerandoPDF(false);
      setProgressoPDF({ porcentagem: 0, mensagem: '' });
    }
  };

  return (
    <div className="comissao-detalhes-layout">
      {/* Sidebar com NavBar */}
      <aside className="cd-sidebar">
        <div className="cd-sidebar-hdr"><h2>GestãoApp</h2></div>
        <NavBar />
      </aside>

      {/* Conteúdo Principal */}
      <main className="comissao-detalhes-main">
        {/* Header da Página */}
        <header className="cd-hdr">
          <div className="cd-hdr-left">
            <span className="cd-unit-tag">{(unidadeSelecionada || '').toUpperCase()}</span>
            <div>
              <h1 className="cd-page-title">Análise de Comissões</h1>
              <p className="cd-page-sub">Classificação e análise detalhada por consultor</p>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <ComissaoFilters
          unidadeSelecionada={unidadeSelecionada}
          setUnidadeSelecionada={setUnidadeSelecionada}
          mesAtual={mesAtual}
          setMesAtual={setSelectedMonth}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          mostrarEstatisticas={mostrarEstatisticas}
          setMostrarEstatisticas={setMostrarEstatisticas}
          onExportar={handleExportar}
          onExportarPDF={handleExportarPDF}
          onExportarPDFResumo={handleExportarPDFResumo}
          onRefresh={handleRefresh}
          loading={loading}
          hasResults={!!resultadosAnalise}
          gerandoPDF={gerandoPDF}
          progressoPDF={progressoPDF}
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
              {dadosConsultores.map((item) => (
                <ConsultorCard
                  key={item.consultor}
                  consultor={item.consultor}
                  dados={item.dados}
                  remuneracaoType={item.remuneracaoType}
                  onClick={() => handleConsultorClick(item.consultor)}
                  isSelected={consultorSelecionado === item.consultor}
                  isExpanded={consultorSelecionado === item.consultor}
                />
              ))}
            </div>
          </section>
        )}

        {/* Card de Premiação do Supervisor */}
        {!loading && premiacaoSupervisor && premiacaoSupervisor.premiacaoTotal > 0 && (
          <section className="premiacao-supervisor-section">
            <div className={`consultor-card supervisor-card ${premiacaoSupervisor.percentualMeta >= 100 ? 'success' : 'warning'}`}>
              {/* Header do Card */}
              <div className="consultor-card-header">
                <div className="consultor-info">
                  <h3 className="consultor-nome">SUPERVISOR DE VENDAS</h3>
                  <div className="consultor-stats">
                    <span className="vendas-count">{premiacaoSupervisor.consultoresCount} consultores</span>
                    <span className="remuneracao-type"><Trophy size={14} /> Premiação</span>
                  </div>
                </div>
                <div className="status-indicator">
                  {premiacaoSupervisor.percentualMeta >= 100 ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Target size={20} />
                  )}
                </div>
              </div>

              {/* Métricas Principais */}
              <div className="consultor-metrics">
                {/* Total de Vendas */}
                <div className="metric">
                  <div className="metric-icon">
                    <DollarSign size={16} />
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Total Vendas</span>
                    <span className="metric-value">
                      R$ {premiacaoSupervisor.totalVendasUnidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Premiação Total */}
                <div className="metric highlight">
                  <div className="metric-icon">
                    <Calculator size={16} />
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Premiação</span>
                    <span className="metric-value">
                      R$ {premiacaoSupervisor.premiacaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Performance da Meta */}
                <div className="metric">
                  <div className="metric-icon">
                    <BarChart3 size={16} />
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Meta</span>
                    <span className="metric-value">
                      {premiacaoSupervisor.percentualMeta.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso da Meta */}
              <div className="progress-section">
                <div className="progress-info">
                  <span className="progress-label">
                    R$ {premiacaoSupervisor.totalVendasUnidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                    R$ {premiacaoSupervisor.metaUnidadeCalculada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`progress-status ${premiacaoSupervisor.percentualMeta >= 100 ? 'success' : 'warning'}`}>
                    {premiacaoSupervisor.percentualMeta >= 100 ? 'Meta Atingida' : 'Em Andamento'}
                  </span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${premiacaoSupervisor.percentualMeta >= 100 ? 'success' : 'warning'}`}
                    style={{ width: `${Math.min(premiacaoSupervisor.percentualMeta, 100)}%` }}
                  />
                </div>
              </div>
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
      <style>{`
        .comissao-detalhes-layout {
          display: flex;
          min-height: 100vh;
          background: var(--background);
        }

        .cd-sidebar {
          width: 260px;
          background: var(--card);
          border-right: 1px solid var(--border);
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 100;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .cd-sidebar-hdr {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--border);
        }

        .cd-sidebar-hdr h2 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--primary);
        }

        .comissao-detalhes-main {
          flex: 1;
          margin-left: 260px;
          padding: 24px 32px;
          max-width: 1400px;
          overflow-x: hidden;
        }

        /* ===== HEADER ===== */
        .cd-hdr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .cd-hdr-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .cd-unit-tag {
          background: var(--primary);
          color: #fff;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: .65rem;
          font-weight: 700;
          letter-spacing: .06em;
        }

        .cd-page-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.3;
        }

        .cd-page-sub {
          font-size: .78rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .consultores-section {
          padding: 0 0 24px;
        }

        .section-header {
          margin-bottom: 16px;
        }

        .section-header h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 4px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .section-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: .78rem;
        }

        .consultores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 14px;
        }

        .loading-section {
          padding: 48px 24px;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-secondary);
          background: var(--card);
          border-radius: var(--radius);
          padding: 48px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }

        .loading-content svg {
          margin-bottom: 12px;
          color: var(--primary);
        }

        .loading-content h3 {
          margin: 0 0 6px;
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
        }

        .loading-content p {
          margin: 0;
          font-size: .82rem;
          line-height: 1.5;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          color: var(--text-secondary);
          background: var(--card);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          margin: 0 0 24px;
        }

        .empty-state svg {
          margin-bottom: 12px;
          color: var(--border);
        }

        .empty-state h3 {
          margin: 0 0 6px;
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
        }

        .empty-state p {
          margin: 0 0 4px;
          font-size: .82rem;
          line-height: 1.5;
          max-width: 420px;
        }

        .spinning {
          animation: cd-spin .8s linear infinite;
        }

        @keyframes cd-spin {
          to { transform: rotate(360deg); }
        }

        /* Premiação Supervisor Section */
        .premiacao-supervisor-section {
          padding: 0 0 24px;
          max-width: 600px;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1024px) {
          .comissao-detalhes-main {
            margin-left: 0;
            padding: 16px;
          }

          .cd-sidebar {
            display: none;
          }

          .consultores-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .cd-hdr {
            flex-direction: column;
            align-items: flex-start;
          }

          .consultores-grid {
            gap: 12px;
          }

          .loading-section,
          .empty-state {
            padding: 32px 16px;
          }
        }

        @media (max-width: 480px) {
          .comissao-detalhes-main {
            padding: 12px;
          }

          .cd-page-title {
            font-size: 1.1rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .spinning { animation: none; }
        }
      `}</style>
    </div>
  );
}