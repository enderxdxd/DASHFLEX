/**
 * Calcula a remuneração (comissão ou premiação) de um array de vendas
 * @param {number} metaValor — valor da meta individual
 * @param {Array} vendasArr — lista de objetos { valor, responsavel, ... }
 * @param {"comissao"|"premiacao"} tipo 
 * @param {boolean} unidadeBatida — se a meta da unidade foi batida
 * @param {Object} configRem — { premiacao, comissaoPlanos }
 * @returns {number} soma das comissões ou valor da premiação
 */
export function calcularRemuneracao(metaValor, vendasArr, tipo, unidadeBatida, configRem) {
  const { comissaoPlanos = [], premiacao = [] } = configRem || {};
  
  if (tipo === 'comissao') {
    const totalV = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
    return vendasArr.reduce((soma, venda) => {
      const valor = Number(venda.valor || 0);
      const plano = comissaoPlanos.find(p => valor >= p.min && valor <= p.max);
      let comissaoUnit;
      if (plano) {
        comissaoUnit = unidadeBatida
          ? plano.metaTME
          : (totalV >= metaValor ? plano.comMeta : plano.semMeta);
      } else {
        const taxaSem = 0.012, taxaCom = 0.015;
        comissaoUnit = totalV >= metaValor ? valor * taxaCom : valor * taxaSem;
      }
      return soma + comissaoUnit;
    }, 0);
  } 
  
  // *** CORREÇÃO DA LÓGICA DE PREMIAÇÃO ***
  else {
    const acumulado = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
    const percentual = metaValor > 0 ? (acumulado / metaValor) * 100 : 0;
    
    // Ordena as faixas por percentual crescente
    const faixasOrdenadas = premiacao
      .filter(f => f.percentual <= percentual)
      .sort((a, b) => a.percentual - b.percentual);
    
    // NOVA LÓGICA: Soma TODAS as faixas atingidas
    const premioTotal = faixasOrdenadas.reduce((soma, faixa) => {
      return soma + (faixa.premio || 0);
    }, 0);
    
    return premioTotal;
  }
}

/**
* Função auxiliar para debugar e mostrar o cálculo de premiação
* @param {number} metaValor 
* @param {Array} vendasArr 
* @param {Array} premiacao 
* @returns {Object} Detalhes do cálculo
*/
export function calcularPremiacaoDetalhada(metaValor, vendasArr, premiacao = []) {
const acumulado = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
const percentual = metaValor > 0 ? (acumulado / metaValor) * 100 : 0;

const faixasAtingidas = premiacao
  .filter(f => f.percentual <= percentual)
  .sort((a, b) => a.percentual - b.percentual);

const premioTotal = faixasAtingidas.reduce((soma, faixa) => soma + (faixa.premio || 0), 0);

return {
  acumulado,
  percentual,
  faixasAtingidas,
  premioTotal,
  detalhes: faixasAtingidas.map(f => `${f.percentual}% = R$ ${f.premio}`)
};
}