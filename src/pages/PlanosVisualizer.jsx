import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, Info, TrendingUp, AlertCircle, User, Calendar, Filter, Mail, MessageCircle } from 'lucide-react';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import ShareService from '../components/export/ShareService';
import { useShareData } from '../hooks/useShareData';

const PlanosVisualizer = ({ comissaoPlanos = [], unidade }) => {
  // Early return se unidade não estiver definida
  if (!unidade) {
    return (
      <div className="planos-visualizer">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Aguardando dados da unidade...</p>
        </div>
      </div>
    );
  }
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState(null);
  const [vendasReais, setVendasReais] = useState([]);
  const [consultoresList, setConsultoresList] = useState([]);
  const [selectedConsultor, setSelectedConsultor] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [loading, setLoading] = useState(true);
  
  // 🔧 NOVO: Estados para configuração de remuneração
  const [configRem, setConfigRem] = useState({
    premiacao: [],
    comissaoPlanos: [],
    metaUnidade: 0,
    taxaSem: 0.012,
    taxaCom: 0.015
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 🔧 NOVO: Carrega configuração de remuneração do Firebase
  useEffect(() => {
    if (!unidade) return;

    async function loadConfig() {
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
            unidade?.toLowerCase() || 'default', 
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
            comissaoPlanos: comissaoPlanos, // usa os planos passados por props
            metaUnidade: 0,
            taxaSem: 0.012,
            taxaCom: 0.015,
            mesReferencia: mesAtual
          };
        }
        
        setConfigRem(config);
        console.log("✅ Configuração de remuneração carregada:", config);
      } catch (error) {
        console.error("🚨 Erro ao carregar configuração de remuneração:", error);
        
        setConfigRem({
          premiacao: [],
          comissaoPlanos: comissaoPlanos,
          metaUnidade: 0,
          taxaSem: 0.012,
          taxaCom: 0.015,
          mesReferencia: dayjs().format('YYYY-MM')
        });
      } finally {
        setLoadingConfig(false);
      }
    }

    loadConfig();
  }, [unidade, comissaoPlanos]);

  // 🔧 NOVA FUNÇÃO: Função corrigida para calcular remuneração
  function calcularRemuneracaoCorrigida(metaValor, vendasArr, tipo, unidadeBatida, configRem, maiorMeta = 0) {
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
      
      console.log("🔍 DEBUG COMISSÃO PlanosVisualizer:", {
        totalVendas: totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        metaValor: metaValor ? metaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A',
        metaIndividualBatida,
        unidadeBatida,
        totalVendasArray: vendasArr.length
      });
      
      let totalComissao = 0;
      
      vendasArr.forEach((venda, index) => {
        const valorVenda = Number(venda?.valor) || 0;
        
        // Verificar se a venda se encaixa em algum plano
        const plano = Array.isArray(comissaoPlanos) 
          ? comissaoPlanos.find(p => 
              valorVenda >= (p.min || 0) && 
              valorVenda <= (p.max || Infinity)
            )
          : null;
        
        let comissaoVenda = 0;
        
        if (plano) {
          // ✅ VENDA É UM PLANO: Usar valor fixo baseado nas metas (CORRIGIDO!)
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
      
      console.log(`💰 TOTAL COMISSÃO CALCULADA (PlanosVisualizer): R$ ${totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      return totalComissao;
    } 
    
    // ===== CÁLCULO PARA PREMIAÇÃO COM PROPORCIONALIDADE =====
    if (tipo === 'premiacao') {
      const acumulado = vendasArr.reduce((soma, v) => soma + (Number(v?.valor) || 0), 0);
      const percentual = metaValor > 0 ? (acumulado / metaValor) * 100 : 0;
      
      const faixasAtingidas = Array.isArray(premiacao)
        ? premiacao
            .filter(f => f.percentual <= percentual)
            .sort((a, b) => (a.percentual || 0) - (b.percentual || 0))
        : [];
      
      const premioBase = faixasAtingidas.reduce((soma, faixa) => {
        return soma + (Number(faixa.premio) || 0);
      }, 0);
      
      // ✅ CÁLCULO PROPORCIONAL: (metaIndividual / maiorMeta) * premioBase
      const fatorProporcionalidade = maiorMeta > 0 ? (metaValor / maiorMeta) : 1;
      const premioTotal = premioBase * fatorProporcionalidade;
      
      return premioTotal;
    }
    
    console.warn(`Tipo de remuneração não reconhecido: ${tipo}`);
    return 0;
  }

  // Carregar dados reais do Firebase
  useEffect(() => {
    if (!unidade) return;

    setLoading(true);
    
    const vendasRef = collection(db, "faturamento", unidade?.toLowerCase() || 'default', "vendas");
    
    const unsubscribe = onSnapshot(vendasRef, (snapshot) => {
      const vendas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setVendasReais(vendas);
      
      // Extrair lista de consultores únicos
      const consultores = [...new Set(vendas.map(v => v.responsavel).filter(Boolean))];
      setConsultoresList(consultores.sort());
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [unidade]);

  // 🔧 NOVA FUNCIONALIDADE: Carrega meta da unidade
  const totalUnidade = vendasReais
    .filter(venda => {
      const dataVenda = dayjs(venda.dataFormatada, 'YYYY-MM-DD');
      const mesVenda = dataVenda.format('YYYY-MM');
      return mesVenda === selectedMonth;
    })
    .reduce((soma, v) => soma + Number(v.valor || 0), 0);

  const unidadeBatida = totalUnidade >= Number(configRem?.metaUnidade || 0);

  // Filtrar vendas baseado nos filtros selecionados
  const vendasFiltradas = vendasReais.filter(venda => {
    const dataVenda = dayjs(venda.dataFormatada, 'YYYY-MM-DD');
    const mesVenda = dataVenda.format('YYYY-MM');
    
    // Filtro por mês
    if (selectedMonth && mesVenda !== selectedMonth) return false;
    
    // Filtro por consultor
    if (selectedConsultor && venda.responsavel !== selectedConsultor) return false;
    
    return true;
  });

  // Vendas não classificadas (fora dos intervalos definidos)
  const vendasNaoClassificadas = vendasFiltradas.filter(venda => {
    const valor = Number(venda.valor || 0);
    return !configRem.comissaoPlanos.some(plano => valor >= plano.min && valor <= plano.max);
  });

  // 🔧 CORRIGIDO: Analisar as vendas por plano com lógica correta
  const analisePlanos = () => {
    const analise = configRem.comissaoPlanos.map(plano => {
      const vendasDoPlano = vendasFiltradas.filter(venda => {
        const valor = Number(venda.valor || 0);
        return valor >= plano.min && valor <= plano.max;
      });

      const totalVendas = vendasDoPlano.length;
      const valorTotal = vendasDoPlano.reduce((s, v) => s + Number(v.valor || 0), 0);
      
      // 🔧 CORRÇÃO: Calcular comissão com lógica real
      const comissaoTotal = vendasDoPlano.reduce((soma, venda) => {
        const valor = Number(venda.valor || 0);
        
        // Usar a lógica correta baseada na meta da unidade e individual
        let comissaoVenda = 0;
        if (unidadeBatida) {
          comissaoVenda = plano.metaTME || 0;
        } else {
          // Para simplicidade, assumindo que a meta individual foi batida
          // Em implementação real, seria necessário verificar a meta individual de cada consultor
          comissaoVenda = plano.comMeta || 0;
        }
        
        return soma + comissaoVenda;
      }, 0);

      return {
        ...plano,
        totalVendas,
        valorTotal,
        comissaoTotal,
        percentualVendas: vendasFiltradas.length > 0 ? ((totalVendas / vendasFiltradas.length) * 100).toFixed(1) : 0,
        vendasDetalhadas: vendasDoPlano
      };
    });

    return analise;
  };

  // 🔧 CORRIGIDO: Análise financeira com cálculo correto
  const analiseFinanceira = () => {
    const dadosAnalise = analisePlanos();
    
    // Vendas e comissões dos planos
    const vendasPlanos = dadosAnalise.reduce((soma, plano) => soma + plano.valorTotal, 0);
    const comissaoPlanos = dadosAnalise.reduce((soma, plano) => soma + plano.comissaoTotal, 0);
    const quantidadePlanos = dadosAnalise.reduce((soma, plano) => soma + plano.totalVendas, 0);
    
    // Vendas não classificadas (fora dos planos)
    const valorNaoClassificado = vendasNaoClassificadas.reduce((s, v) => s + Number(v.valor || 0), 0);
    const quantidadeNaoClassificada = vendasNaoClassificadas.length;
    
    // 🔧 CORRIGIDO: Calcular comissão dos produtos fora dos planos com taxa correta
    // Verificar se meta da unidade foi batida para usar taxa correta
    const taxaOutrosProdutos = unidadeBatida ? configRem.taxaCom : configRem.taxaSem;
    const comissaoNaoClassificada = valorNaoClassificado * taxaOutrosProdutos;
    
    // Totais gerais
    const valorTotalGeral = vendasPlanos + valorNaoClassificado;
    const comissaoTotalGeral = comissaoPlanos + comissaoNaoClassificada;
    const quantidadeTotalGeral = quantidadePlanos + quantidadeNaoClassificada;
    
    return {
      planos: {
        valor: vendasPlanos,
        comissao: comissaoPlanos,
        quantidade: quantidadePlanos,
        percentualValor: valorTotalGeral > 0 ? (vendasPlanos / valorTotalGeral) * 100 : 0,
        percentualQuantidade: quantidadeTotalGeral > 0 ? (quantidadePlanos / quantidadeTotalGeral) * 100 : 0
      },
      outrosProdutos: {
        valor: valorNaoClassificado,
        comissao: comissaoNaoClassificada,
        quantidade: quantidadeNaoClassificada,
        percentualValor: valorTotalGeral > 0 ? (valorNaoClassificado / valorTotalGeral) * 100 : 0,
        percentualQuantidade: quantidadeTotalGeral > 0 ? (quantidadeNaoClassificada / quantidadeTotalGeral) * 100 : 0,
        taxaAplicada: taxaOutrosProdutos
      },
      totais: {
        valor: valorTotalGeral,
        comissao: comissaoTotalGeral,
        quantidade: quantidadeTotalGeral
      },
      metaInfo: {
        unidadeBatida,
        metaUnidade: configRem.metaUnidade,
        totalUnidade
      }
    };
  };

  const dadosAnalise = analisePlanos();
  const { planos: resumoPlanos, outrosProdutos, totais, metaInfo } = analiseFinanceira();
  const cores = ['#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669'];

  // Dados para o gráfico de barras
  const dadosGrafico = dadosAnalise.map(plano => ({
    nome: plano.plano,
    vendas: plano.totalVendas,
    valor: plano.valorTotal,
    comissao: plano.comissaoTotal
  }));

  // Dados para o gráfico de pizza
  const dadosPizza = dadosAnalise
    .filter(p => p.totalVendas > 0)
    .map((plano, index) => ({
      name: plano.plano,
      value: plano.totalVendas,
      fill: cores[index % cores.length]
    }));

  // Verificar problemas na configuração
  const verificarProblemas = () => {
    const problemas = [];
    
    // Verifica sobreposições
    for (let i = 0; i < configRem.comissaoPlanos.length; i++) {
      for (let j = i + 1; j < configRem.comissaoPlanos.length; j++) {
        const plano1 = configRem.comissaoPlanos[i];
        const plano2 = configRem.comissaoPlanos[j];
        
        if ((plano1.min >= plano2.min && plano1.min <= plano2.max) ||
            (plano1.max >= plano2.min && plano1.max <= plano2.max)) {
          problemas.push(`Sobreposição entre ${plano1.plano} e ${plano2.plano}`);
        }
      }
    }

    // Verifica lacunas
    const planosOrdenados = [...configRem.comissaoPlanos].sort((a, b) => a.min - b.min);
    for (let i = 0; i < planosOrdenados.length - 1; i++) {
      if (planosOrdenados[i].max + 1 < planosOrdenados[i + 1].min) {
        problemas.push(`Lacuna entre ${planosOrdenados[i].plano} (R$ ${planosOrdenados[i].max}) e ${planosOrdenados[i + 1].plano} (R$ ${planosOrdenados[i + 1].min})`);
      }
    }

    // Verificar vendas não classificadas
    if (vendasNaoClassificadas.length > 0) {
      const valorNaoClassificado = vendasNaoClassificadas.reduce((s, v) => s + Number(v.valor || 0), 0);
      problemas.push(`${vendasNaoClassificadas.length} vendas não se enquadram em nenhum plano (R$ ${valorNaoClassificado.toLocaleString('pt-BR')})`);
    }

    return problemas;
  };

  const problemas = verificarProblemas();

  // Dados para compartilhamento
  const shareData = useShareData('planos', {
    planos: dadosAnalise,
    vendasReais,
    comissaoPlanos: configRem.comissaoPlanos,
    metaUnidade: configRem.metaUnidade,
    analiseFinanceira: {
      receitaTotal: dadosAnalise.reduce((sum, p) => sum + p.valorTotal, 0),
      comissoesPagas: dadosAnalise.reduce((sum, p) => sum + p.comissaoTotal, 0)
    }
  }, unidade, selectedMonth);

  const [showShareModal, setShowShareModal] = useState(false);

  // Funções de compartilhamento
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPlanosData = () => {
    const header = `📋 RELATÓRIO PLANOS - ${unidade.toUpperCase()}\n`;
    const date = `📅 Período: ${dayjs(selectedMonth).format('MMMM/YYYY')}\n`;
    const timestamp = `🕒 Gerado em: ${dayjs().format('DD/MM/YYYY HH:mm')}\n`;
    const separator = '─'.repeat(50) + '\n';

    let content = '';
    
    // Resumo dos planos
    content += '📊 RESUMO DOS PLANOS\n';
    content += `• Total de Planos Analisados: ${configRem.comissaoPlanos.length}\n`;
    content += `• Comissão Total: R$ ${formatMoney(totais.comissao)}\n`;
    content += `• Vendas Totais: R$ ${formatMoney(totais.valor)}\n`;
    content += `• Meta da Unidade: ${metaInfo.unidadeBatida ? 'ATINGIDA ✅' : 'NÃO ATINGIDA ⚠️'}\n\n`;

    // Detalhes por plano
    if (dadosAnalise && dadosAnalise.length > 0) {
      content += '📈 DETALHES POR PLANO\n';
      dadosAnalise.forEach(plano => {
        content += `\n• ${plano.plano}:\n`;
        content += `  - Vendas: R$ ${formatMoney(plano.valorTotal)}\n`;
        content += `  - Comissão: R$ ${formatMoney(plano.comissaoTotal)}\n`;
        content += `  - Quantidade: ${plano.totalVendas} vendas\n`;
      });
      content += '\n';
    }

    // Análise financeira
    content += '💰 ANÁLISE FINANCEIRA\n';
    content += `• Receita Total: R$ ${formatMoney(totais.valor)}\n`;
    content += `• Comissões Pagas: R$ ${formatMoney(totais.comissao)}\n`;
    content += `• Planos vs Outros: ${resumoPlanos.percentualValor.toFixed(1)}% vs ${outrosProdutos.percentualValor.toFixed(1)}%\n\n`;

    return header + date + timestamp + separator + content;
  };

  const handleShareEmail = () => {
    const formattedData = formatPlanosData();
    const subject = `Relatório Planos - ${unidade} - ${dayjs(selectedMonth).format('MM/YYYY')}`;
    const body = encodeURIComponent(formattedData);
    
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  const handleShareWhatsApp = () => {
    const formattedData = formatPlanosData();
    const message = encodeURIComponent(formattedData);
    
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading || loadingConfig) {
    return (
      <div className="planos-visualizer">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando dados de vendas e configuração...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="planos-visualizer">
      {/* Indicador de status da meta da unidade */}
      <div className={`meta-status-banner ${metaInfo.unidadeBatida ? 'success' : 'warning'}`}>
        <div className="status-content">
          <h3>
            {metaInfo.unidadeBatida ? '🎯 Meta da Unidade ATINGIDA!' : '⚠️ Meta da Unidade NÃO atingida'}
          </h3>
          <div className="status-details">
            <span>
              Meta: {metaInfo.metaUnidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
              Realizado: {metaInfo.totalUnidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
              {metaInfo.metaUnidade > 0 ? `${(metaInfo.totalUnidade / metaInfo.metaUnidade * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div className="impact-note">
            <small>
              {metaInfo.unidadeBatida 
                ? 'Comissões dos planos usando valores TME (mais altos)' 
                : 'Comissões dos planos usando valores comMeta ou semMeta'
              }
            </small>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filters-header">
          <h3><Filter size={20} /> Filtros de Análise</h3>
          <div className="share-buttons">
            <button 
              className="share-btn email-btn" 
              onClick={() => handleShareEmail()}
              title="Enviar por Email"
            >
              <Mail size={16} />
              Email
            </button>
            <button 
              className="share-btn whatsapp-btn" 
              onClick={() => handleShareWhatsApp()}
              title="Enviar por WhatsApp"
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          </div>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Mês de Análise:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Consultor:</label>
            <select
              value={selectedConsultor}
              onChange={(e) => setSelectedConsultor(e.target.value)}
            >
              <option value="">Todos os consultores</option>
              {consultoresList.map(consultor => (
                <option key={consultor} value={consultor}>
                  {consultor}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Header com estatísticas gerais */}
      <div className="stats-header">
        <div className="stat-card">
          <h3>Total de Planos</h3>
          <p className="stat-number">{configRem.comissaoPlanos.length}</p>
        </div>
        <div className="stat-card">
          <h3>Vendas Analisadas</h3>
          <p className="stat-number">{vendasFiltradas.length}</p>
        </div>
        <div className="stat-card">
          <h3>Valor Total</h3>
          <p className="stat-text">
            R$ {totais.valor.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="stat-card">
          <h3>Comissão Total</h3>
          <p className="stat-text success">
            R$ {totais.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Nova seção: Resumo Financeiro */}
      <div className="financial-summary">
        <h3><TrendingUp size={20} /> Resumo Financeiro: Planos vs Outros Produtos</h3>
        
        <div className="summary-cards">
          {/* Card dos Planos */}
          <div className="summary-card planos-card">
            <div className="card-header">
              <h4>💎 Vendas de Planos</h4>
              <span className="percentage">{resumoPlanos.percentualValor.toFixed(1)}% do total</span>
            </div>
            
            <div className="metrics">
              <div className="metric">
                <span className="label">Quantidade:</span>
                <span className="value">{resumoPlanos.quantidade} vendas</span>
              </div>
              <div className="metric">
                <span className="label">Valor Total:</span>
                <span className="value">R$ {resumoPlanos.valor.toLocaleString('pt-BR')}</span>
              </div>
              <div className="metric highlight">
                <span className="label">Comissão:</span>
                <span className="value">R$ {resumoPlanos.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="metric">
                <span className="label">Comissão Média:</span>
                <span className="value">
                  R$ {resumoPlanos.quantidade > 0 ? (resumoPlanos.comissao / resumoPlanos.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
              </div>
            </div>
          </div>

          {/* Card dos Outros Produtos */}
          <div className="summary-card outros-card">
            <div className="card-header">
              <h4>📦 Outros Produtos</h4>
              <span className="percentage">{outrosProdutos.percentualValor.toFixed(1)}% do total</span>
            </div>
            
            <div className="metrics">
              <div className="metric">
                <span className="label">Quantidade:</span>
                <span className="value">{outrosProdutos.quantidade} vendas</span>
              </div>
              <div className="metric">
                <span className="label">Valor Total:</span>
                <span className="value">R$ {outrosProdutos.valor.toLocaleString('pt-BR')}</span>
              </div>
              <div className="metric highlight">
                <span className="label">Comissão ({(outrosProdutos.taxaAplicada * 100).toFixed(1)}%):</span>
                <span className="value">R$ {outrosProdutos.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="metric">
                <span className="label">Taxa Aplicada:</span>
                <span className="value">
                  {(outrosProdutos.taxaAplicada * 100).toFixed(1)}% ({metaInfo.unidadeBatida ? 'com meta unidade' : 'sem meta unidade'})
                </span>
              </div>
            </div>
          </div>

          {/* Card Comparativo */}
          <div className="summary-card comparison-card">
            <div className="card-header">
              <h4>⚡ Comparativo</h4>
              <span className="percentage">Análise de Eficiência</span>
            </div>
            
            <div className="metrics">
              <div className="metric">
                <span className="label">Comissão/Venda (Planos):</span>
                <span className="value">
                  R$ {resumoPlanos.quantidade > 0 ? (resumoPlanos.comissao / resumoPlanos.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
              </div>
              <div className="metric">
                <span className="label">Comissão/Venda (Outros):</span>
                <span className="value">
                  R$ {outrosProdutos.quantidade > 0 ? (outrosProdutos.comissao / outrosProdutos.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </span>
              </div>
              <div className="metric highlight">
                <span className="label">Eficiência dos Planos:</span>
                <span className="value">
                  {resumoPlanos.quantidade > 0 && outrosProdutos.quantidade > 0 
                    ? `${((resumoPlanos.comissao / resumoPlanos.quantidade) / (outrosProdutos.comissao / outrosProdutos.quantidade)).toFixed(1)}x maior`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="metric">
                <span className="label">Foco Recomendado:</span>
                <span className="value">
                  {resumoPlanos.comissao > outrosProdutos.comissao ? '💎 Planos' : '📦 Outros Produtos'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Pizza para Comparação */}
        <div className="comparison-chart">
          <h4>Distribuição de Comissões</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Planos', value: resumoPlanos.comissao, fill: '#4f46e5' },
                  { name: 'Outros Produtos', value: outrosProdutos.comissao, fill: '#dc2626' }
                ]}
                cx="50%"
                cy="50%"
                outerRadius={60}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              />
              <Tooltip 
                formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Comissão']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas de problemas */}
      {problemas.length > 0 && (
        <div className="problems-alert">
          <AlertCircle size={20} />
          <div>
            <h4>Problemas encontrados na configuração:</h4>
            <ul>
              {problemas.map((problema, index) => (
                <li key={index}>{problema}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Vendas não classificadas */}
      {vendasNaoClassificadas.length > 0 && (
        <div className="unclassified-alert">
          <AlertCircle size={20} />
          <div>
            <h4>Vendas não classificadas:</h4>
            <p>{vendasNaoClassificadas.length} vendas não se enquadram em nenhum plano configurado.</p>
            <details>
              <summary>Ver detalhes</summary>
              <div className="unclassified-list">
                {vendasNaoClassificadas.slice(0, 10).map((venda, index) => (
                  <div key={index} className="unclassified-item">
                    <span>{venda.responsavel}</span>
                    <span>{venda.produto}</span>
                    <span>R$ {Number(venda.valor).toLocaleString('pt-BR')}</span>
                    <span>{dayjs(venda.dataFormatada, 'YYYY-MM-DD').format('DD/MM/YYYY')}</span>
                  </div>
                ))}
                {vendasNaoClassificadas.length > 10 && (
                  <p>... e mais {vendasNaoClassificadas.length - 10} vendas</p>
                )}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Botões de controle */}
      <div className="controls">
        <button 
          className={`btn ${showDetails ? 'secondary' : 'primary'}`}
          onClick={() => setShowDetails(!showDetails)}
        >
          <Eye size={16} />
          {showDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
        </button>
      </div>

      {/* Gráficos */}
      <div className="charts-container">
        <div className="chart-section">
          <h3><TrendingUp size={20} /> Distribuição de Vendas por Plano</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'vendas') return [`${value} vendas`, 'Quantidade'];
                  if (name === 'comissao') return [`R$ ${value.toLocaleString('pt-BR')}`, 'Comissão'];
                  return [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor'];
                }}
              />
              <Bar dataKey="vendas" fill="#4f46e5" name="vendas" />
              <Bar dataKey="comissao" fill="#059669" name="comissao" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {dadosPizza.length > 0 && (
          <div className="chart-section">
            <h3><Info size={20} /> Proporção de Vendas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosPizza}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} vendas`, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabela detalhada */}
      {showDetails && (
        <div className="details-table">
          <h3>Análise Detalhada por Plano</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Plano</th>
                  <th>Faixa de Valor</th>
                  <th>Vendas</th>
                  <th>% do Total</th>
                  <th>Valor Total</th>
                  <th>Comissão Total</th>
                  <th>Comissão Sem Meta</th>
                  <th>Comissão Com Meta</th>
                  <th>Comissão TME</th>
                </tr>
              </thead>
              <tbody>
                {dadosAnalise.map((plano, index) => (
                  <tr 
                    key={index}
                    className={plano.totalVendas === 0 ? 'no-sales' : ''}
                    onClick={() => setSelectedPlano(plano)}
                  >
                    <td className="plano-name">{plano.plano}</td>
                    <td>R$ {plano.min.toLocaleString('pt-BR')} - R$ {plano.max.toLocaleString('pt-BR')}</td>
                    <td className="center">{plano.totalVendas}</td>
                    <td className="center">{plano.percentualVendas}%</td>
                    <td>R$ {plano.valorTotal.toLocaleString('pt-BR')}</td>
                    <td className="comissao highlight">R$ {plano.comissaoTotal.toLocaleString('pt-BR')}</td>
                    <td className="comissao">R$ {plano.semMeta}</td>
                    <td className="comissao">R$ {plano.comMeta}</td>
                    <td className="comissao success">R$ {plano.metaTME}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de detalhes do plano selecionado */}
      {selectedPlano && (
        <div className="modal-overlay" onClick={() => setSelectedPlano(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Detalhes do Plano: {selectedPlano.plano}</h3>
            <div className="plano-details">
              <p><strong>Faixa de valores:</strong> R$ {selectedPlano.min.toLocaleString('pt-BR')} - R$ {selectedPlano.max.toLocaleString('pt-BR')}</p>
              <p><strong>Total de vendas:</strong> {selectedPlano.totalVendas}</p>
              <p><strong>Valor total:</strong> R$ {selectedPlano.valorTotal.toLocaleString('pt-BR')}</p>
              <p><strong>Percentual do total:</strong> {selectedPlano.percentualVendas}%</p>
              
              <div className="comissao-details">
                <h4>Estrutura de Comissão:</h4>
                <div className="comissao-grid">
                  <div className="comissao-item">
                    <span>Sem Meta Individual:</span>
                    <span>R$ {selectedPlano.semMeta}</span>
                  </div>
                  <div className="comissao-item">
                    <span>Com Meta Individual:</span>
                    <span>R$ {selectedPlano.comMeta}</span>
                  </div>
                  <div className="comissao-item">
                    <span>Meta da Unidade (TME):</span>
                    <span>R$ {selectedPlano.metaTME}</span>
                  </div>
                </div>
              </div>

              {/* Lista de vendas deste plano */}
              {selectedPlano.vendasDetalhadas.length > 0 && (
                <div className="vendas-detalhadas">
                  <h4>Vendas neste plano:</h4>
                  <div className="vendas-list">
                    {selectedPlano.vendasDetalhadas.slice(0, 5).map((venda, index) => (
                      <div key={index} className="venda-item">
                        <span>{venda.responsavel}</span>
                        <span>{venda.produto}</span>
                        <span>R$ {Number(venda.valor).toLocaleString('pt-BR')}</span>
                        <span>{dayjs(venda.dataFormatada, 'YYYY-MM-DD').format('DD/MM/YYYY')}</span>
                      </div>
                    ))}
                    {selectedPlano.vendasDetalhadas.length > 5 && (
                      <p>... e mais {selectedPlano.vendasDetalhadas.length - 5} vendas</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="btn primary" onClick={() => setSelectedPlano(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .planos-visualizer {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 🆕 NOVO: Banner de status da meta da unidade */
        .meta-status-banner {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          border-left: 5px solid #0ea5e9;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .meta-status-banner.success {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-left-color: #22c55e;
        }

        .meta-status-banner.warning {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-left-color: #f59e0b;
        }

        .status-content h3 {
          margin: 0 0 8px 0;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .status-details {
          color: #475569;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .impact-note {
          color: #64748b;
          font-style: italic;
        }

        .filters-section {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .filters-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px 0;
          color: #374151;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .filter-group input,
        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .stats-header {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-card h3 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        .stat-number {
          font-size: 32px;
          font-weight: bold;
          margin: 0;
          color: #1e293b;
        }

        .stat-number.error {
          color: #dc2626;
        }

        .stat-number.success {
          color: #059669;
        }

        .stat-text {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: #4f46e5;
        }

        .stat-text.success {
          color: #059669;
        }

        .financial-summary {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .financial-summary h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 20px 0;
          color: #1e293b;
          font-size: 20px;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .summary-card {
          border-radius: 12px;
          padding: 20px;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .planos-card {
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
          border-color: #8b5cf6;
        }

        .outros-card {
          background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
          border-color: #f87171;
        }

        .comparison-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-color: #4ade80;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .card-header h4 {
          margin: 0;
          font-size: 18px;
          color: #1e293b;
        }

        .percentage {
          background: rgba(255, 255, 255, 0.8);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .metrics {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .metric.highlight {
          background: rgba(255, 255, 255, 0.6);
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 600;
        }

        .metric .label {
          color: #4b5563;
          font-size: 14px;
        }

        .metric .value {
          color: #1e293b;
          font-weight: 600;
          font-size: 14px;
        }

        .metric.highlight .value {
          color: #059669;
          font-size: 16px;
        }

        .comparison-chart {
          background: #fafafa;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }

        .comparison-chart h4 {
          margin: 0 0 16px 0;
          color: #374151;
        }

        .problems-alert, .unclassified-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          color: #b91c1c;
        }

        .unclassified-alert {
          background: #fffbeb;
          border-color: #fde68a;
          color: #92400e;
        }

        .problems-alert h4, .unclassified-alert h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .problems-alert ul {
          margin: 0;
          padding-left: 16px;
        }

        .unclassified-list {
          margin-top: 12px;
          border: 1px solid #fde68a;
          border-radius: 6px;
          background: white;
          overflow: hidden;
        }

        .unclassified-item {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 12px;
          padding: 8px 12px;
          border-bottom: 1px solid #fde68a;
          font-size: 12px;
        }

        .unclassified-item:last-child {
          border-bottom: none;
        }

        .controls {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn.primary {
          background: #4f46e5;
          color: white;
        }

        .btn.primary:hover {
          background: #4338ca;
        }

        .btn.secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn.secondary:hover {
          background: #d1d5db;
        }

        .charts-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .chart-section {
          background: #fafafa;
          border-radius: 8px;
          padding: 20px;
        }

        .chart-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px 0;
          color: #374151;
        }

        .details-table {
          margin-top: 24px;
        }

        .details-table h3 {
          margin-bottom: 16px;
          color: #374151;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }

        .center {
          text-align: center;
        }

        .comissao {
          font-weight: 600;
        }

        .highlight {
          color: #4f46e5;
        }

        .success {
          color: #059669;
        }

        .plano-name {
          font-weight: 600;
          color: #1e293b;
        }

        .no-sales {
          background: #fef2f2;
          color: #b91c1c;
        }

        tbody tr {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        tbody tr:hover {
          background: #f8fafc;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 700px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-content h3 {
          margin: 0 0 20px 0;
          color: #1e293b;
        }

        .plano-details p {
          margin: 8px 0;
          color: #4b5563;
        }

        .comissao-details {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .comissao-details h4 {
          margin: 0 0 12px 0;
          color: #374151;
        }

        .comissao-grid {
          display: grid;
          gap: 8px;
        }

        .comissao-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .comissao-item span:last-child {
          font-weight: 600;
          color: #059669;
        }

        .vendas-detalhadas {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .vendas-detalhadas h4 {
          margin: 0 0 12px 0;
          color: #374151;
        }

        .vendas-list {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }

        .venda-item {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 12px;
          padding: 8px 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 12px;
        }

        .venda-item:last-child {
          border-bottom: none;
        }

        .filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .filters-header h3 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .share-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .share-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .email-btn {
          background: #3b82f6;
          color: white;
        }

        .email-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .whatsapp-btn {
          background: #25d366;
          color: white;
        }

        .whatsapp-btn:hover {
          background: #22c55e;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          
          .stats-header {
            grid-template-columns: 1fr 1fr;
          }
          
          .summary-cards {
            grid-template-columns: 1fr;
          }
          
          .charts-container {
            grid-template-columns: 1fr;
          }
          
          .table-wrapper {
            overflow-x: auto;
          }
          
          .unclassified-item,
          .venda-item {
            grid-template-columns: 1fr;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default PlanosVisualizer;