// src/hooks/useAnalytics.js
import { useMemo } from 'react';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { calcularRemuneracao }   from '../utils/remuneracao';
dayjs.extend(isSameOrBefore);

/**
 * Tendência mensal: idem ao que você já tinha.
 */
export function useMonthlyTrend(vendas, metas, configRem = {}) {
  const { comissaoPlanos = [], premiacao = [], metaUnidade = 0 } = configRem;

  return useMemo(() => {
    if (!Array.isArray(vendas) || vendas.length === 0) return [];
    const byMonth = {};
    vendas.forEach(v => {
      const m = dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM');
      if (!byMonth[m]) byMonth[m] = { vendas: 0, comissoes: 0 };
      const valor = Number(v.valor || 0);
      byMonth[m].vendas += valor;

      const metaIndiv = metas.find(
        mt => mt.responsavel?.trim().toLowerCase() === v.responsavel?.trim().toLowerCase()
      )?.meta || 0;
      const unidadeBatida = byMonth[m].vendas >= Number(metaUnidade);
      const com = calcularRemuneracao(
        metaIndiv,
        [v],
        'comissao',
        unidadeBatida,
        { comissaoPlanos, premiacao }
      );
      byMonth[m].comissoes += com;
    });

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, vals]) => ({
        mes,
        vendas: vals.vendas,
        comissoes: vals.comissoes
      }));
  }, [vendas, metas, comissaoPlanos, premiacao, metaUnidade]);
}

/**
 * Produtividade diária para o mês:
 * monta um array de dias (1..N) e, para cada consultor vindo de `metas`,
 * uma linha com o total vendido naquele dia.
 */
export function useDailyProductivity(vendas, metas, month) {
  return useMemo(() => {
    if (!Array.isArray(vendas) || vendas.length === 0 || !month) {
      return { days: [], data: {} };
    }

    // filtra somente o mês desejado
    const vendasDoMes = vendas.filter(v =>
      dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === month
    );

    const start = dayjs(month + '-01');
    const daysInMonth = start.daysInMonth();
    const matrix = {};

    // inicializa cada consultor com zeros
    metas.forEach(m => {
      const name = m.responsavel.trim();
      matrix[name] = Array(daysInMonth).fill(0);
    });

    // acumula valor de cada venda no dia correto
    vendasDoMes.forEach(v => {
      const name = v.responsavel.trim();
      const dia  = dayjs(v.dataFormatada, 'YYYY-MM-DD').date(); // 1..daysInMonth
      if (matrix[name]) {
        matrix[name][dia - 1] += Number(v.valor || 0);
      }
    });

    return {
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      data: matrix
    };
  }, [vendas, metas, month]);
}

/**
 * Projeção de fechamento (você já deve ter o `useProjectionFromFiltered`).
 */
export function useProjectionFromFiltered(vendas, metaUnidade, month) {
  return useMemo(() => {
    if (!Array.isArray(vendas) || vendas.length === 0 || !month) {
      return { soldToDate:0, avgDaily:0, projectedTotal:0, pctOfMeta:0 };
    }
    const today = dayjs();
    const start = dayjs(month + '-01').startOf('day');
    const end   = start.endOf('month');

    const vendasAtéHoje = vendas.filter(v => {
      const d = dayjs(v.dataFormatada, 'YYYY-MM-DD');
      return (d.isSame(start) || d.isAfter(start)) && (d.isSame(today) || d.isBefore(today));
    });

    const soldToDate = vendasAtéHoje.reduce((s, v) => s + Number(v.valor || 0), 0);

    const allBusiness = [];
    for (let d = start.clone(); d.isBefore(end) || d.isSame(end); d = d.add(1,'day')) {
      if (![0,6].includes(d.day())) allBusiness.push(d);
    }
    const passed    = allBusiness.filter(d => !d.isAfter(today));
    const remaining = allBusiness.filter(d => d.isAfter(today));

    const avgDaily       = passed.length ? soldToDate / passed.length : 0;
    const projectedTotal = soldToDate + avgDaily * remaining.length;
    const pctOfMeta      = metaUnidade ? (projectedTotal / metaUnidade) * 100 : 0;

    return { soldToDate, avgDaily, projectedTotal, pctOfMeta };
  }, [vendas, metaUnidade, month]);
}

export function useTopPerformers(vendas = [], metas = [], month, topN = 5) {
  return useMemo(() => {
    if (!vendas.length || !month) return [];

    // filtra só o mês e consultores oficiais (que existem em metas)
    const oficialLower = metas.map(m => m.responsavel.trim().toLowerCase());
    const vendasDoMes = vendas.filter(v =>
      dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === month &&
      oficialLower.includes(v.responsavel.trim().toLowerCase())
    );

    // soma por consultor
    const soma = {};
    vendasDoMes.forEach(v => {
      const nome = v.responsavel.trim();
      soma[nome] = (soma[nome] || 0) + Number(v.valor || 0);
    });

    // transforma em array e ordena decrescente
    return Object.entries(soma)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a,b) => b.total - a.total)
      .slice(0, topN);
  }, [vendas, metas, month, topN]);
}

/**
 * Retorna participação de cada produto no faturamento do mês.
 */
export function useProductBreakdown(vendas = [], month) {
  return useMemo(() => {
    if (!vendas.length || !month) return [];

    const vendasDoMes = vendas.filter(v =>
      dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === month
    );

    const soma = {};
    vendasDoMes.forEach(v => {
      const prod = v.produto.trim() || '—';
      soma[prod] = (soma[prod] || 0) + Number(v.valor || 0);
    });

    return Object.entries(soma).map(([produto, total]) => ({ produto, total }));
  }, [vendas, month]);
}
