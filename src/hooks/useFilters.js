import { useReducer, useState, useEffect } from "react";
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

  // Filtragem conforme código antigo: sem filtro de unidade
  const filteredVendas = vendas.filter((v) => {
    const responsavel = (v.responsavel || "").trim().toLowerCase();
    const produto = (v.produto || "").trim().toLowerCase();
    const nome = (v.nome || "").trim().toLowerCase();
    const dataVenda = v.dataFormatada || "";

    const condResponsavel = filters.filtroResponsavel
      ? responsavel.includes(filters.filtroResponsavel.toLowerCase())
      : true;
    const condProduto = filters.filtroProduto
      ? produto.includes(filters.filtroProduto.toLowerCase())
      : true;
    const condNome = filters.filtroNome
      ? nome.includes(filters.filtroNome.toLowerCase())
      : true;

    let condData = true;
    if (filters.startDate && filters.endDate && dataVenda) {
      const saleDate = dayjs(dataVenda, "YYYY-MM-DD");
      condData = saleDate.isBetween(
        dayjs(filters.startDate),
        dayjs(filters.endDate),
        "day",
        "[]"
      );
    }

    const condSearch = filters.searchTerm
      ? Object.values(v).some(
          (val) =>
            val &&
            val.toString().toLowerCase().includes(filters.searchTerm.toLowerCase())
        )
      : true;

    const condMeta = responsaveisOficiais.length
      ? responsaveisOficiais
          .map(r => r.trim().toLowerCase())
          .includes(responsavel)
      : true;

    const condMes = filters.selectedMonth
      ? dayjs(dataVenda, "YYYY-MM-DD").format('YYYY-MM') === filters.selectedMonth
      : true;

    return (
      condResponsavel &&
      condProduto &&
      condNome &&
      condData &&
      condSearch &&
      condMeta &&
      condMes
    );
  });

  // Ordenação
  const sortedVendas = filters.sortConfig.key
    ? [...filteredVendas].sort((a, b) => {
        const { key, direction } = filters.sortConfig;
        if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
        if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
        return 0;
      })
    : filteredVendas;

  // Paginação
  const paginatedVendas = sortedVendas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Soma por responsável para o gráfico
  const somaPorResponsavel = (() => {
    const arr = vendas.filter((v) => {
      const respons = (v.responsavel || "").trim().toLowerCase();
      if (!responsaveisOficiais
        .map(r => r.trim().toLowerCase())
        .includes(respons)) return false;
      if (!v.dataFormatada) return false;
      const d = dayjs(v.dataFormatada, 'YYYY-MM-DD');
      return (
        (chartTimeRange === 'week' && d.isSame(dayjs(), 'week')) ||
        (chartTimeRange === 'month' && d.isSame(dayjs(), 'month')) ||
        (chartTimeRange === 'year' && d.isSame(dayjs(), 'year'))
      );
    });
    return arr.reduce((acc, v) => {
      const key = v.responsavel.trim().toLowerCase();
      acc[key] = (acc[key] || 0) + (Number(v.valor) || 0);
      return acc;
    }, {});
  })();

  // Totais e médias
  const totalFiltrado = filteredVendas.reduce(
    (sum, v) => sum + (Number(v.valor) || 0),
    0
  );
  const mediaPorVenda =
    filteredVendas.length > 0 ? totalFiltrado / filteredVendas.length : 0;

  // Comparativo mês anterior
  const prevMonth = dayjs(filters.selectedMonth + '-01','YYYY-MM-DD')
    .subtract(1,'month')
    .format('YYYY-MM');
  const vendasPrev = vendas.filter(v => {
    const resp = (v.responsavel || "").trim().toLowerCase();
    if (!responsaveisOficiais.map(r => r.trim().toLowerCase()).includes(resp)) return false;
    return dayjs(v.dataFormatada,'YYYY-MM-DD').format('YYYY-MM') === prevMonth;
  });
  const countAtual = filteredVendas.length;
  const countAnterior = vendasPrev.length;
  const totalAnterior = vendasPrev.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
  const pctVendas = countAnterior > 0
    ? ((countAtual - countAnterior) / countAnterior) * 100
    : 0;
  const pctMedia = totalAnterior > 0
    ? ((totalFiltrado - totalAnterior) / totalAnterior) * 100
    : 0;

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
    pctMedia
  };
};
