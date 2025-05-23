// src/hooks/useHeatmapData.js
import { useMemo } from 'react';
import dayjs from 'dayjs';

/**
 * @param {Array} vendasFiltradas  — já foram filtradas por unidade, produto, consultor, mês…
 * @param {Array} metas            — lista de metas da unidade
 * @param {string} month           — 'YYYY-MM'
 */
export function useHeatmapData(vendasFiltradas, metas, month) {
  return useMemo(() => {
    if (!Array.isArray(vendasFiltradas) || !metas?.length || !month) {
      return { days: [], data: {} };
    }

    // 1) dias do mês
    const first = dayjs(month + '-01', 'YYYY-MM-DD');
    const daysInMonth = first.daysInMonth();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // 2) inicializa matriz [consultor][dia]
    const data = {};
    metas.forEach(m => {
      const resp = m.responsavel.trim();
      if (resp) data[resp] = Array(daysInMonth).fill(0);
    });

    // 3) preenche
    vendasFiltradas.forEach(v => {
      if (!v.dataFormatada) return;
      const mes = dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM');
      if (mes !== month) return;
      const resp = v.responsavel.trim();
      const dia  = dayjs(v.dataFormatada, 'YYYY-MM-DD').date();
      if (data[resp]) {
        data[resp][dia - 1] += Number(v.valor) || 0;
      }
    });

    return { days, data };
  }, [vendasFiltradas, metas, month]);
}
