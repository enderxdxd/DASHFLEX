// src/contexts/DataContext.jsx
// Sistema centralizado de dados com cache inteligente
// Reduz drasticamente chamadas ao Firebase e melhora performance

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  collection,
  collectionGroup,
  getDocs,
  onSnapshot,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

// ============ CONFIGURAÇÕES DE CACHE ============
const CACHE_CONFIG = {
  VENDAS_TTL: 15 * 60 * 1000,      // 15 minutos
  METAS_TTL: 15 * 60 * 1000,       // 15 minutos
  DESCONTOS_TTL: 10 * 60 * 1000,   // 10 minutos
  CONFIG_REM_TTL: 30 * 60 * 1000,  // 30 minutos
  STALE_WHILE_REVALIDATE: true,   // Mostra dados antigos enquanto atualiza
  BACKGROUND_REFRESH: true,        // Atualiza em background após TTL
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// ============ INDEXEDDB PARA DADOS GRANDES ============
const DB_NAME = 'dashflex_cache';
const DB_VERSION = 1;
const STORES = {
  VENDAS: 'vendas',
  METAS: 'metas',
  DESCONTOS: 'descontos',
  CONFIG: 'config'
};

class IndexedDBCache {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.readyPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('IndexedDB não disponível, usando localStorage');
        this.isReady = false;
        resolve(false);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('Erro ao abrir IndexedDB:', request.error);
        this.isReady = false;
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'key' });
          }
        });
      };
    });
  }

  async save(storeName, key, data) {
    await this.readyPromise;
    
    if (!this.isReady || !this.db) {
      // Fallback para localStorage
      try {
        const compactData = this.compactData(data);
        localStorage.setItem(`idb_${storeName}_${key}`, JSON.stringify({
          data: compactData,
          timestamp: Date.now()
        }));
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          this.clearOldLocalStorage();
        }
      }
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        store.put({
          key,
          data,
          timestamp: Date.now()
        });

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  async load(storeName, key) {
    await this.readyPromise;
    
    if (!this.isReady || !this.db) {
      // Fallback para localStorage
      try {
        const item = localStorage.getItem(`idb_${storeName}_${key}`);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async clear(storeName) {
    await this.readyPromise;
    
    if (!this.isReady || !this.db) {
      Object.keys(localStorage)
        .filter(k => k.startsWith(`idb_${storeName}`))
        .forEach(k => localStorage.removeItem(k));
      return;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  compactData(data) {
    if (!Array.isArray(data)) return data;
    // Remove campos desnecessários para cache
    return data.map(item => {
      const { _originalValues, ...rest } = item;
      return rest;
    });
  }

  clearOldLocalStorage() {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith('idb_') || k.startsWith('dashflex_'));
    
    // Remove metade dos itens mais antigos
    keys.slice(0, Math.floor(keys.length / 2))
      .forEach(k => localStorage.removeItem(k));
  }
}

// Instância singleton do cache
const idbCache = new IndexedDBCache();

// ============ CONTEXTO PRINCIPAL ============
const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  // Estados principais
  const [vendas, setVendas] = useState([]);
  const [metas, setMetas] = useState({});
  const [descontos, setDescontos] = useState([]);
  const [configRem, setConfigRem] = useState({});
  
  // Estados de loading
  const [loadingStates, setLoadingStates] = useState({
    vendas: true,
    metas: {},
    descontos: true,
    configRem: {}
  });
  
  // Estados de erro
  const [errors, setErrors] = useState({});
  
  // Metadados de cache
  const [cacheInfo, setCacheInfo] = useState({
    vendas: { lastFetch: null, isStale: false, fromCache: false },
    metas: {},
    descontos: { lastFetch: null, isStale: false, fromCache: false },
    configRem: {}
  });

  // Refs para controle
  const unsubscribersRef = useRef({});
  const fetchingRef = useRef({});
  const mountedRef = useRef(true);

  // ============ FUNÇÕES DE FETCH OTIMIZADAS ============

  // Fetch de vendas com cache inteligente
  const fetchVendas = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'all_vendas';
    
    // Evita múltiplas requisições simultâneas
    if (fetchingRef.current.vendas && !forceRefresh) {
      return;
    }
    
    fetchingRef.current.vendas = true;

    // Tenta carregar do cache primeiro
    if (!forceRefresh) {
      const cached = await idbCache.load(STORES.VENDAS, cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.VENDAS_TTL) {
        if (mountedRef.current) {
          setVendas(cached.data);
          setLoadingStates(prev => ({ ...prev, vendas: false }));
          setCacheInfo(prev => ({
            ...prev,
            vendas: { lastFetch: new Date(cached.timestamp), isStale: false, fromCache: true }
          }));
        }
        fetchingRef.current.vendas = false;
        return;
      }
      
      // Stale-while-revalidate: mostra dados antigos enquanto busca novos
      if (cached && CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
        if (mountedRef.current) {
          setVendas(cached.data);
          setLoadingStates(prev => ({ ...prev, vendas: false }));
          setCacheInfo(prev => ({
            ...prev,
            vendas: { lastFetch: new Date(cached.timestamp), isStale: true, fromCache: true }
          }));
        }
      }
    }

    try {
      if (mountedRef.current && !vendas.length) {
        setLoadingStates(prev => ({ ...prev, vendas: true }));
      }

      const snapshot = await getDocs(collectionGroup(db, 'vendas'));
      
      const data = snapshot.docs.map(d => ({
        id: d.id,
        _unidadeOriginal: d.ref.parent.parent.id,
        ...d.data()
      }));

      // Salva no cache
      await idbCache.save(STORES.VENDAS, cacheKey, data);

      if (mountedRef.current) {
        setVendas(data);
        setLoadingStates(prev => ({ ...prev, vendas: false }));
        setCacheInfo(prev => ({
          ...prev,
          vendas: { lastFetch: new Date(), isStale: false, fromCache: false }
        }));
        setErrors(prev => ({ ...prev, vendas: null }));
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      if (mountedRef.current) {
        setErrors(prev => ({ ...prev, vendas: error.message }));
        setLoadingStates(prev => ({ ...prev, vendas: false }));
      }
    } finally {
      fetchingRef.current.vendas = false;
    }
  }, [vendas.length]);

  // Fetch de metas por unidade
  const fetchMetas = useCallback(async (unidade, forceRefresh = false) => {
    if (!unidade) return;
    
    const unidadeLower = unidade.toLowerCase();
    const cacheKey = `metas_${unidadeLower}`;
    
    if (fetchingRef.current[cacheKey] && !forceRefresh) {
      return;
    }
    
    fetchingRef.current[cacheKey] = true;

    // Cache check
    if (!forceRefresh) {
      const cached = await idbCache.load(STORES.METAS, cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.METAS_TTL) {
        if (mountedRef.current) {
          setMetas(prev => ({ ...prev, [unidadeLower]: cached.data }));
          setLoadingStates(prev => ({
            ...prev,
            metas: { ...prev.metas, [unidadeLower]: false }
          }));
          setCacheInfo(prev => ({
            ...prev,
            metas: { ...prev.metas, [unidadeLower]: { lastFetch: new Date(cached.timestamp), fromCache: true } }
          }));
        }
        fetchingRef.current[cacheKey] = false;
        return;
      }
      
      // Stale-while-revalidate
      if (cached && CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
        if (mountedRef.current) {
          setMetas(prev => ({ ...prev, [unidadeLower]: cached.data }));
          setLoadingStates(prev => ({
            ...prev,
            metas: { ...prev.metas, [unidadeLower]: false }
          }));
        }
      }
    }

    try {
      if (mountedRef.current && !metas[unidadeLower]?.length) {
        setLoadingStates(prev => ({
          ...prev,
          metas: { ...prev.metas, [unidadeLower]: true }
        }));
      }

      const metasRef = collection(db, 'faturamento', unidadeLower, 'metas');
      const snapshot = await getDocs(metasRef);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      await idbCache.save(STORES.METAS, cacheKey, data);

      if (mountedRef.current) {
        setMetas(prev => ({ ...prev, [unidadeLower]: data }));
        setLoadingStates(prev => ({
          ...prev,
          metas: { ...prev.metas, [unidadeLower]: false }
        }));
        setCacheInfo(prev => ({
          ...prev,
          metas: { ...prev.metas, [unidadeLower]: { lastFetch: new Date(), fromCache: false } }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      if (mountedRef.current) {
        setErrors(prev => ({ ...prev, [`metas_${unidadeLower}`]: error.message }));
        setLoadingStates(prev => ({
          ...prev,
          metas: { ...prev.metas, [unidadeLower]: false }
        }));
      }
    } finally {
      fetchingRef.current[cacheKey] = false;
    }
  }, [metas]);

  // Fetch de descontos
  const fetchDescontos = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'all_descontos';
    
    if (fetchingRef.current.descontos && !forceRefresh) {
      return;
    }
    
    fetchingRef.current.descontos = true;

    if (!forceRefresh) {
      const cached = await idbCache.load(STORES.DESCONTOS, cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.DESCONTOS_TTL) {
        if (mountedRef.current) {
          setDescontos(cached.data);
          setLoadingStates(prev => ({ ...prev, descontos: false }));
          setCacheInfo(prev => ({
            ...prev,
            descontos: { lastFetch: new Date(cached.timestamp), fromCache: true }
          }));
        }
        fetchingRef.current.descontos = false;
        return;
      }
      
      if (cached && CACHE_CONFIG.STALE_WHILE_REVALIDATE) {
        if (mountedRef.current) {
          setDescontos(cached.data);
          setLoadingStates(prev => ({ ...prev, descontos: false }));
        }
      }
    }

    try {
      if (mountedRef.current && !descontos.length) {
        setLoadingStates(prev => ({ ...prev, descontos: true }));
      }

      const snapshot = await getDocs(collectionGroup(db, 'descontos'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      await idbCache.save(STORES.DESCONTOS, cacheKey, data);

      if (mountedRef.current) {
        setDescontos(data);
        setLoadingStates(prev => ({ ...prev, descontos: false }));
        setCacheInfo(prev => ({
          ...prev,
          descontos: { lastFetch: new Date(), fromCache: false }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar descontos:', error);
      if (mountedRef.current) {
        setErrors(prev => ({ ...prev, descontos: error.message }));
        setLoadingStates(prev => ({ ...prev, descontos: false }));
      }
    } finally {
      fetchingRef.current.descontos = false;
    }
  }, [descontos.length]);

  // Fetch de configuração de remuneração
  const fetchConfigRem = useCallback(async (unidade, month, forceRefresh = false) => {
    if (!unidade || !month) return;
    
    const unidadeLower = unidade.toLowerCase();
    const cacheKey = `config_${unidadeLower}_${month}`;
    
    if (fetchingRef.current[cacheKey] && !forceRefresh) {
      return;
    }
    
    fetchingRef.current[cacheKey] = true;

    if (!forceRefresh) {
      const cached = await idbCache.load(STORES.CONFIG, cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.CONFIG_REM_TTL) {
        if (mountedRef.current) {
          setConfigRem(prev => ({ ...prev, [cacheKey]: cached.data }));
          setLoadingStates(prev => ({
            ...prev,
            configRem: { ...prev.configRem, [cacheKey]: false }
          }));
        }
        fetchingRef.current[cacheKey] = false;
        return;
      }
    }

    try {
      if (mountedRef.current) {
        setLoadingStates(prev => ({
          ...prev,
          configRem: { ...prev.configRem, [cacheKey]: true }
        }));
      }

      const ref = doc(db, 'faturamento', unidadeLower, 'configRemuneracao', `premiacao-${month}`);
      const snapshot = await getDocs(collection(ref.parent));
      
      let data = {
        metaUnidade: 0,
        premiacao: [],
        premiacaoSupervisor: [],
        comissaoPlanos: []
      };

      const docSnap = snapshot.docs.find(d => d.id === `premiacao-${month}`);
      if (docSnap) {
        const docData = docSnap.data();
        data = {
          metaUnidade: docData.metaUnidade || 0,
          premiacao: Array.isArray(docData.premiacao) ? docData.premiacao : [],
          premiacaoSupervisor: Array.isArray(docData.premiacaoSupervisor) ? docData.premiacaoSupervisor : [],
          comissaoPlanos: Array.isArray(docData.comissaoPlanos) ? docData.comissaoPlanos : []
        };
      }

      await idbCache.save(STORES.CONFIG, cacheKey, data);

      if (mountedRef.current) {
        setConfigRem(prev => ({ ...prev, [cacheKey]: data }));
        setLoadingStates(prev => ({
          ...prev,
          configRem: { ...prev.configRem, [cacheKey]: false }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar configRem:', error);
      if (mountedRef.current) {
        setErrors(prev => ({ ...prev, [cacheKey]: error.message }));
        setLoadingStates(prev => ({
          ...prev,
          configRem: { ...prev.configRem, [cacheKey]: false }
        }));
      }
    } finally {
      fetchingRef.current[cacheKey] = false;
    }
  }, []);

  // ============ FUNÇÕES DE REFRESH ============
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchVendas(true),
      fetchDescontos(true)
    ]);
  }, [fetchVendas, fetchDescontos]);

  const clearAllCache = useCallback(async () => {
    await Promise.all([
      idbCache.clear(STORES.VENDAS),
      idbCache.clear(STORES.METAS),
      idbCache.clear(STORES.DESCONTOS),
      idbCache.clear(STORES.CONFIG)
    ]);
    
    // Limpa localStorage também
    Object.keys(localStorage)
      .filter(k => k.startsWith('dashflex_') || k.startsWith('idb_'))
      .forEach(k => localStorage.removeItem(k));
  }, []);

  // ============ EFEITOS ============
  useEffect(() => {
    mountedRef.current = true;
    
    // Carrega vendas e descontos inicialmente
    fetchVendas();
    fetchDescontos();

    return () => {
      mountedRef.current = false;
      // Limpa todos os listeners
      Object.values(unsubscribersRef.current).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [fetchVendas, fetchDescontos]);

  // Background refresh quando dados ficam stale
  useEffect(() => {
    if (!CACHE_CONFIG.BACKGROUND_REFRESH) return;

    const interval = setInterval(() => {
      if (cacheInfo.vendas.isStale) {
        fetchVendas(true);
      }
      if (cacheInfo.descontos.isStale) {
        fetchDescontos(true);
      }
    }, 60000); // Verifica a cada minuto

    return () => clearInterval(interval);
  }, [cacheInfo, fetchVendas, fetchDescontos]);

  // ============ GETTERS OTIMIZADOS ============
  const getMetasForUnidade = useCallback((unidade) => {
    if (!unidade) return [];
    const unidadeLower = unidade.toLowerCase();
    
    // Se não tem dados, dispara fetch
    if (!metas[unidadeLower]) {
      fetchMetas(unidade);
      return [];
    }
    
    return metas[unidadeLower];
  }, [metas, fetchMetas]);

  const getConfigRemForUnidade = useCallback((unidade, month) => {
    if (!unidade || !month) return null;
    
    const cacheKey = `config_${unidade.toLowerCase()}_${month}`;
    
    if (!configRem[cacheKey]) {
      fetchConfigRem(unidade, month);
      return null;
    }
    
    return configRem[cacheKey];
  }, [configRem, fetchConfigRem]);

  // ============ VALOR DO CONTEXTO ============
  const contextValue = useMemo(() => ({
    // Dados
    vendas,
    metas,
    descontos,
    configRem,
    
    // Loading states
    loadingStates,
    isLoading: loadingStates.vendas || loadingStates.descontos,
    
    // Errors
    errors,
    
    // Cache info
    cacheInfo,
    
    // Getters
    getMetasForUnidade,
    getConfigRemForUnidade,
    
    // Actions
    fetchVendas,
    fetchMetas,
    fetchDescontos,
    fetchConfigRem,
    refreshAll,
    clearAllCache,
    
    // Refresh específicos
    refreshVendas: () => fetchVendas(true),
    refreshMetas: (unidade) => fetchMetas(unidade, true),
    refreshDescontos: () => fetchDescontos(true),
    refreshConfigRem: (unidade, month) => fetchConfigRem(unidade, month, true)
  }), [
    vendas,
    metas,
    descontos,
    configRem,
    loadingStates,
    errors,
    cacheInfo,
    getMetasForUnidade,
    getConfigRemForUnidade,
    fetchVendas,
    fetchMetas,
    fetchDescontos,
    fetchConfigRem,
    refreshAll,
    clearAllCache
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// ============ HOOK PARA USAR O CONTEXTO ============
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de um DataProvider');
  }
  return context;
};

// ============ HOOKS ESPECÍFICOS PARA COMPATIBILIDADE ============
export const useVendasFromContext = (unidade) => {
  const { vendas, loadingStates, errors, refreshVendas, cacheInfo } = useData();
  
  const vendasFiltradas = useMemo(() => {
    if (!unidade || !vendas.length) return [];
    return vendas; // Retorna todas, filtro é feito no componente
  }, [vendas, unidade]);
  
  return {
    vendas: vendasFiltradas,
    loading: loadingStates.vendas,
    error: errors.vendas,
    refresh: refreshVendas,
    cacheInfo: cacheInfo.vendas
  };
};

export const useMetasFromContext = (unidade) => {
  const { getMetasForUnidade, loadingStates, errors, refreshMetas, cacheInfo } = useData();
  
  const metasData = useMemo(() => {
    return getMetasForUnidade(unidade);
  }, [getMetasForUnidade, unidade]);
  
  const unidadeLower = unidade?.toLowerCase();
  
  return {
    metas: metasData,
    loading: loadingStates.metas[unidadeLower] ?? true,
    error: errors[`metas_${unidadeLower}`],
    refresh: () => refreshMetas(unidade),
    cacheInfo: cacheInfo.metas[unidadeLower]
  };
};

export const useDescontosFromContext = () => {
  const { descontos, loadingStates, errors, refreshDescontos, cacheInfo } = useData();
  
  return {
    descontos,
    loading: loadingStates.descontos,
    error: errors.descontos,
    refresh: refreshDescontos,
    cacheInfo: cacheInfo.descontos
  };
};

export const useConfigRemFromContext = (unidade, month) => {
  const { getConfigRemForUnidade, loadingStates, errors, refreshConfigRem, cacheInfo } = useData();
  
  const configData = useMemo(() => {
    return getConfigRemForUnidade(unidade, month);
  }, [getConfigRemForUnidade, unidade, month]);
  
  const cacheKey = `config_${unidade?.toLowerCase()}_${month}`;
  
  return {
    configRem: configData || {
      metaUnidade: 0,
      premiacao: [],
      premiacaoSupervisor: [],
      comissaoPlanos: []
    },
    loading: loadingStates.configRem[cacheKey] ?? true,
    error: errors[cacheKey],
    refresh: () => refreshConfigRem(unidade, month)
  };
};

export default DataContext;
