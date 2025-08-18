// src/hooks/useGroupedVendas.js
import { useMemo } from 'react';
import dayjs from 'dayjs';

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
      return vendas;
    }

    // Separar vendas de planos e outras vendas
    const vendasPlanos = [];
    const outrasVendas = [];
    
    vendas.forEach(venda => {
      const produto = (venda.produto || '').toUpperCase().trim();
      // Verifica se é um produto do tipo PLANO
      if (produto === 'PLANO' || produto.includes('PLANO')) {
        vendasPlanos.push(venda);
      } else {
        outrasVendas.push(venda);
      }
    });

    // Se não há vendas de planos, retorna as vendas originais
    if (vendasPlanos.length === 0) {
      return vendas;
    }

    // Agrupar vendas de planos
    const planosAgrupados = {};
    
    vendasPlanos.forEach(venda => {
      // Criar chave única para agrupamento
      const matricula = (venda.matricula || '').trim();
      const responsavel = (venda.responsavel || '').trim().toLowerCase();
      const unidade = (venda.unidade || '').trim().toLowerCase();
      const mes = dayjs(venda.dataFormatada || venda.dataLancamento, 'YYYY-MM-DD').format('YYYY-MM');
      const produto = (venda.produto || '').trim().toUpperCase();
      
      // Chave de agrupamento: matricula + responsavel + mes + unidade + produto
      // Só agrupa se tiver matrícula (para evitar agrupar vendas sem matrícula)
      if (!matricula || matricula === '' || matricula === '0') {
        // Se não tem matrícula válida, não agrupa
        outrasVendas.push(venda);
        return;
      }
      
      const chaveAgrupamento = `${matricula}_${responsavel}_${mes}_${unidade}_${produto}`;
      
      if (!planosAgrupados[chaveAgrupamento]) {
        // Primeira ocorrência - cria o grupo com a venda base
        planosAgrupados[chaveAgrupamento] = {
          ...venda,
          // Adiciona campos para controle
          _isGrouped: true,
          _groupedCount: 1,
          _originalValues: [Number(venda.valor || 0)],
          _groupedVendas: [venda], // Guarda as vendas originais para referência
        };
      } else {
        // Venda duplicada - soma o valor
        const grupo = planosAgrupados[chaveAgrupamento];
        
        // Soma o valor
        grupo.valor = Number(grupo.valor || 0) + Number(venda.valor || 0);
        
        // Atualiza contadores e arrays de controle
        grupo._groupedCount += 1;
        grupo._originalValues.push(Number(venda.valor || 0));
        grupo._groupedVendas.push(venda);
        
        // Mantém a data mais recente
        const dataAtual = dayjs(grupo.dataFormatada || grupo.dataLancamento, 'YYYY-MM-DD');
        const dataVenda = dayjs(venda.dataFormatada || venda.dataLancamento, 'YYYY-MM-DD');
        if (dataVenda.isAfter(dataAtual)) {
          grupo.dataFormatada = venda.dataFormatada;
          grupo.dataLancamento = venda.dataLancamento;
        }
        
        // Concatena informações importantes que podem ser diferentes
        // Por exemplo, formas de pagamento diferentes
        if (venda.formaPagamento && venda.formaPagamento !== grupo.formaPagamento) {
          grupo.formaPagamento = grupo.formaPagamento 
            ? `${grupo.formaPagamento} + ${venda.formaPagamento}`
            : venda.formaPagamento;
        }
        
        // Preserva o nome do cliente (deve ser o mesmo, mas garantimos)
        if (!grupo.nome && venda.nome) {
          grupo.nome = venda.nome;
        }
      }
    });

    // Converter o objeto de grupos em array
    const planosAgrupadosArray = Object.values(planosAgrupados);
    
    
    
    // Combinar planos agrupados com outras vendas
    const vendasFinais = [...planosAgrupadosArray, ...outrasVendas];
    
    // Ordenar por data para manter consistência
    vendasFinais.sort((a, b) => {
      const dataA = dayjs(a.dataFormatada || a.dataLancamento, 'YYYY-MM-DD');
      const dataB = dayjs(b.dataFormatada || b.dataLancamento, 'YYYY-MM-DD');
      return dataB.diff(dataA); // Mais recentes primeiro
    });

    return vendasFinais;
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