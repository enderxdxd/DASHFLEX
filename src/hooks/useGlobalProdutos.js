// src/hooks/useGlobalProdutos.js
import { useState, useEffect, useCallback, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "./useUserData";

// ============ CONFIGURAÇÃO DE CACHE ============
const CACHE_KEY = 'dashflex_global_produtos';
const CACHE_TTL = 60 * 60 * 1000; // 1 hora (produtos mudam raramente)

const cacheUtils = {
  save: (data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignora erros de quota
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

export function useGlobalProdutos(options = {}) {
  const { enableRealtime = false } = options;
  
  // ✅ Usa cache singleton — elimina onAuthStateChanged + getIdTokenResult(true) redundante
  const { userData, role } = useUserData();
  const isAdmin = role === 'admin';
  const userEmail = userData?.email || null;
  
  // Inicializa com cache
  const [produtosSelecionados, setProdutosSelecionados] = useState(() => {
    const cached = cacheUtils.load();
    return cached || [];
  });
  const [loaded, setLoaded] = useState(() => !!cacheUtils.load());
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);

  // Carrega configuração global de produtos
  useEffect(() => {
    isMountedRef.current = true;
    const _t0 = performance.now();
    const configRef = doc(db, "configuracoes", "global", "filtros", "produtos");
    
    // Tenta carregar do cache primeiro
    const cached = cacheUtils.load();
    if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useGlobalProdutos: cache check: ${cached ? 'HIT' : 'MISS'} in +${(performance.now()-_t0).toFixed(0)}ms`);
    if (cached) {
      setProdutosSelecionados(cached);
      setLoaded(true);
      
      // Se não é realtime, não precisa buscar do Firebase
      if (!enableRealtime) {
        if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useGlobalProdutos: using cache, done in +${(performance.now()-_t0).toFixed(0)}ms`);
        return;
      }
    }

    const processData = (data) => {
      if (!isMountedRef.current) return;
      
      const produtos = data?.selecionados || [];
      setProdutosSelecionados(produtos);
      cacheUtils.save(produtos);
      setLoaded(true);
    };

    if (enableRealtime) {
      // Modo realtime
      const unsub = onSnapshot(
        configRef,
        (snap) => {
          if (snap.exists()) {
            processData(snap.data());
          } else {
            processData({ selecionados: [] });
          }
        },
        (error) => {
          console.error('Erro ao carregar produtos globais:', error);
          if (isMountedRef.current) {
            setProdutosSelecionados([]);
            setLoaded(true);
          }
        }
      );
      unsubscribeRef.current = unsub;
    } else if (!cached) {
      // Modo cache-first sem cache - busca uma vez
      if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useGlobalProdutos: fetching from Firestore...`);
      getDoc(configRef)
        .then((snap) => {
          if (snap.exists()) {
            processData(snap.data());
          } else {
            processData({ selecionados: [] });
          }
        })
        .catch((error) => {
          console.error('Erro ao carregar produtos globais:', error);
          if (isMountedRef.current) {
            setProdutosSelecionados([]);
            setLoaded(true);
          }
        });
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [enableRealtime]);

  // Função para salvar configuração (apenas admin)
  const salvarProdutos = async (novosProdutos) => {
    if (!isAdmin) {
      console.error('❌ Apenas administradores podem alterar a configuração de produtos');
      throw new Error('Acesso negado: apenas administradores podem alterar esta configuração');
    }

    if (!userEmail) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const configRef = doc(db, "configuracoes", "global", "filtros", "produtos");
      const configData = {
        selecionados: novosProdutos,
        updatedBy: userEmail,
        updatedAt: new Date(),
        version: Date.now()
      };

      await setDoc(configRef, configData);
      
      // Atualiza cache local
      cacheUtils.save(novosProdutos);
      setProdutosSelecionados(novosProdutos);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar produtos globais:', error);
      throw error;
    }
  };

  // Função para forçar refresh
  const refreshProdutos = useCallback(async () => {
    cacheUtils.clear();
    const configRef = doc(db, "configuracoes", "global", "filtros", "produtos");
    
    try {
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const produtos = snap.data()?.selecionados || [];
        setProdutosSelecionados(produtos);
        cacheUtils.save(produtos);
      }
    } catch (error) {
      console.error('Erro ao atualizar produtos:', error);
    }
  }, []);

  return {
    produtosSelecionados,
    setProdutosSelecionados: salvarProdutos,
    loaded,
    isAdmin,
    userEmail,
    refreshProdutos,
    clearCache: cacheUtils.clear
  };
}
