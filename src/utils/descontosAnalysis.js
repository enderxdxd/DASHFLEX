// src/utils/descontosAnalysis.js
import dayjs from "dayjs";

/**
 * Normaliza matrícula para comparação (6 dígitos com zeros à esquerda)
 */
const normalizarMatricula = (matricula) => {
  if (!matricula) return '';
  return String(matricula).replace(/\D/g, '').padStart(6, '0');
};

/**
 * Reconcilia vendas com descontos baseado na estrutura real do Firestore
 * Espera que descontos venham com a estrutura:
 * {
 *   matricula: "011338",
 *   nome: "João Silva",
 *   responsavel: "Maria Santos",
 *   tipo: "PLANO" ou "MATRÍCULA",
 *   convenio: "Desconto máximo - 5%",
 *   lancamento: "01/07/25",
 *   valor: 313.20
 * }
 */
const reconciliarVendasComDescontos = (vendas, descontos) => {
  console.log('🔄 Iniciando reconciliação de vendas com descontos');
  console.log('📊 Vendas a processar:', vendas.length);
  console.log('💰 Descontos disponíveis:', descontos.length);
  
  // Debug: Verificar estrutura do primeiro desconto
  if (descontos.length > 0) {
    console.log('🔍 Estrutura do primeiro desconto:', {
      matricula: descontos[0].matricula,
      nome: descontos[0].nome,
      descontoPlano: descontos[0].descontoPlano,
      descontoMatricula: descontos[0].descontoMatricula,
      totalDesconto: descontos[0].totalDesconto,
      temDescontoPlano: descontos[0].temDescontoPlano,
      temDescontoMatricula: descontos[0].temDescontoMatricula,
      itensDesconto: descontos[0].itensDesconto
    });
  }
  
  // Primeiro, vamos agrupar os descontos por matrícula
  // Uma matrícula pode ter múltiplos descontos (PLANO + MATRÍCULA)
  // helpers
  const normalizeTipo = (t) => {
    if (!t) return '';
    return String(t)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // tira acentos
      .replace(/[^\w]/g, '')                            // tira pontuação/espaços
      .toUpperCase();
  };
  const bucketFromTipo = (t) => {
    const n = normalizeTipo(t);
    // tudo que mencionar MATRÍCULA / TAXA vai para o bucket MATRÍCULA
    if (n.includes('MATRICUL') || n.includes('TAXA')) return 'MATRICULA';
    return 'PLANO';
  };

  // ====== AGRUPAMENTO POR MATRÍCULA ======
  const descontosPorMatricula = {};
  descontos.forEach(desc => {
    const matriculaNorm = String(desc.matricula || '').replace(/\D/g, '').padStart(6, '0');
    
    // Debug específico para 011338
    if (matriculaNorm === '011338') {
      console.log('🎯 Processando desconto para 011338:', {
        matricula: desc.matricula,
        matriculaNorm,
        itensDesconto: desc.itensDesconto,
        descontoPlano: desc.descontoPlano,
        descontoMatricula: desc.descontoMatricula,
        totalDesconto: desc.totalDesconto
      });
    }
    
    if (!descontosPorMatricula[matriculaNorm]) {
      descontosPorMatricula[matriculaNorm] = {
        descontoPlano: 0,
        descontoMatricula: 0,
        totalDesconto: 0,
        itens: []
      };
    }
    const grupo = descontosPorMatricula[matriculaNorm];

    const itens = Array.isArray(desc.itensDesconto) ? desc.itensDesconto : [];
    const temConsolidado =
      typeof desc.totalDesconto === 'number' ||
      typeof desc.descontoPlano === 'number' ||
      typeof desc.descontoMatricula === 'number';

    let dp = 0, dm = 0, tt = 0;

    if (itens.length) {
      // ✅ SEMPRE prioriza itensDesconto
      itens.forEach(it => {
        const valor = Number(it?.valor || 0);
        if (!valor) return;
        const bucket = bucketFromTipo(it?.tipo);
        if (bucket === 'MATRICULA') dm += valor; else dp += valor;
        grupo.itens.push(it);
      });
      tt = dp + dm;
    } else if (temConsolidado) {
      // fallback: usa consolidados
      dp = Number(desc.descontoPlano || 0);
      dm = Number(desc.descontoMatricula || 0);
      tt = Number(desc.totalDesconto || (dp + dm));
      if (!itens.length) grupo.itens.push({ tipo: 'CONSOLIDADO', valor: tt });
    } else {
      // legado (valor/tipo no topo)
      const valor = Number(desc.valor || 0);
      const bucket = bucketFromTipo(desc.tipo);
      if (bucket === 'MATRICULA') dm += valor; else dp += valor;
      tt = dp + dm;
      grupo.itens.push({ tipo: desc.tipo || 'PLANO', valor });
    }

    grupo.descontoPlano += dp;
    grupo.descontoMatricula += dm;
    grupo.totalDesconto += tt;
  });
  
  console.log('📋 Descontos agrupados por matrícula:', Object.keys(descontosPorMatricula).length);
  
  // Agora reconciliar com as vendas
  const vendasComDesconto = vendas.map(venda => {
    const matriculaVendaNorm = normalizarMatricula(venda.matricula);
    const descontoGrupo = descontosPorMatricula[matriculaVendaNorm];
    
    if (descontoGrupo) {
      // Venda com desconto encontrado
      const valorVendido = Number(venda.valor || 0);
      const totalDesconto = descontoGrupo.totalDesconto;
      const valorCheio = valorVendido + totalDesconto;
      const percentualDesconto = valorCheio > 0 ? (totalDesconto / valorCheio) * 100 : 0;
      
      return {
        ...venda,
        // Dados do desconto
        descontoMatricula: descontoGrupo.descontoMatricula,
        descontoPlano: descontoGrupo.descontoPlano,
        totalDesconto,
        valorCheio,
        percentualDesconto: parseFloat(percentualDesconto.toFixed(2)),
        
        // Flags
        temDesconto: true,
        temDescontoPlano: descontoGrupo.temDescontoPlano,
        temDescontoMatricula: descontoGrupo.temDescontoMatricula,
        
        // Detalhes
        descontoDetalhes: descontoGrupo.itens,
        matchMethod: 'matricula'
      };
    } else {
      // Venda sem desconto
      const valorVendido = Number(venda.valor || 0);
      
      return {
        ...venda,
        descontoMatricula: 0,
        descontoPlano: 0,
        totalDesconto: 0,
        valorCheio: valorVendido,
        percentualDesconto: 0,
        temDesconto: false,
        temDescontoPlano: false,
        temDescontoMatricula: false,
        descontoDetalhes: [],
        matchMethod: 'none'
      };
    }
  });
  
  // Log de diagnóstico
  const vendasComDescontoCount = vendasComDesconto.filter(v => v.temDesconto).length;
  console.log('✅ Reconciliação concluída:');
  console.log('   - Vendas com desconto:', vendasComDescontoCount);
  console.log('   - Vendas sem desconto:', vendas.length - vendasComDescontoCount);
  console.log('   - Taxa de match:', ((vendasComDescontoCount / vendas.length) * 100).toFixed(1) + '%');
  
  // Amostra de vendas com desconto para debug
  const amostraComDesconto = vendasComDesconto.filter(v => v.temDesconto).slice(0, 3);
  if (amostraComDesconto.length > 0) {
    console.log('📌 Amostra de vendas com desconto:');
    amostraComDesconto.forEach(v => {
      console.log(`   - ${v.matricula} | ${v.nome} | Plano: R$ ${v.descontoPlano} | Mat: R$ ${v.descontoMatricula}`);
    });
  }
  
  return vendasComDesconto;
};

/**
 * Analisa descontos agrupados por consultor
 */
const analisarDescontosPorConsultor = (vendasComDesconto) => {
  console.log('👥 Iniciando análise por consultor');
  
  const consultores = {};
  
  vendasComDesconto.forEach(venda => {
    const consultor = venda.responsavel || 'Não Informado';
    
    if (!consultores[consultor]) {
      consultores[consultor] = {
        responsavel: consultor,
        
        // Contadores
        totalVendas: 0,
        vendasComDesconto: 0,
        vendasSemDesconto: 0,
        vendasComDescontoPlano: 0,
        vendasComDescontoMatricula: 0,
        vendasComAmbosDescontos: 0,
        
        // Valores - Inicializar explicitamente com 0
        valorTotalVendido: 0,
        valorTotalCheio: 0,
        totalDescontos: 0,
        totalDescontoPlano: 0,
        totalDescontoMatricula: 0,
        
        // Métricas calculadas
        percentualDescontoMedio: 0,
        percentualVendasComDesconto: 0,
        ticketMedioVendido: 0,
        ticketMedioCheio: 0,
        descontoMedioPorVenda: 0,
        
        // Detalhes
        vendas: []
      };
    }
    
    const c = consultores[consultor];
    
    // Incrementa contadores com validação rigorosa
    c.totalVendas++;
    
    // Garantir que valores são números válidos
    const valorVenda = Number(venda.valor) || 0;
    const valorCheio = Number(venda.valorCheio) || valorVenda;
    const totalDesconto = Number(venda.totalDesconto) || 0;
    const descontoPlano = Number(venda.descontoPlano) || 0;
    const descontoMatricula = Number(venda.descontoMatricula) || 0;
    
    // Verificar NaN antes de somar
    if (!isNaN(valorVenda)) c.valorTotalVendido += valorVenda;
    if (!isNaN(valorCheio)) c.valorTotalCheio += valorCheio;
    if (!isNaN(totalDesconto)) c.totalDescontos += totalDesconto;
    if (!isNaN(descontoPlano)) c.totalDescontoPlano += descontoPlano;
    if (!isNaN(descontoMatricula)) c.totalDescontoMatricula += descontoMatricula;
    
    c.vendas.push(venda);
    
    // Contadores específicos
    if (venda.temDesconto) {
      c.vendasComDesconto++;
      
      if (venda.temDescontoPlano) c.vendasComDescontoPlano++;
      if (venda.temDescontoMatricula) c.vendasComDescontoMatricula++;
      if (venda.temDescontoPlano && venda.temDescontoMatricula) c.vendasComAmbosDescontos++;
    } else {
      c.vendasSemDesconto++;
    }
  });
  
  // Calcula métricas finais com proteção contra divisão por zero e NaN
  Object.values(consultores).forEach(c => {
    // Percentual de desconto médio
    if (c.valorTotalCheio > 0 && !isNaN(c.valorTotalCheio) && !isNaN(c.totalDescontos)) {
      c.percentualDescontoMedio = (c.totalDescontos / c.valorTotalCheio) * 100;
      c.percentualDescontoMedio = parseFloat(c.percentualDescontoMedio.toFixed(2));
    } else {
      c.percentualDescontoMedio = 0;
    }
    
    // Percentual de vendas com desconto
    if (c.totalVendas > 0) {
      c.percentualVendasComDesconto = (c.vendasComDesconto / c.totalVendas) * 100;
      c.percentualVendasComDesconto = parseFloat(c.percentualVendasComDesconto.toFixed(2));
    } else {
      c.percentualVendasComDesconto = 0;
    }
    
    // Tickets médios
    if (c.totalVendas > 0) {
      c.ticketMedioVendido = c.valorTotalVendido / c.totalVendas;
      c.ticketMedioCheio = c.valorTotalCheio / c.totalVendas;
      c.descontoMedioPorVenda = c.totalDescontos / c.totalVendas;
      
      // Formatar
      c.ticketMedioVendido = parseFloat(c.ticketMedioVendido.toFixed(2));
      c.ticketMedioCheio = parseFloat(c.ticketMedioCheio.toFixed(2));
      c.descontoMedioPorVenda = parseFloat(c.descontoMedioPorVenda.toFixed(2));
    } else {
      c.ticketMedioVendido = 0;
      c.ticketMedioCheio = 0;
      c.descontoMedioPorVenda = 0;
    }
    
    // Verificação final de NaN
    Object.keys(c).forEach(key => {
      if (typeof c[key] === 'number' && isNaN(c[key])) {
        console.error(`⚠️ NaN detectado em consultor ${c.responsavel}, campo ${key}`);
        c[key] = 0;
      }
    });
  });
  
  const consultoresArray = Object.values(consultores);
  console.log(`✅ Análise por consultor concluída: ${consultoresArray.length} consultores`);
  
  return consultoresArray;
};

/**
 * Calcula estatísticas gerais dos descontos
 */
const calcularEstatisticasGeraisDesconto = (vendasComDesconto) => {
  console.log('📈 Calculando estatísticas gerais');
  
  if (!vendasComDesconto || !vendasComDesconto.length) {
    console.warn('⚠️ Nenhuma venda para calcular estatísticas');
    return {
      totalConsultores: 0,
      totalVendas: 0,
      vendasComDesconto: 0,
      vendasSemDesconto: 0,
      percentualVendasComDesconto: 0,
      percentualDescontoGeral: 0,
      valorTotalVendido: 0,
      valorTotalCheio: 0,
      totalDescontos: 0,
      totalDescontoPlano: 0,
      totalDescontoMatricula: 0,
      descontoMedioPorVenda: 0,
      descontoMedioPorVendaComDesconto: 0,
      ticketMedioVendido: 0,
      ticketMedioCheio: 0,
      participacaoDescontoPlano: 0,
      participacaoDescontoMatricula: 0
    };
  }

  const totalVendas = vendasComDesconto.length;
  
  // Somas com proteção contra NaN
  let totalDescontos = 0;
  let totalDescontoPlano = 0;
  let totalDescontoMatricula = 0;
  let valorTotalCheio = 0;
  let valorTotalVendido = 0;
  let vendasComDescontoCount = 0;
  
  vendasComDesconto.forEach(v => {
    const valor = Number(v.valor) || 0;
    const valorCheio = Number(v.valorCheio) || valor;
    const desconto = Number(v.totalDesconto) || 0;
    const descontoPlano = Number(v.descontoPlano) || 0;
    const descontoMatricula = Number(v.descontoMatricula) || 0;
    
    if (!isNaN(valor)) valorTotalVendido += valor;
    if (!isNaN(valorCheio)) valorTotalCheio += valorCheio;
    if (!isNaN(desconto)) totalDescontos += desconto;
    if (!isNaN(descontoPlano)) totalDescontoPlano += descontoPlano;
    if (!isNaN(descontoMatricula)) totalDescontoMatricula += descontoMatricula;
    
    if (v.temDesconto) vendasComDescontoCount++;
  });
  
  // Contar consultores únicos
  const consultoresUnicos = [...new Set(vendasComDesconto.map(v => v.responsavel || 'Não Informado'))];
  
  const estatisticas = {
    totalConsultores: consultoresUnicos.length,
    totalVendas,
    vendasComDesconto: vendasComDescontoCount,
    vendasSemDesconto: totalVendas - vendasComDescontoCount,
    
    // Percentuais
    percentualVendasComDesconto: totalVendas > 0 ? (vendasComDescontoCount / totalVendas) * 100 : 0,
    percentualDescontoGeral: valorTotalCheio > 0 ? (totalDescontos / valorTotalCheio) * 100 : 0,
    
    // Valores
    valorTotalVendido,
    valorTotalCheio,
    totalDescontos,
    totalDescontoPlano,
    totalDescontoMatricula,
    
    // Médias
    descontoMedioPorVenda: totalVendas > 0 ? totalDescontos / totalVendas : 0,
    descontoMedioPorVendaComDesconto: vendasComDescontoCount > 0 ? totalDescontos / vendasComDescontoCount : 0,
    ticketMedioVendido: totalVendas > 0 ? valorTotalVendido / totalVendas : 0,
    ticketMedioCheio: totalVendas > 0 ? valorTotalCheio / totalVendas : 0,
    
    // Distribuição
    participacaoDescontoPlano: totalDescontos > 0 ? (totalDescontoPlano / totalDescontos) * 100 : 0,
    participacaoDescontoMatricula: totalDescontos > 0 ? (totalDescontoMatricula / totalDescontos) * 100 : 0
  };
  
  // Verificação final e formatação
  Object.keys(estatisticas).forEach(key => {
    if (typeof estatisticas[key] === 'number') {
      if (isNaN(estatisticas[key])) {
        console.error(`⚠️ NaN detectado em estatística ${key}`);
        estatisticas[key] = 0;
      } else if (key.includes('percentual') || key.includes('participacao')) {
        estatisticas[key] = parseFloat(estatisticas[key].toFixed(2));
      } else if (key.includes('valor') || key.includes('ticket') || key.includes('desconto')) {
        estatisticas[key] = parseFloat(estatisticas[key].toFixed(2));
      }
    }
  });
  
  console.log('✅ Estatísticas calculadas:', estatisticas);
  
  return estatisticas;
};

export { 
  reconciliarVendasComDescontos, 
  analisarDescontosPorConsultor, 
  calcularEstatisticasGeraisDesconto,
  normalizarMatricula 
};