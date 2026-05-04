// src/hooks/useStudentLifecycle.js
import { useMemo } from 'react';
import { calcularIndicesDeCiclo } from '../utils/studentLifecycle';

/**
 * Hook reutilizável para calcular o índice de ciclo do aluno.
 *
 * @param {Object} params
 * @param {Array}  params.vendasOriginais       - vendas brutas (não agrupadas)
 * @param {string} params.unidade               - unidade atual
 * @param {string} params.selectedMonth          - "YYYY-MM"
 * @param {Array}  params.responsaveisOficiais   - consultores com meta (lowercase)
 * @param {Array}  params.produtosSelecionados   - filtro global de produtos
 * @param {Array}  params.contratosPacto         - contratos normalizados da API PACTO
 * @returns {{ resumo, eventosDetalhados }}
 */
export function useStudentLifecycle({
  vendasOriginais,
  unidade,
  selectedMonth,
  responsaveisOficiais = [],
  produtosSelecionados = [],
  contratosPacto = [],
}) {
  return useMemo(() => {
    return calcularIndicesDeCiclo({
      vendasOriginais,
      unidade,
      selectedMonth,
      responsaveisOficiais,
      produtosSelecionados,
      contratosPacto,
    });
  }, [vendasOriginais, unidade, selectedMonth, responsaveisOficiais, produtosSelecionados, contratosPacto]);
}
