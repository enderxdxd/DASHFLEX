import { useState, useEffect } from 'react';

/**
 * Função para detectar e corrigir diárias que estão sendo classificadas como plano
 * @param {Object} venda - Objeto da venda com campos produto, plano, etc.
 * @returns {Object} - Venda corrigida com classificação adequada
 */
export function corrigirClassificacaoDiarias(venda) {
  if (!venda) return venda;
  
  const vendaCorrigida = { ...venda };
  
  // Verifica se o campo "plano" contém referência a diárias
  const planoValue = String(venda.plano || '').toLowerCase().trim();
  const produtoValue = String(venda.produto || '').toLowerCase().trim();
  
  // Padrões que identificam diárias no campo "plano"
  const padroesDiarias = [
    'diária',
    'diárias',
    'diaria', 
    'diarias',
    'plano.*diária',
    'plano.*diárias',
    '\\d+\\s*diária',
    '\\d+\\s*diárias'
  ];
  
  // Verifica se algum padrão de diárias é encontrado no campo plano
  const temDiariaNoPlano = padroesDiarias.some(padrao => {
    const regex = new RegExp(padrao, 'i');
    return regex.test(planoValue);
  });
  
  if (temDiariaNoPlano) {
    console.log(`🔧 CORREÇÃO DETECTADA: Diária encontrada no campo plano`, {
      original: {
        produto: venda.produto,
        plano: venda.plano
      }
    });
    
    // Move o conteúdo do campo "plano" para o campo "produto"
    // E limpa o campo "plano" ou coloca valor padrão
    vendaCorrigida.produto = venda.plano; // Move diárias para produto
    vendaCorrigida.plano = ''; // Limpa o campo plano
    
    // Adiciona flag para tracking
    vendaCorrigida.correcaoAplicada = 'diaria_reclassificada';
    vendaCorrigida.motivoCorrecao = `Diária movida de "plano" para "produto": ${venda.plano}`;
    
    console.log(`✅ CORREÇÃO APLICADA:`, {
      corrigido: {
        produto: vendaCorrigida.produto,
        plano: vendaCorrigida.plano,
        motivo: vendaCorrigida.motivoCorrecao
      }
    });
  }
  
  return vendaCorrigida;
}

/**
 * Processa um array de vendas aplicando correção de diárias
 * @param {Array} vendas - Array de objetos de venda
 * @returns {Object} - Resultado com vendas corrigidas e estatísticas
 */
export function processarCorrecaoDiarias(vendas) {
  if (!Array.isArray(vendas)) {
    return {
      vendasCorrigidas: [],
      estatisticas: {
        total: 0,
        corrigidas: 0,
        semCorrecao: 0
      }
    };
  }
  
  let corrigidas = 0;
  const vendasCorrigidas = vendas.map(venda => {
    const vendaOriginal = { ...venda };
    const vendaCorrigida = corrigirClassificacaoDiarias(venda);
    
    if (vendaCorrigida.correcaoAplicada) {
      corrigidas++;
    }
    
    return vendaCorrigida;
  });
  
  const estatisticas = {
    total: vendas.length,
    corrigidas: corrigidas,
    semCorrecao: vendas.length - corrigidas,
    percentualCorrigido: vendas.length > 0 ? (corrigidas / vendas.length * 100).toFixed(2) : 0
  };
  
  console.log(`📊 ESTATÍSTICAS DA CORREÇÃO DE DIÁRIAS:`, estatisticas);
  
  return {
    vendasCorrigidas,
    estatisticas
  };
}

/**
 * Verifica se uma venda é realmente um plano (após correção)
 * @param {Object} venda - Objeto da venda
 * @returns {boolean} - true se for plano, false se for produto
 */
export function ehPlanoAposCorrecao(venda) {
  if (!venda) return false;
  
  // Primeiro aplica a correção
  const vendaCorrigida = corrigirClassificacaoDiarias(venda);
  
  // Se foi aplicada correção de diária, NUNCA é plano
  if (vendaCorrigida.correcaoAplicada === 'diaria_reclassificada') {
    console.log(`🔍 VERIFICAÇÃO PLANO - DIÁRIA CORRIGIDA:`, {
      matricula: venda.matricula,
      produto: vendaCorrigida.produto,
      motivoCorrecao: vendaCorrigida.motivoCorrecao,
      resultado: 'PRODUTO (diária corrigida)'
    });
    return false;
  }
  
  const produto = String(vendaCorrigida.produto || '').toLowerCase().trim();
  const plano = String(vendaCorrigida.plano || '').toLowerCase().trim();
  
  // Verifica se contém padrões de diárias no produto
  const ehDiaria = produto.includes('diária') || produto.includes('diaria') || 
                   produto.includes('diarias') || produto.includes('diárias');
  
  if (ehDiaria) {
    console.log(`🔍 VERIFICAÇÃO PLANO - DIÁRIA NO PRODUTO:`, {
      matricula: venda.matricula,
      produto: vendaCorrigida.produto,
      resultado: 'PRODUTO (diária detectada)'
    });
    return false;
  }
  
  // NOVA LÓGICA: Calcular duração real pelas datas, não pelo campo duração
  if (vendaCorrigida.dataInicio && vendaCorrigida.dataFim) {
    const inicio = new Date(vendaCorrigida.dataInicio);
    const fim = new Date(vendaCorrigida.dataFim);
    const diasReais = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
    
    // Se a duração real é menor que 25 dias, é diária/produto, não plano
    const ehPlanoReal = diasReais >= 25;
    
    console.log(`🔍 VERIFICAÇÃO PLANO - DURAÇÃO REAL:`, {
      matricula: venda.matricula,
      produto: vendaCorrigida.produto,
      dataInicio: vendaCorrigida.dataInicio,
      dataFim: vendaCorrigida.dataFim,
      diasReais,
      ehPlanoReal,
      resultado: ehPlanoReal ? 'PLANO' : 'PRODUTO (duração < 25 dias)'
    });
    
    return ehPlanoReal;
  }
  
  // Fallback: se não tem datas, verifica se produto é literalmente "plano"
  const resultado = produto === 'plano';
  
  console.log(`🔍 VERIFICAÇÃO PLANO - FALLBACK:`, {
    matricula: venda.matricula,
    produto: vendaCorrigida.produto,
    plano: vendaCorrigida.plano,
    resultado: resultado ? 'PLANO' : 'PRODUTO'
  });
  
  return resultado;
}

/**
 * Hook personalizado para usar a correção em componentes React
 * @param {Array} vendas - Array de vendas
 * @returns {Object} - Vendas corrigidas e estatísticas
 */
export function useCorrecaoDiarias(vendas) {
  const [resultado, setResultado] = useState({
    vendasCorrigidas: [],
    estatisticas: {
      total: 0,
      corrigidas: 0,
      semCorrecao: 0,
      percentualCorrigido: 0
    }
  });
  
  useEffect(() => {
    if (vendas && Array.isArray(vendas)) {
      const novoResultado = processarCorrecaoDiarias(vendas);
      setResultado(novoResultado);
    }
  }, [vendas]);
  
  return resultado;
}

// Função para testar a correção com dados de exemplo
export function testarCorrecaoDiarias() {
  const exemplos = [
    {
      matricula: "123456",
      produto: "Plano",
      plano: "2025_1 PLANO 5 DIÁRIAS",
      valor: 300
    },
    {
      matricula: "789012", 
      produto: "Plano",
      plano: "2025_1 PLANO 10 DIÁRIAS",
      valor: 500
    },
    {
      matricula: "345678",
      produto: "Plano Trimestral",
      plano: "2025_1 PLANO TRIMESTRAL",
      dataInicio: "2025-01-01",
      dataFim: "2025-04-01",
      duracaoMeses: 3,
      valor: 2000
    }
  ];
  
  console.log("🧪 TESTE DE CORREÇÃO DE DIÁRIAS:");
  console.log("Dados originais:", exemplos);
  
  const resultado = processarCorrecaoDiarias(exemplos);
  
  console.log("Resultado:", resultado);
  console.log("Estatísticas:", resultado.estatisticas);
  
  return resultado;
}

/**
 * Função para gerar relatório de correções aplicadas
 * @param {Array} vendas - Array de vendas
 * @returns {Object} - Relatório com estatísticas e detalhes
 */
export function gerarRelatorioCorrecoes(vendas) {
  const resultado = processarCorrecaoDiarias(vendas);
  
  const correcoes = resultado.vendasCorrigidas
    .filter(v => v.correcaoAplicada)
    .map(v => ({
      matricula: v.matricula,
      nome: v.nome,
      produtoOriginal: v.produto,
      planoOriginal: v.plano,
      motivo: v.motivoCorrecao,
      valor: v.valor
    }));
    
  console.table(correcoes);
  
  return {
    estatisticas: resultado.estatisticas,
    detalhes: correcoes
  };
}

// Exporta a função de teste para usar no console
if (typeof window !== 'undefined') {
  window.testarCorrecaoDiarias = testarCorrecaoDiarias;
  window.gerarRelatorioCorrecoes = gerarRelatorioCorrecoes;
}
