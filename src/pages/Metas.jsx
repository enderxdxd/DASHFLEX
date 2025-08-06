// src/pages/Metas.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  collection,
  collectionGroup,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import dayjs from "dayjs";
import NavBar from "../components/NavBar";
import { usePersistedProdutos } from "../hooks/usePersistedProdutos";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import "react-datepicker/dist/react-datepicker.css";
import Loading3D from '../components/ui/Loading3D';


ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Metas() {
  const { unidade } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();

  // --- Estados gerais ---
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [metas, setMetas]     = useState([]);
  const [vendas, setVendas]   = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [configRem, setConfigRem] = useState({
    premiacao: [],
    comissaoPlanos: [],
    metaUnidade: 0
  });
  

  // --- Filtros e persistência ---
  const [produtosSelecionados, setProdutosSelecionados, produtosLoaded] =
    usePersistedProdutos();
  const [showProductFilter, setShowProductFilter] = useState(false);
  const [selectedMonth, setSelectedMonth]         = useState(dayjs().format("YYYY-MM"));

  /**
   * Calcula a remuneração com base no tipo (comissão ou premiação)
   * @param {number} metaValor - Valor da meta a ser atingida
   * @param {Array} vendasArr - Array de vendas
   * @param {string} tipo - 'comissao' ou 'premiacao'
   * @param {boolean} unidadeBatida - Se a meta da unidade foi batida
   * @param {Object} configRem - Configuração de remuneração
   * @returns {number} Valor da remuneração calculada
   */
  /**
 * Função calcularRemuneracao CORRIGIDA para Metas.jsx
 * Esta versão deve substituir a função atual no arquivo
 */
/**
 * FUNÇÃO CALCULAR REMUNERAÇÃO CORRIGIDA
 * Esta versão corrige os problemas identificados na função original
 */

/**
 * Calcula a remuneração com base no tipo (comissão ou premiação)
 * @param {number} metaValor - Valor da meta a ser atingida
 * @param {Array} vendasArr - Array de vendas
 * @param {string} tipo - 'comissao' ou 'premiacao'
 * @param {boolean} unidadeBatida - Se a meta da unidade foi batida
 * @param {Object} configRem - Configuração de remuneração
 * @returns {number} Valor da remuneração calculada
 */
function calcularRemuneracao(metaValor, vendasArr, tipo, unidadeBatida, configRem) {
  // Validações iniciais
  if (!Array.isArray(vendasArr)) {
    console.warn('VendasArr não é um array válido');
    return 0;
  }

  const { 
    comissaoPlanos = [], 
    premiacao = [],
    taxaSem = 0.012, 
    taxaCom = 0.015 
  } = configRem || {};
  
  // ===== CÁLCULO PARA COMISSÃO =====
  if (tipo === 'comissao') {
    const totalVendas = vendasArr.reduce((soma, v) => soma + (Number(v?.valor) || 0), 0);
    const metaIndividualBatida = totalVendas >= metaValor;
    
    console.log("🔍 DEBUG COMISSÃO:", {
      totalVendas: totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      metaValor: metaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      metaIndividualBatida,
      unidadeBatida,
      totalVendasArray: vendasArr.length
    });
    
    let totalComissao = 0;
    
    vendasArr.forEach((venda, index) => {
      const valorVenda = Number(venda?.valor) || 0;
      
      // 🔧 CORREÇÃO: Verificar se o produto é "plano" E se encaixa no intervalo de valores
      // Evita confusão com outros produtos (ex: taxa de personal) que podem ter valores similares
      const plano = (venda?.produto?.trim().toLowerCase() === "plano" && Array.isArray(comissaoPlanos)) 
        ? comissaoPlanos.find(p => 
            valorVenda >= (p.min || 0) && 
            valorVenda <= (p.max || Infinity)
          )
        : null;
      
      let comissaoVenda = 0;
      
      if (plano) {
        // ✅ VENDA É UM PLANO: Usar valor fixo baseado nas metas
        if (unidadeBatida) {
          comissaoVenda = plano.metaTME || 0; // Meta da unidade batida
        } else if (metaIndividualBatida) {
          comissaoVenda = plano.comMeta || 0; // Meta individual batida
        } else {
          comissaoVenda = plano.semMeta || 0; // Meta individual não batida
        }
        
        console.log(`💎 ${index + 1}. Plano ${plano.plano}: R$ ${valorVenda.toLocaleString('pt-BR')} → Comissão: R$ ${comissaoVenda} (${unidadeBatida ? 'TME' : metaIndividualBatida ? 'comMeta' : 'semMeta'})`);
      } else {
        // ✅ VENDA NÃO É UM PLANO: Usar taxa percentual
        const taxa = metaIndividualBatida ? taxaCom : taxaSem;
        comissaoVenda = valorVenda * taxa;
        
        console.log(`📦 ${index + 1}. Outros: R$ ${valorVenda.toLocaleString('pt-BR')} → Comissão: R$ ${comissaoVenda.toFixed(2)} (${(taxa * 100).toFixed(1)}%)`);
      }
      
      totalComissao += comissaoVenda;
    });
    
    console.log(`💰 TOTAL COMISSÃO CALCULADA: R$ ${totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    return totalComissao;
  } 
  
  // ===== CÁLCULO PARA PREMIAÇÃO (LÓGICA CUMULATIVA) =====
  if (tipo === 'premiacao') {
    const acumulado = vendasArr.reduce((soma, v) => soma + (Number(v?.valor) || 0), 0);
    const percentual = metaValor > 0 ? (acumulado / metaValor) * 100 : 0;
    
    // 🔧 CORREÇÃO: Filtra as faixas atingidas e ordena por percentual
    const faixasAtingidas = Array.isArray(premiacao)
      ? premiacao
          .filter(f => f.percentual <= percentual)
          .sort((a, b) => (a.percentual || 0) - (b.percentual || 0))
      : [];
    
    // 🔧 CORREÇÃO: Soma cumulativa de todas as faixas atingidas
    const premioTotal = faixasAtingidas.reduce((soma, faixa) => {
      return soma + (Number(faixa.premio) || 0);
    }, 0);
    
    // Log detalhado para depuração
    console.group('📊 Cálculo de Premiação');
    console.log('Meta:', metaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    console.log('Acumulado:', acumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    console.log('Percentual:', percentual.toFixed(2) + '%');
    console.log('Faixas atingidas:', faixasAtingidas.length);
    faixasAtingidas.forEach((f, i) => {
      console.log(`  ${i+1}. ${f.percentual}% = R$ ${Number(f.premio || 0).toFixed(2)}`);
    });
    console.log('Total de prêmio:', premioTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    console.groupEnd();
    
    return premioTotal;
  }
  
  console.warn(`Tipo de remuneração não reconhecido: ${tipo}`);
  return 0;
}

/**
 * FUNÇÃO DE DEBUG ESPECÍFICA PARA ASMIHS
 * Use esta função temporariamente para debugar o caso específico
 */
function debugCalculoASMIHS(vendasArr, configRem, metaValor, unidadeBatida) {
  console.group("🔍 DEBUG DETALHADO - ASMIHS");
  
  console.log("📊 Dados de entrada:");
  console.log("- Total de vendas:", vendasArr.length);
  console.log("- Planos configurados:", configRem.comissaoPlanos?.length || 0);
  console.log("- Meta individual:", metaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  console.log("- Meta da unidade batida:", unidadeBatida);
  
  const totalVendas = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
  const metaIndividualBatida = totalVendas >= metaValor;
  
  console.log("- Total em vendas:", totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  console.log("- Meta individual batida:", metaIndividualBatida);
  
  // Verificar cada venda individualmente
  let totalComissao = 0;
  let totalPlanos = 0;
  let totalOutros = 0;
  let planosCount = 0;
  let outrosCount = 0;
  
  console.log("\n📋 ANÁLISE VENDA POR VENDA:");
  
  vendasArr.forEach((venda, index) => {
    const valor = Number(venda.valor || 0);
    
    // Verificar se encaixa em algum plano
    const plano = configRem.comissaoPlanos?.find(p => 
      valor >= (p.min || 0) && valor <= (p.max || Infinity)
    );
    
    if (plano) {
      // É um plano - usar lógica corrigida
      let comissao = 0;
      if (unidadeBatida) {
        comissao = plano.metaTME || 0;
      } else if (metaIndividualBatida) {
        comissao = plano.comMeta || 0;
      } else {
        comissao = plano.semMeta || 0;
      }
      
      totalComissao += comissao;
      totalPlanos += comissao;
      planosCount++;
      
      console.log(`${index + 1}. 💎 R$ ${valor.toLocaleString('pt-BR')} (${venda.produto || 'N/A'}) → Plano ${plano.plano} → R$ ${comissao} (${unidadeBatida ? 'TME' : metaIndividualBatida ? 'comMeta' : 'semMeta'})`);
    } else {
      // Não é um plano
      const taxa = metaIndividualBatida ? 0.015 : 0.012;
      const comissao = valor * taxa;
      totalComissao += comissao;
      totalOutros += comissao;
      outrosCount++;
      
      console.log(`${index + 1}. 📦 R$ ${valor.toLocaleString('pt-BR')} (${venda.produto || 'N/A'}) → Outros ${(taxa * 100).toFixed(1)}% → R$ ${comissao.toFixed(2)}`);
    }
  });
  
  console.log("\n💰 RESUMO FINAL:");
  console.log(`- Vendas de planos: ${planosCount} vendas`);
  console.log(`- Outros produtos: ${outrosCount} vendas`);
  console.log("- Comissão dos planos: R$", totalPlanos.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log("- Comissão dos outros: R$", totalOutros.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log("- TOTAL CALCULADO: R$", totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  
  console.groupEnd();
  
  return {
    totalComissao,
    totalPlanos,
    totalOutros,
    planosCount,
    outrosCount,
    breakdown: {
      metaIndividualBatida,
      unidadeBatida,
      totalVendas
    }
  };
}

/**
 * Função para comparar cálculos entre Metas e PlanosVisualizer
 * @param {Array} vendasArr - Array de vendas
 * @param {Object} configRem - Configuração de remuneração
 * @param {number} metaValor - Valor da meta individual
 * @param {boolean} unidadeBatida - Se a meta da unidade foi batida
 * @returns {Object} Resultado da comparação
 */
function compararComPlanosVisualizer(vendasArr, configRem, metaValor, unidadeBatida) {
  if (!vendasArr?.length || !configRem?.comissaoPlanos) {
    return { error: 'Dados insuficientes para comparação' };
  }

  // 1. Cálculo do Metas.jsx
  const totalVendas = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
  const metaIndividualBatida = totalVendas >= metaValor;
  
  let totalComissaoMetas = 0;
  let detalhesMetas = [];
  
  vendasArr.forEach((venda, i) => {
    const valor = Number(venda.valor || 0);
    const plano = configRem.comissaoPlanos.find(p => 
      valor >= (p.min || 0) && valor <= (p.max || Infinity)
    );
    
    let comissao = 0;
    let tipoCalculo = '';
    
    if (plano) {
      if (unidadeBatida) {
        comissao = plano.metaTME || 0;
        tipoCalculo = 'metaTME';
      } else if (metaIndividualBatida) {
        comissao = plano.comMeta || 0;
        tipoCalculo = 'comMeta';
      } else {
        comissao = plano.semMeta || 0;
        tipoCalculo = 'semMeta';
      }
    } else {
      const taxa = metaIndividualBatida ? 0.015 : 0.012;
      comissao = valor * taxa;
      tipoCalculo = `outros (${(taxa * 100).toFixed(1)}%)`;
    }
    
    totalComissaoMetas += comissao;
    
    detalhesMetas.push({
      id: i,
      valor,
      produto: venda.produto || 'N/A',
      plano: plano?.plano || 'Outros',
      comissao,
      tipoCalculo
    });
  });
  
  // 2. Cálculo do PlanosVisualizer (sempre usa comMeta)
  let totalComissaoPV = 0;
  let detalhesPV = [];
  
  vendasArr.forEach((venda, i) => {
    const valor = Number(venda.valor || 0);
    const plano = configRem.comissaoPlanos.find(p => 
      valor >= (p.min || 0) && valor <= (p.max || Infinity)
    );
    
    let comissao = 0;
    
    if (plano) {
      comissao = plano.comMeta || 0;
    } else {
      comissao = valor * 0.015; // 1.5% fixo como no PlanosVisualizer
    }
    
    totalComissaoPV += comissao;
    
    detalhesPV.push({
      id: i,
      valor,
      produto: venda.produto || 'N/A',
      plano: plano?.plano || 'Outros',
      comissao,
      tipoCalculo: plano ? 'comMeta (fixo)' : 'outros (1.5%)'
    });
  });
  
  // 3. Resumo da comparação
  const diferenca = totalComissaoMetas - totalComissaoPV;
  
  return {
    resumo: {
      totalVendas: totalVendas,
      metaIndividual: metaValor,
      metaIndividualBatida,
      unidadeBatida,
      totalComissaoMetas,
      totalComissaoPV,
      diferenca,
      percentualDiferenca: (diferenca / totalComissaoPV * 100).toFixed(2) + '%'
    },
    detalhesMetas,
    detalhesPV,
    configuracao: {
      comissaoPlanos: configRem.comissaoPlanos,
      taxaSemMeta: configRem.taxaSem || 0.012,
      taxaComMeta: configRem.taxaCom || 0.015
    }
  };
}

/**
 * VERSÃO SIMPLIFICADA PARA VERIFICAÇÃO RÁPIDA
 * Use esta função para comparar com o valor esperado
 */
function verificarCalculoRapido(vendasArr, configRem, metaValor, unidadeBatida) {
  const totalVendas = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
  const metaIndividualBatida = totalVendas >= metaValor;
  
  const resultado = vendasArr.reduce((soma, venda) => {
    const valor = Number(venda.valor || 0);
    const plano = configRem.comissaoPlanos?.find(p => 
      valor >= (p.min || 0) && valor <= (p.max || Infinity)
    );
    
    if (plano) {
      // Valor fixo do plano baseado no status da meta
      if (unidadeBatida) return soma + (plano.metaTME || 0);
      if (metaIndividualBatida) return soma + (plano.comMeta || 0);
      return soma + (plano.semMeta || 0);
    } else {
      // Taxa percentual para outros produtos
      const taxa = metaIndividualBatida ? 0.015 : 0.012;
      return soma + (valor * taxa);
    }
  }, 0);
  
  return {
    resultado: resultado,
    status: `Meta Individual: ${metaIndividualBatida ? '✅' : '❌'} | Unidade: ${unidadeBatida ? '✅' : '❌'}`,
    totalVendas: totalVendas
  };
}

/**
 * Função para debugar um consultor específico
 * @param {string} nomeConsultor - Nome do consultor para debugar
 * @param {Array} todasVendas - Array com todas as vendas
 * @param {Object} configRem - Configuração de remuneração
 * @param {Object} metas - Objeto com as metas dos consultores
 */
function debugConsultor(nomeConsultor, todasVendas, configRem, metas) {
  console.group(`🔍 DEBUG CONSULTOR: ${nomeConsultor}`);
  
  // Encontrar a meta do consultor
  const metaConsultor = metas.find(m => 
    m.responsavel.toLowerCase().includes(nomeConsultor.toLowerCase())
  );
  
  if (!metaConsultor) {
    console.error('❌ Consultor não encontrado nas metas');
    console.groupEnd();
    return;
  }
  
  console.log('📊 Meta encontrada:', metaConsultor);
  
  // Filtrar vendas do consultor
  const vendasConsultor = todasVendas.filter(v => 
    v.responsavel.toLowerCase() === metaConsultor.responsavel.toLowerCase()
  );
  
  console.log(`📈 Total de vendas encontradas: ${vendasConsultor.length}`);
  
  // Verificar se a unidade bateu a meta
  const metaUnidade = configRem.metaUnidade || 0;
  const totalVendasUnidade = todasVendas.reduce((s, v) => s + Number(v.valor || 0), 0);
  const unidadeBatida = totalVendasUnidade >= metaUnidade;
  
  console.log('🏢 Status da unidade:', {
    metaUnidade,
    totalVendasUnidade,
    unidadeBatida,
    metaIndividual: metaConsultor.meta
  });
  
  // Calcular remuneração usando a função principal
  const remuneracao = calcularRemuneracao(
    Number(metaConsultor.meta || 0),
    vendasConsultor,
    metaConsultor.remuneracaoType || 'comissao',
    unidadeBatida,
    configRem
  );
  
  console.log('💰 Remuneração calculada:', remuneracao);
  
  // Comparar com o PlanosVisualizer
  console.log('🔄 Comparando com PlanosVisualizer...');
  const comparacao = compararComPlanosVisualizer(
    vendasConsultor,
    configRem,
    Number(metaConsultor.meta || 0),
    unidadeBatida
  );
  
  console.log('📊 Resumo da comparação:', comparacao.resumo);
  
  // Mostrar detalhes das primeiras 5 vendas
  console.log('📋 Detalhes das primeiras 5 vendas (Metas vs PlanosVisualizer):');
  for (let i = 0; i < Math.min(5, vendasConsultor.length); i++) {
    const venda = vendasConsultor[i];
    const detalheMetas = comparacao.detalhesMetas.find(d => d.id === i);
    const detalhePV = comparacao.detalhesPV.find(d => d.id === i);
    
    console.log(`\n📦 Venda #${i + 1}: R$ ${Number(venda.valor || 0).toLocaleString('pt-BR')} (${venda.produto || 'N/A'})`);
    console.log('   Metas.jsx:', {
      plano: detalheMetas?.plano || 'N/A',
      tipoCalculo: detalheMetas?.tipoCalculo || 'N/A',
      comissao: detalheMetas?.comissao?.toFixed(2) || '0.00'
    });
    console.log('   PlanosVisualizer:', {
      plano: detalhePV?.plano || 'N/A',
      tipoCalculo: detalhePV?.tipoCalculo || 'N/A',
      comissao: detalhePV?.comissao?.toFixed(2) || '0.00'
    });
  }
  
  console.groupEnd();
  
  return {
    meta: metaConsultor,
    vendas: vendasConsultor,
    remuneracao,
    comparacao
  };
}

// 🔍 FUNÇÃO DE DEBUG - ADICIONE TEMPORARIAMENTE
function debugCalculoASMIHS(vendasArr, configRem) {
  console.group("🔍 DEBUG DETALHADO - ASMIHS");
  
  console.log("📊 Dados de entrada:");
  console.log("- Total de vendas:", vendasArr.length);
  console.log("- Planos configurados:", configRem.comissaoPlanos);
  console.log("- Meta da unidade:", configRem.metaUnidade);
  
  const totalVendas = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
  console.log("- Total em vendas: R$", totalVendas.toLocaleString('pt-BR'));
  
  // Verificar cada venda individualmente
  let totalComissao = 0;
  let totalPlanos = 0;
  let totalOutros = 0;
  
  console.log("\n📋 ANÁLISE VENDA POR VENDA:");
  
  vendasArr.forEach((venda, index) => {
    const valor = Number(venda.valor || 0);
    
    // Verificar se encaixa em algum plano
    const plano = configRem.comissaoPlanos?.find(p => 
      valor >= (p.min || 0) && valor <= (p.max || Infinity)
    );
    
    if (plano) {
      // É um plano
      const comissao = plano.comMeta || 0; // Assumindo que bateu meta individual
      totalComissao += comissao;
      totalPlanos += comissao;
      
      console.log(`${index + 1}. 💎 R$ ${valor.toLocaleString('pt-BR')} (${venda.produto || 'N/A'}) → Plano ${plano.plano} → R$ ${comissao}`);
    } else {
      // Não é um plano
      const comissao = valor * 0.015; // Assumindo que bateu meta (1,5%)
      totalComissao += comissao;
      totalOutros += comissao;
      
      console.log(`${index + 1}. 📦 R$ ${valor.toLocaleString('pt-BR')} (${venda.produto || 'N/A'}) → Outros 1,5% → R$ ${comissao.toFixed(2)}`);
    }
  });
  
  console.log("\n💰 RESUMO FINAL:");
  console.log("- Comissão dos planos: R$", totalPlanos.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log("- Comissão dos outros: R$", totalOutros.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log("- TOTAL CALCULADO: R$", totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  console.log("- DIFERENÇA COM METAS: R$", (3080.10 - totalComissao).toFixed(2));
  
  console.groupEnd();
  
  return totalComissao;
}

/**
 * ADICIONE ESTA CHAMADA na parte onde você calcula a remuneração do ASMIHS
 * Substitua a linha onde você chama calcularRemuneracao para ASMIHS por:
 */

// No loop das metas, onde você calcula a remuneração, adicione isto APENAS para ASMIHS:
/*
if (m.responsavel.trim().toLowerCase().includes('asmihs')) {
  console.log("🎯 DEBUGANDO ASMIHS ESPECIFICAMENTE:");
  
  const vendasDoResp = vendasParaMeta.filter(
    (v) => v.responsavel.trim().toLowerCase() === m.responsavel.trim().toLowerCase()
  );
  
  console.log("Vendas encontradas para ASMIHS:", vendasDoResp.length);
  console.log("ConfigRem atual:", configRem);
  
  // Debug detalhado
  const debugResult = debugCalculoASMIHS(vendasDoResp, configRem);
  
  // Calcular com a função original
  const remuneracaoOriginal = calcularRemuneracao(
    Number(m.meta),
    vendasDoResp,
    m.remuneracaoType,
    unidadeBatida,
    configRem
  );
  
  console.log("Resultado função original:", remuneracaoOriginal);
  console.log("Resultado debug:", debugResult);
  console.log("---");
}
*/

/**
 * EXEMPLO DE COMO USAR:
 * 
 * 1. Adicione a função debugCalculoASMIHS no seu arquivo Metas.jsx
 * 2. No loop onde você renderiza as linhas da tabela, adicione o código comentado acima
 * 3. Recarregue a página e veja os logs no console
 * 4. Compare os valores para identificar onde está a diferença
 */
  
  // --- Configuração de remuneração ---
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    async function loadConfig() {
      if (!unidade) return;
      
      try {
        setLoadingConfig(true);
        
        // Obter o mês atual para buscar a configuração correta
        const agora = new Date();
        const anoAtual = agora.getFullYear();
        const mesAtualNum = agora.getMonth() + 1;
        const mesAtual = `${anoAtual}-${String(mesAtualNum).padStart(2, '0')}`;
        
        // Função para carregar configuração de um mês específico
        const carregarConfigMes = async (ano, mes) => {
          const mesFormatado = `${ano}-${String(mes).padStart(2, '0')}`;
          const docRef = doc(
            db, 
            "faturamento", 
            unidade.toLowerCase(), 
            "configRemuneracao", 
            `premiacao-${mesFormatado}`
          );
          
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log(`✅ Configuração encontrada para ${mesFormatado}`);
            return {
              premiacao: Array.isArray(data.premiacao) ? data.premiacao : [],
              comissaoPlanos: Array.isArray(data.comissaoPlanos) ? data.comissaoPlanos : [],
              metaUnidade: Number(data.metaUnidade) || 0,
              taxaSem: Number(data.taxaSem) || 0.012,
              taxaCom: Number(data.taxaCom) || 0.015,
              mesReferencia: mesFormatado
            };
          }
          
          return null;
        };
        
        // Tenta carregar a configuração do mês atual
        let config = await carregarConfigMes(anoAtual, mesAtualNum);
        
        // Se não encontrar, tenta o mês anterior
        if (!config) {
          let mesAnterior = mesAtualNum - 1;
          let anoAnterior = anoAtual;
          
          if (mesAnterior === 0) {
            mesAnterior = 12;
            anoAnterior--;
          }
          
          console.log(`⚠️ Configuração não encontrada para ${mesAtual}, tentando ${anoAnterior}-${String(mesAnterior).padStart(2, '0')}...`);
          config = await carregarConfigMes(anoAnterior, mesAnterior);
        }
        
        // Se ainda não encontrou, usa valores padrão
        if (!config) {
          console.log("ℹ️ Usando configuração padrão");
          config = {
            premiacao: [],
            comissaoPlanos: [],
            metaUnidade: 0,
            taxaSem: 0.012,
            taxaCom: 0.015,
            mesReferencia: mesAtual
          };
        }
        
        if (isMounted) {
          setConfigRem(config);
          console.log("✅ Configuração de remuneração carregada com sucesso");
        }
      } catch (error) {
        console.error("🚨 Erro ao carregar configuração de remuneração:", error);
        
        if (isMounted) {
          setConfigRem({
            premiacao: [],
            comissaoPlanos: [],
            metaUnidade: 0,
            taxaSem: 0.012,
            taxaCom: 0.015,
            mesReferencia: dayjs().format('YYYY-MM')
          });
        }
      } finally {
        if (isMounted) {
          setLoadingConfig(false);
        }
      }
    }
    
    loadConfig();
    
    return () => {
      isMounted = false;
    };
  }, [unidade]);


  // --- Carrega metas, vendas e produtos ---
  useEffect(() => {
    if (!unidade) return;
    // Metas
    const metasRef = collection(db, "faturamento", unidade.toLowerCase(), "metas");
    const unsubMetas = onSnapshot(
      metasRef,
      snap => setMetas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => {
        console.error(e);
        setError("Falha ao carregar metas");
        setLoading(false);
      }
    );

    // Vendas
    const vendasQuery = collectionGroup(db, "vendas");
    const unsubVendas = onSnapshot(
      vendasQuery,
      snap => {
        const data = snap.docs.map(d => d.data());
        setVendas(data);
        // extrai produtos únicos
        const setProd = new Set();
        data.forEach(v => v.produto && setProd.add(v.produto.trim()));
        setProdutos(Array.from(setProd).sort());
        setLoading(false);
      },
      e => {
        console.error(e);
        setError("Falha ao carregar vendas");
        setLoading(false);
      }
    );

    return () => {
      unsubMetas();
      unsubVendas();
    };
  }, [unidade]);

  // --- Filtra vendas por produto e mês ---
  const vendasParaMeta = useMemo(() => {
    if (!produtosLoaded) return [];
    return vendas.filter(v => {
      const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
      return (
        v.produto &&
        produtosSelecionados.includes(v.produto.trim()) &&
        mes === selectedMonth
      );
    });
  }, [vendas, produtosSelecionados, selectedMonth, produtosLoaded]);

  // --- Checa meta da unidade ---
  const totalUnidade = useMemo(
    () => vendasParaMeta.reduce((s, v) => s + Number(v.valor || 0), 0),
    [vendasParaMeta]
  );
  
  // metaUnidade vem do configRem.metaUnidade
  const unidadeBatida = totalUnidade >= Number(configRem?.metaUnidade || 0);
  

  // --- Responsáveis únicos ---
  const responsaveisUnicos = useMemo(
    () => {
      const todos = metas.map(m => m.responsavel.trim());
      
      const unicos = new Set(todos);
      return Array.from(unicos).sort((a, b) =>
        a.localeCompare(b, "pt", { sensitivity: "base" })
      );
    },
    [metas]
  );
  

  // --- CRUD de Metas ---
  const [newResponsavel, setNewResponsavel]   = useState("");
  const [newMeta, setNewMeta]                 = useState("");
  const [metaPeriodo, setMetaPeriodo]         = useState(dayjs().format("YYYY-MM"));
  const [editingId, setEditingId]             = useState(null);
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editMeta, setEditMeta]               = useState("");
  const [editPeriodo, setEditPeriodo]         = useState("");
  const [newRemType, setNewRemType]           = useState("comissao");
  const [editRemType, setEditRemType]         = useState("comissao");

  function parseBRNumber(str) {
    return Number(str.replace(/\./g, "").replace(",", "."));
  }

  const handleAddMeta = async e => {
    e.preventDefault(); setError("");
    if (!newResponsavel || !newMeta) { setError("Preencha todos os campos"); return; }
    try {
      await addDoc(
        collection(db, "faturamento", unidade.toLowerCase(), "metas"),
        {
          responsavel: newResponsavel.trim(),
          periodo: metaPeriodo,
          remuneracaoType: newRemType,
          meta: parseBRNumber(newMeta),
          createdAt: dayjs().toISOString(),
        }
      );
      setSuccessMessage("Meta adicionada!");
      setNewResponsavel(""); setNewMeta("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch(err) {
      console.error(err); setError("Erro ao adicionar meta");
    }
  };

  const handleEditMeta = m => {
    setEditingId(m.id);
    setEditResponsavel(m.responsavel);
    setEditMeta(m.meta.toString());
    setEditPeriodo(m.periodo);
    setEditRemType(m.remuneracaoType||"comissao");
  };

  const handleSaveEditedMeta = async id => {
    if (!editResponsavel||!editMeta||!editPeriodo) {
      setError("Preencha todos os campos de edição."); return;
    }
    try {
      await updateDoc(
        doc(db, "faturamento", unidade.toLowerCase(), "metas", id),
        {
          responsavel: editResponsavel.trim(),
          meta: parseBRNumber(editMeta),
          periodo: editPeriodo,
          remuneracaoType: editRemType,
        }
      );
      setSuccessMessage("Meta atualizada!"); setEditingId(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch(err) {
      console.error(err); setError("Erro ao salvar edição");
    }
  };

  const handleDeleteMeta = async id => {
    if (!window.confirm("Excluir esta meta?")) return;
    try {
      await deleteDoc(
        doc(db, "faturamento", unidade.toLowerCase(), "metas", id)
      );
      setSuccessMessage("Meta excluída!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch(err) {
      console.error(err); setError("Erro ao excluir meta");
    }
  };

  // --- Dados para gráfico ---
  const dadosGrafico = useMemo(() => {
    return metas
      .filter(m => m.periodo === selectedMonth)
      .map(m => {
        const totalV = vendasParaMeta
          .filter(v => v.responsavel.trim().toLowerCase() === m.responsavel.trim().toLowerCase())
          .reduce((s,v) => s + Number(v.valor||0), 0);
        return { nome: m.responsavel, vendas: totalV, meta: Number(m.meta) };
      });
  }, [metas, vendasParaMeta, selectedMonth]);

  const ordenado = useMemo(() =>
    [...dadosGrafico].sort((a,b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
  ,[dadosGrafico]);

  const chartData = {
    labels: ordenado.map(d => d.nome),
    datasets: [
      { type: "bar", label: "Meta", data: ordenado.map(d => d.meta), borderRadius:4, backgroundColor: "#10B981" },
      { type: "bar", label: "Realizado", data: ordenado.map(d => d.vendas), borderRadius:4, backgroundColor: "#3B82F6" }
    ],
  };

  // --- Paginação ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const paginatedVendas = vendasParaMeta.slice(
    (currentPage-1)*itemsPerPage,
    currentPage*itemsPerPage
  );
  useEffect(() => {
    // Expor variáveis no window para debug
    window.DEBUG_METAS = {
      vendas,
      vendasParaMeta,
      produtosSelecionados,
      produtosLoaded,
      selectedMonth,
      configRem,
      unidadeBatida,
      metas,
      unidade,
      totalUnidade
    };
    
    // Também expor individualmente para compatibilidade com funções de debug
    window.vendas = vendas;
    window.vendasParaMeta = vendasParaMeta;
    window.produtosSelecionados = produtosSelecionados;
    window.produtosLoaded = produtosLoaded;
    window.selectedMonth = selectedMonth;
    window.configRem = configRem;
    window.unidadeBatida = unidadeBatida;
    window.metas = metas;
    window.unidade = unidade;
    window.totalUnidade = totalUnidade;
    
    // Debug automático quando dados estão disponíveis
    if (vendas.length > 0 && produtosLoaded) {
      console.log("🔧 Variáveis expostas para debug:", {
        vendas: vendas.length,
        vendasParaMeta: vendasParaMeta.length,
        produtosSelecionados: produtosSelecionados?.length || 0,
        selectedMonth,
        unidade,
        configRem: configRem ? 'carregado' : 'não carregado',
        unidadeBatida
      });
      
      // Debug automático se houver problema com produtos selecionados
      if (produtosSelecionados?.length === 0) {
        console.warn("⚠️ PRODUTOS SELECIONADOS VAZIO! Isso pode causar problemas no filtro.");
        console.log("💡 Selecione produtos no filtro ou use debugProblemaReal() para mais detalhes.");
      }
    }
  }, [
    vendas, 
    vendasParaMeta, 
    produtosSelecionados, 
    produtosLoaded, 
    selectedMonth, 
    configRem, 
    unidadeBatida, 
    metas, 
    unidade, 
    totalUnidade
  ]);
  window.debugMelhorado = function debugMelhorado() {
    console.group("🔍 DEBUG MELHORADO - COM VARIÁVEIS EXPOSTAS");
    
    const debug = window.DEBUG_METAS || {};
    
    console.log("1️⃣ ESTADO GERAL:");
    console.log("- Unidade:", debug.unidade);
    console.log("- Mês selecionado:", debug.selectedMonth);
    console.log("- Total vendas:", debug.vendas?.length || 0);
    console.log("- Vendas para meta:", debug.vendasParaMeta?.length || 0);
    console.log("- Produtos selecionados:", debug.produtosSelecionados?.length || 0);
    console.log("- Produtos carregados:", debug.produtosLoaded);
    
    console.log("\n2️⃣ CONFIGURAÇÃO:");
    console.log("- Config carregada:", debug.configRem ? 'SIM' : 'NÃO');
    console.log("- Planos configurados:", debug.configRem?.comissaoPlanos?.length || 0);
    console.log("- Meta da unidade:", debug.configRem?.metaUnidade);
    console.log("- Unidade batida:", debug.unidadeBatida);
    
    // Verificar ASMIHS especificamente
    const vendasASMIHS = (debug.vendasParaMeta || []).filter(v => 
      v.responsavel?.toLowerCase().includes('asmihs')
    );
    
    console.log("\n3️⃣ ASMIHS ESPECÍFICO:");
    console.log("- Vendas encontradas:", vendasASMIHS.length);
    
    if (vendasASMIHS.length > 0) {
      const valorTotal = vendasASMIHS.reduce((s, v) => s + Number(v.valor || 0), 0);
      console.log("- Valor total:", valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
      
      console.log("- Amostra de vendas:");
      vendasASMIHS.slice(0, 3).forEach((v, i) => {
        console.log(`  ${i+1}. R$ ${Number(v.valor).toLocaleString('pt-BR')} - ${v.produto} - ${v.dataFormatada}`);
      });
      
      // Calcular remuneração se tiver dados suficientes
      const metaASMIHS = debug.metas?.find(m => 
        m.responsavel.toLowerCase().includes('asmihs')
      );
      
      if (metaASMIHS && debug.configRem?.comissaoPlanos) {
        console.log("\n4️⃣ CÁLCULO REMUNERAÇÃO ASMIHS:");
        console.log("- Meta individual:", Number(metaASMIHS.meta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        
        // Usar a função de cálculo
        try {
          const remuneracao = calcularRemuneracao(
            Number(metaASMIHS.meta),
            vendasASMIHS,
            metaASMIHS.remuneracaoType || 'comissao',
            debug.unidadeBatida,
            debug.configRem
          );
          console.log("- Remuneração calculada:", remuneracao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        } catch (error) {
          console.error("Erro ao calcular remuneração:", error);
        }
      }
    }
    
    // Verificar problemas comuns
    console.log("\n5️⃣ VERIFICAÇÃO DE PROBLEMAS:");
    
    const problemas = [];
    
    if (!debug.produtosSelecionados || debug.produtosSelecionados.length === 0) {
      problemas.push("❌ Produtos selecionados está vazio");
    }
    
    if (!debug.configRem || !debug.configRem.comissaoPlanos) {
      problemas.push("❌ Configuração de remuneração não carregada");
    }
    
    if (debug.vendas?.length === 0) {
      problemas.push("❌ Nenhuma venda encontrada");
    }
    
    if (debug.vendasParaMeta?.length === 0 && debug.vendas?.length > 0) {
      problemas.push("❌ Filtro está bloqueando todas as vendas");
    }
    
    if (problemas.length > 0) {
      console.log("🚨 PROBLEMAS ENCONTRADOS:");
      problemas.forEach(p => console.log(p));
    } else {
      console.log("✅ Nenhum problema óbvio encontrado");
    }
    
    console.log("\n💡 PRÓXIMOS PASSOS:");
    
    if (!debug.produtosSelecionados || debug.produtosSelecionados.length === 0) {
      console.log("1. Vá em 'Filtrar Produtos' e marque todos os produtos");
    }
    
    if (debug.selectedMonth !== '2025-07') {
      console.log("2. Mude o mês para 2025-07 (julho) para ver os dados da imagem");
    }
    
    console.log("3. Execute debugConsultor('asmihs') para análise detalhada");
    
    console.groupEnd();
    
    return debug;
  };
  
  // FUNÇÃO ESPECÍFICA PARA DEBUGAR UM CONSULTOR
  window.debugConsultor = function debugConsultor(nomeConsultor) {
    const debug = window.DEBUG_METAS || {};
    
    console.group(`🔍 DEBUG CONSULTOR: ${nomeConsultor.toUpperCase()}`);
    
    // Encontrar vendas do consultor
    const vendasConsultor = (debug.vendasParaMeta || []).filter(v => 
      v.responsavel.toLowerCase().includes(nomeConsultor.toLowerCase())
    );
    
    console.log("📊 Vendas encontradas:", vendasConsultor.length);
    
    if (vendasConsultor.length === 0) {
      console.log("❌ Nenhuma venda encontrada para este consultor");
      console.log("Verificar:");
      console.log("1. Nome do consultor está correto?");
      console.log("2. Mês selecionado tem vendas?");
      console.log("3. Produtos estão selecionados no filtro?");
      console.groupEnd();
      return;
    }
    
    // Mostrar todas as vendas
    console.log("\n📋 LISTA DE VENDAS:");
    vendasConsultor.forEach((v, i) => {
      console.log(`${i+1}. R$ ${Number(v.valor).toLocaleString('pt-BR')} - ${v.produto} - ${v.dataFormatada}`);
    });
    
    const valorTotal = vendasConsultor.reduce((s, v) => s + Number(v.valor || 0), 0);
    console.log(`\n💰 VALOR TOTAL: ${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    
    // Encontrar meta do consultor
    const metaConsultor = debug.metas?.find(m => 
      m.responsavel.toLowerCase().includes(nomeConsultor.toLowerCase())
    );
    
    if (metaConsultor) {
      console.log(`\n🎯 META: ${Number(metaConsultor.meta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
      console.log(`📊 % ATINGIDO: ${(valorTotal / Number(metaConsultor.meta) * 100).toFixed(2)}%`);
      
      // Calcular remuneração se tiver configuração
      if (debug.configRem?.comissaoPlanos) {
        try {
          const remuneracao = calcularRemuneracao(
            Number(metaConsultor.meta),
            vendasConsultor,
            metaConsultor.remuneracaoType || 'comissao',
            debug.unidadeBatida,
            debug.configRem
          );
          console.log(`💵 REMUNERAÇÃO: ${remuneracao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
        } catch (error) {
          console.error("Erro ao calcular remuneração:", error);
        }
      }
    } else {
      console.log("❌ Meta não encontrada para este consultor");
    }
    
    console.groupEnd();
  };
  
  console.log("🔧 Funções de debug melhoradas carregadas!");
  console.log("📱 Comandos disponíveis:");
  console.log("- debugMelhorado() - Análise geral");
  console.log("- debugConsultor('asmihs') - Análise específica de consultor");

  if (loading) {
    return (
      <div className="loading-state">
        <Loading3D size={120} />
        <p>Carregando dados...</p>
      </div>
    );
  }
  
  

  return (
    <div className="metas-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>GestãoApp</h2>
        </div>
        <NavBar />
      </aside>
      <main className="metas-content">
      <header className="metas-header">
      <div className="header-content">
        <h1>
          <span className="decorative-line"></span>
          Metas de Vendas - {unidade.toUpperCase()}
        </h1>
        <form onSubmit={handleAddMeta} className="meta-form">
          <div className="form-group">
            <div className="form-row">
              {/* Campo para selecionar o Responsável */}
              <div className="input-group">
                <label htmlFor="responsavel">Responsável</label>
                <input
                  id="responsavel"
                  type="text"
                  list="responsaveisList"
                  placeholder="Selecione ou digite o Responsável"
                  value={newResponsavel}
                  onChange={(e) => setNewResponsavel(e.target.value)}
                  className="modern-input"
                />
                <datalist id="responsaveisList">
                  {responsaveisUnicos.map((nome) => (
                    <option key={nome} value={nome} />
                  ))}
                </datalist>
              </div>

              {/* Campo para digitar o valor da meta */}
              <div className="input-group">
                <label htmlFor="meta">Valor da Meta</label>
                <div className="currency-input-wrapper">
                  <span className="currency-symbol">R$</span>
                  <input
                    id="meta"
                    type="number"
                    placeholder="0,00"
                    value={newMeta}
                    onChange={(e) => setNewMeta(e.target.value)}
                    className="modern-input"
                  />
                </div>
              </div>

              {/* Campo para selecionar o período da meta */}
              <div className="input-group">
                <label htmlFor="periodo">Período</label>
                <input 
                  id="periodo"
                  type="month"
                  value={metaPeriodo}
                  onChange={(e) => setMetaPeriodo(e.target.value)}
                  className="modern-input"
                />
              </div>
            </div>

            <button type="submit" className="submit-button">
              Adicionar Meta
            </button>
          </div>
        </form>
      </div>
    </header>
  
        {(error || successMessage) && (
          <div className={`alert ${error ? 'error' : 'success'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="alert-icon" viewBox="0 0 24 24">
              {error ? (
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              ) : (
                <path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-3-7l-9 9 3 3 9-9-3-3z" />
              )}
            </svg>
            {error || successMessage}
          </div>
        )}
<section className="metas-list">
  <div className="section-header">
    <h2>Metas Cadastradas</h2>
    <span className="total-metas">{metas.length} metas registradas</span>
    <div className="filter-group month-filter" style={{ marginTop: "1rem" }}>
      <label>Selecione o Período:</label>
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="modern-input"
      />
    </div>
  </div>

   {/* Tabela de Metas */}
          <table className="data-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Responsável</th>
                <th>Meta (R$)</th>
                <th>Vendas (R$)</th>
                <th>% Meta</th>
                <th>Remuneração (R$)</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
            {metas
    .filter((m) => m.periodo === selectedMonth)
    .sort((a, b) =>
      a.responsavel
        .trim()
        .localeCompare(b.responsavel.trim(), "pt", { sensitivity: "base" })
    )
    .map((m) => {
      // 1) filtra vendas por consultor
      const vendasDoResp = vendasParaMeta.filter(
        (v) =>
          v.responsavel.trim().toLowerCase() ===
          m.responsavel.trim().toLowerCase()
      );

      // 1.1) soma total das vendas para exibir e calcular % Meta
      const totalV = vendasDoResp.reduce(
        (soma, v) => soma + Number(v.valor || 0),
        0
      );

      // 2) chama a função única que engloba toda a lógica de remuneração
      const remuneracao = calcularRemuneracao(
        Number(m.meta),     // meta individual
        vendasDoResp,       // array de vendas do consultor
        m.remuneracaoType,  // "comissao" ou "premiacao"
        unidadeBatida,
        configRem
      );

      // 3) percentual de meta atingido
      // 🔧 VALIDAÇÃO ROBUSTA: Previne problemas intermitentes
      let pctMeta = 0;
      const metaValor = Number(m.meta || 0);
      const totalVendas = Number(totalV || 0);
      
      if (metaValor > 0 && !isNaN(totalVendas) && !isNaN(metaValor)) {
        pctMeta = (totalVendas / metaValor) * 100;
        
        // Validação adicional para valores extremos
        if (!isFinite(pctMeta) || pctMeta < 0) {
          console.warn(`Percentual inválido para ${m.responsavel}:`, {
            totalVendas,
            metaValor,
            pctMeta
          });
          pctMeta = 0;
        }
      } else if (metaValor <= 0) {
        console.warn(`Meta inválida para ${m.responsavel}:`, metaValor);
        pctMeta = 0;
      }

      const isEditing = editingId === m.id;

      return (
        <tr key={m.id}>
          <td>{isEditing ? (
            <input
              type="month"
              value={editPeriodo}
              onChange={(e) => setEditPeriodo(e.target.value)}
              className="modern-input"
            />
          ) : (
            m.periodo
          )}</td>

          <td>{isEditing ? (
            <input
              type="text"
              value={editResponsavel}
              onChange={(e) => setEditResponsavel(e.target.value)}
              className="modern-input"
            />
          ) : (
            m.responsavel
          )}</td>

          <td>{isEditing ? (
            <input
              type="number"
              value={editMeta}
              onChange={(e) => setEditMeta(e.target.value)}
              className="modern-input"
            />
          ) : (
            Number(m.meta).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          )}</td>

          <td>
            {totalV.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </td>

          <td>
            {isNaN(pctMeta) || !isFinite(pctMeta) ? 
              <span style={{color: '#ef4444'}}>--</span> : 
              `${pctMeta.toFixed(2)}%`
            }
          </td>

          <td>
            {remuneracao.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              
            })}
          </td>

          <td>{isEditing ? (
            <select
              value={editRemType}
              onChange={(e) => setEditRemType(e.target.value)}
              className="modern-input"
            >
              <option value="comissao">Comissão</option>
              <option value="premiacao">Premiação</option>
              
            </select>
          ) : m.remuneracaoType === "comissao" ? (
            "Comissão"
          ) : (
            "Premiação"
          )}</td>

          <td className="actions">
          {isEditing ? (
                    <>
                      <button
                        className="success-button"
                        onClick={() => handleSaveEditedMeta(m.id)}
                      >
                        ✓
                      </button>
                      <button
                        className="cancel-button"
                        onClick={() => setEditingId(null)}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="edit-button"
                        onClick={() => handleEditMeta(m)}
                      >
                        ✎
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteMeta(m.id)}
                      >
                        🗑
                      </button>
              </>
            )}
          </td>
        </tr>
      );
    })}
</tbody>

          </table>
        </section>
        

        




  
        <section className="product-filter-section">
          <button
            className="toggle-product-filter"
            onClick={() => setShowProductFilter(!showProductFilter)}
          >
            {showProductFilter ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="filter-icon" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
                Fechar Filtro
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="filter-icon" viewBox="0 0 24 24">
                  <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                </svg>
                Filtrar Produtos
              </>
            )}
          </button>
          
          {showProductFilter && (
            <div className="product-filter-grid">
              {produtos.map((produto, index) => (
                <label key={index} className="product-card">
                  <input
                    type="checkbox"
                    checked={produtosSelecionados.includes(produto)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProdutosSelecionados(prev => [...prev, produto]);
                      } else {
                        setProdutosSelecionados(prev => prev.filter(p => p !== produto));
                      }
                    }}
                  />
                  <div className="card-content">
                    <span className="checkmark">
                      <svg viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </span>
                    {produto}
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>
  
        <section className="chart-section">
          <div className="section-header">
            <h2>Desempenho vs Metas</h2>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="color-box achieved"></div>
                Atingido
              </div>
              <div className="legend-item">
                <div className="color-box pending"></div>
                Meta
              </div>
            </div>
          </div>
          <div className="chart-wrapper">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    // inverte a ordem na legenda, pra bater com o gráfico
                    filter: (_, i) => i > -1,
                  },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      `R$ ${ctx.raw.toLocaleString("pt-BR")}`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (v) => `R$ ${v.toLocaleString("pt-BR")}`,
                  },
                },
              },
            }}
          />
          </div>
        </section>  
      </main>
  
      <style>{`
  /* Light Mode Default Values */
  :root {
    --primary-color: #3b82f6;
    --primary-hover: #2563eb;
    --primary-light: #dbeafe;
    --primary-lighter: #eff6ff;
    --accent-color: #10b981;
    --accent-light: #d1fae5;
    --error-color: #ef4444;
    --error-light: #fef2f2;
    --error-lighter: #fee2e2;
    --success-color: #10b981;
    --success-light: #d1fae5;
    --success-lighter: #ecfdf5;
    --text-color: #1e293b;
    --text-secondary: #4b5563;
    --text-light: #64748b;
    --text-muted: #9ca3af;
    --text-placeholder: #9ca3af;
    --text-currency: #6b7280;
    --border-color: #e2e8f0;
    --border-input: #e5e7eb;
    --border-hover: #cbd5e1;
    --border-focus: #6366f1;
    --bg-color: #f8fafc;
    --bg-secondary: #f9fafb;
    --bg-hover: #f1f5f9;
    --card-bg: #ffffff;
    --input-bg: #f9fafb;
    --input-focus-bg: #ffffff;
    --table-hover: rgba(0, 0, 0, 0.01);
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    --shadow-light: 0 2px 4px rgba(0, 0, 0, 0.05);
    --shadow-focus: 0 0 0 3px rgba(99, 102, 241, 0.1);
    --shadow-focus-strong: 0 0 0 3px rgba(99, 102, 241, 0.3);
    --radius: 8px;
    --transition: all 0.3s ease;
    --header-height: 72px;
  }

  /* Manual Dark Mode Classes */
  .dark,
  [data-theme="dark"] {
    --primary-color: #60a5fa;
    --primary-hover: #3b82f6;
    --primary-light: rgba(96, 165, 250, 0.1);
    --primary-lighter: rgba(96, 165, 250, 0.05);
    --accent-color: #34d399;
    --accent-light: rgba(52, 211, 153, 0.1);
    --error-color: #f87171;
    --error-light: rgba(248, 113, 113, 0.1);
    --error-lighter: rgba(248, 113, 113, 0.05);
    --success-color: #34d399;
    --success-light: rgba(52, 211, 153, 0.1);
    --success-lighter: rgba(52, 211, 153, 0.05);
    --text-color: #f1f5f9;
    --text-secondary: #e2e8f0;
    --text-light: #94a3b8;
    --text-muted: #64748b;
    --text-placeholder: #64748b;
    --text-currency: #94a3b8;
    --border-color: #374151;
    --border-input: #4b5563;
    --border-hover: #6b7280;
    --border-focus: #60a5fa;
    --bg-color: #0f172a;
    --bg-secondary: #1e293b;
    --bg-hover: #334155;
    --card-bg: #1e293b;
    --input-bg: #334155;
    --input-focus-bg: #475569;
    --table-hover: rgba(255, 255, 255, 0.02);
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    --shadow-light: 0 2px 4px rgba(0, 0, 0, 0.2);
    --shadow-focus: 0 0 0 3px rgba(96, 165, 250, 0.2);
    --shadow-focus-strong: 0 0 0 3px rgba(96, 165, 250, 0.4);
  }

  /* Base Styles */
  .metas-layout {
    display: flex;
    margin-left: 140px;
    min-height: 100vh;
    background-color: var(--bg-color);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    transition: var(--transition);
  }
    
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    line-height: 1.5;
    transition: var(--transition);
  }

  /* Layout Structure */
  .metas-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .metas-content {
    padding: 2rem;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
  }

  /* Header Styles */
  .metas-header {
    background-color: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    margin-bottom: 2rem;
    border: 1px solid var(--border-color);
    transition: var(--transition);
  }

  .header-content h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    color: var(--text-color);
  }

  .decorative-line {
    display: inline-block;
    width: 4px;
    height: 24px;
    background-color: var(--primary-color);
    margin-right: 12px;
    border-radius: 2px;
  }

  /* Form Styles */
  .meta-form {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: var(--shadow-light);
    margin-bottom: 2rem;
    transition: var(--transition);
  }

  .form-group {
    width: 100%;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .modern-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-input);
    border-radius: 8px;
    font-size: 0.875rem;
    color: var(--text-color);
    background-color: var(--input-bg);
    transition: var(--transition);
  }

  .modern-input:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: var(--shadow-focus);
    background-color: var(--input-focus-bg);
  }

  .modern-input:hover {
    border-color: var(--border-hover);
  }

  .modern-input::placeholder {
    color: var(--text-placeholder);
  }

  .currency-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .currency-symbol {
    position: absolute;
    left: 1rem;
    color: var(--text-currency);
    font-size: 0.875rem;
    z-index: 1;
  }

  .currency-input-wrapper input {
    padding-left: 2.5rem;
  }

  .submit-button {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: var(--transition);
  }

  .submit-button:hover {
    background-color: var(--primary-hover);
    transform: translateY(-1px);
  }

  .submit-button:focus {
    outline: none;
    box-shadow: var(--shadow-focus-strong);
  }

  .submit-button:active {
    transform: translateY(0);
  }

  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .meta-form {
      padding: 1rem;
    }
  }

  /* Alert Styles */
  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--radius);
    margin: 1rem 0;
    transition: var(--transition);
  }

  .alert.error {
    background-color: var(--error-light);
    color: var(--error-color);
    border-left: 4px solid var(--error-color);
    border: 1px solid var(--error-color);
  }

  .alert.success {
    background-color: var(--success-light);
    color: var(--success-color);
    border-left: 4px solid var(--success-color);
    border: 1px solid var(--success-color);
  }

  .alert-icon {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  /* Table Styles */
  .section-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-right: auto;
    color: var(--text-color);
  }

  .total-metas {
    color: var(--text-light);
    font-size: 14px;
    background-color: var(--bg-secondary);
    padding: 4px 12px;
    border-radius: 50px;
    border: 1px solid var(--border-color);
  }

  .metas-list {
    background-color: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    margin-bottom: 2rem;
    border: 1px solid var(--border-color);
    transition: var(--transition);
  }

  .month-filter {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .month-filter label {
    font-size: 14px;
    color: var(--text-light);
  }

  .table-wrapper {
    overflow-x: auto;
    border-radius: var(--radius);
    border: 1px solid var(--border-color);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th,
  .data-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .data-table th {
    background-color: var(--bg-secondary);
    font-weight: 600;
    font-size: 14px;
    color: var(--text-light);
  }

  .data-table tr:last-child td {
    border-bottom: none;
  }

  .data-table tbody tr:hover {
    background-color: var(--table-hover);
  }

  .data-table tbody tr {
    transition: var(--transition);
  }

  /* Action buttons */
  .actions {
    display: flex;
    gap: 8px;
  }

  .edit-button,
  .delete-button,
  .success-button,
  .cancel-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius);
    border: none;
    cursor: pointer;
    transition: var(--transition);
  }

  .edit-button {
    background-color: var(--primary-light);
    color: var(--primary-color);
  }

  .edit-button:hover {
    background-color: var(--primary-lighter);
    transform: scale(1.05);
  }

  .delete-button {
    background-color: var(--error-light);
    color: var(--error-color);
  }

  .delete-button:hover {
    background-color: var(--error-lighter);
    transform: scale(1.05);
  }

  .success-button {
    background-color: var(--success-light);
    color: var(--success-color);
  }

  .success-button:hover {
    background-color: var(--success-lighter);
    transform: scale(1.05);
  }

  .cancel-button {
    background-color: rgba(100, 116, 139, 0.1);
    color: var(--text-light);
  }

  .cancel-button:hover {
    background-color: rgba(100, 116, 139, 0.2);
    transform: scale(1.05);
  }

  .edit-button svg,
  .delete-button svg,
  .success-button svg,
  .cancel-button svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  /* Product Filter */
  .product-filter-section {
    background-color: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    margin-bottom: 2rem;
    border: 1px solid var(--border-color);
    transition: var(--transition);
  }

  .toggle-product-filter {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-light);
    cursor: pointer;
    transition: var(--transition);
  }

  .toggle-product-filter:hover {
    background-color: var(--bg-hover);
    color: var(--text-color);
    border-color: var(--border-hover);
    transform: translateY(-1px);
  }

  .filter-icon {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  .product-filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .product-card {
    position: relative;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    transition: var(--transition);
    background: var(--card-bg);
  }

  .product-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }

  .product-card input[type="checkbox"] {
    position: absolute;
    opacity: 0;
  }

  .card-content {
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
  }

  .checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
    background: var(--card-bg);
  }

  .checkmark svg {
    width: 16px;
    height: 16px;
    fill: white;
    opacity: 0;
    transition: var(--transition);
  }

  .product-card input[type="checkbox"]:checked + .card-content .checkmark {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
  }

  .product-card input[type="checkbox"]:checked + .card-content .checkmark svg {
    opacity: 1;
  }

  /* Chart Section */
  .chart-section {
    background-color: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    margin-bottom: 2rem;
    border: 1px solid var(--border-color);
    transition: var(--transition);
  }

  .chart-wrapper {
    height: 400px;
    position: relative;
  }

  .chart-legend {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-light);
  }

  .color-box {
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }

  .color-box.achieved {
    background-color: var(--primary-color);
  }

  .color-box.pending {
    background-color: var(--accent-color);
  }

  /* Custom tipo-group for editing */
  .tipo-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tipo-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
    color: var(--text-color);
  }

  /* Select Elements */
  select {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-input);
    border-radius: var(--radius);
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 0.875rem;
    cursor: pointer;
    transition: var(--transition);
    appearance: none;
  }

  select:focus {
    outline: none;
    border-color: var(--border-focus);
    box-shadow: var(--shadow-focus);
    background-color: var(--input-focus-bg);
  }

  select:hover {
    border-color: var(--border-hover);
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
      transform: none !important;
    }
  }

  /* Focus states for accessibility */
  .toggle-product-filter:focus,
  .product-card:focus,
  .edit-button:focus,
  .delete-button:focus,
  .success-button:focus,
  .cancel-button:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .form-group {
      grid-template-columns: 1fr;
    }
    
    .chart-wrapper {
      height: 300px;
    }
  }

  @media (max-width: 768px) {
    .metas-content {
      padding: 1rem;
    }
    
    .metas-header, 
    .metas-list,
    .product-filter-section,
    .chart-section {
      padding: 1.5rem;
    }
    
    .section-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .section-header h2 {
      margin-right: 0;
    }
    
    .chart-legend {
      margin-top: 0.5rem;
    }

    .data-table th,
    .data-table td {
      padding: 8px 12px;
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    .header-content h1 {
      font-size: 1.5rem;
    }
    
    .product-filter-grid {
      grid-template-columns: 1fr;
    }
    
    .chart-wrapper {
      height: 250px;
    }

    .metas-header,
    .metas-list,
    .product-filter-section,
    .chart-section,
    .meta-form {
      padding: 1rem;
    }

    .chart-legend {
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  /* Print styles */
  @media print {
    .metas-layout {
      margin-left: 0;
      background: white;
    }

    .metas-header,
    .metas-list,
    .product-filter-section,
    .chart-section,
    .meta-form {
      box-shadow: none;
      border: 1px solid #ccc;
      background: white;
    }

    .edit-button,
    .delete-button,
    .success-button,
    .cancel-button {
      display: none;
    }
  }
}`
}</style>
    </div>

  );
  
 }
