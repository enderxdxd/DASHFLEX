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
import Loading3D from '../components/ui/Loading3D';
import { calcularRemuneracaoPorDuracao } from '../utils/calculoRemuneracaoDuracao';
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

function calcularRemuneracao(metaValor, vendasArr, tipo, unidadeBatida, configRem) {
  // Validações iniciais
  if (!Array.isArray(vendasArr)) {
    console.warn('VendasArr não é um array válido');
    return 0;
  }

  // Calcula totais necessários para a nova lógica
  const totalVendasIndividual = vendasArr.reduce((soma, v) => soma + Number(v.valor || 0), 0);
  
  // Para o total da equipe, usa vendas agrupadas do mês selecionado SEM FILTRAR POR UNIDADE
  const totalVendasTime = vendasAgrupadas
    .filter(venda => {
      const dataVenda = dayjs(venda.dataFormatada, 'YYYY-MM-DD');
      const mesVenda = dataVenda.format('YYYY-MM');
      return mesVenda === selectedMonth;
    })
    .reduce((soma, v) => soma + Number(v.valor || 0), 0);

  if (tipo === 'comissao') {
    const resultado = calcularRemuneracaoPorDuracao({
      vendas: vendasArr,
      metaIndividual: metaValor,
      metaTime: configRem.metaUnidade || 0,
      totalVendasIndividual,
      totalVendasTime,
      descontos, // Usa os descontos do hook
      tipo: 'comissao',
      produtosSelecionados // Passa o filtro de produtos
    });
    
    console.log(`💰 Nova lógica - ${resultado.totalComissao.toFixed(2)} (${resultado.resumo.totalPlanosProcessados} planos, ${resultado.resumo.totalProdutosProcessados} produtos)`);
    return resultado.totalComissao;
  }
  
  if (tipo === 'premiacao') {
    const resultado = calcularRemuneracaoPorDuracao({
      vendas: vendasArr,
      metaIndividual: metaValor,
      premiacao: configRem.premiacao || [],
      tipo: 'premiacao'
    });
    
    return resultado.totalPremiacao;
  }
  
  return 0;
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
  
  const resultado = calcularRemuneracaoPorDuracao({
    vendas: vendasResp,
    metaIndividual: Number(metaResp.meta),
    metaTime: configRem.metaUnidade || 0,
    totalVendasIndividual: vendasResp.reduce((s, v) => s + Number(v.valor || 0), 0),
    totalVendasTime,
    descontos,
    tipo: metaResp.remuneracaoType || 'comissao',
    produtosSelecionados
  });
  
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
  const metaUnidade = configRem.metaUnidade || 0;
  const totalVendasUnidade = todasVendas.reduce((s, v) => s + Number(v.valor || 0), 0);
  const unidadeBatida = totalVendasUnidade >= metaUnidade;
  
  
  // Calcular remuneração usando a função principal
  const remuneracao = calcularRemuneracao(
    Number(metaConsultor.meta || 0),
    vendasConsultor,
    metaConsultor.remuneracaoType || 'comissao',
    unidadeBatida,
    configRem
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
    window.descontos = descontos;
    
    // Expor função de debug da nova lógica
    window.debugRemuneracao = debugRemuneracao;
    
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
 
  if (loading || loadingDescontos) {
    return (
      <div className="loading-state">
        <Loading3D />
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
                  Meta: {(configRem?.metaUnidade || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

        {/* Card informativo sobre a nova lógica */}
        <div className="info-card" style={{ 
          background: 'var(--info-bg, #e3f2fd)', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid var(--info-border, #90caf9)'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
            <svg style={{ flexShrink: 0, marginTop: '2px', width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <div>
              <strong>Nova Lógica de Comissão Ativa</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
                As comissões agora são calculadas baseadas na duração dos planos 
                (diferença entre data início e fim) ao invés de intervalos de valores.
                Descontos de matrícula não afetam mais a comissão dos planos.
              </p>
            </div>
          </div>
        </div>

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
                {responsaveisUnicos.map((consultor) => {
                  // Calcular vendas do consultor em todas as unidades (USANDO VENDAS AGRUPADAS)
                  const vendasConsultor = vendasAgrupadas.filter(v => 
                    v.responsavel?.trim().toLowerCase() === consultor.trim().toLowerCase() &&
                    dayjs(v.dataFormatada, 'YYYY-MM-DD').format('YYYY-MM') === crossUnitPeriod &&
                    (produtosSelecionados.length === 0 || produtosSelecionados.includes(v.produto))
                  );
                  
                  // Agrupar vendas por unidade
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
                    m.responsavel?.trim().toLowerCase() === consultor.trim().toLowerCase() &&
                    m.periodo === crossUnitPeriod
                  );
                  
                  if (Object.keys(vendasPorUnidade).length === 0) return null;
                  
                  return (
                    <div key={consultor} className="consultant-performance-card">
                      <div className="card-header">
                        <div className="consultant-info">
                          <div className="consultant-avatar">
                            {consultor.charAt(0).toUpperCase()}
                          </div>
                          <div className="consultant-details">
                            <h4 className="consultant-name">{consultor}</h4>
                            <div className="consultant-stats">
                              <div className="total-sales">
                                {formatCurrency(totalGeral)}
                              </div>
                              {metaConsultor && (
                                <div className="meta-progress">
                                  {((totalGeral / metaConsultor.valor) * 100).toFixed(1)}% da meta
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
                          {Object.entries(vendasPorUnidade)
                            .sort(([,a], [,b]) => b.total - a.total)
                            .map(([unidade, dados]) => {
                              const isCurrentUnit = unidade === unidadeParam;
                              const percentage = totalGeral > 0 ? (dados.total / totalGeral * 100) : 0;
                              
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
                                  <div className="unit-progress">
                                    <div 
                                      className={`progress-bar ${isCurrentUnit ? 'current' : 'other'}`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
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

  /* Modern Header with Gradient */
  .modern-metas-header {
    position: relative;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    margin-bottom: 2rem;
    overflow: hidden;
    min-height: 200px;
  }
  
  .header-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  
  .gradient-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
  }
  
  .floating-shapes {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
  }
  
  .shape {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    animation: float 6s ease-in-out infinite;
  }
  
  .shape-1 {
    width: 80px;
    height: 80px;
    top: 20%;
    left: 10%;
    animation-delay: 0s;
  }
  
  .shape-2 {
    width: 120px;
    height: 120px;
    top: 60%;
    right: 15%;
    animation-delay: 2s;
  }
  
  .shape-3 {
    width: 60px;
    height: 60px;
    bottom: 20%;
    left: 60%;
    animation-delay: 4s;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(180deg); }
  }
  
  .header-content {
    position: relative;
    z-index: 2;
    padding: 2rem;
  }
  
  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
    flex-wrap: wrap;
  }
  
  .header-text {
    flex: 1;
    min-width: 300px;
  }
  
  .page-title {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .title-icon {
    width: 2rem;
    height: 2rem;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .page-subtitle {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    font-weight: 400;
  }
  
  .unit-status-card {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 280px;
    transition: all 0.3s ease;
  }
  
  .unit-status-card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.2);
  }
  
  .unit-status-card.success {
    border-color: rgba(34, 197, 94, 0.3);
  }
  
  .unit-status-card.warning {
    border-color: rgba(245, 158, 11, 0.3);
  }
  
  .status-icon {
    font-size: 2rem;
    line-height: 1;
  }
  
  .status-info {
    flex: 1;
  }
  
  .status-title {
    font-size: 1rem;
    font-weight: 600;
    color: white;
    margin: 0 0 0.5rem 0;
  }
  
  .status-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.25rem 0;
  }
  
  .status-meta {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }
  
  /* Add Meta Section */
  .add-meta-section {
    margin-bottom: 2rem;
  }
  
  .section-card {
    background: var(--card-bg);
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid var(--border-color);
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .section-card:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  
  .card-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .card-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .card-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--primary-color);
  }
  
  .card-subtitle {
    font-size: 0.875rem;
    color: var(--text-light);
    margin: 0;
  }
  
  .modern-form {
    padding: 2rem;
  }
  
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .field-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .label-icon {
    width: 1rem;
    height: 1rem;
    color: var(--text-light);
  }
  
  .input-wrapper {
    position: relative;
  }
  
  .modern-input, .modern-select {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-input);
    border-radius: 8px;
    font-size: 0.875rem;
    color: var(--text-color);
    background-color: var(--input-bg);
    transition: all 0.2s ease;
  }
  
  .modern-input:focus, .modern-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background-color: var(--input-focus-bg);
  }
  
  .currency-wrapper {
    position: relative;
  }
  
  .currency-prefix {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-light);
    font-size: 0.875rem;
    pointer-events: none;
    z-index: 1;
  }
  
  .currency-input {
    padding-left: 2.5rem;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
  }
  
  .submit-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .submit-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .btn-icon {
    width: 1rem;
    height: 1rem;
  }
  
  /* Cross-Unit Performance Section */
  .cross-unit-performance {
    margin-bottom: 2rem;
  }
  
  .performance-content {
    padding: 2rem;
  }
  
  .period-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;
    max-width: 300px;
  }
  
  .selector-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .selector-wrapper {
    position: relative;
  }
  
  .period-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-input);
    border-radius: 6px;
    font-size: 0.875rem;
    color: var(--text-color);
    background-color: var(--input-bg);
    transition: all 0.2s ease;
  }
  
  .period-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
  
  .performance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
  }
  
  .consultant-performance-card {
    background: var(--card-bg);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .consultant-performance-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
  
  .consultant-performance-card .card-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .consultant-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }
  
  .consultant-avatar {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .consultant-details {
    flex: 1;
    min-width: 0;
  }
  
  .consultant-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.25rem 0;
    word-break: break-word;
  }
  
  .consultant-stats {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  
  .total-sales {
    font-size: 1rem;
    font-weight: 600;
    color: var(--success-color);
  }
  
  .meta-progress {
    font-size: 0.75rem;
    color: var(--text-light);
  }
  
  .performance-summary {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .units-count {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
  }
  
  .units-count .count {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    line-height: 1;
  }
  
  .units-count .label {
    font-size: 0.75rem;
    color: var(--text-light);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .consultant-performance-card .card-body {
    padding: 1.5rem;
  }
  
  .units-breakdown {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .unit-item {
    padding: 1rem;
    border-radius: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }
  
  .unit-item.current-unit {
    background: var(--primary-light);
    border-color: var(--primary-color);
  }
  
  .unit-item:hover {
    background: var(--bg-hover);
  }
  
  .unit-item.current-unit:hover {
    background: var(--primary-lighter);
  }
  
  .unit-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }
  
  .unit-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .unit-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .current-icon {
    width: 1rem;
    height: 1rem;
    color: var(--primary-color);
  }
  
  .unit-count {
    font-size: 0.75rem;
    color: var(--text-light);
  }
  
  .unit-value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
  }
  
  .unit-value .value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-color);
  }
  
  .unit-value .percentage {
    font-size: 0.75rem;
    color: var(--text-light);
  }
  
  .unit-progress {
    height: 6px;
    background: var(--bg-color);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .unit-progress .progress-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  
  .unit-progress .progress-bar.current {
    background: linear-gradient(90deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  }
  
  .unit-progress .progress-bar.other {
    background: linear-gradient(90deg, var(--accent-color) 0%, #34d399 100%);
  }

  /* Chart Section */
  .chart-section {
    background: var(--card-bg);
    border-radius: 16px;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    margin-bottom: 2rem;
    overflow: hidden;
  }

  .chart-wrapper {
    padding: 2rem;
    height: 400px;
  }

  .chart-legend {
    display: flex;
    gap: 1rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-light);
  }

  .color-box {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .color-box.achieved {
    background-color: var(--success-color);
  }

  .color-box.pending {
    background-color: var(--accent-color);
  }
{{ ... }}
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
