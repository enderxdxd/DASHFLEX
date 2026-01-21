import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  collection, 
  collectionGroup,
  onSnapshot, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { 
  analisarDescontosPorConsultor, 
  calcularEstatisticasGeraisDesconto 
} from "../utils/descontosAnalysis";

// ============ CONFIGURAÇÃO DE CACHE ============
const CACHE_KEY = 'dashflex_descontos_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const descontosCacheUtils = {
  save: (data, month) => {
    try {
      localStorage.setItem(`${CACHE_KEY}_${month}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Limpa caches antigos
        Object.keys(localStorage)
          .filter(k => k.startsWith(CACHE_KEY))
          .forEach(k => localStorage.removeItem(k));
      }
    }
  },
  load: (month) => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${month}`);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(`${CACHE_KEY}_${month}`);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },
  clear: (month) => {
    if (month) {
      localStorage.removeItem(`${CACHE_KEY}_${month}`);
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_KEY))
        .forEach(k => localStorage.removeItem(k));
    }
  }
};

// Flag para ambiente de produção (desabilita logs)
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const debugLog = (...args) => { if (!IS_PRODUCTION) console.log(...args); };


dayjs.extend(customParseFormat);

// ===== FUNÇÕES COPIADAS EXATAMENTE DO COMISSAODETALHES.JSX =====

// Função para aplicar correção de diárias (baseada no sistema real)
const corrigirClassificacaoDiarias = (venda) => {
  if (!venda) return venda;
  
  const vendaCorrigida = { ...venda };
  const planoValue = String(venda.plano || '').toLowerCase().trim();
  
  const padroesDiarias = [
    'diária', 'diárias', 'diaria', 'diarias',
    'plano.*diária', 'plano.*diárias',
    '\\d+\\s*diária', '\\d+\\s*diárias'
  ];
  
  const temDiariaNoPlano = padroesDiarias.some(padrao => {
    const regex = new RegExp(padrao, 'i');
    return regex.test(planoValue);
  });
  
  if (temDiariaNoPlano) {
    vendaCorrigida.produto = venda.plano;
    vendaCorrigida.plano = '';
    vendaCorrigida.correcaoAplicada = 'diaria_reclassificada';
    vendaCorrigida.motivoCorrecao = `Diária movida de "plano" para "produto": ${venda.plano}`;
  }
  
  return vendaCorrigida;
};

// Função para verificar se é plano após correção
const ehPlanoAposCorrecao = (venda) => {
  if (!venda) return false;
  
  const vendaCorrigida = corrigirClassificacaoDiarias(venda);
  
  if (vendaCorrigida.correcaoAplicada === 'diaria_reclassificada') {
    return false;
  }
  
  const produto = String(vendaCorrigida.produto || '').toLowerCase().trim();
  
  if (produto.includes('diária') || produto.includes('diaria')) {
    return false;
  }
  
  if (produto !== 'plano') {
    return false;
  }
  
  if (vendaCorrigida.duracaoMeses && typeof vendaCorrigida.duracaoMeses === 'number') {
    return vendaCorrigida.duracaoMeses >= 1;
  }
  
  if (vendaCorrigida.dataInicio && vendaCorrigida.dataFim) {
    const inicio = new Date(vendaCorrigida.dataInicio);
    const fim = new Date(vendaCorrigida.dataFim);
    const diasReais = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
    return diasReais >= 25;
  }
  
  return false;
};

export const useDescontos = (
  unidade, 
  vendas = [], 
  metas = [], 
  desconsiderarMatricula = true, 
  externalSelectedMonth = null,
  produtosSelecionados = [] // NOVO PARÂMETRO: produtos globalmente selecionados
) => {
  // Estados básicos
  const [descontos, setDescontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Estado interno para mês selecionado
  const [internalSelectedMonth, setInternalSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  
  // Usar mês externo se fornecido, senão usar interno
  const selectedMonth = externalSelectedMonth || internalSelectedMonth;
  
  // Metas internas para responsáveis oficiais
  const [metasInternas, setMetasInternas] = useState([]);
  
  // Upload
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  
  // Filtros
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroMatricula, setFiltroMatricula] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  
  // Ordenação e paginação
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ===== HELPERS GLOBAIS DO HOOK =====
  const normalize = (s = '') =>
    String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^\w\s]/g, '') // remove pontuação
      .replace(/\s+/g, ' ') // normaliza espaços
      .trim()
      .toUpperCase();

  const matchResponsavel = (responsavelDesconto, responsaveisOficiais) => {
    if (!responsavelDesconto || responsaveisOficiais.size === 0) return false;
    
    const respNorm = normalize(responsavelDesconto);
    
    // 1. Match exato
    if (responsaveisOficiais.has(respNorm)) return true;
    
    // 2. Match por palavras-chave (primeiro e último nome)
    const palavrasDesconto = respNorm.split(' ').filter(p => p.length > 2);
    
    for (const respOficial of responsaveisOficiais) {
      const palavrasOficial = respOficial.split(' ').filter(p => p.length > 2);
      
      // Se pelo menos 2 palavras batem (primeiro + último nome)
      const matches = palavrasDesconto.filter(p => 
        palavrasOficial.some(po => po.includes(p) || p.includes(po))
      );
      
      if (matches.length >= 2) {
        return true;
      }
    }
    
    return false;
  };

  const parseMes = (raw) => {
    if (!raw) return null;
    
    // Firestore Timestamp
    if (typeof raw === 'object' && raw !== null) {
      if (typeof raw.toDate === 'function') {
        const d = dayjs(raw.toDate());
        return d.isValid() ? d.format('YYYY-MM') : null;
      }
      if ('seconds' in raw && typeof raw.seconds === 'number') {
        const d = dayjs(raw.seconds * 1000);
        return d.isValid() ? d.format('YYYY-MM') : null;
      }
    }
    
    // String (com trim) ou ISO
    const s = String(raw).trim();
    const d1 = dayjs(s, ['DD/MM/YY','DD/MM/YYYY','YYYY-MM-DD','YYYY-MM'], true);
    if (d1.isValid()) return d1.format('YYYY-MM');
    
    const d2 = dayjs(s); // fallback "não estrito" para ISO/Timestamp toString
    return d2.isValid() ? d2.format('YYYY-MM') : null;
  };

  // ===== CARREGAR METAS INTERNAS =====
  useEffect(() => {
    if (!unidade) return;
    
    const unsubscribe = onSnapshot(
      collection(db, 'faturamento', unidade.toLowerCase(), 'metas'),
      (snapshot) => {
        const metasData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setMetasInternas(metasData);
      },
      (err) => {
        console.error('Erro ao carregar metas internas:', err);
        setMetasInternas([]);
      }
    );
    
    return () => unsubscribe();
  }, [unidade]);

  // ===== FONTE ÚNICA PARA RESPONSÁVEIS OFICIAIS =====
  const metasFonte = useMemo(() => {
    return (Array.isArray(metas) && metas.length > 0) ? metas : metasInternas;
  }, [metas, metasInternas]);

  const responsaveisOficiaisSet = useMemo(() => {
    return new Set(
      metasFonte
        .map(m => normalize(m.responsavel))
        .filter(Boolean)
    );
  }, [metasFonte]);

  // ===== CARREGAR DESCONTOS VIA COLLECTIONGROUP =====
  useEffect(() => {
    if (!unidade) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Traz TODOS os descontos de TODAS as unidades (igual às vendas)
    const unsub = onSnapshot(
      collectionGroup(db, 'descontos'),
      (snapshot) => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // 1) filtro por mês (se o desconto tiver 'mes'/'lancamento'/'data'/'dataFormatada')
        const byMonth = all.filter(desc => {
          const mesDesc =
            parseMes(desc.mes) ||
            parseMes(desc.lancamento) ||
            parseMes(desc.data) ||
            parseMes(desc.dataFormatada);
          // se não conseguir inferir o mês, mantemos (para não perder nada)
          return !selectedMonth || !mesDesc ? true : (mesDesc === selectedMonth);
        });

        // 2) Busca descontos de TODAS as unidades para consultores da unidade atual
        // Similar ao comportamento das vendas - consultor pode dar desconto em qualquer unidade
        const byResp = byMonth.filter(desc => {
          // se não há metas, libera geral (modo aberto)
          if (responsaveisOficiaisSet.size === 0) return true;
          
          // Usa matching fuzzy para responsáveis - busca em TODAS as unidades
          return matchResponsavel(desc.responsavel, responsaveisOficiaisSet);
        });

        // Salva no cache
        descontosCacheUtils.save(byResp, selectedMonth);
        setDescontos(byResp);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar descontos (collectionGroup):', err);
        setError('Erro ao carregar descontos');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [unidade, selectedMonth, responsaveisOficiaisSet]);

  // ===== APLICAR **EXATAMENTE** A MESMA LÓGICA DO COMISSAODETALHES =====
  // ✅ Esta é a parte crítica que deve replicar a função analisarConsultor
  const vendasDaUnidade = useMemo(() => {
    if (!vendas?.length) {
      return [];
    }

    // Helper para identificar se é plano
    const isPlano = (produto) => {
      if (!produto) return false;
      const produtoNorm = String(produto)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^\w\s]/g, '') // remove pontuação
        .trim()
        .toUpperCase();
      
      return produtoNorm.includes('PLANO');
    };

    // APLICAR MESMA LÓGICA DA COMISSAODETALHES
    const vendasFiltradas = vendas.filter(venda => {
      // 1. Filtro por unidade
      const unidadeVenda = (venda.unidade || '').replace(/\s/g, '').toLowerCase();
      const unidadeAtual = (unidade || '').replace(/\s/g, '').toLowerCase();
      if (unidadeVenda !== unidadeAtual) return false;

      // 2. Filtro por mês
      const vendaMes = parseMes(venda.dataFormatada || venda.dataLancamento);
      if (!vendaMes || vendaMes !== selectedMonth) return false;

      // 3. Filtro produtos não comissionáveis
      const produtosNaoComissionaveisFixos = [
        'Taxa de Matrícula', 
        'Estorno', 
        'Ajuste Contábil',
        'QUITAÇÃO DE DINHEIRO - CANCELAMENTO'
      ];

      if (produtosNaoComissionaveisFixos.includes(venda.produto)) return false;

      // 4. Filtro apenas produtos que são PLANO (incluindo diárias)
      const isDiariaOriginal = venda.produto === 'Plano' && 
        venda.plano && 
        (venda.plano.toLowerCase().includes('diária') || venda.plano.toLowerCase().includes('diarias'));

      const isDiariaCorrigida = venda.produto && 
        (venda.produto.toLowerCase().includes('diária') || venda.produto.toLowerCase().includes('diarias'));

      const isDiaria = isDiariaOriginal || isDiariaCorrigida;

      if (!isPlano(venda.produto) && !isDiaria) return false;

      return true;
    });

    return vendasFiltradas;
  }, [vendas, unidade, selectedMonth]);

  // ===== RECONCILIAÇÃO: VENDAS x DESCONTOS (MESMO CÓDIGO) =====
  const vendasComDesconto = useMemo(() => {
    if (!vendasDaUnidade?.length) {
      return [];
    }
    
    if (!descontos?.length) {
      return vendasDaUnidade.map(venda => ({
        ...venda,
        temDesconto: false,
        temDescontoPlano: false,
        temDescontoMatricula: false,
        descontoPlano: 0,
        descontoMatricula: 0,
        totalDesconto: 0,
        valorCheio: Number(venda.valor || 0),
        percentualDesconto: 0,
        descontoDetalhes: []
      }));
    }
    
    // Helpers para normalização de tipos
    const normalizeTipo = (t) => {
      if (!t) return '';
      return String(t)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w]/g, '')
        .toUpperCase();
    };
    
    const bucketFromTipo = (t) => {
      const n = normalizeTipo(t);
      if (n.includes('MATRICUL') || n.includes('TAXA')) return 'MATRICULA';
      return 'PLANO';
    };

    // Agrupamento por matrícula
    const descontosPorMatricula = {};
    
    descontos.forEach(desc => {
      const matriculaNorm = String(desc.matricula || '').replace(/\D/g, '').padStart(6, '0');
      
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

      if (itens.length > 0) {
        itens.forEach(it => {
          const valor = Number(it?.valor || 0);
          if (!valor) return;
          
          const bucket = bucketFromTipo(it?.tipo);
          if (bucket === 'MATRICULA') {
            dm += valor;
          } else {
            dp += valor;
          }
          grupo.itens.push({...it, valor});
        });
        tt = dp + dm;
      } else if (temConsolidado) {
        dp = Number(desc.descontoPlano || 0);
        dm = Number(desc.descontoMatricula || 0);
        tt = Number(desc.totalDesconto || (dp + dm));
        if (tt > 0) {
          grupo.itens.push({ tipo: 'CONSOLIDADO', valor: tt });
        }
      } else {
        const valor = Number(desc.valor || 0);
        if (valor > 0) {
          const bucket = bucketFromTipo(desc.tipo);
          if (bucket === 'MATRICULA') {
            dm += valor;
          } else {
            dp += valor;
          }
          tt = dp + dm;
          grupo.itens.push({ tipo: desc.tipo || 'PLANO', valor });
        }
      }

      grupo.descontoPlano += dp;
      grupo.descontoMatricula += dm;
      grupo.totalDesconto += tt;
    });
    
    // Aplicar lógica de reconciliação
    const vendasProcessadas = vendasDaUnidade.map(venda => {
      const matriculaNorm = String(venda.matricula || '').replace(/\D/g, '').padStart(6, '0');
      const descontoGrupo = descontosPorMatricula[matriculaNorm];
      
      const valorPago = Number(venda.valor || 0);
      
      if (descontoGrupo && descontoGrupo.totalDesconto > 0) {
        const descontoPlanoFinal = Number(descontoGrupo.descontoPlano || 0);
        const descontoMatriculaFinal = desconsiderarMatricula ? 0 : Number(descontoGrupo.descontoMatricula || 0);
        const totalDesconto = descontoPlanoFinal + descontoMatriculaFinal;
        
        const valorCheio = valorPago + totalDesconto;
        const percentualDesconto = valorCheio > 0 ? (totalDesconto / valorCheio) * 100 : 0;
        
        return {
          ...venda,
          temDesconto: totalDesconto > 0,
          temDescontoPlano: descontoPlanoFinal > 0,
          temDescontoMatricula: descontoMatriculaFinal > 0,
          descontoPlano: descontoPlanoFinal,
          descontoMatricula: descontoMatriculaFinal,
          totalDesconto,
          valorCheio,
          percentualDesconto: parseFloat(percentualDesconto.toFixed(2)),
          descontoDetalhes: descontoGrupo.itens || []
        };
      } else {
        return {
          ...venda,
          temDesconto: false,
          temDescontoPlano: false,
          temDescontoMatricula: false,
          descontoPlano: 0,
          descontoMatricula: 0,
          totalDesconto: 0,
          valorCheio: valorPago,
          percentualDesconto: 0,
          descontoDetalhes: []
        };
      }
    });
    
    return vendasProcessadas;
  }, [vendasDaUnidade, descontos, unidade, desconsiderarMatricula]);

  // ===== RESTO DA LÓGICA PERMANECE IGUAL =====
  const dadosFiltrados = useMemo(() => {
    let resultado = vendasComDesconto;

    if (filtroResponsavel) {
      const filtro = normalize(filtroResponsavel);
      resultado = resultado.filter(venda =>
        normalize(venda.responsavel || '').includes(filtro)
      );
    }

    if (filtroMatricula) {
      const filtro = normalize(filtroMatricula);
      resultado = resultado.filter(venda =>
        normalize(String(venda.matricula || '')).includes(filtro)
      );
    }

    if (filtroNome) {
      const filtro = normalize(filtroNome);
      resultado = resultado.filter(venda =>
        normalize(venda.nome || '').includes(filtro)
      );
    }

    switch (tipoFiltro) {
      case "com_desconto":
        resultado = resultado.filter(venda => venda.temDesconto);
        break;
      case "sem_desconto":
        resultado = resultado.filter(venda => !venda.temDesconto);
        break;
      case "desconto_plano":
        resultado = resultado.filter(venda => venda.temDescontoPlano);
        break;
      case "desconto_matricula":
        resultado = resultado.filter(venda => venda.temDescontoMatricula);
        break;
      default:
        break;
    }

    return resultado;
  }, [vendasComDesconto, filtroResponsavel, filtroMatricula, filtroNome, tipoFiltro]);

  const dadosOrdenados = useMemo(() => {
    if (!sortConfig.key) return dadosFiltrados;

    return [...dadosFiltrados].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [dadosFiltrados, sortConfig]);

  const dadosPaginados = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dadosOrdenados.slice(startIndex, endIndex);
  }, [dadosOrdenados, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(dadosOrdenados.length / itemsPerPage);

  const analiseConsultores = useMemo(() => {
    if (!vendasComDesconto?.length) return [];
    return analisarDescontosPorConsultor(vendasComDesconto, unidade);
  }, [vendasComDesconto, unidade]);

  const estatisticas = useMemo(() => {
    const stats = {
      totalVendas: vendasComDesconto.length,
      vendasComDesconto: 0,
      vendasSemDesconto: 0,
      valorTotalVendido: 0,
      valorTotalCheio: 0,
      totalDescontos: 0,
      totalDescontoPlano: 0,
      totalDescontoMatricula: 0,
      percentualVendasComDesconto: 0,
      percentualDescontoGeral: 0,
      participacaoDescontoPlano: 0,
      participacaoDescontoMatricula: 0,
      ticketMedioVendido: 0,
      ticketMedioCheio: 0,
      descontoMedioPorVenda: 0
    };
    
    if (!vendasComDesconto?.length) return stats;
    
    vendasComDesconto.forEach(venda => {
      const valorVenda = Number(venda.valor || 0);
      const valorCheio = Number(venda.valorCheio || 0);
      const totalDesconto = Number(venda.totalDesconto || 0);
      
      stats.valorTotalVendido += valorVenda;
      stats.valorTotalCheio += valorCheio;
      stats.totalDescontos += totalDesconto;
      
      if (venda.temDesconto) {
        stats.vendasComDesconto++;
        stats.totalDescontoPlano += Number(venda.descontoPlano || 0);
        stats.totalDescontoMatricula += Number(venda.descontoMatricula || 0);
      } else {
        stats.vendasSemDesconto++;
      }
    });
    
    if (stats.totalVendas > 0) {
      stats.percentualVendasComDesconto = parseFloat(((stats.vendasComDesconto / stats.totalVendas) * 100).toFixed(2));
      stats.ticketMedioVendido = parseFloat((stats.valorTotalVendido / stats.totalVendas).toFixed(2));
      stats.ticketMedioCheio = parseFloat((stats.valorTotalCheio / stats.totalVendas).toFixed(2));
      stats.descontoMedioPorVenda = parseFloat((stats.totalDescontos / stats.totalVendas).toFixed(2));
    }
    
    if (stats.valorTotalCheio > 0) {
      stats.percentualDescontoGeral = parseFloat(((stats.totalDescontos / stats.valorTotalCheio) * 100).toFixed(2));
    }
    
    if (stats.totalDescontos > 0) {
      stats.participacaoDescontoPlano = parseFloat(((stats.totalDescontoPlano / stats.totalDescontos) * 100).toFixed(2));
      stats.participacaoDescontoMatricula = parseFloat(((stats.totalDescontoMatricula / stats.totalDescontos) * 100).toFixed(2));
    }
    
    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'number' && isNaN(value)) {
        stats[key] = 0;
      }
    });
    
    return stats;
  }, [vendasComDesconto, unidade]);

  const responsaveis = useMemo(() => {
    return [...new Set(vendasComDesconto.map(v => v.responsavel).filter(Boolean))].sort();
  }, [vendasComDesconto]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const resetFiltros = () => {
    setFiltroResponsavel("");
    setFiltroMatricula("");
    setFiltroNome("");
    setTipoFiltro("todos");
    setCurrentPage(1);
  };

  const uploadPlanilha = async () => {
    if (!file) {
      setError("Nenhum arquivo selecionado");
      return;
    }

    if (!unidade) {
      setError("Unidade não identificada");
      return;
    }

    setUploading(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("unidade", unidade.toLowerCase());

      const functionsUrl = process.env.REACT_APP_FIREBASE_FUNCTIONS_URL || 
        'https://southamerica-east1-chatpos-aff1a.cloudfunctions.net/uploadDescontos';
      
      const response = await fetch(functionsUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(`${result.message} (Unidade: ${unidade.toUpperCase()})`);
        setProcessedData(result.statistics);
        setFile(null);
        
        setTimeout(() => {
          console.log('🔄 Recarregando dados após upload...');
        }, 1000);
      } else {
        setError(result.error || "Erro no processamento");
      }
    } catch (err) {
      console.error("Erro no upload:", err);
      setError("Erro na conexão com o servidor: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteAllDescontos = async (startDate = null, endDate = null) => {
    if (!unidade) {
      setError("Unidade não identificada");
      return;
    }

    try {
      setLoading(true);
      const descontosRef = collection(db, "faturamento", unidade.toLowerCase(), "descontos");
      const snapshot = await getDocs(descontosRef);
      
      if (snapshot.empty) {
        setSuccessMessage("Nenhum desconto para deletar");
        setLoading(false);
        return;
      }

      let docsToDelete = snapshot.docs;
      
      // Se foi especificado um intervalo de datas, filtrar
      if (startDate && endDate) {
        const start = dayjs(startDate).startOf('day');
        const end = dayjs(endDate).endOf('day');
        
        docsToDelete = snapshot.docs.filter(doc => {
          const data = doc.data();
          
          // Tentar diferentes campos de data
          let docDate = null;
          
          if (data.dataVenda) {
            docDate = dayjs(data.dataVenda);
          } else if (data.data) {
            docDate = dayjs(data.data);
          } else if (data.createdAt) {
            docDate = dayjs(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt);
          } else if (data.timestamp) {
            docDate = dayjs(data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp);
          }
          
          // Se não conseguiu identificar a data, incluir na exclusão por segurança
          if (!docDate || !docDate.isValid()) {
            console.warn('Documento sem data válida será incluído na exclusão:', doc.id, data);
            return true;
          }
          
          return docDate.isBetween(start, end, null, '[]');
        });
        
        console.log(`Filtro por data aplicado: ${docsToDelete.length} de ${snapshot.docs.length} documentos serão excluídos`);
      }

      if (docsToDelete.length === 0) {
        const periodo = startDate && endDate 
          ? ` no período de ${dayjs(startDate).format('DD/MM/YYYY')} a ${dayjs(endDate).format('DD/MM/YYYY')}`
          : '';
        setSuccessMessage(`Nenhum desconto encontrado para deletar${periodo}`);
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);
      docsToDelete.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
      
      const periodo = startDate && endDate 
        ? ` no período de ${dayjs(startDate).format('DD/MM/YYYY')} a ${dayjs(endDate).format('DD/MM/YYYY')}`
        : '';
      setSuccessMessage(`${docsToDelete.length} desconto(s) deletado(s) com sucesso${periodo}!`);
      
    } catch (err) {
      console.error("Erro ao deletar descontos:", err);
      setError("Erro ao deletar descontos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  // ===== RETORNO DO HOOK =====
  return {
    // Dados principais
    descontos,
    vendasComDesconto: dadosPaginados,
    analiseConsultores,
    estatisticas,
    responsaveis,
    
    // Estados de loading e mensagens
    loading,
    error,
    successMessage,
    
    // Upload
    file,
    setFile,
    uploading,
    uploadPlanilha,
    processedData,
    
    // Filtros
    filtroResponsavel,
    setFiltroResponsavel,
    filtroMatricula,
    setFiltroMatricula,
    filtroNome,
    setFiltroNome,
    tipoFiltro,
    setTipoFiltro,
    resetFiltros,
    
    // Paginação
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    totalItens: dadosOrdenados.length,
    
    // Ordenação
    sortConfig,
    handleSort,
    
    // Ações
    deleteAllDescontos,
    clearMessages,
    
    // Informações da unidade
    unidade,
    totalVendasUnidade: vendasDaUnidade.length,
    totalDescontosUnidade: descontos.length,
    
    // Dados completos para análise detalhada (não paginados)
    todasVendasProcessadas: vendasComDesconto,
    dadosOrdenados,
    
    // Controle de mês
    selectedMonth,
    setSelectedMonth: setInternalSelectedMonth
  };
};