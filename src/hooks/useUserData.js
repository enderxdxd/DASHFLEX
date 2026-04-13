// src/hooks/useUserData.js
// Cache singleton para dados do usuário — evita múltiplas chamadas getDoc ao Firestore
import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ============ SINGLETON CACHE ============
// Compartilhado entre TODAS as instâncias do hook (NavBar, PrivateRoute, PersonalRoute, useUserRole)
let _cachedUserData = null;
let _cachedUid = null;
let _fetchPromise = null;

async function fetchUserData(user) {
  if (!user) return null;
  
  // Se já tem cache para este UID, retorna imediatamente
  if (_cachedUid === user.uid && _cachedUserData) {
    if (process.env.NODE_ENV !== 'production') console.log('[PERF] useUserData: cache hit (memory)');
    return _cachedUserData;
  }

  // Se já tem um fetch em andamento, reutiliza a mesma promise
  if (_fetchPromise) {
    if (process.env.NODE_ENV !== 'production') console.log('[PERF] useUserData: reusing existing fetch promise');
    return _fetchPromise;
  }

  const _t = performance.now();
  if (process.env.NODE_ENV !== 'production') console.log('[PERF] useUserData: fetching from Firestore...');
  _fetchPromise = (async () => {
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useUserData: getDoc done in ${(performance.now()-_t).toFixed(0)}ms`);
      
      const fallback = {
        name: user.displayName || user.email?.split('@')[0] || 'Usuário',
        email: user.email,
        avatar: user.photoURL,
        uid: user.uid
      };

      if (userSnap.exists()) {
        const data = userSnap.data();
        _cachedUserData = {
          ...fallback,
          name: data.name || fallback.name,
          role: data.role || 'user',
          firestoreData: data
        };
      } else {
        _cachedUserData = { ...fallback, role: 'user', firestoreData: null };
      }
      
      _cachedUid = user.uid;
      return _cachedUserData;
    } catch (error) {
      console.warn('useUserData: erro ao buscar dados:', error);
      return {
        name: user.displayName || user.email?.split('@')[0] || 'Usuário',
        email: user.email,
        avatar: user.photoURL,
        uid: user.uid,
        role: 'user',
        firestoreData: null
      };
    } finally {
      _fetchPromise = null;
    }
  })();

  return _fetchPromise;
}

// Limpa o cache (usar no logout)
export function clearUserDataCache() {
  _cachedUserData = null;
  _cachedUid = null;
  _fetchPromise = null;
}

// Retorna dados cacheados sem hook (para uso síncrono)
export function getCachedUserData() {
  return _cachedUserData;
}

// Hook principal
export function useUserData() {
  const [userData, setUserData] = useState(_cachedUserData);
  const [loading, setLoading] = useState(!_cachedUserData);

  useEffect(() => {
    const auth = getAuth();
    const _t0 = performance.now();
    if (process.env.NODE_ENV !== 'production') console.log('[PERF] useUserData: useEffect start, hasCache=' + !!_cachedUserData);
    
    // Se já tem cache, usa imediatamente
    if (_cachedUserData) {
      setUserData(_cachedUserData);
      setLoading(false);
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (process.env.NODE_ENV !== 'production') console.log(`[PERF] useUserData: onAuthStateChanged +${(performance.now()-_t0).toFixed(0)}ms, user=${!!user}`);
      if (user) {
        const data = await fetchUserData(user);
        setUserData(data);
      } else {
        clearUserDataCache();
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return {
    userData,
    loading,
    role: userData?.role || null,
    userInfo: userData ? { name: userData.name, email: userData.email, avatar: userData.avatar } : null
  };
}
