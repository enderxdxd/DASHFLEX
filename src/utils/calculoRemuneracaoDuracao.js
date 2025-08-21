// utils/calculoRemuneracaoDuracao.js
// NOVA LÓGICA DE CÁLCULO – por duração + filtro de "outros" comissionáveis

import dayjs from 'dayjs';

/* ===================== helpers ===================== */

const DEFAULT_OUTROS_BLACKLIST = [
  'taxa de matricula',     // taxa de matrícula específica
  'taxa matricula',        // variação
  'estorno',              // estorno/cancelamento
  'ajuste contabil',      // ajustes contábeis específicos
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
      venda?.dataTermino ||   // <<--- importante
      venda?.data_termino ||
      venda?.termino ||
      venda?.end;
    return { inicio, fim };
  }
function parseDateFlexible(d) {
    if (!d) return dayjs.invalid();
    const s = String(d);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return dayjs(s);                 // 2025-08-04
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return dayjs(s, 'DD/MM/YYYY'); // 04/08/2025
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return dayjs(s, 'DD-MM-YYYY');
    return dayjs(s);
  }

function norm(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

function isPlano(venda) {
  // Só considera plano quando o produto é literalmente "PLANO"
  return norm(venda?.produto) === 'plano';
}

export function calcularDuracaoPlano(dataInicio, dataFim, duracaoMeses = null) {
    // 🔧 NOVA LÓGICA: Usar duracaoMeses da planilha se disponível
    if (duracaoMeses && typeof duracaoMeses === 'number' && duracaoMeses > 0) {
      return duracaoMeses;
    }
    
    // Fallback: calcular por datas (lógica antiga)
    const inicio = parseDateFlexible(dataInicio);
    const fim    = parseDateFlexible(dataFim);
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
  const indiceProduto = bateuMetaIndividual ? 0.015 : 0.012;

  if (!bateuMetaIndividual) {
    return {
      indiceProduto,
      indicesPlanos: {
        semDesconto: { 1: 9, 3: 18, 6: 28, 8: 42, 12: 53, 24: 97 },
        comDesconto: { 1: 3, 3: 11, 6: 21, 8: 25, 12: 38, 24: 61 }
      }
    };
  }

  if (bateuMetaIndividual && !bateuMetaTime) {
    return {
      indiceProduto,
      indicesPlanos: {
        semDesconto: { 1: 12, 3: 24, 6: 37, 8: 47, 12: 60, 24: 103 },
        comDesconto: { 1: 6, 3: 16, 6: 23, 8: 30, 12: 42, 24: 67 }
      }
    };
  }

  // Bateu individual e time
  return {
    indiceProduto,
    indicesPlanos: {
      semDesconto: { 1: 15, 3: 28, 6: 43, 8: 51, 12: 65, 24: 107 },
      comDesconto: { 1: 9, 3: 20, 6: 25, 8: 34, 12: 45, 24: 71 }
    }
  };
}

/** desconto que conta para comissão é apenas o do PLANO (não o de matrícula) */
export function verificarDescontoPlano(venda, descontos) {
  if (!venda?.matricula || !Array.isArray(descontos) || !descontos.length) return false;

  const matriculaNorm = String(venda.matricula).replace(/\D/g, '').padStart(6, '0');

  const itens = descontos.filter(d => {
    const dMat = String(d.matricula || '').replace(/\D/g, '').padStart(6, '0');
    return dMat === matriculaNorm;
  });

  if (!itens.length) return false;

  let temDescontoPlano = false;

  for (const desc of itens) {
    // itensDesconto (novo)
    if (Array.isArray(desc.itensDesconto) && desc.itensDesconto.length) {
      for (const it of desc.itensDesconto) {
        const tipo = norm(it?.tipo);
        if (!tipo.includes('matricul') && !tipo.includes('taxa') && Number(it?.valor) > 0) {
          temDescontoPlano = true;
          break;
        }
      }
      if (temDescontoPlano) break;
    }

    // campos legados
    const tipoTop = norm(desc?.tipo);
    if (!tipoTop.includes('matricul') && !tipoTop.includes('taxa') && Number(desc?.valor) > 0) {
      temDescontoPlano = true;
      break;
    }

    if (Number(desc?.descontoPlano) > 0) {
      temDescontoPlano = true;
      break;
    }
  }

  return temDescontoPlano;
}

/** “Outros” comissionáveis = usa filtro de produtos selecionados do Metas */
function ehProdutoOutrosComissionavel(venda, produtosSelecionados = []) {
  const nome = String(venda?.produto || '').trim();
  if (!nome || nome.toLowerCase() === 'plano') return false;
  
  // Se não há produtos selecionados, considera todos comissionáveis (fallback)
  if (!Array.isArray(produtosSelecionados) || produtosSelecionados.length === 0) {
    return true;
  }
  
  // Verifica se o produto está na lista de produtos selecionados
  return produtosSelecionados.includes(nome);
}

/* ===================== principal ===================== */

export function calcularRemuneracaoPorDuracao(params) {
  const {
    vendas = [],
    metaIndividual = 0,
    metaTime = 0,
    totalVendasIndividual = 0,
    totalVendasTime = 0,
    descontos = [],
    tipo = 'comissao', // 'comissao' | 'premiacao'
    produtosSelecionados = [], // Lista de produtos do filtro do Metas
  } = params;

  // Premiação: mantém a mesma regra cumulativa
  if (tipo === 'premiacao') return calcularPremiacao(params);

  const bateuMetaIndividual = totalVendasIndividual >= metaIndividual;
  const bateuMetaTime = totalVendasTime >= metaTime;

  const { indiceProduto, indicesPlanos } = getIndicesComissao(
    bateuMetaIndividual,
    bateuMetaTime
  );

  let totalComissao = 0;
  let comissaoProdutos = 0;
  let comissaoPlanos = 0;
  let totalVendaProdutos = 0;

  const qtdPlanos = {
    semDesconto: { 1: 0, 3: 0, 6: 0, 8: 0, 12: 0, 24: 0 },
    comDesconto: { 1: 0, 3: 0, 6: 0, 8: 0, 12: 0, 24: 0 }
  };

  const vendasDetalhadas = [];

  // ...
for (const venda of vendas) {
    const valor = Number(venda?.valor || 0);
    if (!(valor > 0)) continue;
  
    const { inicio, fim } = resolveDatasPlano(venda);   
  
    if (isPlano(venda) && inicio && fim) {              
      const duracao = calcularDuracaoPlano(inicio, fim, venda.duracaoMeses);
      const temDesconto = verificarDescontoPlano(venda, descontos);
      const tabela = temDesconto ? indicesPlanos.comDesconto : indicesPlanos.semDesconto;
      const valorComissao = Number(tabela[duracao] || 0);

      comissaoPlanos += valorComissao;
      totalComissao += valorComissao;

      if (temDesconto) qtdPlanos.comDesconto[duracao] = (qtdPlanos.comDesconto[duracao] || 0) + 1;
      else            qtdPlanos.semDesconto[duracao] = (qtdPlanos.semDesconto[duracao] || 0) + 1;

      vendasDetalhadas.push({
        ...venda,
        tipo: 'plano',
        duracao,
        temDesconto,
        valorComissao,
        detalhe: `Plano ${duracao} meses ${temDesconto ? 'COM' : 'SEM'} desconto`
      });

    } else if (ehProdutoOutrosComissionavel(venda, produtosSelecionados)) {
      // ---- OUTROS COMISSIONÁVEIS ----
      const valorComissao = valor * indiceProduto;
      comissaoProdutos += valorComissao;
      totalComissao += valorComissao;
      totalVendaProdutos += valor;

      vendasDetalhadas.push({
        ...venda,
        tipo: 'produto',
        valorComissao,
        taxa: indiceProduto,
        detalhe: `Produto comissionável - ${(indiceProduto * 100).toFixed(1)}%`
      });
    } else {
      // ---- OUTROS NÃO COMISSIONÁVEIS (matrícula/taxa/desconto/estorno/ajuste etc) ----
      vendasDetalhadas.push({
        ...venda,
        tipo: 'nao_comissionavel',
        valorComissao: 0,
        detalhe: 'Não comissionável (blacklist)'
      });
    }
  }

  return {
    totalComissao,
    comissaoProdutos,
    comissaoPlanos,
    totalVendaProdutos,

    qtdPlanosSemDesconto: qtdPlanos.semDesconto,
    qtdPlanosComDesconto: qtdPlanos.comDesconto,

    bateuMetaIndividual,
    bateuMetaTime,

    indiceProduto,
    indicesPlanos,

    vendasDetalhadas,

    resumo: {
      totalVendas: vendas.length,
      totalPlanosProcessados:
        Object.values(qtdPlanos.semDesconto).reduce((a,b) => a+b, 0) +
        Object.values(qtdPlanos.comDesconto).reduce((a,b) => a+b, 0),
      totalProdutosProcessados: vendasDetalhadas.filter(v => v.tipo === 'produto').length,
      totalNaoComissionaveis: vendasDetalhadas.filter(v => v.tipo === 'nao_comissionavel').length,
    }
  };
}

/* ===================== premiação (cumulativa) ===================== */

export function calcularPremiacao(params) {
  const { vendas = [], metaIndividual = 0, premiacao = [] } = params;

  const totalVendas = vendas.reduce((s, v) => s + Number(v?.valor || 0), 0);
  const percentual = metaIndividual > 0 ? (totalVendas / metaIndividual) * 100 : 0;

  const faixasAtingidas = (premiacao || [])
    .filter(f => Number(f?.percentual) <= percentual)
    .sort((a, b) => Number(a?.percentual || 0) - Number(b?.percentual || 0));

  const premioTotal = faixasAtingidas.reduce((s, f) => s + Number(f?.premio || 0), 0);

  return {
    totalPremiacao: premioTotal,
    percentualAtingido: percentual,
    faixasAtingidas,
    totalVendas
  };
}
