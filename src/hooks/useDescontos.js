import { useState, useEffect, useMemo } from "react";
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

dayjs.extend(customParseFormat);

export const useDescontos = (
  unidade, 
  vendas = [], 
  metas = [], 
  desconsiderarMatricula = true, 
  externalSelectedMonth = null
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

        console.log(`🔍 [${unidade}] Descontos carregados:`, {
          total: all.length,
          porMes: byMonth.length,
          porResponsavel: byResp.length,
          responsaveisOficiais: Array.from(responsaveisOficiaisSet),
          mesAtual: selectedMonth
        });
        
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

  // ===== FILTRAR VENDAS PARA ANÁLISE DE DESCONTOS =====
  const vendasDaUnidade = useMemo(() => {
    if (!vendas?.length) {
      console.log(`⚠️ [${unidade}] Nenhuma venda disponível`);
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
    
    // FILTRAR POR UNIDADE, MÊS E TIPO DE PRODUTO (PLANOS)
    const vendasFiltradas = vendas.filter(venda => {
      // 1. Filtro por unidade - apenas vendas da unidade atual (com normalização)
      const unidadeVenda = (venda.unidade || '').replace(/\s/g, '').toLowerCase();
      const unidadeAtual = (unidade || '').replace(/\s/g, '').toLowerCase();
      if (unidadeVenda !== unidadeAtual) return false;
      
      // 2. Filtro por mês
      const vendaMes = parseMes(venda.dataFormatada || venda.dataLancamento);
      if (!vendaMes || vendaMes !== selectedMonth) return false;
      
      // 3. Filtro apenas produtos que são PLANO
      if (!isPlano(venda.produto)) return false;
      
      return true;
    });
    
    console.log(`📊 [${unidade}] Vendas filtradas para análise:`, {
      totalVendas: vendas.length,
      vendasUnidade: vendas.filter(v => {
        const unidadeVenda = (v.unidade || '').replace(/\s/g, '').toLowerCase();
        const unidadeAtual = (unidade || '').replace(/\s/g, '').toLowerCase();
        return unidadeVenda === unidadeAtual;
      }).length,
      vendasMes: vendas.filter(v => {
        const vendaMes = parseMes(v.dataFormatada || v.dataLancamento);
        return vendaMes === selectedMonth;
      }).length,
      planosFiltrados: vendasFiltradas.length,
      exemploVendas: vendasFiltradas.slice(0, 3).map(v => ({
        responsavel: v.responsavel,
        unidade: v.unidade,
        produto: v.produto,
        valor: v.valor,
        matricula: v.matricula
      }))
    });
    
    return vendasFiltradas;
  }, [vendas, unidade, selectedMonth]);

  // ===== RECONCILIAÇÃO: VENDAS x DESCONTOS =====
  const vendasComDesconto = useMemo(() => {
    if (!vendasDaUnidade?.length) {
      console.log(`❌ [${unidade}] vendasDaUnidade está vazio! Retornando array vazio.`);
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
        valorCheio: Number(venda.valor || 0), // Valor cheio = valor pago quando não há desconto
        percentualDesconto: 0,
        descontoDetalhes: []
      }));
    }
    
    // Helpers para normalização de tipos
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

      if (itens.length > 0) {
        // ✅ SEMPRE prioriza itensDesconto quando disponível
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
        // fallback: usa valores consolidados
        dp = Number(desc.descontoPlano || 0);
        dm = Number(desc.descontoMatricula || 0);
        tt = Number(desc.totalDesconto || (dp + dm));
        if (tt > 0) {
          grupo.itens.push({ tipo: 'CONSOLIDADO', valor: tt });
        }
      } else {
        // legado (valor/tipo no topo)
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
    
    console.log(`🔍 [${unidade}] Descontos processados:`, {
      totalDescontos: descontos.length,
      matriculasComDesconto: Object.keys(descontosPorMatricula).length,
      exemploAgrupamento: Object.entries(descontosPorMatricula).slice(0, 3).map(([mat, dados]) => ({
        matricula: mat,
        totalDesconto: dados.totalDesconto,
        itens: dados.itens.length
      }))
    });
    
    // PASSO 2: Aplicar lógica de reconciliação
    const vendasProcessadas = vendasDaUnidade.map(venda => {
      const matriculaNorm = String(venda.matricula || '').replace(/\D/g, '').padStart(6, '0');
      const descontoGrupo = descontosPorMatricula[matriculaNorm];
      
      const valorPago = Number(venda.valor || 0); // Valor que o cliente efetivamente pagou
      
      if (descontoGrupo && descontoGrupo.totalDesconto > 0) {
        // TEM DESCONTO: Valor Cheio = Valor Pago + Total Descontos
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
    const totalDescontos = comDesconto.reduce((sum, v) => sum + (v.totalDesconto || 0), 0);
    const totalValorCheio = vendasProcessadas.reduce((sum, v) => sum + (v.valorCheio || 0), 0);
    
    console.log(`✅ [${unidade}] Reconciliação finalizada:`, {
      totalVendas: vendasProcessadas.length,
      comDesconto: comDesconto.length,
      semDesconto: vendasProcessadas.length - comDesconto.length,
      totalDescontos: totalDescontos.toFixed(2),
      totalValorCheio: totalValorCheio.toFixed(2),
      percentualComDesconto: ((comDesconto.length / vendasProcessadas.length) * 100).toFixed(1) + '%'
    });
    
    return vendasProcessadas;
  }, [vendasDaUnidade, descontos, unidade, desconsiderarMatricula]);

  // ===== FILTROS APLICADOS =====
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
    if (!vendasComDesconto?.length) return [];
    
    console.log(`🔍 [${unidade}] Iniciando análise por consultor:`, {
      totalVendas: vendasComDesconto.length,
      exemploVendas: vendasComDesconto.slice(0, 3).map(v => ({
        responsavel: v.responsavel,
        unidade: v.unidade,
        valor: v.valor
      }))
    });
    
    const resultado = analisarDescontosPorConsultor(vendasComDesconto, unidade);
    
    console.log(`📋 [${unidade}] Resultado análise consultores:`, {
      totalConsultores: resultado.length,
      consultores: resultado.map(c => c.responsavel)
    });
    
    return resultado;
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
    
    // Verificar e corrigir NaN
    Object.entries(stats).forEach(([key, value]) => {
      if (typeof value === 'number' && isNaN(value)) {
        console.warn(`⚠️ Estatística '${key}' é NaN - corrigindo para 0`);
        stats[key] = 0;
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(`${result.message} (Unidade: ${unidade.toUpperCase()})`);
        setProcessedData(result.statistics);
        setFile(null);
        
        // Aguardar um pouco para garantir que o Firestore atualizou
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

  // ===== DELETAR DESCONTOS =====
  const deleteAllDescontos = async () => {
    if (!unidade) {
      setError("Unidade não identificada");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja deletar TODOS os descontos da unidade ${unidade}? Esta ação não pode ser desfeita.`)) {
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

      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
      setSuccessMessage(`${snapshot.size} desconto(s) deletado(s) com sucesso!`);
    } catch (err) {
      console.error("Erro ao deletar descontos:", err);
      setError("Erro ao deletar descontos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== LIMPEZA DE MENSAGENS =====
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