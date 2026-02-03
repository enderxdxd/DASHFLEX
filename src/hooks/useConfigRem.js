// src/hooks/useConfigRem.js
import { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// ============ CONFIGURAÇÃO DE CACHE ============
const CACHE_PREFIX = 'dashflex_configrem_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

const cacheUtils = {
  getKey: (unidade, month) => `${CACHE_PREFIX}${unidade?.toLowerCase()}_${month}`,
  
  save: (unidade, month, data) => {
    try {
      localStorage.setItem(cacheUtils.getKey(unidade, month), JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Limpa caches antigos
        Object.keys(localStorage)
          .filter(k => k.startsWith(CACHE_PREFIX))
          .forEach(k => localStorage.removeItem(k));
      }
    }
  },
  
  load: (unidade, month) => {
    try {
      const cached = localStorage.getItem(cacheUtils.getKey(unidade, month));
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(cacheUtils.getKey(unidade, month));
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
  
  clear: (unidade, month) => {
    if (unidade && month) {
      localStorage.removeItem(cacheUtils.getKey(unidade, month));
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    }
  }
};

const DEFAULT_CONFIG = {
  metaUnidade: 0,
  premiacao: [],
  premiacaoSupervisor: [],
  comissaoPlanos: []
};

export function useConfigRem(unidade, month, options = {}) {
  const { enableRealtime = false } = options;
  
  const [configRem, setConfigRem] = useState(() => {
    // Inicializa com cache se disponível
    const cached = cacheUtils.load(unidade, month);
    return cached || DEFAULT_CONFIG;
  });
  const [loading, setLoading] = useState(() => !cacheUtils.load(unidade, month));
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);
  const unsubscribeSecondaryRef = useRef(null);

  const parseConfigData = (data) => ({
    metaUnidade: data.metaUnidade || 0,
    premiacao: Array.isArray(data.premiacao) ? data.premiacao : [],
    premiacaoSupervisor: Array.isArray(data.premiacaoSupervisor) ? data.premiacaoSupervisor : [],
    comissaoPlanos: Array.isArray(data.comissaoPlanos) ? data.comissaoPlanos : []
  });

  const fetchConfig = useCallback(async (skipCache = false) => {
    if (!unidade || !month) {
      setLoading(false);
      return;
    }

    // Tenta carregar do cache primeiro
    if (!skipCache) {
      const cached = cacheUtils.load(unidade, month);
      if (cached) {
        if (isMountedRef.current) {
          setConfigRem(cached);
          setLoading(false);
        }
        return;
      }
    }

    setLoading(true);

    try {
      const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${month}`);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = parseConfigData(snap.data());
        cacheUtils.save(unidade, month, data);
        if (isMountedRef.current) {
          setConfigRem(data);
          setLoading(false);
        }
      } else {
        // Tenta mês anterior
        const mesAnterior = month.split('-')[1] === '01' 
          ? `${parseInt(month.split('-')[0]) - 1}-12`
          : `${month.split('-')[0]}-${String(parseInt(month.split('-')[1]) - 1).padStart(2, '0')}`;
        
        const refAnterior = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${mesAnterior}`);
        const snapAnterior = await getDoc(refAnterior);

        if (snapAnterior.exists()) {
          const data = parseConfigData(snapAnterior.data());
          cacheUtils.save(unidade, month, data);
          if (isMountedRef.current) {
            setConfigRem(data);
          }
        } else {
          if (isMountedRef.current) {
            setConfigRem(DEFAULT_CONFIG);
          }
        }
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configRem:', err);
      if (isMountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [unidade, month]);

  useEffect(() => {
    if (!unidade || !month) {
      setLoading(false);
      return;
    }

    isMountedRef.current = true;

    // Tenta carregar do cache primeiro
    const cached = cacheUtils.load(unidade, month);
    if (cached) {
      setConfigRem(cached);
      setLoading(false);
      
      // Se não é realtime, não precisa buscar do Firebase
      if (!enableRealtime) {
        return;
      }
    }

    if (enableRealtime) {
      // Modo realtime - usa onSnapshot
      if (!cached) setLoading(true);

      const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${month}`);

      const unsub = onSnapshot(
        ref,
        snap => {
          if (snap.exists()) {
            const data = parseConfigData(snap.data());
            cacheUtils.save(unidade, month, data);
            if (isMountedRef.current) {
              setConfigRem(data);
              setLoading(false);
            }
          } else {
            // Tenta mês anterior
            const mesAnterior = month.split('-')[1] === '01' 
              ? `${parseInt(month.split('-')[0]) - 1}-12`
              : `${month.split('-')[0]}-${String(parseInt(month.split('-')[1]) - 1).padStart(2, '0')}`;
            
            const refAnterior = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${mesAnterior}`);

            unsubscribeSecondaryRef.current = onSnapshot(
              refAnterior,
              snapAnterior => {
                if (snapAnterior.exists()) {
                  const data = parseConfigData(snapAnterior.data());
                  cacheUtils.save(unidade, month, data);
                  if (isMountedRef.current) {
                    setConfigRem(data);
                  }
                } else {
                  if (isMountedRef.current) {
                    setConfigRem(DEFAULT_CONFIG);
                  }
                }
                if (isMountedRef.current) {
                  setLoading(false);
                }
              },
              err => {
                console.error(err);
                if (isMountedRef.current) {
                  setError(err.message);
                  setLoading(false);
                }
              }
            );
          }
        },
        err => {
          console.error(err);
          if (isMountedRef.current) {
            setError(err.message);
            setLoading(false);
          }
        }
      );
      unsubscribeRef.current = unsub;
    } else {
      // Modo cache-first - busca uma vez
      if (!cached) {
        fetchConfig();
      }
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (unsubscribeSecondaryRef.current) {
        unsubscribeSecondaryRef.current();
      }
    };
  }, [unidade, month, enableRealtime, fetchConfig]);

  // Função para forçar refresh
  const refreshConfig = useCallback(async () => {
    cacheUtils.clear(unidade, month);
    await fetchConfig(true);
  }, [unidade, month, fetchConfig]);

  return { 
    configRem, 
    loading, 
    error,
    refreshConfig,
    clearCache: () => cacheUtils.clear(unidade, month)
  };
}
