// src/hooks/useGlobalProdutos.js
import { useState, useEffect, useCallback, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

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
  const auth = getAuth();
  
  // Inicializa com cache
  const [produtosSelecionados, setProdutosSelecionados] = useState(() => {
    const cached = cacheUtils.load();
    return cached || [];
  });
  const [loaded, setLoaded] = useState(() => !!cacheUtils.load());
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);

  // Verifica se usuário é admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setUserEmail(null);
        return;
      }
      
      setUserEmail(user.email);
      
      try {
        // Força pegar claims frescos
        const tokenResult = await user.getIdTokenResult(true);
        const isUserAdmin = tokenResult.claims.role === "admin" || tokenResult.claims.admin === true;
        if (isMountedRef.current) {
          setIsAdmin(isUserAdmin);
        }
      } catch (error) {
        console.error('Erro ao verificar claims:', error);
        if (isMountedRef.current) {
          setIsAdmin(false);
        }
      }
    });
    
    return () => unsub();
  }, [auth]);

  // Carrega configuração global de produtos
  useEffect(() => {
    isMountedRef.current = true;
    const configRef = doc(db, "configuracoes", "global", "filtros", "produtos");
    
    // Tenta carregar do cache primeiro
    const cached = cacheUtils.load();
    if (cached) {
      setProdutosSelecionados(cached);
      setLoaded(true);
      
      // Se não é realtime, não precisa buscar do Firebase
      if (!enableRealtime) {
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
