// src/hooks/usePersonals.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// ============ CACHE OTIMIZADO ============
const CACHE_PREFIX = 'dashflex_personals_';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

const personalsCacheUtils = {
  getKey: (unidade) => `${CACHE_PREFIX}${(unidade || '').toLowerCase()}`,
  save: (unidade, data) => {
    try {
      const compact = data.map(p => ({
        id: p.id,
        personal: p.personal,
        aluno: p.aluno,
        produto: p.produto,
        plano: p.plano,
        valorFinal: p.valorFinal,
        situacao: p.situacao,
        unidade: p.unidade,
        dataImportacao: p.dataImportacao
      }));
      localStorage.setItem(personalsCacheUtils.getKey(unidade), JSON.stringify({
        data: compact,
        timestamp: Date.now(),
        count: data.length
      }));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        Object.keys(localStorage)
          .filter(k => k.startsWith(CACHE_PREFIX))
          .forEach(k => localStorage.removeItem(k));
      }
    }
  },
  load: (unidade) => {
    try {
      const cached = localStorage.getItem(personalsCacheUtils.getKey(unidade));
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(personalsCacheUtils.getKey(unidade));
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
  clear: (unidade) => localStorage.removeItem(personalsCacheUtils.getKey(unidade))
};

export function usePersonals(unidade) {
  const [personals, setPersonals] = useState(() => {
    return personalsCacheUtils.load(unidade) || [];
  });
  const [loading, setLoading] = useState(() => !personalsCacheUtils.load(unidade));
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const isMountedRef = useRef(true);

  // Função para adicionar novos dados
  const addPersonals = useCallback((newData) => {
    setLoading(true);
    try {
      if (!newData) {
        throw new Error('Dados não fornecidos');
      }
      
      const dataArray = Array.isArray(newData) ? newData : [newData];
      
      setPersonals(prev => {
        const updated = [...prev, ...dataArray];
        personalsCacheUtils.save(unidade, updated);
        return updated;
      });
      
      setSuccessMessage(`${dataArray.length} registros adicionados com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError('Erro ao adicionar dados: ' + err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  }, [unidade]);

  // Função para limpar todos os dados
  const clearPersonals = useCallback(() => {
    setPersonals([]);
    personalsCacheUtils.clear(unidade);
    setSuccessMessage('Dados limpos com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [unidade]);

  // Função para remover um registro específico
  const removePersonal = useCallback((id) => {
    setPersonals(prev => {
      const updated = prev.filter(p => p.id !== id);
      personalsCacheUtils.save(unidade, updated);
      return updated;
    });
  }, [unidade]);

  // Carregar dados com cache-first + background revalidation
  useEffect(() => {
    if (!unidade) return;
    isMountedRef.current = true;

    const cached = personalsCacheUtils.load(unidade);
    
    if (cached && cached.length > 0) {
      // Cache hit: mostra dados do cache imediatamente
      setPersonals(cached);
      setLoading(false);
      
      // Background revalidation: busca dados frescos sem bloquear UI
      const personalsRef = collection(db, 'faturamento', unidade, 'personals');
      const q = query(personalsRef, orderBy('dataImportacao', 'desc'));
      getDocs(q)
        .then((snapshot) => {
          if (!isMountedRef.current) return;
          const freshData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setPersonals(freshData);
          personalsCacheUtils.save(unidade, freshData);
        })
        .catch(() => {}); // Silencioso - já temos cache
    } else {
      // Cache miss: busca do Firebase
      setLoading(true);
      const personalsRef = collection(db, 'faturamento', unidade, 'personals');
      const q = query(personalsRef, orderBy('dataImportacao', 'desc'));
      getDocs(q)
        .then((snapshot) => {
          if (!isMountedRef.current) return;
          const firestoreData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setPersonals(firestoreData);
          personalsCacheUtils.save(unidade, firestoreData);
          setLoading(false);
        })
        .catch((err) => {
          if (isMountedRef.current) {
            setError('Erro ao carregar dados do servidor: ' + err.message);
            setLoading(false);
          }
        });
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [unidade]);

  return {
    personals,
    loading,
    error,
    successMessage,
    addPersonals,
    clearPersonals,
    removePersonal,
    setError,
    setSuccessMessage
  };
}
