// src/hooks/usePactoContratos.js
// Hook React que busca contratos da PACTO para as matrículas das vendas locais.
// Usa v2-indice-renovacao (via Cloud Function) para mapear matrícula → codigoCliente,
// depois busca contratos completos. Cache em memória para não rebuscar a cada render.

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchContratosPacto } from "../services/pactoApi";

// Cache em memória compartilhado entre instâncias do hook
let memCache = null;
let memCacheKey = "";
let memCacheTimestamp = 0;
const MEM_CACHE_TTL = 30 * 60 * 1000; // 30 min

/**
 * @param {Object} params
 * @param {Array}  params.vendas     - Vendas locais (para extrair matrículas)
 * @param {boolean} params.enabled   - Toggle para habilitar/desabilitar a integração
 * @returns {{ contratos, loading, error, enabled, setEnabled, refresh, stats }}
 */
export function usePactoContratos({ vendas = [], enabled: initialEnabled = false } = {}) {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStats, setApiStats] = useState(null);
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem("pacto_integration_enabled");
    return saved !== null ? saved === "true" : initialEnabled;
  });
  const fetchedRef = useRef(false);
  const abortRef = useRef(null);

  // Persiste toggle
  useEffect(() => {
    localStorage.setItem("pacto_integration_enabled", String(enabled));
  }, [enabled]);

  // Extrai matrículas únicas das vendas locais
  const matriculasKey = vendas.length > 0
    ? [...new Set(
        vendas
          .map((v) => v.matricula)
          .filter(Boolean)
          .map((m) => String(m).replace(/\D/g, ""))
          .filter((m) => m && m !== "000000")
      )].sort().join(",")
    : "";

  const fetchData = useCallback(async (force = false) => {
    if (!enabled || !matriculasKey) {
      setContratos([]);
      return;
    }

    // Checa cache em memória
    if (
      !force &&
      memCache &&
      memCacheKey === matriculasKey &&
      Date.now() - memCacheTimestamp < MEM_CACHE_TTL
    ) {
      setContratos(memCache);
      return;
    }

    // Cancela fetch anterior se existir
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const matriculas = matriculasKey.split(",");
      const { contratos: result, stats: apiStatsResult } = await fetchContratosPacto(matriculas);

      if (!controller.signal.aborted) {
        setContratos(result);
        setApiStats(apiStatsResult);
        memCache = result;
        memCacheKey = matriculasKey;
        memCacheTimestamp = Date.now();
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("[usePactoContratos] Erro:", err.message);
        setError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, matriculasKey]);

  // Fetch automático quando habilitado e matrículas mudam
  useEffect(() => {
    if (!enabled) {
      setContratos([]);
      fetchedRef.current = false;
      return;
    }

    if (!matriculasKey) return;

    if (fetchedRef.current && memCacheKey === matriculasKey) {
      if (memCache) setContratos(memCache);
      return;
    }

    fetchedRef.current = true;
    fetchData();

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [enabled, matriculasKey, fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  const stats = {
    totalContratos: contratos.length,
    pessoasUnicas: new Set(contratos.map((c) => c.matricula).filter(Boolean)).size,
    totalMapeadas: apiStats?.totalMapeadas || 0,
    totalSemMapeamento: apiStats?.totalSemMapeamento || 0,
    totalMatriculasEnviadas: apiStats?.totalMatriculasEnviadas || 0,
  };

  return {
    contratos,
    loading,
    error,
    enabled,
    setEnabled,
    refresh,
    stats,
  };
}
