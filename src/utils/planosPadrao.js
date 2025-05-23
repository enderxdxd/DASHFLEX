export default function gerarPlanosPadrao(unidade) {
  switch (unidade.toLowerCase()) {
    case "alphaville":
      return [
        { plano: "Semestral", min: 2700, max: 3474, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Bianual", min: 10000, max: 11496, semMeta: 61, comMeta: 67, metaTME: 71 },
        { plano: "Octomestral", min: 4000, max: 4432, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1300, max: 1887, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Anual", min: 5200, max: 6264, semMeta: 38, comMeta: 42, metaTME: 45 },
      ];
    case "buena vista":
      return [
        { plano: "Semestral", min: 2300, max: 2496, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Bianual", min: 7364, max: 8112, semMeta: 61, comMeta: 67, metaTME: 71 },
        { plano: "Octomestral", min: 3000, max: 3224, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 3, comMeta: 6, metaTME: 9 },
        { plano: "Trimestral", min: 1200, max: 1368, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Anual", min: 4000, max: 4356, semMeta: 38, comMeta: 42, metaTME: 45 },
      ];
    case "marista":
      return [
        { plano: "Semestral", min: 3000, max: 3324, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Bianual", min: 9000, max: 9816, semMeta: 61, comMeta: 67, metaTME: 71 },
        { plano: "Octomestral", min: 4072, max: 6264, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1500, max: 1794, semMeta: 18, comMeta: 24, metaTME: 28 },
        { plano: "Anual", min: 5000, max: 5508, semMeta: 38, comMeta: 42, metaTME: 45 },
      ];
    default:
      return [];
  }
}

export function gerarFaixasPremiacao(unidade) {
  const isAlphaville = unidade.toLowerCase() === 'alphaville';
  const faixas = [];
  
  // Configurações base
  const inicio = 35; // Começa em 35%
  const incremento = 5; // Incremento de 5%
  const valorBase = isAlphaville ? 200 : 180; // Valor base diferente por unidade
  const valorMeta = isAlphaville ? 220 : 200; // Valor quando atinge meta diferente por unidade
  
  // Gera faixas até 100%
  for (let percentual = inicio; percentual < 100; percentual += incremento) {
    faixas.push({
      percentual: percentual,
      premio: valorBase
    });
  }
  
  // Adiciona faixa de 100%
  faixas.push({
    percentual: 100,
    premio: valorMeta
  });
  
  // Adiciona faixas acima de 100%
  for (let percentual = 105; percentual <= 200; percentual += incremento) {
    faixas.push({
      percentual: percentual,
      premio: valorMeta
    });
  }
  
  return faixas;
}