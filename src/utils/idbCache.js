// src/utils/idbCache.js
// Cache IndexedDB standalone para dados grandes (vendas: 39k+ docs)
// localStorage tem limite de ~5MB; IndexedDB suporta centenas de MB

const DB_NAME = 'dashflex_vendas_cache';
const DB_VERSION = 1;
const STORE_NAME = 'data';

let _db = null;
let _readyPromise = null;

function getDB() {
  if (_readyPromise) return _readyPromise;
  
  _readyPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      console.warn('[idbCache] IndexedDB não disponível');
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('[idbCache] Erro ao abrir:', request.error);
      resolve(null);
    };

    request.onsuccess = () => {
      _db = request.result;
      resolve(_db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });

  return _readyPromise;
}

export async function idbSave(key, data) {
  const db = await getDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, data, timestamp: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbLoad(key, maxAge) {
  const db = await getDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) { resolve(null); return; }
        
        // Verifica TTL se maxAge fornecido
        if (maxAge && (Date.now() - result.timestamp > maxAge)) {
          resolve(null);
          return;
        }
        
        resolve({ data: result.data, timestamp: result.timestamp });
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbClear(key) {
  const db = await getDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (key) {
        store.delete(key);
      } else {
        store.clear();
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Inicializa DB proativamente no import
getDB();
