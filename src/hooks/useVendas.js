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
import { idbSave, idbLoad, idbClear } from '../utils/idbCache';

// ============ CONFIGURAÇÃO DE CACHE OTIMIZADO ============
const CACHE_KEY = 'vendas_all';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos

// Cache com IndexedDB (suporta centenas de MB vs 5MB do localStorage)
// 39k vendas = ~10-15MB de JSON — estoura localStorage
const cacheUtils = {
  save: async (data) => {
    const compactData = data.map(v => ({
      id: v.id,
      _unidadeOriginal: v._unidadeOriginal,
      matricula: v.matricula,
      nome: v.nome,
      responsavel: v.responsavel,
      produto: v.produto,
      plano: v.plano,
      valor: v.valor,
      unidade: v.unidade,
      dataFormatada: v.dataFormatada,
      dataLancamento: v.dataLancamento,
      dataInicio: v.dataInicio,
      dataFim: v.dataFim,
      duracaoMeses: v.duracaoMeses,
      formaPagamento: v.formaPagamento
    }));
    await idbSave(CACHE_KEY, compactData);
  },
  load: async () => {
    const result = await idbLoad(CACHE_KEY, CACHE_TTL);
    return result ? result.data : null;
  },
  clear: async () => {
    await idbClear(CACHE_KEY);
  }
};

// Cache em memória compartilhado entre páginas para navegação instantânea
let memoryCache = null;
let memoryCacheTimestamp = 0;
let memoryDerivedCache = {
  produtos: [],
  responsaveis: [],
};
let sharedFetchPromise = null;

const buildDerivedLists = (data) => {
  const produtosSet = new Set();
  const responsaveisSet = new Set();

  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v.produto) produtosSet.add(v.produto.trim());
    if (v.responsavel) responsaveisSet.add(v.responsavel.trim());
  }

  return {
    produtos: Array.from(produtosSet).sort(),
    responsaveis: Array.from(responsaveisSet).sort(),
  };
};

const updateMemoryCache = (data) => {
  memoryCache = data;
  memoryCacheTimestamp = Date.now();
  memoryDerivedCache = buildDerivedLists(data);
};

const hasFreshMemoryCache = () =>
  Array.isArray(memoryCache) &&
  Date.now() - memoryCacheTimestamp < CACHE_TTL;

export const useVendas = (unidade, metas = [], options = {}) => {
  // OTIMIZAÇÃO: Realtime desabilitado por padrão para melhor performance
  // Use refreshVendas() para atualizar manualmente quando necessário
  const { enableRealtime = false, groupPlans = true } = options;
  
  // Estados brutos — inicializa vazio, cache async (IndexedDB) carrega no useEffect
  const [vendas, setVendas] = useState(() => memoryCache || []);
  
  // APLICAR AGRUPAMENTO DE PLANOS DIVIDIDOS
  const vendasAgrupadas = useGroupedVendas(vendas, groupPlans);
  const [loading, setLoading] = useState(() => !hasFreshMemoryCache());
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
  const [responsaveis, setResponsaveis] = useState(() => memoryDerivedCache.responsaveis || []);
  const [produtos, setProdutos] = useState(() => memoryDerivedCache.produtos || []);
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
    const BATCH_SIZE = 500;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const b = writeBatch(db);
      docs.slice(i, i + BATCH_SIZE).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
  };
  const deleteAllUnitData = async () => {
    await deleteAllDocumentsFromSubcollection("vendas");
    // ✅ Atualizar estado local: remover vendas da unidade deletada
    const updated = vendas.filter(v => (v._unidadeOriginal || '').toLowerCase() !== unidade.toLowerCase());
    updateMemoryCache(updated);
    setVendas(updated);
    setProdutos(memoryDerivedCache.produtos);
    setResponsaveis(memoryDerivedCache.responsaveis);
    cacheUtils.save(updated).catch(() => {});
  };

  const updateVenda = async (id, dados) => {
    try {
      if (!id) throw new Error("ID faltando");
      
      // Buscar a venda original para obter a unidade correta
      const vendaOriginal = vendas.find(v => v.id === id);
      
      if (!vendaOriginal) {
        throw new Error(`Venda não encontrada na lista: ${id}`);
      }
      
      const unidadeOriginal = vendaOriginal._unidadeOriginal || unidade.toLowerCase();
      
      const docRef = doc(db, "faturamento", unidadeOriginal, "vendas", id);
      
      // Verificar se o documento existe antes de tentar atualizar
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Documento não encontrado no caminho: faturamento/${unidadeOriginal}/vendas/${id}`);
      }
      
      await updateDoc(docRef, dados);
      
      // ✅ OPTIMISTIC UPDATE: Atualizar estado local imediatamente
      const updated = vendas.map(v => v.id === id ? { ...v, ...dados } : v);
      updateMemoryCache(updated);
      setVendas(updated);
      setProdutos(memoryDerivedCache.produtos);
      setResponsaveis(memoryDerivedCache.responsaveis);
      cacheUtils.save(updated).catch(() => {});
      
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
      
      // ✅ Após upload, invalidar cache e recarregar dados do Firebase
      await cacheUtils.clear();
      const snap = await getDocs(collectionGroup(db, "vendas"));
      const freshData = snap.docs.map((d) => ({ 
        id: d.id, 
        _unidadeOriginal: d.ref.parent.parent.id,
        ...d.data() 
      }));
      updateMemoryCache(freshData);
      setVendas(freshData);
      cacheUtils.save(freshData).catch(() => {});
      setProdutos(memoryDerivedCache.produtos);
      setResponsaveis(memoryDerivedCache.responsaveis);
  
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  

  // ▲ Busca OTIMIZADA com cache-first strategy
  useEffect(() => {
    if (!unidade) return;
    isMountedRef.current = true;
    const _t0 = performance.now();
    if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useVendas: start for ${unidade}`);

    // Função otimizada para processar dados
    const processData = (data, source = 'firebase') => {
      if (!isMountedRef.current) return;
      if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useVendas: processData (${source.toUpperCase()}) ${data.length} vendas in +${(performance.now()-_t0).toFixed(0)}ms`);
      updateMemoryCache(data);
      setVendas(data);
      setProdutos(memoryDerivedCache.produtos);
      setResponsaveis(memoryDerivedCache.responsaveis);
      setLoading(false);
      lastFetchRef.current = Date.now();
      
      // Salva no cache persistente apenas se não veio da memória/IndexedDB
      if (source === 'firebase' || source === 'realtime') {
        cacheUtils.save(data).catch(() => {});
      }

      if (!localStorage.getItem("produtosSelecionados")) {
        setProdutosSelecionados(memoryDerivedCache.produtos);
      }
    };

    // ESTRATÉGIA CACHE-FIRST com IndexedDB (async)
    const loadData = async () => {
      if (hasFreshMemoryCache()) {
        if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useVendas: memory cache HIT in +${(performance.now()-_t0).toFixed(0)}ms`);
        processData(memoryCache, 'memory');
        if (!enableRealtime) {
          return;
        }
      }

      if (memoryCache?.length > 0) {
        if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useVendas: stale memory cache HIT in +${(performance.now()-_t0).toFixed(0)}ms`);
        processData(memoryCache, 'memory');
      }

      // 1) Tenta carregar do IndexedDB
      const cached = await cacheUtils.load();
      if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useVendas: cache check: ${cached ? cached.length + ' items' : 'MISS'} in +${(performance.now()-_t0).toFixed(0)}ms`);
      
      if (!isMountedRef.current) return;

      if (cached && cached.length > 0) {
        processData(cached, 'indexeddb');
        
        // Background revalidation silenciosa (não bloqueia UI)
        if (!enableRealtime) {
          if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useVendas: starting background revalidation...`);
          if (!sharedFetchPromise) {
            sharedFetchPromise = getDocs(collectionGroup(db, "vendas"))
              .then((snap) => snap.docs.map((d) => ({ 
                id: d.id, 
                _unidadeOriginal: d.ref.parent.parent.id,
                ...d.data() 
              })))
              .finally(() => {
                sharedFetchPromise = null;
              });
          }
          sharedFetchPromise
            .then((data) => {
              if (isMountedRef.current) {
                processData(data, 'firebase');
              }
            })
            .catch(() => {}); // Silencioso - já temos cache
          return;
        }
      }

      // Sem cache — busca do Firebase
      if (enableRealtime) {
        if (!cached) setLoading(true);
        
        const unsub = onSnapshot(
          collectionGroup(db, "vendas"),
          { includeMetadataChanges: false },
          (snap) => {
            const data = snap.docs.map((d) => ({ 
              id: d.id, 
              _unidadeOriginal: d.ref.parent.parent.id,
              ...d.data() 
            }));
            processData(data, 'realtime');
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
        // Modo cache-first SEM cache - busca uma vez do Firebase
        if (!cached && !memoryCache?.length) setLoading(true);
        if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useVendas: NO CACHE, fetching from Firebase...`);
        if (!sharedFetchPromise) {
          sharedFetchPromise = getDocs(collectionGroup(db, "vendas"))
            .then((snap) => snap.docs.map((d) => ({ 
              id: d.id, 
              _unidadeOriginal: d.ref.parent.parent.id,
              ...d.data() 
            })))
            .finally(() => {
              sharedFetchPromise = null;
            });
        }
        sharedFetchPromise
          .then((data) => {
            processData(data, 'firebase');
          })
          .catch((err) => {
            if (isMountedRef.current) {
              setError("Falha ao carregar: " + err.message);
              setLoading(false);
            }
          });
      }
    };

    loadData();

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
    await cacheUtils.clear();
    memoryCache = null;
    memoryCacheTimestamp = 0;
    memoryDerivedCache = { produtos: [], responsaveis: [] };
    
    try {
      const snap = await getDocs(collectionGroup(db, "vendas"));
      const data = snap.docs.map((d) => ({ 
        id: d.id, 
        _unidadeOriginal: d.ref.parent.parent.id,
        ...d.data() 
      }));
      
      updateMemoryCache(data);
      setVendas(data);
      cacheUtils.save(data).catch(() => {});
      setProdutos(memoryDerivedCache.produtos);
      setResponsaveis(memoryDerivedCache.responsaveis);
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
    const totalCur = sum(cur);
    const totalPrev = sum(prev);
    setTotalCurrent(totalCur);
    setTotalPrevious(totalPrev);
    setPercentChange(totalPrev > 0 ? ((totalCur - totalPrev) / totalPrev) * 100 : 0);
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
    clearCache: async () => {
      memoryCache = null;
      memoryCacheTimestamp = 0;
      memoryDerivedCache = { produtos: [], responsaveis: [] };
      await cacheUtils.clear();
    }, // Limpar cache manualmente
  };
};
