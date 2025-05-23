/**
 * Calcula a comissão de um array de vendas dado:
 * @param {number} metaValor — valor da meta individual
 * @param {Array} vendasArr — lista de objetos { valor, responsavel, ... }
 * @param {"comissao"|"premiacao"} tipo 
 * @param {boolean} unidadeBatida — se a meta da unidade foi batida
 * @param {Object} configRem — { premiacao, comissaoPlanos }
 * @returns {number} soma das comissões
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
    } else {
      const acumulado = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
      const percentual = metaValor > 0 ? (acumulado / metaValor) * 100 : 0;
      const faixa = premiacao
        .filter(f => f.percentual <= percentual)
        .sort((a,b) => a.percentual - b.percentual)
        .pop();
      return faixa?.premio || 0;
    }
  }
  