import { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  collectionGroup,
  onSnapshot, 
  getDocs, 
  writeBatch, 
  doc 
} from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { 
  reconciliarVendasComDescontos, 
  analisarDescontosPorConsultor, 
  calcularEstatisticasGeraisDesconto 
} from "../utils/descontosAnalysis";

dayjs.extend(customParseFormat);

export const useDescontos = (unidade, vendas = [], metas = []) => {
  // Estados básicos
  const [descontos, setDescontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
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
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [desconsiderarMatricula, setDesconsiderarMatricula] = useState(false);
  
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
    if (typeof raw === 'object') {
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
    const d2 = dayjs(s); // fallback "não estrito" p/ ISO/Timestamp toString
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
      () => setMetasInternas([])
    );
    
    return () => unsubscribe();
  }, [unidade]);

  // ===== FONTE ÚNICA PARA RESPONSÁVEIS OFICIAIS =====
  const metasFonte = useMemo(() => {
    return (Array.isArray(metas) && metas.length) ? metas : metasInternas;
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
    if (!unidade) return;

    setLoading(true);

    // Traz TODOS os descontos de TODAS as unidades (igual às vendas)
    const unsub = onSnapshot(
      collectionGroup(db, 'descontos'),
      (snapshot) => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // 1) filtro por mês (se o desconto tiver 'lancamento'/'data'/'dataFormatada')
        const byMonth = all.filter(desc => {
          const mesDesc =
            parseMes(desc.mes) ||
            parseMes(desc.lancamento) ||
            parseMes(desc.data) ||
            parseMes(desc.dataFormatada);
          // se não conseguir inferir o mês, mantemos (para não perder nada)
          return !selectedMonth || !mesDesc ? true : (mesDesc === selectedMonth);
        });

        // 2) MUDANÇA: Agora busca descontos de TODAS as unidades para consultores da unidade atual
        // Similar ao comportamento das vendas - consultor pode dar desconto em qualquer unidade
        const byResp = byMonth.filter(desc => {
          // se não há metas, libera geral (modo aberto)
          if (responsaveisOficiaisSet.size === 0) return true;
          
          // Usa matching fuzzy para responsáveis - busca em TODAS as unidades
          const isOficial = matchResponsavel(desc.responsavel, responsaveisOficiaisSet);
          
          return isOficial;
        });

        console.log(`🔍 [${unidade}] Descontos carregados:`, {
          total: all.length,
          porMes: byMonth.length,
          porResponsavel: byResp.length,
          responsaveisOficiais: Array.from(responsaveisOficiaisSet)
        });
        
        setDescontos(byResp);
        setLoading(false);
        setError('');
      },
      (err) => {
        console.error('Erro ao buscar descontos (collectionGroup):', err);
        setError('Erro ao carregar descontos');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [unidade, selectedMonth, responsaveisOficiaisSet]);

  // ===== FILTRAR VENDAS PARA ANÁLISE DE DESCONTOS =====
  const vendasDaUnidade = useMemo(() => {
    if (!vendas.length) {
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
    
    // CORREÇÃO: Não filtrar por unidade - usar TODAS as vendas como na visão geral
    // Apenas filtrar por mês e tipo de produto (planos)
    const vendasFiltradas = vendas.filter(venda => {
      // 1. Filtro por mês
      const vendaMes = parseMes(venda.dataFormatada || venda.dataLancamento);
      if (!vendaMes) return false;
      if (vendaMes !== selectedMonth) return false;
      
      // 2. Filtro apenas produtos que são PLANO
      if (!isPlano(venda.produto)) return false;
      
      return true;
    });
    
    console.log(`📊 [${unidade}] Vendas para análise de descontos:`, {
      total: vendas.length,
      porMes: vendas.filter(v => {
        const mes = parseMes(v.dataFormatada || v.dataLancamento);
        return mes === selectedMonth;
      }).length,
      planosNoMes: vendasFiltradas.length,
      todasUnidades: true // Agora inclui todas as unidades
    });
    
    return vendasFiltradas;
  }, [vendas, metas, unidade, selectedMonth]);

  // ===== RECONCILIAÇÃO CORRETA: VENDAS x DESCONTOS =====
  const vendasComDesconto = useMemo(() => {
    
    if (!vendasDaUnidade.length) {
      return [];
    }
    
    if (!descontos.length) {
      return vendasDaUnidade.map(venda => ({
        ...venda,
        temDesconto: false,
        temDescontoPlano: false,
        temDescontoMatricula: false,
        descontoPlano: 0,
        descontoMatricula: 0,
        totalDesconto: 0,
        valorCheio: Number(venda.valor || 0), // Valor cheio = valor pago quando não há desconto
        percentualDesconto: 0
      }));
    }
    
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
    
    
    // Debug detalhado para matricula específica
    const targetMatricula = "011338";
    const descontosTarget = descontos.filter(d => {
      const norm = String(d.matricula || '').replace(/\D/g, '').padStart(6, '0');
      return norm === targetMatricula;
    });
    
    // PASSO 2: Aplicar lógica CORRETA de reconciliação
    const vendasProcessadas = vendasDaUnidade.map(venda => {
      // 🔒 NOVA LÓGICA: Filtrar por unidade da venda E responsáveis oficiais da unidade selecionada
      const vendaUnidade = (venda.unidade || "").toLowerCase();
      const unidadeAtual = unidade.toLowerCase();
      
      // Se a venda não é da unidade atual, verificar se o responsável é da unidade atual
      const isOficial = responsaveisOficiaisSet.size === 0
        ? true
        : responsaveisOficiaisSet.has(normalize(venda.responsavel));

      // Se não é responsável oficial da unidade atual, tratar como sem desconto
      if (!isOficial) {
        const valorPago = Number(venda.valor || 0);
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

      const matriculaNorm = String(venda.matricula || '').replace(/\D/g, '').padStart(6, '0');
      const descontoGrupo = descontosPorMatricula[matriculaNorm];
      
      
      const valorPago = Number(venda.valor || 0); // Valor que o cliente efetivamente pagou
      
      if (descontoGrupo && descontoGrupo.totalDesconto > 0) {
        // TEM DESCONTO: Valor Cheio = Valor Pago + Total Descontos
        // Se desconsiderar matrícula, usar apenas desconto de plano
        const descontoPlanoFinal = descontoGrupo.descontoPlano;
        const descontoMatriculaFinal = desconsiderarMatricula ? 0 : descontoGrupo.descontoMatricula;
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
          descontoDetalhes: descontoGrupo.itens
        };
      } else {
        // SEM DESCONTO: Valor Cheio = Valor Pago
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
    
    // PASSO 3: Logs de diagnóstico
    const comDesconto = vendasProcessadas.filter(v => v.temDesconto);
    const semDesconto = vendasProcessadas.filter(v => !v.temDesconto);
    const totalDescontos = comDesconto.reduce((sum, v) => sum + v.totalDesconto, 0);
    const totalValorCheio = vendasProcessadas.reduce((sum, v) => sum + v.valorCheio, 0);
    
    
    
    return vendasProcessadas;
  }, [vendasDaUnidade, descontos, unidade, responsaveisOficiaisSet, desconsiderarMatricula] );

  // ===== FILTROS APLICADOS (sem filtro por mês, já aplicado em vendasDaUnidade) =====
  const dadosFiltrados = useMemo(() => {
    let resultado = vendasComDesconto;

    // Filtro por responsável
    if (filtroResponsavel) {
      const filtro = normalize(filtroResponsavel);
      resultado = resultado.filter(venda =>
        normalize(venda.responsavel || '').includes(filtro)
      );
    }

    // Filtro por matrícula
    if (filtroMatricula) {
      const filtro = normalize(filtroMatricula);
      resultado = resultado.filter(venda =>
        normalize(String(venda.matricula || '')).includes(filtro)
      );
    }

    // Filtro por nome
    if (filtroNome) {
      const filtro = normalize(filtroNome);
      resultado = resultado.filter(venda =>
        normalize(venda.nome || '').includes(filtro)
      );
    }

    // Filtro por tipo de desconto
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

  // ===== ORDENAÇÃO =====
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

  // ===== PAGINAÇÃO =====
  const dadosPaginados = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dadosOrdenados.slice(startIndex, endIndex);
  }, [dadosOrdenados, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(dadosOrdenados.length / itemsPerPage);

  // ===== ANÁLISE POR CONSULTOR =====
  const analiseConsultores = useMemo(() => {
    
    // Agrupar vendas por consultor
    const consultoresMap = {};
    
    vendasComDesconto.forEach(venda => {
      const responsavel = venda.responsavel || 'Sem Responsável';
      
      if (!consultoresMap[responsavel]) {
        consultoresMap[responsavel] = {
          responsavel,
          vendas: [],
          totalVendas: 0,
          vendasComDesconto: 0,
          vendasSemDesconto: 0,
          valorTotalVendido: 0,
          valorTotalCheio: 0,
          totalDescontos: 0,
          totalDescontoPlano: 0,
          totalDescontoMatricula: 0
        };
      }
      
      const consultor = consultoresMap[responsavel];
      consultor.vendas.push(venda);
      consultor.totalVendas++;
      
      const valorVenda = Number(venda.valor || 0);
      const valorCheio = Number(venda.valorCheio || 0);
      const totalDesconto = Number(venda.totalDesconto || 0);
      
      consultor.valorTotalVendido += valorVenda;
      consultor.valorTotalCheio += valorCheio;
      consultor.totalDescontos += totalDesconto;
      
      if (venda.temDesconto) {
        consultor.vendasComDesconto++;
        consultor.totalDescontoPlano += Number(venda.descontoPlano || 0);
        consultor.totalDescontoMatricula += Number(venda.descontoMatricula || 0);
      } else {
        consultor.vendasSemDesconto++;
      }
    });
    
    // Calcular métricas derivadas
    const consultoresArray = Object.values(consultoresMap).map(consultor => {
      const percentualVendasComDesconto = consultor.totalVendas > 0 
        ? parseFloat(((consultor.vendasComDesconto / consultor.totalVendas) * 100).toFixed(2))
        : 0;
      
      const percentualDescontoMedio = consultor.valorTotalCheio > 0
        ? parseFloat(((consultor.totalDescontos / consultor.valorTotalCheio) * 100).toFixed(2))
        : 0;
      
      const ticketMedioVendido = consultor.totalVendas > 0
        ? consultor.valorTotalVendido / consultor.totalVendas
        : 0;
      
      const ticketMedioCheio = consultor.totalVendas > 0
        ? consultor.valorTotalCheio / consultor.totalVendas
        : 0;
      
      return {
        ...consultor,
        percentualVendasComDesconto,
        percentualDescontoMedio,
        ticketMedioVendido,
        ticketMedioCheio
      };
    });
    
    // Ordenar por total de vendas (decrescente)
    consultoresArray.sort((a, b) => b.totalVendas - a.totalVendas);
    
    
    return consultoresArray;
  }, [vendasComDesconto, unidade]);

  // ===== ESTATÍSTICAS GERAIS =====
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
    
    // Calcular percentuais e médias
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
    
    console.log(`✅ [${unidade}] Estatísticas calculadas:`, stats);
    
    // Verificar NaN
    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'number' && isNaN(value)) {
        console.error(`❌ Estatística '${key}' é NaN`);
        stats[key] = 0; // Corrigir para 0
      }
    });
    
    return stats;
  }, [vendasComDesconto, unidade]);

  // ===== RESPONSÁVEIS ÚNICOS =====
  const responsaveis = useMemo(() => {
    return [...new Set(vendasComDesconto.map(v => v.responsavel).filter(Boolean))].sort();
  }, [vendasComDesconto]);

  // ===== FUNÇÕES AUXILIARES =====
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
    setDesconsiderarMatricula(false);
    setCurrentPage(1);
  };

  // ===== UPLOAD DE PLANILHA =====
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
      
      console.log('🔗 Upload para:', functionsUrl);
      console.log('📦 Arquivo:', file.name);
      console.log('🏢 Unidade:', unidade);
      
      const response = await fetch(functionsUrl, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(`${result.message} (Unidade: ${unidade.toUpperCase()})`);
        setProcessedData(result.statistics);
        setFile(null);
        
        // Importante: Aguardar um pouco para garantir que o Firestore atualizou
        setTimeout(() => {
          console.log('🔄 Recarregando dados após upload...');
        }, 1000);
      } else {
        setError(result.error || "Erro no processamento");
      }
    } catch (err) {
      console.error("Erro no upload:", err);
      setError("Erro na conexão com o servidor");
    } finally {
      setUploading(false);
    }
  };

  // ===== DELETAR DESCONTOS =====
  const deleteAllDescontos = async () => {
    if (!unidade) {
      setError("Unidade não identificada");
      return;
    }

    try {
      const descontosRef = collection(db, "faturamento", unidade.toLowerCase(), "descontos");
      const snapshot = await getDocs(descontosRef);
      
      if (snapshot.empty) {
        setSuccessMessage("Nenhum desconto para deletar");
        return;
      }

      const batch = writeBatch(db);
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      setSuccessMessage(`${snapshot.size} desconto(s) deletado(s) com sucesso!`);
    } catch (err) {
      console.error("Erro ao deletar descontos:", err);
      setError("Erro ao deletar descontos");
    }
  };

  return {
    // Dados
    descontos,
    vendasComDesconto: dadosPaginados,
    analiseConsultores,
    estatisticas,
    responsaveis,
    
    // Estados
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
    selectedMonth,
    setSelectedMonth,
    tipoFiltro,
    setTipoFiltro,
    desconsiderarMatricula,
    setDesconsiderarMatricula,
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
    
    // Info
    unidade,
    totalVendasUnidade: vendasDaUnidade.length,
    totalDescontosUnidade: descontos.length,
    
    // Limpeza
    clearMessages: () => {
      setError("");
      setSuccessMessage("");
    },
    
    // Dados completos para análise detalhada
    todasVendasProcessadas: vendasComDesconto,
    dadosOrdenados
  };
};