// Função para gerar faixas de premiação com lógica progressiva corrigida
export function gerarFaixasPremiacao(unidade) {
  const isAlphaville = unidade.toLowerCase() === 'alphaville';
  const faixas = [];
  
  // Configurações base
  const inicio = 35; // Começa em 35%
  const incremento = 5; // Incremento de 5%
  const valorBase = isAlphaville ? 200 : 180; // Valor base por faixa
  const valorMeta = isAlphaville ? 220 : 200; // Valor quando atinge 100%
  
  // Gera faixas até 95% (antes da meta)
  for (let percentual = inicio; percentual < 100; percentual += incremento) {
    faixas.push({
      percentual: percentual,
      premio: valorBase
    });
  }
  
  // Adiciona faixa de 100% (meta atingida)
  faixas.push({
    percentual: 100,
    premio: valorBase // Todos: Alphaville: 200, Buena Vista/Marista: 180
  });
  
  // Adiciona faixas acima de 100% (superação da meta) com lógica alternada
  const valorSuperacao = isAlphaville ? 320 : 300; // Valor para faixas "especiais"
  
  for (let percentual = 105; percentual <= 200; percentual += incremento) {
    // Lógica alternada: 105%, 115%, 125%... = valorMeta (220/200)
    // 110%, 120%, 130%... = valorSuperacao (320/300)
    const faixaIndex = (percentual - 105) / incremento; // 0, 1, 2, 3, 4...
    const isEspecial = faixaIndex % 2 === 1; // 1, 3, 5... (110%, 120%, 130%...)
    
    faixas.push({
      percentual: percentual,
      premio: isEspecial ? valorSuperacao : valorMeta
    });
  }
  
  return faixas;
}

// Função para simular e mostrar como a premiação será calculada
export function simularPremiacao(percentualAtingido, unidade) {
  const faixas = gerarFaixasPremiacao(unidade);
  const faixasAtingidas = faixas
    .filter(f => f.percentual <= percentualAtingido)
    .sort((a, b) => a.percentual - b.percentual);
  
  const premioTotal = faixasAtingidas.reduce((soma, faixa) => soma + faixa.premio, 0);
  
  return {
    percentualAtingido,
    faixasAtingidas,
    premioTotal,
    detalhamento: faixasAtingidas.map(f => `${f.percentual}% → +R$ ${f.premio}`),
    resumo: `${percentualAtingido}% da meta = R$ ${premioTotal} (${faixasAtingidas.length} faixas)`
  };
}

// Exemplo de uso e teste
export function exemploCalculoPremiacao() {
  console.log("=== EXEMPLO DE CÁLCULO DE PREMIAÇÃO ===");
  
  const exemplos = [35, 45, 60, 100, 150];
  const unidades = ['alphaville', 'buena vista'];
  
  unidades.forEach(unidade => {
    console.log(`\n--- ${unidade.toUpperCase()} ---`);
    
    exemplos.forEach(percentual => {
      const resultado = simularPremiacao(percentual, unidade);
      console.log(resultado.resumo);
      console.log(`  Faixas: ${resultado.detalhamento.join(', ')}`);
    });
  });
}

// Função para validar se as faixas estão configuradas corretamente
export function validarFaixasPremiacao(faixas) {
  const problemas = [];
  
  // Verifica se as faixas estão ordenadas
  const faixasOrdenadas = [...faixas].sort((a, b) => a.percentual - b.percentual);
  const estaOrdenado = faixas.every((faixa, index) => 
    faixa.percentual === faixasOrdenadas[index].percentual
  );
  
  if (!estaOrdenado) {
    problemas.push("Faixas não estão ordenadas por percentual");
  }
  
  // Verifica duplicatas
  const percentuais = faixas.map(f => f.percentual);
  const percentuaisUnicos = [...new Set(percentuais)];
  if (percentuais.length !== percentuaisUnicos.length) {
    problemas.push("Existem faixas com percentuais duplicados");
  }
  
  // Verifica se tem faixa de 100%
  const temMeta = faixas.some(f => f.percentual === 100);
  if (!temMeta) {
    problemas.push("Não há faixa configurada para 100% da meta");
  }
  
  // Verifica valores zerados
  const valoresZerados = faixas.filter(f => !f.premio || f.premio === 0);
  if (valoresZerados.length > 0) {
    problemas.push(`${valoresZerados.length} faixa(s) com valor zero ou indefinido`);
  }
  
  return {
    valido: problemas.length === 0,
    problemas,
    totalFaixas: faixas.length,
    menorPercentual: Math.min(...percentuais),
    maiorPercentual: Math.max(...percentuais)
  };
}

// Dados dos planos por unidade (mantém a estrutura original)
export default function gerarPlanosPadrao(unidade) {
  switch (unidade.toLowerCase()) {
    case "alphaville":
      return [
        { plano: "Diária", min: 0, max: 688, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1300, max: 1887, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Semestral", min: 2700, max: 3474, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Octomestral", min: 4000, max: 4432, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Anual", min: 5200, max: 6264, semMeta: 38, comMeta: 42, metaTME: 45 },
        { plano: "Bianual", min: 6265, max: 11496, semMeta: 61, comMeta: 67, metaTME: 71 },
      ];
    case "buena vista":
      return [
        { plano: "Diária", min: 0, max: 688, semMeta: 3, comMeta: 6, metaTME: 9 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 3, comMeta: 6, metaTME: 9 },
        { plano: "Trimestral", min: 1200, max: 1368, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Semestral", min: 2300, max: 2496, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Octomestral", min: 3000, max: 3224, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Anual", min: 4000, max: 4356, semMeta: 38, comMeta: 42, metaTME: 45 },
        { plano: "Bianual", min: 4357, max: 8112, semMeta: 61, comMeta: 67, metaTME: 71 },
      ];
    case "marista":
      return [
        { plano: "Diária", min: 0, max: 688, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1500, max: 1794, semMeta: 18, comMeta: 24, metaTME: 28 },
        { plano: "Semestral", min: 3000, max: 3324, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Octomestral", min: 4072, max: 5499, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Anual", min: 5500, max: 6264, semMeta: 38, comMeta: 42, metaTME: 45 },
        { plano: "Bianual", min: 6265, max: 9816, semMeta: 61, comMeta: 67, metaTME: 71 },
      ];
    default:
      return [];
  }
}