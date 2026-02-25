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
import { useGlobalProdutos } from "../hooks/useGlobalProdutos";
import { useGroupedVendas } from "../hooks/useGroupedVendas";
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
import '../styles/Metas.css';
import Loading3D from '../components/ui/Loading3D';
import { useDescontosSimples } from '../utils/useDescontosSimples';



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
  
  // APLICAR AGRUPAMENTO DE PLANOS DIVIDIDOS
  const vendasAgrupadas = useGroupedVendas(vendas);
  const [produtos, setProdutos] = useState([]);
  const [editingData, setEditingData] = useState({});
  const [showProductFilter, setShowProductFilter] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [crossUnitPeriod, setCrossUnitPeriod] = useState(dayjs().format("YYYY-MM"));
  const [configRem, setConfigRem] = useState({
    premiacao: [],
    comissaoPlanos: [],
    metaUnidade: 0
  });

  // Variáveis auxiliares
  const unidadeParam = unidade;
  
  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };
  

  // --- Filtros e persistência ---
  const { produtosSelecionados, loaded: produtosLoaded, isAdmin } = useGlobalProdutos();

  // Hook para buscar descontos do Firebase
  const { descontos, loading: loadingDescontos } = useDescontosSimples(unidade);

// ✅ FUNÇÃO CORRETA - Igual ao ComissaoDetalhes
const calcularComissaoReal = (venda, ehPlano, temDesconto, bateuMetaIndividual, unidadeBatida, produtosSelecionados = []) => {
  const valor = Number(venda.valor || 0);
  if (valor <= 0) return 0;
  
  const produtosNaoComissionaveisFixos = ['Taxa de Matrícula', 'Estorno', 'Ajuste Contábil', 'QUITAÇÃO DE DINHEIRO - CANCELAMENTO'];
  if (produtosNaoComissionaveisFixos.includes(venda.produto)) return 0;
  
  const isDiariaOriginal = venda.produto === 'Plano' && venda.plano && (venda.plano.toLowerCase().includes('diária') || venda.plano.toLowerCase().includes('diarias'));
  const isDiariaCorrigida = venda.produto && (venda.produto.toLowerCase().includes('diária') || venda.produto.toLowerCase().includes('diarias'));
  const isDiaria = isDiariaOriginal || isDiariaCorrigida;
  
  if (produtosSelecionados.length > 0 && !produtosSelecionados.includes(venda.produto) && !isDiaria) return 0;
  
  if (!ehPlano) {
    const taxa = bateuMetaIndividual ? 0.015 : 0.012;
    return valor * taxa;
  }
  
  const duracao = venda.duracaoMeses || 1;
  const duracaoMap = { 1: 0, 3: 1, 6: 2, 8: 3, 12: 4, 24: 5 };
  const indice = duracaoMap[duracao] || 0;
  
  let tabela;
  if (unidadeBatida) {
    tabela = temDesconto ? [9, 20, 25, 34, 45, 71] : [15, 28, 43, 51, 65, 107];
  } else if (bateuMetaIndividual) {
    tabela = temDesconto ? [6, 16, 23, 30, 42, 67] : [12, 24, 37, 47, 60, 103];
  } else {
    tabela = temDesconto ? [3, 11, 21, 25, 38, 61] : [9, 18, 28, 42, 53, 97];
  }
  
  return tabela[indice] || 0;
};

function calcularRemuneracao(metaValor, vendasArr, tipo, unidadeBatida, configRem, metaUnidadeCalculada, maiorMeta = 0) {
  if (!Array.isArray(vendasArr)) return { total: 0, base: 0, bonus: 0 };

  const totalVendasIndividual = vendasArr.reduce((soma, v) => soma + Number(v.valor || 0), 0);
  const bateuMetaIndividual = totalVendasIndividual >= metaValor;
  const percentualMeta = metaValor > 0 ? (totalVendasIndividual / metaValor) * 100 : 0;
  
  if (tipo === 'comissao') {
    // ✅ COPIAR EXATAMENTE DO COMISSAODETALHES
    let totalComissaoReal = 0;
    let planosCount = 0;
    let produtosCount = 0;
    
    // Função auxiliar para correção de diárias (IGUAL AO COMISSAODETALHES)
    const corrigirClassificacaoDiarias = (venda) => {
      const vendaCorrigida = { ...venda };
      const planoValue = String(venda.plano || '').toLowerCase();
      const regexDiarias = /\bdi[aá]rias?\b|\bdiarias?\b/i;
      const temDiariaNoPlano = regexDiarias.test(planoValue);
      
      if (temDiariaNoPlano) {
        vendaCorrigida.produto = venda.plano;
        vendaCorrigida.plano = '';
        vendaCorrigida.correcaoAplicada = 'diaria_reclassificada';
      }
      return vendaCorrigida;
    };
    
    // Função auxiliar para verificar se é plano (IGUAL AO COMISSAODETALHES)
    const ehPlanoAposCorrecao = (venda) => {
      if (!venda) return false;
      const vendaCorrigida = corrigirClassificacaoDiarias(venda);
      if (vendaCorrigida.correcaoAplicada === 'diaria_reclassificada') return false;
      const produto = String(vendaCorrigida.produto || '').toLowerCase().trim();
      if (produto !== 'plano') return false;
      const duracao = Number(vendaCorrigida.duracaoMeses || 0);
      return duracao > 0;
    };
    
    vendasArr.forEach(venda => {
      const vendaCorrigida = corrigirClassificacaoDiarias(venda);
      const ehPlano = ehPlanoAposCorrecao(vendaCorrigida);
      
      const vendaComDesconto = descontos.find(d => d.matricula === venda.matricula);
      
      if (ehPlano) {
        planosCount++;
        const temDescontoPlano = vendaComDesconto && Number(vendaComDesconto.descontoPlano || 0) > 0;
        const comissao = calcularComissaoReal(vendaCorrigida, true, temDescontoPlano, bateuMetaIndividual, unidadeBatida, produtosSelecionados);
        totalComissaoReal += comissao;
      } else {
        const temDescontoMatricula = vendaComDesconto && Number(vendaComDesconto.descontoMatricula || 0) > 0;
        const comissao = calcularComissaoReal(vendaCorrigida, false, temDescontoMatricula, bateuMetaIndividual, unidadeBatida, produtosSelecionados);
        
        if (comissao > 0) {
          produtosCount++;
          totalComissaoReal += comissao;
        }
      }
    });
    
    // ✅ CALCULAR BÔNUS DE 10%
    let bonus = 0;
    if (percentualMeta >= 110) {
      const faixas = Math.floor((percentualMeta - 100) / 10);
      bonus = faixas * 100;
    }
    
    return { total: totalComissaoReal + bonus, base: totalComissaoReal, bonus };
  }
  
  if (tipo === 'premiacao') {
    const faixasAtingidas = (configRem.premiacao || [])
      .filter(f => Number(f.percentual || 0) <= percentualMeta)
      .sort((a, b) => Number(a.percentual || 0) - Number(b.percentual || 0));
    
    const premioBase = faixasAtingidas.reduce((soma, f) => soma + Number(f.premio || 0), 0);
    const fatorProporcionalidade = maiorMeta > 0 ? (metaValor / maiorMeta) : 1;
    
    return { total: premioBase * fatorProporcionalidade, base: premioBase * fatorProporcionalidade, bonus: 0 };
  }
  
  return { total: 0, base: 0, bonus: 0 };
}

// Função para debug da nova lógica
function debugRemuneracao(responsavel) {
  const metaResp = metas.find(m => 
    m.responsavel.toLowerCase() === responsavel.toLowerCase()
  );
  
  if (!metaResp) {
    console.log(`❌ Meta não encontrada para ${responsavel}`);
    return null;
  }
  
  const vendasResp = vendasParaMeta.filter(v => 
    v.responsavel.toLowerCase() === responsavel.toLowerCase()
  );
  
  const totalVendasTime = vendasAgrupadas
    .filter(venda => {
      const dataVenda = dayjs(venda.dataFormatada, 'YYYY-MM-DD');
      const mesVenda = dataVenda.format('YYYY-MM');
      const vendaUnidade = (venda.unidade || "").toLowerCase();
      const unidadeAtual = (unidadeParam || "").toLowerCase();
      return mesVenda === selectedMonth && vendaUnidade === unidadeAtual;
    })
    .reduce((soma, v) => soma + Number(v.valor || 0), 0);
  
  // ✅ CALCULAR MAIOR META DO PERÍODO
  const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
  const maiorMetaCalc = metasDoMes.reduce((max, m) => {
    const metaValor = Number(m.meta || 0);
    return metaValor > max ? metaValor : max;
  }, 0);
  
  // ✅ USAR calcularRemuneracao com maiorMeta para proporcionalidade
  const resultado = calcularRemuneracao(
    Number(metaResp.meta),
    vendasResp,
    metaResp.remuneracaoType || 'comissao',
    unidadeBatida,
    configRem,
    metaUnidade,
    maiorMetaCalc // ✅ CORRIGIDO: passa maior meta para proporcionalidade
  );
  
  console.log(`🔍 Debug ${responsavel}:`, resultado);
  return resultado;
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
  
  
  // Filtrar vendas do consultor
  const vendasConsultor = todasVendas.filter(v => 
    v.responsavel.toLowerCase() === metaConsultor.responsavel.toLowerCase()
  );
  
  
  // Verificar se a unidade bateu a meta
  // metaUnidade já calculada no escopo principal
  const totalVendasUnidade = todasVendas.reduce((s, v) => s + Number(v.valor || 0), 0);
  const unidadeBatida = totalVendasUnidade >= metaUnidade;
  
  // Calcular maior meta do período
  const metasDoMes = metas.filter(m => m.periodo === metaConsultor.periodo);
  const maiorMeta = metasDoMes.reduce((max, m) => {
    const metaValor = Number(m.meta || 0);
    return metaValor > max ? metaValor : max;
  }, 0);
  
  // Calcular remuneração usando a função principal
  const remuneracao = calcularRemuneracao(
    Number(metaConsultor.meta || 0),
    vendasConsultor,
    metaConsultor.remuneracaoType || 'comissao',
    unidadeBatida,
    configRem,
    metaUnidade,
    maiorMeta
  );
  
  
  // Comparar com o PlanosVisualizer
  console.log('🔄 Comparando com PlanosVisualizer...');
  const comparacao = compararComPlanosVisualizer(
    vendasConsultor,
    configRem,
    Number(metaConsultor.meta),
    unidadeBatida
  );
  
  console.log('📊 Resumo da comparação:', comparacao.resumo);
  
  // Debug logs removed
  
  console.groupEnd();
  
  return {
    meta: metaConsultor,
    vendas: vendasConsultor,
    remuneracao,
    comparacao
  };
}

// Debug function - logs removed
function debugCalculoASMIHS(vendasArr, configRem) {
  const totalVendas = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
  
  let totalComissao = 0;
  let totalPlanos = 0;
  let totalOutros = 0;
  
  vendasArr.forEach((venda, index) => {
    const valor = Number(venda.valor || 0);
    
    const plano = configRem.comissaoPlanos?.find(p => 
      valor >= (p.min || 0) && valor <= (p.max || Infinity)
    );
    
    if (plano) {
      const comissao = plano.comMeta || 0;
      totalComissao += comissao;
      totalPlanos += comissao;
    } else {
      const comissao = valor * 0.015;
      totalComissao += comissao;
      totalOutros += comissao;
    }
  });
  
  return totalComissao;
}


  
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
        // extrai produtos únicos das vendas originais (antes do agrupamento)
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

  // --- Filtra vendas por produto, mês e unidade ---
  const vendasParaMeta = useMemo(() => {
    if (!produtosLoaded) return [];
    return vendasAgrupadas.filter(v => {
      const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
      return (
        v.produto &&
        produtosSelecionados.includes(v.produto.trim()) &&
        mes === selectedMonth
      );
    });
  }, [vendasAgrupadas, produtosSelecionados, selectedMonth, produtosLoaded]);

  // --- Checa meta da unidade (TODAS as vendas realizadas na unidade) ---
  const totalUnidade = useMemo(() => {
    // TODAS as vendas da unidade (não filtra por responsáveis oficiais)
    // A meta da unidade é baseada no faturamento TOTAL da unidade
    return vendasParaMeta
      .filter(v => (v.unidade || "").toLowerCase() === (unidade || "").toLowerCase())
      .reduce((s, v) => s + Number(v.valor || 0), 0);
  }, [vendasParaMeta, unidade]);
  
  // Calcular meta da unidade automaticamente baseada na soma das metas dos consultores
  const metaUnidade = useMemo(() => {
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    return metasDoMes.reduce((soma, meta) => soma + Number(meta.meta || 0), 0);
  }, [metas, selectedMonth]);
  
  const unidadeBatida = totalUnidade >= metaUnidade;

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
        // Para o gráfico, aplicar a MESMA lógica de filtro global que outros componentes
        const vendasConsultor = vendasAgrupadas
          .filter(v => {
            const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
            const matchResponsavel = v.responsavel.trim().toLowerCase() === m.responsavel.trim().toLowerCase();
            const matchMes = mes === selectedMonth;
            const matchUnidade = (v.unidade || "").toLowerCase() === (unidade || "").toLowerCase();
            
            // LÓGICA GLOBAL: Se não há produtos selecionados, inclui todas as vendas
            const matchProduto = produtosSelecionados.length === 0 || 
              (v.produto && produtosSelecionados.includes(v.produto.trim()));
            
            return matchResponsavel && matchMes && matchUnidade && matchProduto;
          })
          .reduce((s,v) => s + Number(v.valor||0), 0);
        return { nome: m.responsavel, vendas: vendasConsultor, meta: Number(m.meta) };
      });
  }, [metas, vendasAgrupadas, selectedMonth, unidade, produtosSelecionados]);

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
 
  if (loading || loadingDescontos) {
    return (
      <div className="loading-state">
        <Loading3D />
      </div>
    );
  }
  
  

  return (
    <div className="metas-page">
      <NavBar />
      <main className="metas-content">
      {/* Header Moderno com Gradiente */}
      <div className="modern-metas-header">
        <div className="header-background">
          <div className="gradient-overlay"></div>
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
        
        <div className="header-content">
          <div className="header-main">
            <div className="header-text">
              <h1 className="page-title">
                <svg className="title-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Metas & Performance - {unidade.toUpperCase()}
              </h1>
              <p className="page-subtitle">
                Gerencie metas e visualize performance cruzada entre unidades
              </p>
            </div>
            
            {/* Status da unidade */}
            <div className={`unit-status-card ${unidadeBatida ? 'success' : 'warning'}`}>
              <div className="status-icon">
                {unidadeBatida ? '🎯' : '📊'}
              </div>
              <div className="status-info">
                <h3 className="status-title">
                  {unidadeBatida ? 'Meta da Unidade Atingida!' : 'Acompanhando Progresso'}
                </h3>
                <div className="status-value">
                  {totalUnidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="status-meta">
                  Meta: {metaUnidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Formulário moderno para adicionar metas */}
      <div className="add-meta-section">
        <div className="section-card">
          <div className="card-header">
            <h2 className="card-title">
              <svg className="card-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Nova Meta
            </h2>
            <p className="card-subtitle">Defina uma nova meta para um consultor</p>
          </div>
          
          <form onSubmit={handleAddMeta} className="modern-form">
            <div className="form-grid">
              <div className="form-field">
                <label className="field-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  Responsável
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    list="responsaveisList"
                    placeholder="Selecione ou digite o nome"
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
              </div>
              
              <div className="form-field">
                <label className="field-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                  </svg>
                  Valor da Meta
                </label>
                <div className="input-wrapper currency-wrapper">
                  <span className="currency-prefix">R$</span>
                  <input
                    type="number"
                    placeholder="0,00"
                    value={newMeta}
                    onChange={(e) => setNewMeta(e.target.value)}
                    step="0.01"
                    className="modern-input currency-input"
                  />
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H3V8h14v12z"/>
                  </svg>
                  Período
                </label>
                <div className="input-wrapper">
                  <input
                    type="month"
                    value={metaPeriodo}
                    onChange={(e) => setMetaPeriodo(e.target.value)}
                    className="modern-input"
                  />
                </div>
              </div>
              
              <div className="form-field">
                <label className="field-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Tipo de Remuneração
                </label>
                <div className="input-wrapper">
                  <select
                    value={newRemType}
                    onChange={(e) => setNewRemType(e.target.value)}
                    className="modern-select"
                  >
                    <option value="comissao">Comissão</option>
                    <option value="premiacao">Premiação</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-btn">
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>Adicionar Meta</span>
              </button>
            </div>
          </form>
        </div>
      </div>
  
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
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
            {(() => {
              // ✅ CALCULAR MAIOR META DO PERÍODO ANTES DO LOOP
              const metasDoMes = metas.filter((m) => m.periodo === selectedMonth);
              const maiorMeta = metasDoMes.reduce((max, m) => {
                const metaValor = Number(m.meta || 0);
                return metaValor > max ? metaValor : max;
              }, 0);
              
              console.log('📊 MAIOR META DO PERÍODO:', {
                periodo: selectedMonth,
                maiorMeta: maiorMeta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                totalConsultores: metasDoMes.length
              });
              
              return metasDoMes
                .sort((a, b) =>
                  a.responsavel
                    .trim()
                    .localeCompare(b.responsavel.trim(), "pt", { sensitivity: "base" })
                )
                .map((m) => {
                  // 1) filtra vendas por consultor - CROSSING: TODAS AS UNIDADES
                  const vendasDoResp = vendasAgrupadas.filter(v => {
                    const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
                    const matchResponsavel = v.responsavel.trim().toLowerCase() === m.responsavel.trim().toLowerCase();
                    const matchMes = mes === selectedMonth;
                    // REMOVIDO: filtro por unidade para permitir crossing
                    
                    // LÓGICA GLOBAL: Se não há produtos selecionados, inclui todas as vendas
                    const matchProduto = produtosSelecionados.length === 0 || 
                      (v.produto && produtosSelecionados.includes(v.produto.trim()));
                    
                    return matchResponsavel && matchMes && matchProduto;
                  });

                  // 1.1) soma total das vendas para exibir e calcular % Meta
                  const totalV = vendasDoResp.reduce(
                    (soma, v) => soma + Number(v.valor || 0),
                    0
                  );

                  // 2) chama a função única que engloba toda a lógica de remuneração
                  const resultadoRemuneracao = calcularRemuneracao(
                    Number(m.meta),     // meta individual
                    vendasDoResp,       // array de vendas do consultor
                    m.remuneracaoType,  // "comissao" ou "premiacao"
                    unidadeBatida,
                    configRem,
                    metaUnidade,        // passa a meta da unidade calculada
                    maiorMeta           // ✅ NOVO: passa maior meta para proporcionalidade
                  );
                  const remuneracao = resultadoRemuneracao.total;
                  const remuneracaoBase = resultadoRemuneracao.base;
                  const bonus = resultadoRemuneracao.bonus;

      // 3) percentual de meta atingido - USAR DADOS CONSISTENTES
      let pctMeta = 0;
      const metaValor = Number(m.meta || 0);
      
      // Debug específico para Agnes
      if (m.responsavel.toLowerCase().includes('agnes')) {
        console.log(`🚨 DEBUG AGNES ESPECÍFICO:`, {
          responsavel: m.responsavel,
          metaOriginal: m.meta,
          metaValor,
          totalVendas: totalV,
          vendasDoResp: vendasDoResp.length,
          metaIsValid: metaValor > 0,
          calculation: metaValor > 0 ? `${totalV} / ${metaValor} = ${(totalV / metaValor * 100).toFixed(2)}%` : 'Meta inválida ou zero'
        });
      }
      
      if (metaValor > 0 && !isNaN(totalV) && !isNaN(metaValor)) {
        pctMeta = (totalV / metaValor) * 100;
        
        // Validação adicional para valores extremos
        if (!isFinite(pctMeta) || pctMeta < 0) {
          console.warn(`Percentual inválido para ${m.responsavel}:`, {
            totalV,
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
    });
  })()}
</tbody>

          </table>
        </section>
        
        {/* Nova Seção: Performance Cruzada entre Unidades */}
        <section className="cross-unit-performance">
          <div className="section-card">
            <div className="card-header">
              <h2 className="card-title">
                <svg className="card-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                Performance Cruzada por Unidade
              </h2>
              <p className="card-subtitle">Visualize vendas de consultores em diferentes unidades</p>
            </div>
            
            <div className="performance-content">
              <div className="period-selector">
                <label className="selector-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H3V8h14v12z"/>
                  </svg>
                  Período de Análise
                </label>
                <div className="selector-wrapper">
                  <input
                    type="month"
                    value={crossUnitPeriod}
                    onChange={(e) => setCrossUnitPeriod(e.target.value)}
                    className="period-input"
                  />
                </div>
              </div>
              
              {/* Grid de Cards de Performance */}
              <div className="performance-grid">
                {responsaveisUnicos && responsaveisUnicos.length > 0 ? 
                  responsaveisUnicos.map((consultor) => {
                    // CORREÇÃO: Calcular vendas do consultor em todas as unidades (USANDO VENDAS AGRUPADAS)
                    const vendasConsultor = vendasAgrupadas.filter(v => {
                      const responsavelNormalizado = v.responsavel?.trim().toLowerCase() || '';
                      const consultorNormalizado = consultor?.trim().toLowerCase() || '';
                      const dataVenda = v.dataFormatada ? dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') : null;
                      const periodoMatch = dataVenda === crossUnitPeriod;
                      const responsavelMatch = responsavelNormalizado === consultorNormalizado;
                      
                      // Filtro de produtos: se não há produtos selecionados, inclui todos
                      const produtoMatch = produtosSelecionados.length === 0 || 
                                         produtosSelecionados.includes(v.produto);
                      
                      return responsavelMatch && periodoMatch && produtoMatch;
                    });
                    
                    // Debug log para verificar filtros
                    console.log('🔍 Performance cruzada debug:', {
                      consultor,
                      crossUnitPeriod,
                      vendasEncontradas: vendasConsultor.length,
                      produtosSelecionados,
                      exemploVenda: vendasConsultor[0]
                    });
                    
                    // CORREÇÃO: Agrupar vendas por unidade
                    const vendasPorUnidade = vendasConsultor.reduce((acc, venda) => {
                      const unidadeVenda = venda.unidade || 'Não Informado';
                      if (!acc[unidadeVenda]) {
                        acc[unidadeVenda] = {
                          vendas: [],
                          total: 0,
                          count: 0
                        };
                      }
                      acc[unidadeVenda].vendas.push(venda);
                      acc[unidadeVenda].total += Number(venda.valor || 0);
                      acc[unidadeVenda].count += 1;
                      return acc;
                    }, {});
                    
                    const totalGeral = Object.values(vendasPorUnidade).reduce((sum, u) => sum + u.total, 0);
                    const metaConsultor = metas.find(m => 
                      m.responsavel?.trim().toLowerCase() === consultor?.trim().toLowerCase() &&
                      m.periodo === crossUnitPeriod
                    );
                    
                    // CORREÇÃO: Só retorna null se não há vendas E não há meta
                    if (Object.keys(vendasPorUnidade).length === 0 && !metaConsultor) return null;
                    
                    return (
                      <div key={consultor} className="consultant-performance-card">
                        <div className="card-header">
                          <div className="consultant-info">
                            <div className="consultant-avatar">
                              {consultor?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="consultant-details">
                              <h4 className="consultant-name">{consultor}</h4>
                              <div className="consultant-stats">
                                <div className="total-sales">
                                  {formatCurrency(totalGeral)}
                                </div>
                                {metaConsultor && (
                                  <div className="meta-progress">
                                    {Number(metaConsultor.meta || 0) > 0 
                                      ? ((totalGeral / Number(metaConsultor.meta || 0)) * 100).toFixed(1) 
                                      : '0'}% da meta
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="performance-summary">
                            <div className="units-count">
                              <div className="count">{Object.keys(vendasPorUnidade).length}</div>
                              <div className="label">Unidades</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="card-body">
                          <div className="units-breakdown">
                            {Object.keys(vendasPorUnidade).length > 0 ? (
                              Object.entries(vendasPorUnidade)
                                .sort(([,a], [,b]) => b.total - a.total)
                                .map(([unidade, dados]) => {
                                  const isCurrentUnit = unidade === unidadeParam;
                                  const percentage = totalGeral > 0 ? ((dados.total || 0) / totalGeral * 100) : 0;
                                  
                                  console.log('🔍 Progress bar debug:', { 
                                    unidade, 
                                    totalGeral, 
                                    dadosTotal: dados.total, 
                                    percentage: percentage.toFixed(1) 
                                  });
                                  
                                  return (
                                    <div key={unidade} className={`unit-item ${isCurrentUnit ? 'current-unit' : ''}`}>
                                      <div className="unit-header">
                                        <div className="unit-info">
                                          <div className="unit-name">
                                            {isCurrentUnit && (
                                              <svg className="current-icon" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                              </svg>
                                            )}
                                            {unidade}
                                          </div>
                                          <div className="unit-count">
                                            {dados.count} {dados.count === 1 ? 'venda' : 'vendas'}
                                          </div>
                                        </div>
                                        <div className="unit-value">
                                          <div className="value">{formatCurrency(dados.total)}</div>
                                          <div className="percentage">{percentage.toFixed(1)}%</div>
                                        </div>
                                      </div>
                                      <div className="unit-percentage-display">
                                        <div className={`percentage-badge ${isCurrentUnit ? 'current-unit' : 'other-unit'}`}>
                                          {percentage.toFixed(1)}%
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                            ) : (
                              <div className="no-sales-message">
                                <p>Nenhuma venda encontrada para {consultor} no período {crossUnitPeriod}</p>
                                {metaConsultor && (
                                  <p className="meta-info">Meta: {formatCurrency(Number(metaConsultor.meta || 0))}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }).filter(Boolean) // Remove elementos null
                : (
                  <div className="no-consultants-message">
                    <p>Nenhum consultor encontrado com vendas ou metas no período selecionado.</p>
                    <p>Verifique se há dados de vendas e metas cadastradas para o período {crossUnitPeriod}.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
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
                <div key={index} className={`product-card ${produtosSelecionados.includes(produto) ? 'selected' : ''}`}>
                  <div className="card-content">
                    <span className="checkmark">
                      <svg viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </span>
                    {produto}
                  </div>
                  {!isAdmin && (
                    <div className="admin-only-badge">
                      Configurado pelo Admin
                    </div>
                  )}
                </div>
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
  
    </div>

  );
  
 }