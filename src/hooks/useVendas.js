// File: src/hooks/useVendas.js
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  collection,
  collectionGroup,
  onSnapshot,
  getDocs,
  writeBatch,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import { useGroupedVendas } from './useGroupedVendas';

// ============ CONFIGURAÇÃO DE CACHE ============
const CACHE_KEY = 'dashflex_vendas_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const cacheUtils = {
  save: (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Se localStorage cheio, limpa e tenta novamente
      if (e.name === 'QuotaExceededError') {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  },
  load: () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
  clear: () => localStorage.removeItem(CACHE_KEY)
};

export const useVendas = (unidade, metas = [], options = {}) => {
  const { enableRealtime = true } = options; // Pode desabilitar realtime para economizar
  
  // Estados brutos
  const [vendas, setVendas] = useState(() => {
    // Inicializa com cache se disponível
    const cached = cacheUtils.load();
    return cached || [];
  });
  
  // APLICAR AGRUPAMENTO DE PLANOS DIVIDIDOS
  const vendasAgrupadas = useGroupedVendas(vendas);
  const [loading, setLoading] = useState(() => !cacheUtils.load());
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);
  const lastFetchRef = useRef(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Upload XLS
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  // flag para conversão automática do 'Administrador'
  const [autoConvertAdmin, setAutoConvertAdmin] = useState(true);

  // Filtros e seleção de período
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [chartTimeRange, setChartTimeRange] = useState("month"); // "week" | "month" | "year"

  // Ordenação e paginação
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dados auxiliares extraídos
  const [responsaveis, setResponsaveis] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState([]);

  // Comparativo mês atual x anterior
  const [totalCurrent, setTotalCurrent] = useState(0);
  const [totalPrevious, setTotalPrevious] = useState(0);
  const [percentChange, setPercentChange] = useState(0);
  const [processedVendasCount, setProcessedVendasCount] = useState(0);


  // ——————————————————————————————————————————————————————————————
  // ▲ Helpers para CRUD e batch delete
  const deleteAllDocumentsFromSubcollection = async (subName) => {
    const subcolRef = collection(db, "faturamento", unidade.toLowerCase(), subName);
    const snap = await getDocs(subcolRef);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  };
  const deleteAllUnitData = () => deleteAllDocumentsFromSubcollection("vendas");

  const updateVenda = async (id, dados) => {
    try {
      if (!id) throw new Error("ID faltando");
      
      // Buscar a venda original para obter a unidade correta
      const vendaOriginal = vendas.find(v => v.id === id);
      
  
      
      if (!vendaOriginal) {
        throw new Error(`Venda não encontrada na lista: ${id}`);
      }
      
      const unidadeOriginal = vendaOriginal._unidadeOriginal || unidade.toLowerCase();
      
      console.log("✅ Unidade que será usada:", unidadeOriginal);
      
      const docRef = doc(db, "faturamento", unidadeOriginal, "vendas", id);
      
      // Verificar se o documento existe antes de tentar atualizar
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado no caminho: faturamento/${unidadeOriginal}/vendas/${id}`);
      }
      
      await updateDoc(docRef, dados);
      setSuccessMessage("Venda atualizada!");
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (err) {
      console.error("❌ Erro ao atualizar venda:", err);
      setError(err.message);
      return false;
    }
  };

  // ▲ Upload XLS
  const handleUpload = async () => {
    // 1) Valida se tem arquivo selecionado
    if (!file) {
      setError("Selecione um arquivo antes de enviar");
      return;
    }
  
    // 2) Prepara o FormData com arquivo, unidade e flag de conversão
    const form = new FormData();
    form.append("file", file);
    form.append("unidade", unidade);
  form.append("autoConvertAdmin", String(autoConvertAdmin));
  
    try {
      setUploading(true);
      setError("");
      
      // 3) Chama sua Cloud Function
      const res = await fetch(
        "https://southamerica-east1-chatpos-aff1a.cloudfunctions.net/uploadXLS",
        { method: "POST", body: form }
      );
  
      // 4) Trata erro de HTTP
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro desconhecido no upload");
      }
  
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Falha no processamento");
      }
  
      const count = json.count ?? json.processedCount ?? 0;
      setProcessedVendasCount(count);
      setSuccessMessage(`Foram processadas ${json.count} vendas!`);
  
      setFile(null);
  
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  

  // ▲ Busca otimizada com cache
  useEffect(() => {
    if (!unidade) return;
    isMountedRef.current = true;

    // Tenta carregar do cache primeiro
    const cached = cacheUtils.load();
    if (cached && cached.length > 0) {
      setVendas(cached);
      setLoading(false);
      
      // Preenche produtos e responsáveis do cache
      const ps = [...new Set(cached.map((v) => v.produto?.trim()).filter(Boolean))].sort();
      setProdutos(ps);
      if (!localStorage.getItem("produtosSelecionados")) setProdutosSelecionados(ps);
      const rs = [...new Set(cached.map((v) => v.responsavel?.trim()).filter(Boolean))].sort();
      setResponsaveis(rs);
    }

    // Função para processar dados
    const processData = (data) => {
      if (!isMountedRef.current) return;
      
      setVendas(data);
      setLoading(false);
      lastFetchRef.current = Date.now();
      
      // Salva no cache
      cacheUtils.save(data);

      // Preenche produtos e responsáveis
      const ps = [...new Set(data.map((v) => v.produto?.trim()).filter(Boolean))].sort();
      setProdutos(ps);
      if (!localStorage.getItem("produtosSelecionados")) setProdutosSelecionados(ps);
      const rs = [...new Set(data.map((v) => v.responsavel?.trim()).filter(Boolean))].sort();
      setResponsaveis(rs);
    };

    if (enableRealtime) {
      // Modo realtime - usa onSnapshot
      if (!cached) setLoading(true);
      
      const unsub = onSnapshot(
        collectionGroup(db, "vendas"),
        { includeMetadataChanges: false }, // Ignora mudanças de metadata para reduzir updates
        (snap) => {
          const data = snap.docs.map((d) => ({ 
            id: d.id, 
            _unidadeOriginal: d.ref.parent.parent.id,
            ...d.data() 
          }));
          processData(data);
        },
        (err) => {
          if (isMountedRef.current) {
            setError("Falha ao carregar: " + err.message);
            setLoading(false);
          }
        }
      );
      unsubscribeRef.current = unsub;
    } else {
      // Modo cache-first - busca apenas se cache expirado
      if (!cached) {
        setLoading(true);
        getDocs(collectionGroup(db, "vendas"))
          .then((snap) => {
            const data = snap.docs.map((d) => ({ 
              id: d.id, 
              _unidadeOriginal: d.ref.parent.parent.id,
              ...d.data() 
            }));
            processData(data);
          })
          .catch((err) => {
            if (isMountedRef.current) {
              setError("Falha ao carregar: " + err.message);
              setLoading(false);
            }
          });
      }
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [unidade, enableRealtime]);

  // Função para forçar refresh dos dados
  const refreshVendas = useCallback(async () => {
    if (!unidade) return;
    setLoading(true);
    cacheUtils.clear();
    
    try {
      const snap = await getDocs(collectionGroup(db, "vendas"));
      const data = snap.docs.map((d) => ({ 
        id: d.id, 
        _unidadeOriginal: d.ref.parent.parent.id,
        ...d.data() 
      }));
      
      setVendas(data);
      cacheUtils.save(data);
      
      const ps = [...new Set(data.map((v) => v.produto?.trim()).filter(Boolean))].sort();
      setProdutos(ps);
      const rs = [...new Set(data.map((v) => v.responsavel?.trim()).filter(Boolean))].sort();
      setResponsaveis(rs);
    } catch (err) {
      setError("Falha ao atualizar: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [unidade]);

  // ▲ Sincroniza produtosSelecionados com localStorage
  useEffect(() => {
    localStorage.setItem(
      "produtosSelecionados",
      JSON.stringify(produtosSelecionados)
    );
  }, [produtosSelecionados]);

  // ▲ Comparativo mês atual x anterior
  useEffect(() => {
    if (!vendasAgrupadas.length) return;
    const cur = selectedMonth;
    const prev = dayjs(cur + "-01", "YYYY-MM-DD")
      .subtract(1, "month")
      .format("YYYY-MM");

    const sum = (month) => {
      const filtered = vendasAgrupadas.filter((v) => {
        const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
        return mes === month;
      });
      return filtered.reduce((s, v) => s + Number(v.valor || 0), 0);
    };
    setTotalCurrent(sum(cur));
    setTotalPrevious(sum(prev));
    setPercentChange(prev && sum(prev) > 0 ? ((sum(cur) - sum(prev)) / sum(prev)) * 100 : 0);
  }, [vendasAgrupadas, selectedMonth]);

  // ——————————————————————————————————————————————————————————————
  // ▼ Filtragem por metas/responsáveis oficiais
  const responsaveisOficiais = useMemo(
    () => metas.map((m) => m.responsavel.trim().toLowerCase()),
    [metas]
  );

  // ▼ Vendas da unidade atual (para métricas específicas da unidade)
  const vendasUnidadeAtual = useMemo(() => {
    if (!unidade) return [];
    return vendasAgrupadas.filter((v) => {
      const unidadeVenda = (v.unidade || "").toLowerCase();
      return unidadeVenda === unidade.toLowerCase();
    });
  }, [vendasAgrupadas, unidade]);

  // ▼ Vendas já filtradas de acordo com todos os critérios (TODAS as unidades para filtro global)
  const vendasFiltradas = useMemo(() => {
    if (!unidade) return [];
    return vendasAgrupadas.filter((v) => {
      // ✅ CORREÇÃO: Não filtra por unidade - permite vendas de todas as unidades
  
      // seu filtro por responsável
      const resp = (v.responsavel || "").trim().toLowerCase();
      if (filtroResponsavel &&
          !resp.includes(filtroResponsavel.toLowerCase())
      ) return false;
  
      // filtro por produto
      const prod = (v.produto || "").trim().toLowerCase();
      if (filtroProduto &&
          !prod.includes(filtroProduto.toLowerCase())
      ) return false;
  
      // filtro por nome
      const nome = (v.nome || "").trim().toLowerCase();
      if (filtroNome &&
          !nome.includes(filtroNome.toLowerCase())
      ) return false;
  
      // filtro de intervalo de datas
      if (startDate && endDate && v.dataFormatada) {
        const d = dayjs(v.dataFormatada, "YYYY-MM-DD");
        if (!d.isBetween(dayjs(startDate), dayjs(endDate), "day", "[]"))
          return false;
      }
  
      // filtro de busca livre
      if (searchTerm) {
        const all = Object.values(v).join(" ").toLowerCase();
        if (!all.includes(searchTerm.toLowerCase())) return false;
      }
  
      // filtro de metas/responsáveis oficiais
      if (
        responsaveisOficiais.length > 0 &&
        !responsaveisOficiais.includes(resp)
      ) return false;
  
      // filtro de mês selecionado
      if (selectedMonth) {
        const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
        if (mes !== selectedMonth) return false;
      }
  
      return true;
    });
  }, [
    vendasAgrupadas,
    unidade,
    filtroResponsavel,
    filtroProduto,
    filtroNome,
    searchTerm,
    startDate,
    endDate,
    selectedMonth,
    produtosSelecionados,
    responsaveisOficiais,
  ]);
  

  // ▼ Ordenação
  const vendasOrdenadas = useMemo(() => {
    if (!sortConfig.key) return vendasFiltradas;
    return [...vendasFiltradas].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      if (a[sortConfig.key] < b[sortConfig.key]) return -1 * dir;
      if (a[sortConfig.key] > b[sortConfig.key]) return 1 * dir;
      return 0;
    });
  }, [vendasFiltradas, sortConfig]);

  // ▼ Paginação
  const paginatedVendas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return vendasOrdenadas.slice(start, start + itemsPerPage);
  }, [vendasOrdenadas, currentPage]);

  //---------------------------------
  // ▲ Métricas e estatísticas
  const totalFaturado = useMemo(() =>
    vendasAgrupadas.reduce((sum, v) => sum + Number(v.valor || 0), 0)
  , [vendasAgrupadas]);

  const totalFiltrado = useMemo(() =>
    vendasFiltradas.reduce((sum, v) => sum + Number(v.valor || 0), 0)
  , [vendasFiltradas]);

  const mediaPorVenda = useMemo(() => (
    vendasFiltradas.length ? totalFiltrado / vendasFiltradas.length : 0
  ), [totalFiltrado, vendasFiltradas]);

  // ▲ Dados para gráfico
  const chartData = useMemo(() => {
    const byResp = {};
    vendasAgrupadas.forEach((v) => {
      const d = dayjs(v.dataFormatada, "YYYY-MM-DD");
      const ok =
        chartTimeRange === "week"  ? d.isSame(dayjs(), "week")  :
        chartTimeRange === "month" ? d.isSame(dayjs(), "month") : true;
      if (!ok) return;
      const key = (v.responsavel || "desconhecido").trim().toLowerCase();
      byResp[key] = (byResp[key] || 0) + Number(v.valor || 0);
    });
    return {
      labels: Object.keys(byResp),
      datasets: [{ label: "Vendas (R$)", data: Object.values(byResp) }],
    };
  }, [vendasAgrupadas, chartTimeRange]);

  // ▲ Contagens e variações em número de vendas
  const prevMonth = dayjs(selectedMonth + "-01", "YYYY-MM-DD").subtract(1, "month").format("YYYY-MM");
  const vendasMesAtual    = useMemo(() => vendasAgrupadas.filter((v) => dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === selectedMonth), [vendasAgrupadas, selectedMonth]);
  const vendasMesAnterior = useMemo(() => vendasAgrupadas.filter((v) => dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === prevMonth), [vendasAgrupadas, prevMonth]);
  const countAtual        = vendasMesAtual.length;
  const countAnterior     = vendasMesAnterior.length;
  const pctVendas         = countAnterior ? ((countAtual - countAnterior) / countAnterior) * 100 : 0;

  // Exposição da API do hook
  return {
    vendas: vendasAgrupadas, // RETORNAR AS VENDAS JÁ AGRUPADAS (TODAS as unidades)
    vendasUnidadeAtual, // ✅ NOVO: Vendas apenas da unidade atual
    vendasOriginais: vendas, // Opcional: manter acesso às vendas originais se necessário
    loading,
    error,
    successMessage,
    file,
    setFile,
    uploading,
    autoConvertAdmin,
    setAutoConvertAdmin,
    handleUpload,

    filtroResponsavel,
    setFiltroResponsavel,
    filtroProduto,
    setFiltroProduto,
    filtroNome,
    setFiltroNome,
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedMonth,
    setSelectedMonth,
    chartTimeRange,
    setChartTimeRange,

    sortConfig,
    setSortConfig,
    currentPage,
    setCurrentPage,
    itemsPerPage,

    responsaveis,
    produtos,
    produtosSelecionados,
    setProdutosSelecionados,

    vendasFiltradas,
    vendasOrdenadas,
    paginatedVendas,

    totalFaturado,
    totalFiltrado,
    mediaPorVenda,

    totalCurrent,
    totalPrevious,
    percentChange,

    chartData,

    countAtual,
    countAnterior,
    pctVendas,

    updateVenda,
    deleteAllUnitData,
    refreshVendas, // Nova função para forçar refresh
    clearCache: cacheUtils.clear, // Limpar cache manualmente
  };
};
