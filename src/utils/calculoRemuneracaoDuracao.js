// utils/calculoRemuneracaoDuracao.js
// VERSÃO CORRIGIDA - Aplica correção de diárias ANTES de classificar

import dayjs from 'dayjs';
import { corrigirClassificacaoDiarias, ehPlanoAposCorrecao } from './correcaoDiarias';

const DEFAULT_OUTROS_BLACKLIST = [
  'taxa de matricula',
  'taxa matricula',
  'estorno',
  'ajuste contabil',
  'multa',
  'juros'
];

export function resolveDatasPlano(venda) {
  const inicio =
    venda?.dataInicio ||
    venda?.data_inicio ||
    venda?.inicio ||
    venda?.start;
  const fim =
    venda?.dataFim ||
    venda?.dataTermino ||
    venda?.data_termino ||
    venda?.termino ||
    venda?.end;
  return { inicio, fim };
}

function parseDateFlexible(d) {
  if (!d) return dayjs.invalid();
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return dayjs(s);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return dayjs(s, 'DD/MM/YYYY');
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return dayjs(s, 'DD-MM-YYYY');
  return dayjs(s);
}

function norm(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

/**
 * 🔧 FUNÇÃO CORRIGIDA - Aplica correção de diárias antes de verificar se é plano
 */
function isPlano(venda) {
  // PASSO 1: Aplicar correção de diárias
  const vendaCorrigida = corrigirClassificacaoDiarias(venda);
  
  // PASSO 2: Usar função especializada que considera duração
  return ehPlanoAposCorrecao(vendaCorrigida);
}

export function calcularDuracaoPlano(dataInicio, dataFim, duracaoMeses = null) {
  // 🔧 NOVA LÓGICA: Usar duracaoMeses da planilha se disponível
  if (duracaoMeses && typeof duracaoMeses === 'number' && duracaoMeses > 0) {
    return duracaoMeses;
  }
  
  // Fallback: calcular por datas (lógica antiga)
  const inicio = parseDateFlexible(dataInicio);
  const fim = parseDateFlexible(dataFim);
  if (!inicio.isValid() || !fim.isValid()) return 0;

  const diffDays = fim.diff(inicio, 'day');
  if (diffDays <= 31) return 1;
  if (diffDays <= 95) return 3;
  if (diffDays <= 185) return 6;
  if (diffDays <= 250) return 8;
  if (diffDays <= 370) return 12;
  if (diffDays <= 740) return 24;
  return 24;
}

export function getIndicesComissao(bateuMetaIndividual, bateuMetaTime) {
  const indiceProduto = bateuMetaIndividual ? 1 : 0;

  const indicesPlanos = {
    semDesconto: {
      1: bateuMetaTime ? 15 : (bateuMetaIndividual ? 12 : 9),
      3: bateuMetaTime ? 28 : (bateuMetaIndividual ? 24 : 18),
      6: bateuMetaTime ? 43 : (bateuMetaIndividual ? 37 : 28),
      8: bateuMetaTime ? 51 : (bateuMetaIndividual ? 47 : 42),
      12: bateuMetaTime ? 65 : (bateuMetaIndividual ? 60 : 53),
      24: bateuMetaTime ? 107 : (bateuMetaIndividual ? 103 : 97)
    },
    comDesconto: {
      1: bateuMetaTime ? 9 : (bateuMetaIndividual ? 6 : 3),
      3: bateuMetaTime ? 20 : (bateuMetaIndividual ? 16 : 11),
      6: bateuMetaTime ? 25 : (bateuMetaIndividual ? 23 : 21),
      8: bateuMetaTime ? 34 : (bateuMetaIndividual ? 30 : 25),
      12: bateuMetaTime ? 45 : (bateuMetaIndividual ? 42 : 38),
      24: bateuMetaTime ? 71 : (bateuMetaIndividual ? 67 : 61)
    }
  };

  return { indiceProduto, indicesPlanos };
}

export function verificarDescontoPlano(venda, descontos) {
  if (!descontos?.length) return false;
  
  return descontos.some(desconto => {
    const matriculaMatch = norm(desconto.matricula) === norm(venda.matricula);
    const temDescontoPlano = Number(desconto.descontoPlano || 0) > 0;
    return matriculaMatch && temDescontoPlano;
  });
}

export function isProdutoComissionavel(venda, produtosSelecionados = []) {
  // PASSO 1: Aplicar correção de diárias
  const vendaCorrigida = corrigirClassificacaoDiarias(venda);
  
  // PASSO 2: Se foi classificado como plano após correção, não é produto
  if (ehPlanoAposCorrecao(vendaCorrigida)) {
    return false;
  }
  
  const produto = norm(vendaCorrigida.produto);
  const plano = norm(vendaCorrigida.plano);
  
  // Verificar blacklist
  const blacklist = [...DEFAULT_OUTROS_BLACKLIST].map(norm);
  const naBlacklist = blacklist.some(item => 
    produto.includes(item) || plano.includes(item)
  );
  
  if (naBlacklist) {
    return false;
  }
  
  // Verificar filtro global
  if (produtosSelecionados.length > 0) {
    const produtoOriginal = venda.produto?.trim() || '';
    return produtosSelecionados.includes(produtoOriginal);
  }
  
  return true;
}

/**
 * 🔧 FUNÇÃO PRINCIPAL CORRIGIDA
 */
export function calcularRemuneracaoPorDuracao(params) {
  const {
    vendas = [],
    metaIndividual = 0,
    metaTime = 0,
    totalVendasIndividual = 0,
    totalVendasTime = 0,
    descontos = [],
    tipo = 'comissao',
    produtosSelecionados = [],
    maiorMeta = 0 // ✅ NOVO PARÂMETRO: maior meta do grupo
  } = params;

  if (tipo === 'premiacao') return calcularPremiacao({ ...params, maiorMeta });

  const bateuMetaIndividual = totalVendasIndividual >= metaIndividual;
  const bateuMetaTime = totalVendasTime >= metaTime;

  const { indiceProduto, indicesPlanos } = getIndicesComissao(
    bateuMetaIndividual,
    bateuMetaTime
  );

  let totalComissao = 0;
  let comissaoProdutos = 0;
  let comissaoPlanos = 0;

  const qtdPlanos = {
    semDesconto: { 1: 0, 3: 0, 6: 0, 8: 0, 12: 0, 24: 0 },
    comDesconto: { 1: 0, 3: 0, 6: 0, 8: 0, 12: 0, 24: 0 }
  };

  const vendasDetalhadas = [];
  
  for (const venda of vendas) {
    const valor = Number(venda?.valor || 0);
    if (!(valor > 0)) continue;

    // 🔧 APLICAR CORREÇÃO DE DIÁRIAS ANTES DE CLASSIFICAR
    const vendaCorrigida = corrigirClassificacaoDiarias(venda);
    const { inicio, fim } = resolveDatasPlano(vendaCorrigida);

    // 🔧 USAR FUNÇÃO CORRIGIDA PARA VERIFICAR SE É PLANO
    if (isPlano(vendaCorrigida) && inicio && fim) {
      const duracao = calcularDuracaoPlano(inicio, fim, vendaCorrigida.duracaoMeses);
      const temDesconto = verificarDescontoPlano(vendaCorrigida, descontos);
      const tabela = temDesconto ? indicesPlanos.comDesconto : indicesPlanos.semDesconto;
      const valorComissao = Number(tabela[duracao] || 0);

      comissaoPlanos += valorComissao;
      totalComissao += valorComissao;

      if (temDesconto) qtdPlanos.comDesconto[duracao] = (qtdPlanos.comDesconto[duracao] || 0) + 1;
      else qtdPlanos.semDesconto[duracao] = (qtdPlanos.semDesconto[duracao] || 0) + 1;

      vendasDetalhadas.push({
        ...vendaCorrigida,
        tipo: 'plano',
        duracao,
        temDesconto,
        valorComissao,
        detalhe: `Plano ${duracao} meses ${temDesconto ? 'COM' : 'SEM'} desconto`
      });

    } else if (isProdutoComissionavel(vendaCorrigida, produtosSelecionados)) {
      // Produtos que não são planos mas são comissionáveis
      const taxas = { 0: 0.012, 1: 0.015 };
      const valorComissao = valor * (taxas[indiceProduto] || 0.012);

      comissaoProdutos += valorComissao;
      totalComissao += valorComissao;

      vendasDetalhadas.push({
        ...vendaCorrigida,
        tipo: 'produto',
        valorComissao,
        detalhe: `Produto comissionável - Taxa: ${((taxas[indiceProduto] || 0.012) * 100).toFixed(1)}%`
      });
    }
  }

  const resultado = {
    totalComissao,
    comissaoProdutos,
    comissaoPlanos,
    bateuMetaIndividual,
    bateuMetaTime,
    qtdPlanosSemDesconto: Object.values(qtdPlanos.semDesconto).reduce((a, b) => a + b, 0),
    qtdPlanosComDesconto: Object.values(qtdPlanos.comDesconto).reduce((a, b) => a + b, 0),
    vendasDetalhadas,
    detalhePlanos: qtdPlanos,
    resumo: {
      totalPlanosProcessados: Object.values(qtdPlanos.semDesconto).reduce((a, b) => a + b, 0) + 
                             Object.values(qtdPlanos.comDesconto).reduce((a, b) => a + b, 0),
      totalProdutosProcessados: vendasDetalhadas.filter(v => v.tipo === 'produto').length
    }
  };

  return resultado;
}

// Função auxiliar para calcular premiação
function calcularPremiacao(params) {
  const {
    vendas = [],
    metaIndividual = 0,
    metaTime = 0,
    totalVendasIndividual = 0,
    totalVendasTime = 0,
    premiacao = [],
    produtosSelecionados = [],
    maiorMeta = 0 // ✅ NOVO PARÂMETRO: maior meta do grupo
  } = params;

  // Calcula o percentual de meta atingido
  const percentualMeta = metaIndividual > 0 ? (totalVendasIndividual / metaIndividual) * 100 : 0;

  // Ordena as faixas por percentual crescente e filtra as atingidas
  const faixasAtingidas = premiacao
    .filter(faixa => {
      const percentualFaixa = Number(faixa.percentual || 0);
      return percentualFaixa <= percentualMeta;
    })
    .sort((a, b) => Number(a.percentual || 0) - Number(b.percentual || 0));

  // Soma TODAS as faixas atingidas
  const premioBase = faixasAtingidas.reduce((soma, faixa) => {
    return soma + Number(faixa.premio || 0);
  }, 0);
  
  // ✅ CÁLCULO PROPORCIONAL: (menorMeta / maiorMeta) * premioBase
  // Se maiorMeta > 0, aplica proporcionalidade baseada na meta individual vs maior meta
  const fatorProporcionalidade = maiorMeta > 0 ? (metaIndividual / maiorMeta) : 1;
  const premioTotal = premioBase * fatorProporcionalidade;

  // Determina se bateu as metas
  const bateuMetaIndividual = totalVendasIndividual >= metaIndividual;
  const bateuMetaTime = totalVendasTime >= metaTime;

  // Cria detalhamento das vendas (para compatibilidade)
  const vendasDetalhadas = vendas.map((venda, index) => ({
    id: index,
    valor: Number(venda.valor || 0),
    produto: venda.produto || 'N/A',
    responsavel: venda.responsavel || 'N/A',
    tipo: 'premiacao',
    comissao: 0, // Premiação não usa comissão por venda individual
    observacao: `Premiação por faixas: ${faixasAtingidas.length} faixas atingidas`
  }));

  const resultado = {
    totalComissao: premioTotal, // Para compatibilidade com código existente
    totalPremiacao: premioTotal, // ✅ PROPRIEDADE CORRETA
    comissaoProdutos: 0, // Premiação não separa por tipo de produto
    comissaoPlanos: premioTotal, // Todo o prêmio vem das faixas
    bateuMetaIndividual,
    bateuMetaTime,
    percentualMeta,
    faixasAtingidas,
    premioTotal,
    // ✅ INFORMAÇÕES DE PROPORCIONALIDADE
    premioBase, // Valor antes da proporcionalidade
    fatorProporcionalidade, // Fator aplicado (metaIndividual / maiorMeta)
    maiorMeta, // Maior meta do grupo para referência
    metaIndividual, // Meta do consultor
    qtdPlanosSemDesconto: 0,
    qtdPlanosComDesconto: 0,
    vendasDetalhadas,
    detalhePlanos: {},
    // Informações adicionais para debug
    resumo: {
      totalPlanosProcessados: 0,
      totalProdutosProcessados: vendas.length,
      metodo: 'Premiação por faixas de percentual com proporcionalidade',
      formulaProporcional: `(${metaIndividual} / ${maiorMeta}) × ${premioBase} = ${premioTotal.toFixed(2)}`
    }
  };

  return resultado;
}

/**
 * 🏆 FUNÇÃO PARA CALCULAR PREMIAÇÃO DO SUPERVISOR
 * Calcula a premiação do supervisor baseada no percentual de atingimento da meta da unidade
 */
export function calcularPremiacaoSupervisor({
  totalVendasUnidade,
  metaUnidade,
  premiacaoSupervisor = []
}) {
  // Validações básicas
  if (!premiacaoSupervisor || premiacaoSupervisor.length === 0) {
    return {
      totalPremiacao: 0,
      percentualMeta: 0,
      faixasAtingidas: [],
      bateuMeta: false
    };
  }

  if (!metaUnidade || metaUnidade <= 0) {
    return {
      totalPremiacao: 0,
      percentualMeta: 0,
      faixasAtingidas: [],
      bateuMeta: false
    };
  }

  // Calcular percentual de atingimento da meta da unidade
  const percentualMeta = (totalVendasUnidade / metaUnidade) * 100;
  const bateuMeta = percentualMeta >= 100;

  // Filtrar faixas atingidas (todas as faixas com percentual <= percentual atingido)
  const faixasAtingidas = premiacaoSupervisor
    .filter(faixa => {
      const percentualFaixa = Number(faixa.percentual || 0);
      return percentualFaixa <= percentualMeta;
    })
    .sort((a, b) => Number(a.percentual || 0) - Number(b.percentual || 0));

  // Somar todos os prêmios das faixas atingidas (sistema cumulativo)
  const premioTotal = faixasAtingidas.reduce((soma, faixa) => {
    return soma + Number(faixa.premio || 0);
  }, 0);

  const resultado = {
    totalPremiacao: premioTotal,
    percentualMeta,
    faixasAtingidas,
    bateuMeta,
    resumo: {
      totalFaixasConfiguradas: premiacaoSupervisor.length,
      totalFaixasAtingidas: faixasAtingidas.length,
      metodo: 'Premiação supervisor por faixas de percentual da unidade'
    }
  };

  return resultado;
}