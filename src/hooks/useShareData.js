import { useMemo } from 'react';
import dayjs from 'dayjs';

export const useShareData = (type, rawData, unidade, selectedMonth) => {
  const shareData = useMemo(() => {
    if (!rawData || !unidade) return null;

    if (type === 'analytics') {
      return formatAnalyticsShareData(rawData);
    } else if (type === 'planos') {
      return formatPlanosShareData(rawData);
    }

    return null;
  }, [type, rawData, unidade, selectedMonth]);

  return shareData;
};

const formatAnalyticsShareData = (data) => {
  // Calcular resumo geral
  const vendas = data.vendas || [];
  const metas = data.metas || [];
  const metaUnidade = data.metaUnidade || 0;

  const totalVendas = vendas.reduce((sum, venda) => sum + (venda.valor || 0), 0);
  const numeroVendas = vendas.length;
  const ticketMedio = numeroVendas > 0 ? totalVendas / numeroVendas : 0;

  // Top performers
  const performersMap = {};
  vendas.forEach(venda => {
    const consultor = venda.consultor || 'Não informado';
    if (!performersMap[consultor]) {
      performersMap[consultor] = { name: consultor, total: 0, count: 0 };
    }
    performersMap[consultor].total += venda.valor || 0;
    performersMap[consultor].count += 1;
  });

  const topPerformers = Object.values(performersMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Breakdown por produto
  const productMap = {};
  vendas.forEach(venda => {
    const produto = venda.produto || 'Não informado';
    if (!productMap[produto]) {
      productMap[produto] = { name: produto, value: 0, count: 0 };
    }
    productMap[produto].value += venda.valor || 0;
    productMap[produto].count += 1;
  });

  const productBreakdown = Object.values(productMap)
    .sort((a, b) => b.value - a.value);

  return {
    summary: {
      totalVendas,
      metaUnidade,
      numeroVendas,
      ticketMedio,
      atingimento: metaUnidade > 0 ? (totalVendas / metaUnidade) * 100 : 0
    },
    topPerformers,
    productBreakdown,
    metas: metas.map(meta => ({
      consultor: meta.responsavel,
      meta: meta.meta,
      vendas: vendas
        .filter(v => v.consultor === meta.responsavel)
        .reduce((sum, v) => sum + (v.valor || 0), 0)
    }))
  };
};

const formatPlanosShareData = (data) => {
  const planos = data.planos || [];
  const vendasReais = data.vendasReais || [];
  const comissaoPlanos = data.comissaoPlanos || [];

  // Calcular totais
  const vendasTotais = vendasReais.reduce((sum, venda) => sum + (venda.valor || 0), 0);
  const comissaoTotal = planos.reduce((sum, plano) => sum + (plano.comissaoTotal || 0), 0);

  // Análise por plano
  const planosDetalhados = planos.map(plano => {
    const vendasPlano = vendasReais.filter(v => v.plano === plano.nome);
    const vendasValor = vendasPlano.reduce((sum, v) => sum + (v.valor || 0), 0);
    const quantidade = vendasPlano.length;

    // Calcular comissão baseada na configuração
    const configPlano = comissaoPlanos.find(c => c.plano === plano.nome);
    const percentualComissao = configPlano ? configPlano.percentual : 0;
    const comissao = vendasValor * (percentualComissao / 100);

    return {
      nome: plano.nome,
      vendas: vendasValor,
      quantidade,
      comissao,
      percentualComissao
    };
  });

  // Análise financeira
  const receitaTotal = vendasTotais;
  const comissoesPagas = comissaoTotal;
  const margemLiquida = receitaTotal > 0 ? ((receitaTotal - comissoesPagas) / receitaTotal) * 100 : 0;

  return {
    resumo: {
      totalPlanos: planos.length,
      vendasTotais,
      comissaoTotal
    },
    planos: planosDetalhados,
    analiseFinanceira: {
      receitaTotal,
      comissoesPagas,
      margemLiquida
    },
    vendas: vendasReais.map(venda => ({
      data: dayjs(venda.data).format('DD/MM/YYYY'),
      consultor: venda.consultor,
      cliente: venda.cliente,
      plano: venda.plano,
      valor: venda.valor
    }))
  };
};

export default useShareData;
