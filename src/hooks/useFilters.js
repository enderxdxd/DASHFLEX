// File: src/hooks/useFilters.js
import { useReducer, useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useParams } from 'react-router-dom';

dayjs.extend(isBetween);

// Reducer para gerenciar os estados de filtro
const filtersReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FILTER_RESPONSAVEL':
      return { ...state, filtroResponsavel: action.payload };
    case 'SET_FILTER_PRODUTO':
      return { ...state, filtroProduto: action.payload };
    case 'SET_FILTER_NOME':
      return { ...state, filtroNome: action.payload };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_DATE_RANGE':
      return {
        ...state,
        startDate: action.payload.startDate,
        endDate: action.payload.endDate
      };
    case 'TOGGLE_DATE_PICKER':
      return { ...state, showDatePicker: !state.showDatePicker };
    case 'SET_SELECTED_MONTH':
      return { ...state, selectedMonth: action.payload };
    case 'SET_SORT_CONFIG':
      return { ...state, sortConfig: action.payload };
    case 'RESET_FILTERS':
      return {
        ...state,
        filtroResponsavel: "",
        filtroProduto: "",
        filtroNome: "",
        searchTerm: "",
        startDate: null,
        endDate: null
      };
    default:
      return state;
  }
};

/**
 * Hook de filtros e métricas de vendas.
 * @param {Array} vendas - Lista completa de vendas de todas as unidades.
 * @param {Array<string>} responsaveisOficiais - Lista de consultores cadastrados na unidade.
 * @param {string} initialMonth - Mês inicial no formato 'YYYY-MM'.
 */
export const useFilters = (
  vendas,
  responsaveisOficiais,
  initialMonth = dayjs().format("YYYY-MM")
) => {
  // Estado inicial dos filtros
  const initialFiltersState = {
    filtroResponsavel: "",
    filtroProduto: "",
    filtroNome: "",
    searchTerm: "",
    startDate: null,
    endDate: null,
    showDatePicker: false,
    selectedMonth: initialMonth,
    sortConfig: { key: null, direction: "ascending" }
  };

  const [filters, dispatchFilters] = useReducer(filtersReducer, initialFiltersState);
  const [currentPage, setCurrentPage] = useState(1);
  const [chartTimeRange, setChartTimeRange] = useState("month");
  const itemsPerPage = 10;

  // Reset da página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Ajusta mês inicial quando mudar
  useEffect(() => {
    dispatchFilters({ type: 'SET_SELECTED_MONTH', payload: initialMonth });
  }, [initialMonth]);

  // Pré-processar responsáveis oficiais para lookup O(1)
  const responsaveisOficiaisSet = useMemo(() => {
    return new Set(responsaveisOficiais.map(r => r.trim().toLowerCase()));
  }, [responsaveisOficiais]);

  // Filtragem otimizada com useMemo
  const filteredVendas = useMemo(() => {
    if (!vendas?.length) return [];
    
    const filtroRespLower = filters.filtroResponsavel?.toLowerCase() || '';
    const filtroProdLower = filters.filtroProduto?.toLowerCase() || '';
    const filtroNomeLower = filters.filtroNome?.toLowerCase() || '';
    const searchTermLower = filters.searchTerm?.toLowerCase() || '';
    const hasDateRange = filters.startDate && filters.endDate;
    const hasResponsaveisOficiais = responsaveisOficiaisSet.size > 0;
    
    return vendas.filter((v) => {
      const responsavel = (v.responsavel || "").trim().toLowerCase();
      const produto = (v.produto || "").trim().toLowerCase();
      const nome = (v.nome || "").trim().toLowerCase();
      const dataVenda = v.dataFormatada || "";

      // Filtros de texto (otimizados)
      if (filtroRespLower && !responsavel.includes(filtroRespLower)) return false;
      if (filtroProdLower && !produto.includes(filtroProdLower)) return false;
      if (filtroNomeLower && !nome.includes(filtroNomeLower)) return false;

      // Filtro de data
      if (hasDateRange && dataVenda) {
        const saleDate = dayjs(dataVenda, "YYYY-MM-DD");
        if (!saleDate.isBetween(dayjs(filters.startDate), dayjs(filters.endDate), "day", "[]")) {
          return false;
        }
      }

      // Filtro de busca
      if (searchTermLower) {
        const found = Object.values(v).some(val => 
          val && val.toString().toLowerCase().includes(searchTermLower)
        );
        if (!found) return false;
      }

      // Filtro de responsáveis oficiais (usando Set para O(1))
      if (hasResponsaveisOficiais && !responsaveisOficiaisSet.has(responsavel)) {
        return false;
      }

      // Filtro de mês
      if (filters.selectedMonth && dataVenda) {
        const mesVenda = dataVenda.substring(0, 7); // YYYY-MM
        if (mesVenda !== filters.selectedMonth) return false;
      }

      return true;
    });
  }, [vendas, filters.filtroResponsavel, filters.filtroProduto, filters.filtroNome, 
      filters.searchTerm, filters.startDate, filters.endDate, filters.selectedMonth, 
      responsaveisOficiaisSet]);

  // Ordenação com useMemo
  const sortedVendas = useMemo(() => {
    if (!filters.sortConfig.key) return filteredVendas;
    
    return [...filteredVendas].sort((a, b) => {
      const { key, direction } = filters.sortConfig;
      if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredVendas, filters.sortConfig]);

  // Paginação com useMemo
  const paginatedVendas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedVendas.slice(start, start + itemsPerPage);
  }, [sortedVendas, currentPage, itemsPerPage]);

  // Função para aplicar correção de diárias (mesma lógica da ComissaoDetalhes)
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
    
    // Produtos não comissionáveis
    const produtosNaoComissionaveis = [
      'Taxa de Matrícula', 
      'Estorno', 
      'Ajuste Contábil',
      'QUITAÇÃO DE DINHEIRO - CANCELAMENTO'
    ];
    
    if (produtosNaoComissionaveis.includes(venda.produto)) {
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

  // Set de produtos não comissionáveis (constante)
  const produtosNaoComissionaveisSet = useMemo(() => new Set([
    'Taxa de Matrícula', 
    'Estorno', 
    'Ajuste Contábil',
    'QUITAÇÃO DE DINHEIRO - CANCELAMENTO'
  ]), []);

  // Aplicar correção e filtrar vendas corretamente (memoizado)
  const { vendasCorrigidas, vendasPlanos, vendasOutrosProdutos } = useMemo(() => {
    const corrigidas = filteredVendas.map(corrigirClassificacaoDiarias);
    const planos = corrigidas.filter(ehPlanoAposCorrecao);
    const outros = corrigidas.filter(v => {
      const ehPlano = ehPlanoAposCorrecao(v);
      const ehNaoComissionavel = produtosNaoComissionaveisSet.has(v.produto);
      return !ehPlano && !ehNaoComissionavel;
    });
    return { vendasCorrigidas: corrigidas, vendasPlanos: planos, vendasOutrosProdutos: outros };
  }, [filteredVendas, produtosNaoComissionaveisSet]);

  // Soma por responsável para o gráfico (memoizado)
  const somaPorResponsavel = useMemo(() => {
    const now = dayjs();
    const acc = {};
    
    for (const v of vendas) {
      const respons = (v.responsavel || "").trim().toLowerCase();
      if (!responsaveisOficiaisSet.has(respons)) continue;
      if (!v.dataFormatada) continue;
      
      const d = dayjs(v.dataFormatada, 'YYYY-MM-DD');
      const inRange = (
        (chartTimeRange === 'week' && d.isSame(now, 'week')) ||
        (chartTimeRange === 'month' && d.isSame(now, 'month')) ||
        (chartTimeRange === 'year' && d.isSame(now, 'year'))
      );
      
      if (inRange) {
        acc[respons] = (acc[respons] || 0) + (Number(v.valor) || 0);
      }
    }
    return acc;
  }, [vendas, responsaveisOficiaisSet, chartTimeRange]);

  // Totais e médias (memoizado)
  const { totalFiltrado, mediaPorVenda } = useMemo(() => {
    const total = vendasCorrigidas.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
    const media = vendasCorrigidas.length > 0 ? total / vendasCorrigidas.length : 0;
    return { totalFiltrado: total, mediaPorVenda: media };
  }, [vendasCorrigidas]);

  // Estatísticas para planos (memoizado)
  const estatisticasPlanos = useMemo(() => {
    const valorTotal = vendasPlanos.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
    return {
      quantidade: vendasPlanos.length,
      valorTotal,
      valorMedio: vendasPlanos.length > 0 ? valorTotal / vendasPlanos.length : 0
    };
  }, [vendasPlanos]);
  
  // Estatísticas para outros produtos (memoizado)
  const estatisticasOutros = useMemo(() => {
    const valorTotal = vendasOutrosProdutos.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
    return {
      quantidade: vendasOutrosProdutos.length,
      valorTotal,
      valorMedio: vendasOutrosProdutos.length > 0 ? valorTotal / vendasOutrosProdutos.length : 0
    };
  }, [vendasOutrosProdutos]);

  // Comparativo mês anterior (memoizado)
  const { countAtual, countAnterior, totalAnterior, pctVendas, pctMedia, vendasPrev } = useMemo(() => {
    const prevMonth = dayjs(filters.selectedMonth + '-01', 'YYYY-MM-DD')
      .subtract(1, 'month')
      .format('YYYY-MM');
    
    const prev = vendas.filter(v => {
      const resp = (v.responsavel || "").trim().toLowerCase();
      if (!responsaveisOficiaisSet.has(resp)) return false;
      const mesVenda = (v.dataFormatada || '').substring(0, 7);
      return mesVenda === prevMonth;
    });
    
    const cAtual = filteredVendas.length;
    const cAnterior = prev.length;
    const tAnterior = prev.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
    const pVendas = cAnterior > 0 ? ((cAtual - cAnterior) / cAnterior) * 100 : 0;
    const pMedia = tAnterior > 0 ? ((totalFiltrado - tAnterior) / tAnterior) * 100 : 0;
    
    return { 
      countAtual: cAtual, 
      countAnterior: cAnterior, 
      totalAnterior: tAnterior, 
      pctVendas: pVendas, 
      pctMedia: pMedia,
      vendasPrev: prev
    };
  }, [vendas, filters.selectedMonth, responsaveisOficiaisSet, filteredVendas, totalFiltrado]);

  return {
    filters,
    dispatchFilters,
    filteredVendas,
    sortedVendas,
    paginatedVendas,
    currentPage,
    setCurrentPage,
    somaPorResponsavel,
    chartTimeRange,
    setChartTimeRange,
    totalFiltrado,
    mediaPorVenda,
    countAtual,
    countAnterior,
    mediaAtual: mediaPorVenda,
    mediaAnterior: vendasPrev.length > 0 ? totalAnterior / countAnterior : 0,
    pctVendas,
    pctMedia,
    estatisticasPlanos,
  estatisticasOutros,
  vendasPlanos,
  vendasOutrosProdutos
  };
};
