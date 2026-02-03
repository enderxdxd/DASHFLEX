// src/utils/cacheManager.js
// Gerenciador centralizado de cache do DASHFLEX

const CACHE_PREFIXES = [
  'dashflex_vendas_cache',
  'dashflex_metas_',
  'dashflex_descontos_cache',
  'dashflex_config_',
  'dashflex_configrem_',
  'dashflex_global_produtos',
  'idb_',
  'produtosSelecionados'
];

// TTL padrão por tipo de cache (em ms)
export const CACHE_TTL = {
  VENDAS: 15 * 60 * 1000,      // 15 minutos
  METAS: 15 * 60 * 1000,       // 15 minutos
  DESCONTOS: 10 * 60 * 1000,   // 10 minutos
  CONFIG_REM: 30 * 60 * 1000,  // 30 minutos
  PRODUTOS: 60 * 60 * 1000     // 1 hora
};

/**
 * Limpa todo o cache do DASHFLEX
 */
export const clearAllCache = () => {
  const keys = Object.keys(localStorage);
  let cleared = 0;
  
  keys.forEach(key => {
    if (CACHE_PREFIXES.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
      cleared++;
    }
  });
  
  return cleared;
};

/**
 * Obtém estatísticas do cache
 */
export const getCacheStats = () => {
  const keys = Object.keys(localStorage);
  let totalSize = 0;
  let cacheItems = [];
  
  keys.forEach(key => {
    if (CACHE_PREFIXES.some(prefix => key.startsWith(prefix))) {
      const item = localStorage.getItem(key);
      const size = item ? new Blob([item]).size : 0;
      totalSize += size;
      
      try {
        const parsed = JSON.parse(item);
        cacheItems.push({
          key,
          size,
          timestamp: parsed.timestamp ? new Date(parsed.timestamp) : null,
          itemCount: Array.isArray(parsed.data) ? parsed.data.length : 1
        });
      } catch {
        cacheItems.push({ key, size, timestamp: null, itemCount: 0 });
      }
    }
  });
  
  return {
    totalItems: cacheItems.length,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    items: cacheItems
  };
};

/**
 * Verifica se o cache está expirado
 */
export const isCacheExpired = (key, ttlMs) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return true;
    
    const { timestamp } = JSON.parse(item);
    if (!timestamp) return true;
    
    return Date.now() - timestamp > ttlMs;
  } catch {
    return true;
  }
};

/**
 * Limpa caches expirados
 */
export const clearExpiredCache = (ttlMs = 30 * 60 * 1000) => {
  const keys = Object.keys(localStorage);
  let cleared = 0;
  
  keys.forEach(key => {
    if (CACHE_PREFIXES.some(prefix => key.startsWith(prefix))) {
      if (isCacheExpired(key, ttlMs)) {
        localStorage.removeItem(key);
        cleared++;
      }
    }
  });
  
  return cleared;
};

/**
 * Força refresh de todos os dados (limpa cache e recarrega página)
 */
export const forceFullRefresh = () => {
  clearAllCache();
  window.location.reload();
};

/**
 * Expõe funções de debug no console (apenas em desenvolvimento)
 */
if (process.env.NODE_ENV !== 'production') {
  window.dashflexCache = {
    clearAll: clearAllCache,
    getStats: getCacheStats,
    clearExpired: clearExpiredCache,
    forceRefresh: forceFullRefresh
  };
}

export default {
  clearAllCache,
  getCacheStats,
  isCacheExpired,
  clearExpiredCache,
  forceFullRefresh
};
