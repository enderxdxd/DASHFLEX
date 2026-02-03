// File: src/hooks/useMetas.js
import { useState, useEffect, useCallback, useRef } from "react";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// ============ CONFIGURAÇÃO DE CACHE ============
const CACHE_PREFIX = 'dashflex_metas_';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

const cacheUtils = {
  getKey: (unidade) => `${CACHE_PREFIX}${unidade?.toLowerCase() || 'default'}`,
  save: (unidade, data) => {
    try {
      localStorage.setItem(cacheUtils.getKey(unidade), JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Limpa caches antigos de metas
        Object.keys(localStorage)
          .filter(k => k.startsWith(CACHE_PREFIX))
          .forEach(k => localStorage.removeItem(k));
      }
    }
  },
  load: (unidade) => {
    try {
      const cached = localStorage.getItem(cacheUtils.getKey(unidade));
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(cacheUtils.getKey(unidade));
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
  clear: (unidade) => localStorage.removeItem(cacheUtils.getKey(unidade))
};

export const useMetas = (unidade, options = {}) => {
  // OTIMIZAÇÃO: Realtime desabilitado por padrão para melhor performance
  const { enableRealtime = false } = options;
  
  const [metas, setMetas] = useState(() => {
    const cached = cacheUtils.load(unidade);
    return cached || [];
  });
  const [loading, setLoading] = useState(() => !cacheUtils.load(unidade));
  const [error, setError] = useState("");
  const [responsaveisOficiais, setResponsaveisOficiais] = useState([]);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);

  // Busca as metas da unidade atual
  useEffect(() => {
    if (!unidade) return;
    isMountedRef.current = true;
    
    // Tenta carregar do cache primeiro
    const cached = cacheUtils.load(unidade);
    if (cached && cached.length > 0) {
      setMetas(cached);
      setLoading(false);
      const oficiais = cached.map((m) => (m.responsavel || '').trim().toLowerCase());
      setResponsaveisOficiais(oficiais);
    }

    const processData = (metasData) => {
      if (!isMountedRef.current) return;
      
      setMetas(metasData);
      cacheUtils.save(unidade, metasData);
      
      const oficiais = metasData.map((m) => (m.responsavel || '').trim().toLowerCase());
      setResponsaveisOficiais(oficiais);
      
      setLoading(false);
      setError("");
    };

    const metasRef = collection(db, "faturamento", unidade.toLowerCase(), "metas");

    if (enableRealtime) {
      if (!cached) setLoading(true);
      
      const unsubscribeMetas = onSnapshot(
        metasRef,
        { includeMetadataChanges: false },
        (snapshot) => {
          const metasData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          processData(metasData);
        },
        (err) => {
          if (isMountedRef.current) {
            console.error("Erro ao carregar metas:", err);
            setError("Falha ao carregar metas.");
            setLoading(false);
          }
        }
      );
      unsubscribeRef.current = unsubscribeMetas;
    } else {
      // Modo cache-first
      if (!cached) {
        setLoading(true);
        getDocs(metasRef)
          .then((snapshot) => {
            const metasData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            processData(metasData);
          })
          .catch((err) => {
            if (isMountedRef.current) {
              console.error("Erro ao carregar metas:", err);
              setError("Falha ao carregar metas.");
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

  // Função para forçar refresh
  const refreshMetas = useCallback(async () => {
    if (!unidade) return;
    setLoading(true);
    cacheUtils.clear(unidade);
    
    try {
      const metasRef = collection(db, "faturamento", unidade.toLowerCase(), "metas");
      const snapshot = await getDocs(metasRef);
      const metasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setMetas(metasData);
      cacheUtils.save(unidade, metasData);
      
      const oficiais = metasData.map((m) => (m.responsavel || '').trim().toLowerCase());
      setResponsaveisOficiais(oficiais);
      setError("");
    } catch (err) {
      console.error("Erro ao atualizar metas:", err);
      setError("Falha ao atualizar metas.");
    } finally {
      setLoading(false);
    }
  }, [unidade]);

  return {
    metas,
    loading,
    error,
    responsaveisOficiais,
    refreshMetas,
    clearCache: () => cacheUtils.clear(unidade)
  };
};


