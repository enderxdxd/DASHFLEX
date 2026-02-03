// src/hooks/useGroupedVendas.js
import { useMemo } from 'react';

/**
 * Hook para agrupar vendas de planos que foram divididas em múltiplos pagamentos
 * 
 * Regras de agrupamento:
 * - Apenas produtos do tipo "PLANO"
 * - Mesma matrícula
 * - Mesmo mês
 * - Mesmo responsável/consultor
 * - Mesma unidade
 * 
 * @param {Array} vendas - Array de vendas originais
 * @returns {Array} Array de vendas com planos agrupados
 */
export const useGroupedVendas = (vendas) => {
  return useMemo(() => {
    if (!Array.isArray(vendas) || vendas.length === 0) {
      return vendas || [];
    }

    // Usar Map para melhor performance em vez de arrays separados
    const planosAgrupados = new Map();
    const outrasVendas = [];
    const vendasLength = vendas.length;
    
    for (let i = 0; i < vendasLength; i++) {
      const venda = vendas[i];
      const produto = (venda.produto || '').toUpperCase().trim();
      
      // Verifica se é um produto do tipo PLANO
      if (produto !== 'PLANO' && !produto.includes('PLANO')) {
        outrasVendas.push(venda);
        continue;
      }
      
      const matricula = (venda.matricula || '').trim();
      
      // Se não tem matrícula válida, não agrupa
      if (!matricula || matricula === '' || matricula === '0') {
        outrasVendas.push(venda);
        continue;
      }
      
      const responsavel = (venda.responsavel || '').trim().toLowerCase();
      const unidadeVenda = (venda.unidade || '').trim().toLowerCase();
      const dataStr = venda.dataFormatada || venda.dataLancamento || '';
      const mes = dataStr.substring(0, 7); // YYYY-MM
      
      const chaveAgrupamento = `${matricula}_${responsavel}_${mes}_${unidadeVenda}_${produto}`;

      const grupoExistente = planosAgrupados.get(chaveAgrupamento);
      
      if (!grupoExistente) {
        // Primeira ocorrência - cria o grupo com a venda base
        planosAgrupados.set(chaveAgrupamento, {
          ...venda,
          _isGrouped: true,
          _groupedCount: 1,
          _originalValues: [Number(venda.valor || 0)],
        });
      } else {
        // Venda duplicada - soma o valor (mutação direta para performance)
        grupoExistente.valor = Number(grupoExistente.valor || 0) + Number(venda.valor || 0);
        grupoExistente._groupedCount += 1;
        grupoExistente._originalValues.push(Number(venda.valor || 0));
        
        // Mantém a data mais recente (comparação simples de string funciona para YYYY-MM-DD)
        const dataAtual = grupoExistente.dataFormatada || grupoExistente.dataLancamento || '';
        const dataVenda = venda.dataFormatada || venda.dataLancamento || '';
        if (dataVenda > dataAtual) {
          grupoExistente.dataFormatada = venda.dataFormatada;
          grupoExistente.dataLancamento = venda.dataLancamento;
        }
        
        // Preserva o nome do cliente
        if (!grupoExistente.nome && venda.nome) {
          grupoExistente.nome = venda.nome;
        }
      }
    }

    // Se não há vendas de planos agrupadas, retorna as vendas originais
    if (planosAgrupados.size === 0) {
      return vendas;
    }

    // Combinar planos agrupados com outras vendas (sem sorting para performance)
    // O sorting pode ser feito no componente que precisa se necessário
    return [...planosAgrupados.values(), ...outrasVendas];
  }, [vendas]);
};

/**
 * Hook auxiliar para obter estatísticas do agrupamento
 * Útil para mostrar informações ao usuário sobre o agrupamento realizado
 */
export const useGroupingStats = (vendasOriginais, vendasAgrupadas) => {
  return useMemo(() => {
    if (!Array.isArray(vendasOriginais) || !Array.isArray(vendasAgrupadas)) {
      return {
        totalOriginal: 0,
        totalAgrupado: 0,
        vendasAgrupadas: 0,
        valorTotalOriginal: 0,
        valorTotalAgrupado: 0,
        planosAgrupados: []
      };
    }

    const planosAgrupados = vendasAgrupadas.filter(v => v._isGrouped && v._groupedCount > 1);
    const valorTotalOriginal = vendasOriginais.reduce((sum, v) => sum + Number(v.valor || 0), 0);
    const valorTotalAgrupado = vendasAgrupadas.reduce((sum, v) => sum + Number(v.valor || 0), 0);

    return {
      totalOriginal: vendasOriginais.length,
      totalAgrupado: vendasAgrupadas.length,
      vendasAgrupadas: vendasOriginais.length - vendasAgrupadas.length,
      valorTotalOriginal,
      valorTotalAgrupado,
      planosAgrupados: planosAgrupados.map(p => ({
        matricula: p.matricula,
        nome: p.nome,
        responsavel: p.responsavel,
        quantidade: p._groupedCount,
        valorTotal: p.valor,
        valores: p._originalValues
      }))
    };
  }, [vendasOriginais, vendasAgrupadas]);
};