// src/hooks/useDataCache.js
// Sistema centralizado de cache para dados do Firebase
// Reduz leituras desnecessárias e melhora performance

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  collectionGroup,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

// ============ CONFIGURAÇÕES DE CACHE ============
const CACHE_CONFIG = {
  VENDAS_TTL: 5 * 60 * 1000,      // 5 minutos
  METAS_TTL: 10 * 60 * 1000,      // 10 minutos
  DESCONTOS_TTL: 5 * 60 * 1000,   // 5 minutos
  CONFIG_TTL: 30 * 60 * 1000,     // 30 minutos
  MAX_CACHE_SIZE: 50 * 1024 * 1024 // 50MB limite
};

// ============ UTILITÁRIOS DE CACHE ============
const cacheUtils = {
  // Gera chave única para o cache
  generateKey: (type, params) => {
    return `dashflex_${type}_${JSON.stringify(params)}`;
  },

  // Verifica se o cache é válido
  isValid: (cacheEntry, ttl) => {
    if (!cacheEntry) return false;
    const age = Date.now() - cacheEntry.timestamp;
    return age < ttl;
  },

  // Salva no localStorage com compressão básica
  save: (key, data) => {
    try {
      const entry = {
        data,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(key, JSON.stringify(entry));
      return true;
    } catch (e) {
      // Se localStorage estiver cheio, limpa caches antigos
      if (e.name === 'QuotaExceededError') {
        cacheUtils.clearOldCaches();
        try {
          localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), version: '1.0' }));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  },

  // Carrega do localStorage
  load: (key) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item);
    } catch {
      return null;
    }
  },

  // Limpa caches antigos
  clearOldCaches: () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('dashflex_'));
    const entries = keys.map(k => ({
      key: k,
      timestamp: cacheUtils.load(k)?.timestamp || 0
    }));
    
    // Ordena por timestamp e remove os mais antigos
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = entries.slice(0, Math.floor(entries.length / 2));
    toRemove.forEach(e => localStorage.removeItem(e.key));
  },

  // Limpa todo o cache do app
  clearAll: () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('dashflex_'));
    keys.forEach(k => localStorage.removeItem(k));
  }
};

// ============ HOOK PRINCIPAL DE CACHE ============
export const useDataCache = () => {
  const [cacheStats, setCacheStats] = useState({
    hits: 0,
    misses: 0,
    lastUpdate: null
  });

  const updateStats = useCallback((hit) => {
    setCacheStats(prev => ({
      ...prev,
      hits: hit ? prev.hits + 1 : prev.hits,
      misses: hit ? prev.misses : prev.misses + 1,
      lastUpdate: new Date().toISOString()
    }));
  }, []);

  return {
    cacheStats,
    updateStats,
    clearCache: cacheUtils.clearAll,
    isValid: cacheUtils.isValid,
    save: cacheUtils.save,
    load: cacheUtils.load,
    generateKey: cacheUtils.generateKey
  };
};

// ============ HOOK OTIMIZADO DE VENDAS ============
export const useCachedVendas = (unidade, options = {}) => {
  const {
    enableRealtime = false,  // Desabilitado por padrão para economizar leituras
    forceRefresh = false,
    selectedMonth = null
  } = options;

  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const unsubscribeRef = useRef(null);
  const isMountedRef = useRef(true);

  // Função para buscar dados
  const fetchVendas = useCallback(async (skipCache = false) => {
    if (!unidade) {
      setVendas([]);
      setLoading(false);
      return;
    }

    const cacheKey = cacheUtils.generateKey('vendas', { unidade: unidade.toLowerCase() });
    
    // Tenta carregar do cache primeiro
    if (!skipCache && !forceRefresh) {
      const cached = cacheUtils.load(cacheKey);
      if (cacheUtils.isValid(cached, CACHE_CONFIG.VENDAS_TTL)) {
        if (isMountedRef.current) {
          setVendas(cached.data);
          setLoading(false);
          setLastFetch(new Date(cached.timestamp));
        }
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Busca todas as vendas via collectionGroup
      const snapshot = await getDocs(collectionGroup(db, 'vendas'));
      
      const data = snapshot.docs.map(d => ({
        id: d.id,
        _unidadeOriginal: d.ref.parent.parent.id,
        ...d.data()
      }));

      // Salva no cache
      cacheUtils.save(cacheKey, data);

      if (isMountedRef.current) {
        setVendas(data);
        setLoading(false);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error('Erro ao buscar vendas:', err);
      if (isMountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [unidade, forceRefresh]);

  // Efeito principal
  useEffect(() => {
    isMountedRef.current = true;

    if (enableRealtime) {
      // Modo realtime - usa onSnapshot mas com throttling
      const unsub = onSnapshot(
        collectionGroup(db, 'vendas'),
        { includeMetadataChanges: false },
        (snap) => {
          const data = snap.docs.map(d => ({
            id: d.id,
            _unidadeOriginal: d.ref.parent.parent.id,
            ...d.data()
          }));
          
          if (isMountedRef.current) {
            setVendas(data);
            setLoading(false);
            
            // Atualiza cache em background
            const cacheKey = cacheUtils.generateKey('vendas', { unidade: unidade?.toLowerCase() });
            cacheUtils.save(cacheKey, data);
          }
        },
        (err) => {
          if (isMountedRef.current) {
            setError(err.message);
            setLoading(false);
          }
        }
      );
      unsubscribeRef.current = unsub;
    } else {
      // Modo cache - busca uma vez e usa cache
      fetchVendas();
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [unidade, enableRealtime, fetchVendas]);

  // Função para forçar refresh
  const refresh = useCallback(() => {
    fetchVendas(true);
  }, [fetchVendas]);

  return {
    vendas,
    loading,
    error,
    lastFetch,
    refresh
  };
};

// ============ HOOK OTIMIZADO DE METAS ============
export const useCachedMetas = (unidade, options = {}) => {
  const { enableRealtime = false, forceRefresh = false } = options;

  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchMetas = useCallback(async (skipCache = false) => {
    if (!unidade) {
      setMetas([]);
      setLoading(false);
      return;
    }

    const cacheKey = cacheUtils.generateKey('metas', { unidade: unidade.toLowerCase() });

    if (!skipCache && !forceRefresh) {
      const cached = cacheUtils.load(cacheKey);
      if (cacheUtils.isValid(cached, CACHE_CONFIG.METAS_TTL)) {
        if (isMountedRef.current) {
          setMetas(cached.data);
          setLoading(false);
        }
        return;
      }
    }

    setLoading(true);

    try {
      const metasRef = collection(db, 'faturamento', unidade.toLowerCase(), 'metas');
      const snapshot = await getDocs(metasRef);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      cacheUtils.save(cacheKey, data);

      if (isMountedRef.current) {
        setMetas(data);
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [unidade, forceRefresh]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enableRealtime) {
      if (!unidade) return;
      
      const metasRef = collection(db, 'faturamento', unidade.toLowerCase(), 'metas');
      const unsub = onSnapshot(
        metasRef,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          if (isMountedRef.current) {
            setMetas(data);
            setLoading(false);
            
            const cacheKey = cacheUtils.generateKey('metas', { unidade: unidade.toLowerCase() });
            cacheUtils.save(cacheKey, data);
          }
        },
        (err) => {
          if (isMountedRef.current) {
            setError(err.message);
            setLoading(false);
          }
        }
      );
      unsubscribeRef.current = unsub;
    } else {
      fetchMetas();
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [unidade, enableRealtime, fetchMetas]);

  const refresh = useCallback(() => {
    fetchMetas(true);
  }, [fetchMetas]);

  return {
    metas,
    loading,
    error,
    refresh,
    responsaveisOficiais: metas.map(m => (m.responsavel || '').trim().toLowerCase())
  };
};

// ============ HOOK OTIMIZADO DE DESCONTOS ============
export const useCachedDescontos = (unidade, selectedMonth, options = {}) => {
  const { enableRealtime = false, forceRefresh = false } = options;

  const [descontos, setDescontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchDescontos = useCallback(async (skipCache = false) => {
    if (!unidade) {
      setDescontos([]);
      setLoading(false);
      return;
    }

    const cacheKey = cacheUtils.generateKey('descontos', { 
      unidade: unidade.toLowerCase(),
      month: selectedMonth 
    });

    if (!skipCache && !forceRefresh) {
      const cached = cacheUtils.load(cacheKey);
      if (cacheUtils.isValid(cached, CACHE_CONFIG.DESCONTOS_TTL)) {
        if (isMountedRef.current) {
          setDescontos(cached.data);
          setLoading(false);
        }
        return;
      }
    }

    setLoading(true);

    try {
      const snapshot = await getDocs(collectionGroup(db, 'descontos'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      cacheUtils.save(cacheKey, data);

      if (isMountedRef.current) {
        setDescontos(data);
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [unidade, selectedMonth, forceRefresh]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enableRealtime) {
      const unsub = onSnapshot(
        collectionGroup(db, 'descontos'),
        (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          
          if (isMountedRef.current) {
            setDescontos(data);
            setLoading(false);
          }
        },
        (err) => {
          if (isMountedRef.current) {
            setError(err.message);
            setLoading(false);
          }
        }
      );
      unsubscribeRef.current = unsub;
    } else {
      fetchDescontos();
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [unidade, selectedMonth, enableRealtime, fetchDescontos]);

  const refresh = useCallback(() => {
    fetchDescontos(true);
  }, [fetchDescontos]);

  return {
    descontos,
    loading,
    error,
    refresh
  };
};

// ============ CONTEXTO GLOBAL DE DADOS ============
// Para compartilhar dados entre componentes sem re-fetch

import { createContext, useContext } from 'react';

const DataCacheContext = createContext(null);

export const DataCacheProvider = ({ children, unidade }) => {
  const vendasData = useCachedVendas(unidade, { enableRealtime: false });
  const metasData = useCachedMetas(unidade, { enableRealtime: false });
  
  const refreshAll = useCallback(() => {
    vendasData.refresh();
    metasData.refresh();
  }, [vendasData, metasData]);

  const value = {
    vendas: vendasData.vendas,
    metas: metasData.metas,
    loading: vendasData.loading || metasData.loading,
    error: vendasData.error || metasData.error,
    refreshAll,
    refreshVendas: vendasData.refresh,
    refreshMetas: metasData.refresh,
    lastFetch: vendasData.lastFetch
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};

export const useGlobalData = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useGlobalData must be used within DataCacheProvider');
  }
  return context;
};

// ============ UTILITÁRIOS DE PERFORMANCE ============
export const performanceUtils = {
  // Debounce para filtros
  debounce: (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  // Throttle para scroll/resize
  throttle: (func, limit) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoização simples
  memoize: (fn) => {
    const cache = new Map();
    return (...args) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = fn(...args);
      cache.set(key, result);
      return result;
    };
  }
};

export default {
  useDataCache,
  useCachedVendas,
  useCachedMetas,
  useCachedDescontos,
  DataCacheProvider,
  useGlobalData,
  cacheUtils,
  performanceUtils,
  CACHE_CONFIG
};
