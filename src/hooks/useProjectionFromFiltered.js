import { useMemo } from 'react';
import dayjs from 'dayjs';

/**
 * Projeção de meta baseada apenas nas vendas já filtradas
 * @param {Array} filteredVendas — vendas que já passaram por filtros de produto/consultor/mês
 * @param {number} metaUnidade — meta da unidade
 * @param {string} month — "YYYY-MM"
 */
export function useProjectionFromFiltered(filteredVendas, metaUnidade, month) {
  return useMemo(() => {
    if (!month) {
      return {
        soldToDate:     0,
        avgDaily:       0,
        projectedTotal: 0,
        pctOfMeta:      0,
      };
    }

    const today = dayjs();
    const start = dayjs(month + '-01');
    const end   = start.endOf('month');

    // vendas até hoje (já filtradas)
    const vendasToDate = filteredVendas.filter(v => {
      const d = dayjs(v.dataFormatada, 'YYYY-MM-DD');
      return d.isBetween(start, today, 'day', '[]');
    });

    const soldToDate = vendasToDate.reduce((sum, v) => sum + Number(v.valor || 0), 0);

    // dias úteis do mês
    const allBiz = [];
    for (let d = start.clone(); d.isSameOrBefore(end); d = d.add(1,'day')) {
      if (![0,6].includes(d.day())) allBiz.push(d);
    }
    const passed    = allBiz.filter(d => !d.isAfter(today));
    const remaining = allBiz.filter(d => d.isAfter(today));

    const avgDaily       = passed.length    ? soldToDate / passed.length    : 0;
    const projectedTotal = soldToDate + avgDaily * remaining.length;
    const pctOfMeta      = metaUnidade      ? (projectedTotal / metaUnidade) * 100 : 0;

    return { soldToDate, avgDaily, projectedTotal, pctOfMeta };
  }, [filteredVendas, metaUnidade, month]);
}
