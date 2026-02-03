// src/hooks/useOptimizedData.js
// Hook otimizado que combina dados do contexto global com processamento local
// Reduz re-renders e melhora performance significativamente

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import dayjs from 'dayjs';

// ============ HOOK PRINCIPAL PARA DADOS OTIMIZADOS ============
export const useOptimizedData = (unidade, selectedMonth) => {
  const {
    vendas,
    getMetasForUnidade,
    descontos,
    loadingStates,
    cacheInfo,
    refreshVendas,
    refreshMetas,
    refreshDescontos,
    refreshAll
  } = useData();

  // Metas da unidade
  const metas = useMemo(() => {
    return getMetasForUnidade(unidade);
  }, [getMetasForUnidade, unidade]);

  // Vendas filtradas por unidade
  const vendasUnidade = useMemo(() => {
    if (!unidade || !vendas.length) return [];
    const unidadeLower = unidade.toLowerCase();
    return vendas.filter(v => {
      const unidadeVenda = (v._unidadeOriginal || v.unidade || '').toLowerCase();
      return unidadeVenda === unidadeLower;
    });
  }, [vendas, unidade]);

  // Vendas do mês selecionado
  const vendasMes = useMemo(() => {
    if (!selectedMonth || !vendasUnidade.length) return vendasUnidade;
    return vendasUnidade.filter(v => {
      const dataVenda = v.dataFormatada || v.dataLancamento;
      if (!dataVenda) return false;
      const mesVenda = dayjs(dataVenda, 'YYYY-MM-DD').format('YYYY-MM');
      return mesVenda === selectedMonth;
    });
  }, [vendasUnidade, selectedMonth]);

  // Metas do mês selecionado
  const metasMes = useMemo(() => {
    if (!selectedMonth || !metas.length) return metas;
    return metas.filter(m => m.periodo === selectedMonth);
  }, [metas, selectedMonth]);

  // Responsáveis oficiais (consultores com meta)
  const responsaveisOficiais = useMemo(() => {
    return new Set(
      metasMes.map(m => (m.responsavel || '').trim().toLowerCase())
    );
  }, [metasMes]);

  // Vendas apenas de consultores com meta
  const vendasConsultoresComMeta = useMemo(() => {
    if (responsaveisOficiais.size === 0) return vendasMes;
    return vendasMes.filter(v => {
      const resp = (v.responsavel || '').trim().toLowerCase();
      return responsaveisOficiais.has(resp);
    });
  }, [vendasMes, responsaveisOficiais]);

  // Descontos filtrados por mês
  const descontosMes = useMemo(() => {
    if (!selectedMonth || !descontos.length) return descontos;
    return descontos.filter(d => {
      const mesDesc = d.mes || d.dataFormatada;
      if (!mesDesc) return true;
      const mes = dayjs(mesDesc).format('YYYY-MM');
      return mes === selectedMonth;
    });
  }, [descontos, selectedMonth]);

  // Estatísticas calculadas
  const estatisticas = useMemo(() => {
    const totalVendas = vendasConsultoresComMeta.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    const totalMeta = metasMes.reduce((sum, m) => sum + Number(m.meta || 0), 0);
    const percentualMeta = totalMeta > 0 ? (totalVendas / totalMeta) * 100 : 0;
    
    return {
      totalVendas,
      totalMeta,
      percentualMeta,
      quantidadeVendas: vendasConsultoresComMeta.length,
      quantidadeConsultores: metasMes.length,
      ticketMedio: vendasConsultoresComMeta.length > 0 
        ? totalVendas / vendasConsultoresComMeta.length 
        : 0
    };
  }, [vendasConsultoresComMeta, metasMes]);

  // Loading state combinado
  const isLoading = loadingStates.vendas || 
    loadingStates.metas[unidade?.toLowerCase()] || 
    loadingStates.descontos;

  // Refresh combinado
  const refresh = useCallback(() => {
    refreshVendas();
    refreshMetas(unidade);
    refreshDescontos();
  }, [refreshVendas, refreshMetas, refreshDescontos, unidade]);

  return {
    // Dados brutos
    vendas,
    vendasUnidade,
    vendasMes,
    vendasConsultoresComMeta,
    metas,
    metasMes,
    descontos,
    descontosMes,
    
    // Dados processados
    responsaveisOficiais,
    estatisticas,
    
    // Estados
    isLoading,
    cacheInfo,
    
    // Ações
    refresh,
    refreshAll
  };
};

// ============ HOOK PARA AGRUPAMENTO DE VENDAS OTIMIZADO ============
export const useGroupedVendasOptimized = (vendas) => {
  const cacheRef = useRef(new Map());
  const lastVendasRef = useRef(null);

  return useMemo(() => {
    // Se vendas não mudou, retorna do cache
    if (lastVendasRef.current === vendas && cacheRef.current.has('grouped')) {
      return cacheRef.current.get('grouped');
    }

    if (!Array.isArray(vendas) || vendas.length === 0) {
      return vendas || [];
    }

    const planosAgrupados = new Map();
    const outrasVendas = [];

    for (let i = 0; i < vendas.length; i++) {
      const venda = vendas[i];
      const produto = (venda.produto || '').toUpperCase().trim();

      if (produto !== 'PLANO' && !produto.includes('PLANO')) {
        outrasVendas.push(venda);
        continue;
      }

      const matricula = (venda.matricula || '').trim();
      if (!matricula || matricula === '' || matricula === '0') {
        outrasVendas.push(venda);
        continue;
      }

      const responsavel = (venda.responsavel || '').trim().toLowerCase();
      const unidadeVenda = (venda.unidade || '').trim().toLowerCase();
      const dataStr = venda.dataFormatada || venda.dataLancamento || '';
      const mes = dataStr.substring(0, 7);

      const chaveAgrupamento = `${matricula}_${responsavel}_${mes}_${unidadeVenda}_${produto}`;

      const grupoExistente = planosAgrupados.get(chaveAgrupamento);

      if (!grupoExistente) {
        planosAgrupados.set(chaveAgrupamento, {
          ...venda,
          _isGrouped: true,
          _groupedCount: 1
        });
      } else {
        grupoExistente.valor = Number(grupoExistente.valor || 0) + Number(venda.valor || 0);
        grupoExistente._groupedCount += 1;
      }
    }

    const result = [...planosAgrupados.values(), ...outrasVendas];
    
    // Salva no cache
    lastVendasRef.current = vendas;
    cacheRef.current.set('grouped', result);

    return result;
  }, [vendas]);
};

// ============ HOOK PARA DEBOUNCE DE FILTROS ============
export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

// ============ HOOK PARA MEMOIZAÇÃO DE CÁLCULOS PESADOS ============
export const useMemoizedCalculation = (calculationFn, deps, cacheKey) => {
  const cacheRef = useRef(new Map());
  
  return useMemo(() => {
    const key = cacheKey || JSON.stringify(deps);
    
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key);
    }
    
    const result = calculationFn();
    
    // Limita tamanho do cache
    if (cacheRef.current.size > 50) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    cacheRef.current.set(key, result);
    return result;
  }, deps);
};

export default useOptimizedData;
