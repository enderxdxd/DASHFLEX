import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { useVendas } from '../hooks/useVendas';
import { useGroupedVendas } from '../hooks/useGroupedVendas';
import { useConfigRem } from '../hooks/useConfigRem';
import { useMetas } from '../hooks/useMetas';
import { useGlobalProdutos } from '../hooks/useGlobalProdutos';
import { calcularRemuneracaoPorDuracao, calcularDuracaoPlano, verificarDescontoPlano, calcularPremiacaoSupervisor } from '../utils/calculoRemuneracaoDuracao';

import { useDescontosSimples } from '../utils/useDescontosSimples';
import { processarCorrecaoDiarias } from '../utils/correcaoDiarias';
import MonitorCorrecaoDiarias from '../components/MonitorCorrecaoDiarias';
import { 
  Settings, 
  Target, 
  DollarSign, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Award,
  Calculator,
  Eye,
  BarChart3,
  Info,
  Filter,
  Mail,
  MessageCircle,
  Trophy,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../styles/ConfigRemuneracao.css';
import Navbar from '../components/NavBar';
// Dark mode is handled globally by useDarkMode hook




const obterCategoriaDuracao = (duracaoMeses) => {
  if (!duracaoMeses || duracaoMeses <= 0) return 'Mensal';
  if (duracaoMeses === 1) return 'Mensal';
  if (duracaoMeses === 3) return 'Trimestral';
  if (duracaoMeses === 6) return 'Semestral';
  if (duracaoMeses === 8) return 'Octomestral';
  if (duracaoMeses === 12) return 'Anual';
  if (duracaoMeses === 24) return 'Bianual';
  // Para valores não padrão, usar lógica de proximidade
  if (duracaoMeses <= 2) return 'Mensal';
  if (duracaoMeses <= 4) return 'Trimestral';
  if (duracaoMeses <= 7) return 'Semestral';
  if (duracaoMeses <= 10) return 'Octomestral';
  if (duracaoMeses <= 18) return 'Anual';
  return 'Bianual';
};


const gerarPlanosPadraoLocal = (unidade) => {
  console.log('🔍 DEBUG gerarPlanosPadraoLocal - Recebeu unidade:', unidade);
  if (!unidade) {
    console.log('🔍 DEBUG gerarPlanosPadraoLocal - Unidade vazia, retornando []');
    return [];
  }
  
  const unidadeLower = unidade.toLowerCase();
  console.log('🔍 DEBUG gerarPlanosPadraoLocal - unidadeLower:', unidadeLower);
  
  switch (unidadeLower) {
    case "alphaville":
      console.log('🔍 DEBUG - Matched case: alphaville');
      return [
        { plano: "Diária", min: 0, max: 688, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1300, max: 1887, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Semestral", min: 2700, max: 3474, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Octomestral", min: 4000, max: 4432, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Anual", min: 5200, max: 6264, semMeta: 38, comMeta: 42, metaTME: 45 },
        { plano: "Bianual", min: 6265, max: 11496, semMeta: 61, comMeta: 67, metaTME: 71 },
      ];
    case "buena vista":
    case "buenavista":
      console.log('🔍 DEBUG - Matched case: buena vista/buenavista');
      return [
        { plano: "Diária", min: 0, max: 688, semMeta: 3, comMeta: 6, metaTME: 9 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 3, comMeta: 6, metaTME: 9 },
        { plano: "Trimestral", min: 1200, max: 1368, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Semestral", min: 2300, max: 2496, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Octomestral", min: 3000, max: 3224, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Anual", min: 4000, max: 4356, semMeta: 38, comMeta: 42, metaTME: 45 },
        { plano: "Bianual", min: 4357, max: 8112, semMeta: 61, comMeta: 67, metaTME: 71 },
      ];
    case "marista":
      console.log('🔍 DEBUG - Matched case: marista');
      return [
        { plano: "Diária", min: 0, max: 688, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1500, max: 1794, semMeta: 18, comMeta: 24, metaTME: 28 },
        { plano: "Semestral", min: 3000, max: 3324, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Octomestral", min: 4072, max: 5499, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Anual", min: 5500, max: 6264, semMeta: 38, comMeta: 42, metaTME: 45 },
        { plano: "Bianual", min: 6265, max: 9816, semMeta: 61, comMeta: 67, metaTME: 71 },
      ];
    case "palmas":
      console.log('🔍 DEBUG - Matched case: palmas');
      return [
        { plano: "Diária", min: 0, max: 688, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Mensal", min: 689, max: 689, semMeta: 9, comMeta: 12, metaTME: 15 },
        { plano: "Trimestral", min: 1300, max: 1887, semMeta: 11, comMeta: 16, metaTME: 20 },
        { plano: "Semestral", min: 2700, max: 3474, semMeta: 21, comMeta: 23, metaTME: 25 },
        { plano: "Octomestral", min: 4000, max: 4432, semMeta: 25, comMeta: 30, metaTME: 34 },
        { plano: "Anual", min: 5200, max: 6264, semMeta: 38, comMeta: 42, metaTME: 45 },
        { plano: "Bianual", min: 6265, max: 11496, semMeta: 61, comMeta: 67, metaTME: 71 },
      ];
    default:
      console.log('🔍 DEBUG - No case matched, going to default. unidadeLower was:', unidadeLower);
      return [];
  }
};

const gerarFaixasPremiacaoLocal = (unidade) => {
  if (!unidade) return [];
  
  const faixas = [];
  const inicio = 35;
  const incremento = 5;
  // Todas as unidades usam os mesmos valores de Alphaville
  const valorBase = 200;
  const valorMeta = 220;
  const valorSuperacao = 320; // Valor para faixas "especiais"
  
  for (let percentual = inicio; percentual < 100; percentual += incremento) {
    faixas.push({ percentual: percentual, premio: valorBase });
  }
  
  faixas.push({ percentual: 100, premio: valorBase }); // Todos: Alphaville: 200, Buena Vista/Marista: 180
  
  // Lógica alternada para faixas acima de 100%
  for (let percentual = 105; percentual <= 200; percentual += incremento) {
    // 105%, 115%, 125%... = valorMeta (220/200)
    // 110%, 120%, 130%... = valorSuperacao (320/300)
    const faixaIndex = (percentual - 105) / incremento; // 0, 1, 2, 3, 4...
    const isEspecial = faixaIndex % 2 === 1; // 1, 3, 5... (110%, 120%, 130%...)
    
    faixas.push({ 
      percentual: percentual, 
      premio: isEspecial ? valorSuperacao : valorMeta 
    });
  }
  
  return faixas;
};

// Função específica para gerar faixas de premiação do SUPERVISOR
// Padrão: 70% → 450, 75% → 900, 80% → 1350, etc. (acumulativo de 450)
const gerarFaixasPremiacaoSupervisorLocal = () => {
  const faixas = [];
  const inicio = 70;
  const incremento = 5;
  const valorIncremento = 450;
  let premioAcumulado = 0;
  
  // Gera faixas de 70% até 200% com incremento de 5%
  for (let percentual = inicio; percentual <= 200; percentual += incremento) {
    premioAcumulado += valorIncremento;
    faixas.push({ 
      percentual: percentual, 
      premio: premioAcumulado 
    });
  }
  
  return faixas;
};

const PlanosVisualizerIntegrado = ({ comissaoPlanos, configRem, unidade, vendas, responsaveis, metas, metaUnidadeCalculada }) => {
  const [selectedConsultor, setSelectedConsultor] = useState('');
  const [selectedDuracao, setSelectedDuracao] = useState(null);
  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const [sortBy, setSortBy] = useState('quantidade');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [activeView, setActiveView] = useState('overview');
  
  // Hook para produtos selecionados (mesmo filtro do Dashboard/Analytics)
  const { produtosSelecionados, loaded: produtosLoaded } = useGlobalProdutos();
  
  // Hook para buscar descontos do Firebase
  const { descontos } = useDescontosSimples(unidade);

  // Filtrar vendas por mês e produtos selecionados (igual ao Dashboard/Analytics)
  const vendasParaMeta = React.useMemo(() => {
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

  // Calcular total da unidade (apenas vendas dos responsáveis da unidade)
  const totalUnidade = React.useMemo(() => {
    // Obter lista de responsáveis que têm metas na unidade atual
    const responsaveisUnidade = metas.map(m => m.responsavel?.trim().toLowerCase()).filter(Boolean);
    
    // Filtrar vendas apenas dos responsáveis da unidade atual
    const vendasDaUnidade = vendasParaMeta.filter(v => {
      const responsavel = (v.responsavel || '').trim().toLowerCase();
      return responsaveisUnidade.includes(responsavel);
    });
    
    return vendasDaUnidade.reduce((soma, v) => soma + Number(v.valor || 0), 0);
  }, [vendasParaMeta, metas]);
  
  const unidadeBatida = totalUnidade >= Number(metaUnidadeCalculada || 0);

  // Filtrar vendas para análise (apenas responsáveis da unidade + filtro de consultor)
  const vendasFiltradas = React.useMemo(() => {
    // Obter lista de responsáveis que têm metas na unidade atual
    const responsaveisUnidade = metas.map(m => m.responsavel?.trim().toLowerCase()).filter(Boolean);
    
    return vendasParaMeta.filter(venda => {
      const responsavel = (venda.responsavel || '').trim().toLowerCase();
      
      // Filtrar apenas responsáveis da unidade
      if (!responsaveisUnidade.includes(responsavel)) return false;
      
      // Filtrar por consultor específico se selecionado
      if (selectedConsultor && venda.responsavel !== selectedConsultor) return false;
      
      return true;
    });
  }, [vendasParaMeta, metas, selectedConsultor]);

  const calcularRemuneracaoDetalhada = (metaValor, vendasArr, unidadeBatida, configRem) => {
    // Calcula totais necessários
    const totalVendasIndividual = vendasArr.reduce((soma, v) => soma + Number(v.valor || 0), 0);
    
    // Total de vendas da unidade/time (mesmo cálculo do Metas.jsx)
    const totalVendasTime = vendasParaMeta
      .reduce((soma, v) => soma + Number(v.valor || 0), 0);
    
    // Usa a nova função de cálculo
    const resultado = calcularRemuneracaoPorDuracao({
      vendas: vendasArr,
      metaIndividual: metaValor,
      metaTime: metaUnidadeCalculada || 0,
      totalVendasIndividual,
      totalVendasTime,
      descontos,
      tipo: 'comissao',
      produtosSelecionados
    });
    
    // Formata o resultado para manter compatibilidade com o resto do código
    return {
      totalComissaoPlanos: resultado.comissaoPlanos,
      totalComissaoOutros: resultado.comissaoProdutos,
      totalComissao: resultado.totalComissao,
      vendasPlanos: resultado.vendasDetalhadas.filter(v => v.tipo === 'plano'),
      vendasOutros: resultado.vendasDetalhadas.filter(v => v.tipo === 'produto'),
      metaIndividualBatida: resultado.bateuMetaIndividual,
      totalVendas: totalVendasIndividual,
      
      // Adiciona informações extras da nova lógica
      qtdPlanosSemDesconto: resultado.qtdPlanosSemDesconto,
      qtdPlanosComDesconto: resultado.qtdPlanosComDesconto,
      bateuMetaTime: resultado.bateuMetaTime
    };
  };

  const analiseConsultores = () => {
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    
    return metasDoMes.map(meta => {
      const vendasDoConsultor = vendasFiltradas.filter(v => 
        v.responsavel.trim().toLowerCase() === meta.responsavel.trim().toLowerCase()
      );
      
      const analise = calcularRemuneracaoDetalhada(
        Number(meta.meta),
        vendasDoConsultor,
        unidadeBatida,
        configRem
      );
      
      return {
        ...meta,
        ...analise,
        percentualMeta: meta.meta > 0 ? (analise.totalVendas / meta.meta) * 100 : 0
      };
    });
  };

  const estatisticasGerais = () => {
    const totalVendasPlanos = vendasFiltradas.filter(v => v.produto.trim().toLowerCase() === "plano");
    const totalVendasOutros = vendasFiltradas.filter(v => v.produto.trim().toLowerCase() !== "plano");
    
    const valorPlanos = totalVendasPlanos.reduce((s, v) => s + Number(v.valor || 0), 0);
    const valorOutros = totalVendasOutros.reduce((s, v) => s + Number(v.valor || 0), 0);
    
    return {
      totalVendas: vendasFiltradas.length,
      totalValor: valorPlanos + valorOutros,
      planos: {
        quantidade: totalVendasPlanos.length,
        valor: valorPlanos,
        percentual: vendasFiltradas.length > 0 ? (totalVendasPlanos.length / vendasFiltradas.length) * 100 : 0
      },
      outros: {
        quantidade: totalVendasOutros.length,
        valor: valorOutros,
        percentual: vendasFiltradas.length > 0 ? (totalVendasOutros.length / vendasFiltradas.length) * 100 : 0
      }
    };
  };

  const dadosConsultores = analiseConsultores();
  const estatisticas = estatisticasGerais();
  
  // 📊 NOVA FUNCIONALIDADE: Análise detalhada por faixas de duração
  const analisePorFaixas = () => {
    // Nova análise baseada em duração ao invés de intervalos de valores
    const faixasPorDuracao = {
      1: { nome: 'Mensal', vendas: [], valorTotal: 0, comissaoTotal: 0 },
      3: { nome: 'Trimestral', vendas: [], valorTotal: 0, comissaoTotal: 0 },
      6: { nome: 'Semestral', vendas: [], valorTotal: 0, comissaoTotal: 0 },
      8: { nome: 'Octomestral', vendas: [], valorTotal: 0, comissaoTotal: 0 },
      12: { nome: 'Anual', vendas: [], valorTotal: 0, comissaoTotal: 0 },
      24: { nome: 'Bianual', vendas: [], valorTotal: 0, comissaoTotal: 0 }
    };
    
    // Processa cada venda de plano
    vendasFiltradas.forEach(venda => {
      const ehPlano = venda.produto?.toLowerCase().includes('plano');
      
      if (ehPlano) {
        // Use duration from Excel if available, otherwise fallback to date calculation
        let duracao;
        if (venda.duracaoMeses && venda.duracaoMeses > 0) {
          duracao = venda.duracaoMeses;
        } else if (venda.dataInicio && venda.dataFim) {
          duracao = calcularDuracaoPlano(venda.dataInicio, venda.dataFim);
        } else {
          return; // Skip if no duration data available
        }
        
        if (faixasPorDuracao[duracao]) {
          faixasPorDuracao[duracao].vendas.push(venda);
          faixasPorDuracao[duracao].valorTotal += Number(venda.valor || 0);
          
          // Calcula comissão desta venda específica
          const temDesconto = verificarDescontoPlano(venda, descontos);
          const consultor = dadosConsultores.find(c => 
            c.responsavel?.toLowerCase() === venda.responsavel?.toLowerCase()
          );
          
          if (consultor) {
            // Busca o valor de comissão calculado para este consultor
            const vendaComissao = consultor.vendasPlanos.find(vp => 
              vp.matricula === venda.matricula && 
              vp.valor === venda.valor
            );
            
            if (vendaComissao) {
              faixasPorDuracao[duracao].comissaoTotal += vendaComissao.valorComissao || 0;
            }
          }
        }
      }
    });
    
    // Converte para array e calcula estatísticas
    return Object.entries(faixasPorDuracao)
      .filter(([_, dados]) => dados.vendas.length > 0)
      .map(([duracao, dados]) => ({
        faixa: `${dados.nome} (${duracao} ${Number(duracao) === 1 ? 'mês' : 'meses'})`,
        planoConfig: {
          duracao: Number(duracao),
          nome: dados.nome
        },
        vendas: dados.vendas.length,
        valorTotal: dados.valorTotal,
        ticketMedio: dados.vendas.length > 0 ? dados.valorTotal / dados.vendas.length : 0,
        comissaoTotal: dados.comissaoTotal,
        comissaoMedia: dados.vendas.length > 0 ? dados.comissaoTotal / dados.vendas.length : 0,
        participacao: estatisticas.planos.quantidade > 0 
          ? (dados.vendas.length / estatisticas.planos.quantidade) * 100 
          : 0
      }));
  };
  
  // 🏆 NOVA FUNCIONALIDADE: Ranking de performance
  const rankingConsultores = () => {
    return dadosConsultores
      .map(consultor => ({
        ...consultor,
        scorePerformance: (
          (consultor.percentualMeta * 0.4) + 
          (consultor.vendasPlanos.length * 10) + 
          (consultor.totalComissao / 100)
        ),
        eficiencia: consultor.totalVendas > 0 ? (consultor.totalComissao / consultor.totalVendas) * 100 : 0
      }))
      .sort((a, b) => b.scorePerformance - a.scorePerformance);
  };
  
  // 📈 NOVA FUNCIONALIDADE: Oportunidades identificadas
  const identificarOportunidades = () => {
    const oportunidades = [];
    
    dadosConsultores.forEach(consultor => {
      // Consultor próximo da meta (80-99%)
      if (consultor.percentualMeta >= 80 && consultor.percentualMeta < 100) {
        const valorNecessario = Number(consultor.meta) - consultor.totalVendas;
        oportunidades.push({
          tipo: 'meta_proxima',
          consultor: consultor.responsavel,
          descricao: `Próximo da meta - faltam R$ ${valorNecessario.toLocaleString('pt-BR')}`,
          impacto: 'alto',
          valor: valorNecessario
        });
      }
      
      // Consultor com muitas vendas mas baixa comissão (possível problema de faixa)
      if (consultor.vendasPlanos.length >= 3 && consultor.totalComissaoPlanos < 500) {
        oportunidades.push({
          tipo: 'baixa_comissao',
          consultor: consultor.responsavel,
          descricao: `${consultor.vendasPlanos.length} vendas mas baixa comissão - revisar faixas`,
          impacto: 'medio',
          valor: consultor.totalComissaoPlanos
        });
      }
    });
    
    // Oportunidade da unidade
    if (!unidadeBatida && totalUnidade >= (metaUnidadeCalculada || 0) * 0.85) {
      const valorNecessario = (metaUnidadeCalculada || 0) - totalUnidade;
      oportunidades.push({
        tipo: 'meta_unidade',
        consultor: 'UNIDADE',
        descricao: `Unidade próxima da meta TME - faltam R$ ${valorNecessario.toLocaleString('pt-BR')}`,
        impacto: 'critico',
        valor: valorNecessario
      });
    }
    
    return oportunidades;
  };
  
  const faixasDetalhadas = analisePorFaixas();
  const ranking = rankingConsultores();
  const oportunidades = identificarOportunidades();

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
    
    // Status da meta (dados reais)
    content += '🎯 STATUS DA META\n';
    content += `• Meta da Unidade: ${unidadeBatida ? 'ATINGIDA ✅' : 'NÃO ATINGIDA ⚠️'}\n`;
    content += `• Meta: R$ ${formatMoney(metaUnidadeCalculada || 0)}\n`;
    content += `• Realizado: R$ ${formatMoney(totalUnidade)}\n`;
    content += `• Percentual: ${metaUnidadeCalculada > 0 ? (totalUnidade / metaUnidadeCalculada * 100).toFixed(1) : '0'}%\n\n`;

    // Resumo real das vendas do período
    content += '📊 RESUMO DO PERÍODO\n';
    content += `• Total de Vendas: ${vendasFiltradas.length}\n`;
    content += `• Valor Total: R$ ${formatMoney(totalUnidade)}\n`;
    content += `• Planos Configurados: ${comissaoPlanos.length}\n`;
    if (selectedConsultor) {
      const vendasConsultor = vendasFiltradas.filter(v => v.responsavel === selectedConsultor);
      content += `• Consultor: ${selectedConsultor} (${vendasConsultor.length} vendas)\n`;
    }
    content += '\n';

    // Estatísticas reais das vendas
    const vendasValores = vendasFiltradas.map(v => Number(v.valor || 0)).filter(v => v > 0);
    const ticketMedio = vendasValores.length > 0 ? vendasValores.reduce((a, b) => a + b, 0) / vendasValores.length : 0;
    const maiorVenda = vendasValores.length > 0 ? Math.max(...vendasValores) : 0;
    const menorVenda = vendasValores.length > 0 ? Math.min(...vendasValores) : 0;
    
    content += '📈 ESTATÍSTICAS DE VENDAS\n';
    content += `• Ticket Médio: R$ ${formatMoney(ticketMedio)}\n`;
    content += `• Maior Venda: R$ ${formatMoney(maiorVenda)}\n`;
    content += `• Menor Venda: R$ ${formatMoney(menorVenda)}\n\n`;

    // Ranking real de consultores (baseado em dadosConsultores)
    const consultoresOrdenados = dadosConsultores
      .filter(c => c.responsavel && c.totalVendas > 0)
      .sort((a, b) => b.totalVendas - a.totalVendas);
    
    if (consultoresOrdenados.length > 0) {
      content += '🏆 RANKING DE CONSULTORES\n';
      consultoresOrdenados.slice(0, 5).forEach((consultor, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
        const percentualMeta = consultor.meta > 0 ? (consultor.totalVendas / consultor.meta * 100).toFixed(1) : '0';
        content += `${medal} ${consultor.responsavel}\n`;
        content += `   Vendas: R$ ${formatMoney(consultor.totalVendas)} (${percentualMeta}% da meta)\n`;
        content += `   Comissão: R$ ${formatMoney(consultor.totalComissao)}\n\n`;
      });
    }

    // Análise real por tipo de produto
    const vendasPlanos = vendasFiltradas.filter(v => 
      v.produto && (v.produto.toLowerCase().includes('plano') || v.produto.toLowerCase() === 'plano')
    );
    const vendasOutros = vendasFiltradas.filter(v => 
      v.produto && !(v.produto.toLowerCase().includes('plano') || v.produto.toLowerCase() === 'plano')
    );
    
    const valorPlanos = vendasPlanos.reduce((s, v) => s + Number(v.valor || 0), 0);
    const valorOutros = vendasOutros.reduce((s, v) => s + Number(v.valor || 0), 0);
    
    content += '📊 ANÁLISE POR PRODUTO\n';
    content += `• Planos: ${vendasPlanos.length} vendas - R$ ${formatMoney(valorPlanos)}\n`;
    content += `• Outros: ${vendasOutros.length} vendas - R$ ${formatMoney(valorOutros)}\n`;
    
    if (totalUnidade > 0) {
      const percPlanos = (valorPlanos / totalUnidade * 100).toFixed(1);
      const percOutros = (valorOutros / totalUnidade * 100).toFixed(1);
      content += `• Distribuição: ${percPlanos}% Planos | ${percOutros}% Outros\n`;
    }
    content += '\n';

    // Informações dos planos configurados
    if (comissaoPlanos && comissaoPlanos.length > 0) {
      content += '📋 PLANOS CONFIGURADOS\n';
      comissaoPlanos.forEach(plano => {
        const vendasDoPlano = vendasPlanos.filter(v => 
          v.produto && v.produto.toLowerCase().includes(plano.plano.toLowerCase())
        );
        const valorDoPlano = vendasDoPlano.reduce((s, v) => s + Number(v.valor || 0), 0);
        
        if (vendasDoPlano.length > 0) {
          content += `• ${plano.plano}: ${vendasDoPlano.length} vendas - R$ ${formatMoney(valorDoPlano)}\n`;
        }
      });
    }

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

  // Função para gerar PDF profissional
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 30;

    // Configuração de fontes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(51, 51, 51);

    // Cabeçalho
    doc.text(`RELATÓRIO PLANOS - ${unidade.toUpperCase()}`, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${dayjs(selectedMonth).format('MMMM/YYYY')}`, margin, yPosition);
    doc.text(`Gerado em: ${dayjs().format('DD/MM/YYYY HH:mm')}`, pageWidth - 80, yPosition);
    yPosition += 20;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // Status da Meta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('🎯 STATUS DA META', margin, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const metaStatus = unidadeBatida ? 'ATINGIDA ✓' : 'NÃO ATINGIDA ⚠';
    const metaColor = unidadeBatida ? [34, 197, 94] : [239, 68, 68];
    
    doc.setTextColor(...metaColor);
    doc.text(`Meta da Unidade: ${metaStatus}`, margin + 5, yPosition);
    yPosition += 8;
    
    doc.setTextColor(100, 100, 100);
    doc.text(`Meta: R$ ${formatMoney(metaUnidadeCalculada || 0)}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Realizado: R$ ${formatMoney(totalUnidade)}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Percentual: ${metaUnidadeCalculada > 0 ? (totalUnidade / metaUnidadeCalculada * 100).toFixed(1) : '0'}%`, margin + 5, yPosition);
    yPosition += 15;

    // Resumo dos Planos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text('📊 RESUMO DOS PLANOS', margin, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total de Planos: ${comissaoPlanos.length}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Vendas Totais: R$ ${formatMoney(totalUnidade)}`, margin + 5, yPosition);
    yPosition += 6;
    if (selectedConsultor) {
      doc.text(`Consultor Selecionado: ${selectedConsultor}`, margin + 5, yPosition);
      yPosition += 6;
    }
    yPosition += 10;

    // Estatísticas Gerais
    const stats = estatisticasGerais();
    if (stats) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 51);
      doc.text('📈 ESTATÍSTICAS GERAIS', margin, yPosition);
      yPosition += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Total de Vendas: ${stats.totalVendas}`, margin + 5, yPosition);
      yPosition += 6;
      doc.text(`Valor Total: R$ ${formatMoney(stats.totalValor)}`, margin + 5, yPosition);
      yPosition += 15;
    }

    // Ranking de Consultores (se houver)
    if (ranking && ranking.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 51);
      doc.text('🏆 TOP CONSULTORES', margin, yPosition);
      yPosition += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      
      ranking.slice(0, 5).forEach((consultor, index) => {
        if (yPosition < 260) {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
          const nome = consultor.nome || 'N/A';
          const vendas = formatMoney(consultor.vendas || 0);
          const quantidade = consultor.totalVendas || 0;
          
          doc.text(`${medal} ${nome}`, margin + 5, yPosition);
          doc.text(`R$ ${vendas} (${quantidade} vendas)`, margin + 80, yPosition);
          yPosition += 8;
        }
      });
      
      yPosition += 10;
    }

    // Oportunidades
    if (oportunidades && oportunidades.length > 0 && yPosition < 250) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(51, 51, 51);
      doc.text('💡 OPORTUNIDADES', margin, yPosition);
      yPosition += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      oportunidades.slice(0, 3).forEach(op => {
        if (yPosition < 270) {
          doc.text(`• ${op.tipo}: ${op.descricao}`, margin + 5, yPosition);
          yPosition += 8;
        }
      });
    }

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Gerado automaticamente pelo DASHFLEX', margin, doc.internal.pageSize.height - 10);
    doc.text(`Página 1`, pageWidth - 30, doc.internal.pageSize.height - 10);

    return doc;
  };

  // Função para gerar PDF e enviar para WhatsApp automaticamente
  const handleSharePDFWhatsApp = async () => {
    try {
      // Gerar o PDF
      const doc = generatePDF();
      
      // Converter PDF para blob
      const pdfBlob = doc.output('blob');
      
      // Criar URL temporária para o arquivo
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `relatorio-planos-${unidade}-${dayjs(selectedMonth).format('MM-YYYY')}.pdf`;
      
      // Fazer download automático
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL temporária
      URL.revokeObjectURL(pdfUrl);
      
      // Aguardar um pouco e abrir WhatsApp com mensagem
      setTimeout(() => {
        const message = `📊 *RELATÓRIO PLANOS - ${unidade.toUpperCase()}*\n\n` +
                       `📅 *Período:* ${dayjs(selectedMonth).format('MMMM/YYYY')}\n` +
                       `🎯 *Meta:* ${unidadeBatida ? 'ATINGIDA ✅' : 'NÃO ATINGIDA ⚠️'}\n` +
                       `💰 *Realizado:* R$ ${formatMoney(totalUnidade)}\n\n` +
                       `📄 *PDF do relatório completo foi baixado automaticamente!*\n` +
                       `Anexe o arquivo PDF baixado para enviar os detalhes completos.`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  return (
    <div className="planos-visualizer">
      <div className={`meta-status ${unidadeBatida ? 'success' : 'warning'}`}>
        <h4>
          {unidadeBatida ? '🎯 Meta da Unidade ATINGIDA!' : '⚠️ Meta da Unidade NÃO atingida'}
        </h4>
        <p>
          Meta: R$ {(metaUnidadeCalculada || 0).toLocaleString('pt-BR')} | 
          Realizado: R$ {totalUnidade.toLocaleString('pt-BR')} | 
          {metaUnidadeCalculada > 0 ? `${(totalUnidade / metaUnidadeCalculada * 100).toFixed(1)}%` : '0%'}
        </p>
        <small>
          <strong>Impacto:</strong> {unidadeBatida ? 'Comissões dos planos usando valores TME (mais altos)' : 'Comissões dos planos usando valores padrão'}
        </small>
      </div>

      <div className="filters-section">
        <div className="filters-header">
          <h4><Filter size={16} /> Filtros de Análise</h4>
          <div className="share-buttons">
            <button 
              className="share-btn email-btn" 
              onClick={handleShareEmail}
              title="Enviar por Email"
            >
              <Mail size={16} />
              Email
            </button>
            <button 
              className="share-btn whatsapp-btn" 
              onClick={handleShareWhatsApp}
              title="Enviar por WhatsApp"
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>

          </div>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Mês:</label>
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
              <option value="">Todos</option>
              {responsaveis.map(consultor => (
                <option key={consultor} value={consultor}>{consultor}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="view-tabs">
        <button 
          className={`view-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          <BarChart3 size={16} />
          Visão Geral
        </button>
        
        <button 
          className={`view-tab ${activeView === 'analise-planos' ? 'active' : ''}`}
          onClick={() => setActiveView('analise-planos')}
        >
          <Calendar size={16} />
          Análise por Plano
        </button>
        <button 
          className={`view-tab ${activeView === 'ranking' ? 'active' : ''}`}
          onClick={() => setActiveView('ranking')}
        >
          <Trophy size={16} />
          Ranking
        </button>
        <button 
          className={`view-tab ${activeView === 'oportunidades' ? 'active' : ''}`}
          onClick={() => setActiveView('oportunidades')}
        >
          <Target size={16} />
          Oportunidades
        </button>
      </div>

      {activeView === 'overview' && (
        <div className="overview-content">
          <div className="stats-grid">
            <div className="stat-card">
              <h5>Total de Vendas</h5>
              <span className="stat-number">{estatisticas.totalVendas.toLocaleString('pt-BR')}</span>
            </div>
            <div className="stat-card">
              <h5>Valor Total</h5>
              <span className="stat-value">R$ {estatisticas.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="stat-card">
              <h5>Vendas de Planos</h5>
              <span className="stat-number">{estatisticas.planos.quantidade.toLocaleString('pt-BR')}</span>
              <small>R$ {estatisticas.planos.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({estatisticas.planos.percentual.toFixed(1)}% do total)</small>
            </div>
            <div className="stat-card">
              <h5>Outros Produtos</h5>
              <span className="stat-number">{estatisticas.outros.quantidade.toLocaleString('pt-BR')}</span>
              <small>R$ {estatisticas.outros.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({estatisticas.outros.percentual.toFixed(1)}% do total)</small>
            </div>
          </div>

          <div className="charts-section">
            <div className="chart-container">
              <h4><Info size={16} /> Planos vs Outros Produtos</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Planos', value: estatisticas.planos.valor, fill: '#4f46e5' },
                      { name: 'Outros', value: estatisticas.outros.valor, fill: '#dc2626' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  />
                  <Tooltip formatter={(value) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      
      
      {activeView === 'faixas' && (
        <div className="faixas-content">
          <div className="section-header">
            <h4><BarChart3 size={16} /> Análise Detalhada por Faixas de Planos</h4>
            <p>Performance e distribuição por faixa de valor</p>
          </div>
          
          <div className="faixas-grid">
            {faixasDetalhadas.map((faixa, index) => (
              <div key={index} className="faixa-card">
                <div className="faixa-header">
                  <h5>{faixa.faixa}</h5>
                  <div className="participacao-badge">
                    {faixa.participacao.toFixed(1)}% das vendas
                  </div>
                </div>
                
                <div className="faixa-metrics">
                  <div className="metric-row">
                    <span className="metric-label">Vendas:</span>
                    <span className="metric-value">{faixa.vendas}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Valor Total:</span>
                    <span className="metric-value">R$ {faixa.valorTotal.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Ticket Médio:</span>
                    <span className="metric-value">R$ {faixa.ticketMedio.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Comissão Total:</span>
                    <span className="metric-value success">R$ {faixa.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Comissão Média:</span>
                    <span className="metric-value">R$ {faixa.comissaoMedia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                
                <div className="faixa-config">
                  <h6>Configuração de Comissão:</h6>
                  <div className="config-row">
                    <span>Sem Meta: R$ {faixa.planoConfig.semMeta || 0}</span>
                    <span>Com Meta: R$ {faixa.planoConfig.comMeta || 0}</span>
                    <span>TME: R$ {faixa.planoConfig.metaTME || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeView === 'ranking' && (
        <div className="ranking-content">
          <div className="section-header">
            <h4><Trophy size={16} /> Ranking de Performance</h4>
            <p>Consultores ordenados por score de performance</p>
          </div>
          
          <div className="ranking-list">
            {ranking.map((consultor, index) => (
              <div key={consultor.id || index} className={`ranking-item ${index < 3 ? 'top-performer' : ''}`}>
                <div className="ranking-position">
                  <span className="position-number">{index + 1}º</span>
                  {index === 0 && <span className="trophy gold">🥇</span>}
                  {index === 1 && <span className="trophy silver">🥈</span>}
                  {index === 2 && <span className="trophy bronze">🥉</span>}
                </div>
                
                <div className="consultor-info">
                  <h5>{consultor.responsavel}</h5>
                  <div className="performance-metrics">
                    <div className="metric-chip">
                      <span className="chip-label">Meta:</span>
                      <span className={`chip-value ${consultor.percentualMeta >= 100 ? 'success' : 'warning'}`}>
                        {consultor.percentualMeta.toFixed(1)}%
                      </span>
                    </div>
                    <div className="metric-chip">
                      <span className="chip-label">Vendas:</span>
                      <span className="chip-value">{consultor.vendasPlanos.length}</span>
                    </div>
                    <div className="metric-chip">
                      <span className="chip-label">Comissão:</span>
                      <span className="chip-value success">R$ {consultor.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="metric-chip">
                      <span className="chip-label">Eficiência:</span>
                      <span className="chip-value">{consultor.eficiencia.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="performance-score">
                  <span className="score-label">Score</span>
                  <span className="score-value">{consultor.scorePerformance.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeView === 'oportunidades' && (
        <div className="oportunidades-content">
          <div className="section-header">
            <h4><Target size={16} /> Oportunidades Identificadas</h4>
            <p>Insights e ações recomendadas baseadas nos dados</p>
          </div>
          
          {oportunidades.length === 0 ? (
            <div className="empty-oportunidades">
              <Target size={48} />
              <h5>Nenhuma oportunidade crítica identificada</h5>
              <p>Todos os consultores estão performando dentro do esperado.</p>
            </div>
          ) : (
            <div className="oportunidades-list">
              {oportunidades.map((oportunidade, index) => (
                <div key={index} className={`oportunidade-card ${oportunidade.impacto}`}>
                  <div className="oportunidade-header">
                    <div className={`impacto-badge ${oportunidade.impacto}`}>
                      {oportunidade.impacto === 'critico' && '🔴'}
                      {oportunidade.impacto === 'alto' && '🟡'}
                      {oportunidade.impacto === 'medio' && '🟢'}
                      <span>{oportunidade.impacto.toUpperCase()}</span>
                    </div>
                    <h5>{oportunidade.consultor}</h5>
                  </div>
                  
                  <div className="oportunidade-content">
                    <p>{oportunidade.descricao}</p>
                    {oportunidade.valor && (
                      <div className="valor-destaque">
                        <strong>Valor: R$ {oportunidade.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}
                  </div>
                  
                  <div className="oportunidade-actions">
                    {oportunidade.tipo === 'meta_proxima' && (
                      <small>💡 Foque em vendas de maior valor para maximizar o resultado</small>
                    )}
                    {oportunidade.tipo === 'baixa_comissao' && (
                      <small>💡 Revisar se as vendas estão nas faixas corretas de comissão</small>
                    )}
                    {oportunidade.tipo === 'meta_unidade' && (
                      <small>💡 Esforço conjunto pode desbloquear comissões TME para todos</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'analise-planos' && (
        <div className="analise-planos-content">
          <div className="section-header">
            <h4><Calendar size={16} /> Análise por Plano - Visão por Consultor</h4>
            <p>Análise detalhada dos planos vendidos organizados por consultor</p>
          </div>

          {/* Filtros Avançados */}
          <div className="planos-filters">
            <div className="filter-group">
              <label>Filtrar por Duração:</label>
              <select 
                value={selectedDuracao || ''} 
                onChange={(e) => setSelectedDuracao(e.target.value || null)}
                className="filter-select"
              >
                <option value="">Todas as durações</option>
                <option value="1">Mensal (até 31 dias)</option>
                <option value="3">Trimestral (32-95 dias)</option>
                <option value="6">Semestral (96-185 dias)</option>
                <option value="8">Octomestral (186-250 dias)</option>
                <option value="12">Anual (251-370 dias)</option>
                <option value="24">Bianual (371+ dias)</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Valor Mínimo:</label>
              <input
                type="number"
                placeholder="R$ 0,00"
                value={minValue || ''}
                onChange={(e) => setMinValue(e.target.value ? Number(e.target.value) : null)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Valor Máximo:</label>
              <input
                type="number"
                placeholder="R$ 999.999,99"
                value={maxValue || ''}
                onChange={(e) => setMaxValue(e.target.value ? Number(e.target.value) : null)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Ordenar por:</label>
              <select 
                value={sortBy || 'quantidade'} 
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="quantidade">Quantidade de Planos</option>
                <option value="valor">Valor Total</option>
                <option value="comissao">Comissão Total</option>
                <option value="ticket">Ticket Médio</option>
                <option value="nome">Nome do Consultor</option>
              </select>
            </div>
          </div>

          {/* Estatísticas Resumo */}
          <div className="planos-summary-stats">
            <div className="summary-stat">
              <span className="stat-label">Total de Planos</span>
              <span className="stat-value">{(() => {
                return vendasFiltradas.filter(v => {
                  if (v.produto?.toLowerCase() !== 'plano') return false;
                  
                  // Aplicar filtros
                  if (selectedDuracao) {
                    if (!v.dataInicio || !v.dataFim) return false;
                    const inicio = dayjs(v.dataInicio);
                    const fim = dayjs(v.dataFim);
                    
                    // Use duration from Excel if available, otherwise fallback to date calculation
                    let duracaoPlano;
                    if (v.duracaoMeses && v.duracaoMeses > 0) {
                      duracaoPlano = obterCategoriaDuracao(v.duracaoMeses);
                    } else if (inicio.isValid() && fim.isValid()) {
                      const diffDays = fim.diff(inicio, 'day');
                      if (diffDays <= 31) duracaoPlano = 'Mensal';
                      else if (diffDays <= 95) duracaoPlano = 'Trimestral';
                      else if (diffDays <= 185) duracaoPlano = 'Semestral';
                      else if (diffDays <= 250) duracaoPlano = 'Octomestral';
                      else if (diffDays <= 370) duracaoPlano = 'Anual';
                      else duracaoPlano = 'Bianual';
                    } else {
                      return false;
                    }
                    
                    const filtroMap = {
                      '1': 'Mensal',
                      '3': 'Trimestral',
                      '6': 'Semestral',
                      '8': 'Octomestral',
                      '12': 'Anual',
                      '24': 'Bianual'
                    };
                    
                    if (duracaoPlano !== filtroMap[selectedDuracao]) return false;
                  }
                  
                  const valor = Number(v.valor || 0);
                  if (minValue && valor < minValue) return false;
                  if (maxValue && valor > maxValue) return false;
                  
                  return true;
                }).length;
              })()}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Valor Total</span>
              <span className="stat-value">R$ {(() => {
                const planosVendas = vendasFiltradas.filter(v => {
                  if (v.produto?.toLowerCase() !== 'plano') return false;
                  
                  if (selectedDuracao) {
                    if (!v.dataInicio || !v.dataFim) return false;
                    const inicio = dayjs(v.dataInicio);
                    const fim = dayjs(v.dataFim);
                    const diffDays = fim.diff(inicio, 'day');
                    
                    const duracao = Number(selectedDuracao);
                    if (duracao === 1 && diffDays > 31) return false;
                    if (duracao === 3 && (diffDays <= 31 || diffDays > 95)) return false;
                    if (duracao === 6 && (diffDays <= 95 || diffDays > 185)) return false;
                    if (duracao === 8 && (diffDays <= 185 || diffDays > 250)) return false;
                    if (duracao === 12 && (diffDays <= 250 || diffDays > 370)) return false;
                    if (duracao === 24 && diffDays <= 370) return false;
                  }
                  
                  const valor = Number(v.valor || 0);
                  if (minValue && valor < minValue) return false;
                  if (maxValue && valor > maxValue) return false;
                  
                  return true;
                });
                return planosVendas.reduce((s, v) => s + Number(v.valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
              })()}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Consultores Ativos</span>
              <span className="stat-value">{(() => {
                const planosVendas = vendasFiltradas.filter(v => {
                  if (v.produto?.toLowerCase() !== 'plano') return false;
                  
                  if (selectedDuracao) {
                    if (!v.dataInicio || !v.dataFim) return false;
                    const inicio = dayjs(v.dataInicio);
                    const fim = dayjs(v.dataFim);
                    const diffDays = fim.diff(inicio, 'day');
                    
                    const duracao = Number(selectedDuracao);
                    if (duracao === 1 && diffDays > 31) return false;
                    if (duracao === 3 && (diffDays <= 31 || diffDays > 95)) return false;
                    if (duracao === 6 && (diffDays <= 95 || diffDays > 185)) return false;
                    if (duracao === 8 && (diffDays <= 185 || diffDays > 250)) return false;
                    if (duracao === 12 && (diffDays <= 250 || diffDays > 370)) return false;
                    if (duracao === 24 && diffDays <= 370) return false;
                  }
                  
                  const valor = Number(v.valor || 0);
                  if (minValue && valor < minValue) return false;
                  if (maxValue && valor > maxValue) return false;
                  
                  return true;
                });
                return new Set(planosVendas.map(v => v.responsavel)).size;
              })()}</span>
            </div>
          </div>

          {/* Cards dos Consultores */}
          <div className="consultores-planos-cards">
            {(() => {
              // Filtrar e processar dados dos consultores
              const consultoresData = responsaveis
                .filter(consultor => selectedConsultor === '' || consultor === selectedConsultor)
                .map(consultor => {
                  const planosConsultor = vendasFiltradas.filter(v => {
                    if (v.produto?.toLowerCase() !== 'plano' || v.responsavel !== consultor) return false;
                    
                    // Aplicar filtros
                    if (selectedDuracao) {
                      const duracao = Number(selectedDuracao);
                      // Use duration from Excel if available
                      if (v.duracaoMeses && v.duracaoMeses > 0) {
                        if (duracao === 1 && v.duracaoMeses > 1) return false;
                        if (duracao === 3 && v.duracaoMeses !== 3) return false;
                        if (duracao === 6 && v.duracaoMeses !== 6) return false;
                        if (duracao === 8 && v.duracaoMeses !== 8) return false;
                        if (duracao === 12 && v.duracaoMeses !== 12) return false;
                        if (duracao === 24 && v.duracaoMeses !== 24) return false;
                      } else {
                        // Fallback to date calculation
                        if (!v.dataInicio || !v.dataFim) return false;
                        const inicio = dayjs(v.dataInicio);
                        const fim = dayjs(v.dataFim);
                        const diffDays = fim.diff(inicio, 'day');
                        
                        if (duracao === 1 && diffDays > 31) return false;
                        if (duracao === 3 && (diffDays <= 31 || diffDays > 95)) return false;
                        if (duracao === 6 && (diffDays <= 95 || diffDays > 185)) return false;
                        if (duracao === 8 && (diffDays <= 185 || diffDays > 250)) return false;
                        if (duracao === 12 && (diffDays <= 250 || diffDays > 370)) return false;
                        if (duracao === 24 && diffDays <= 370) return false;
                      }
                    }
                    
                    const valor = Number(v.valor || 0);
                    if (minValue && valor < minValue) return false;
                    if (maxValue && valor > maxValue) return false;
                    
                    return true;
                  });
                  
                  if (planosConsultor.length === 0) return null;

                  const valorTotal = planosConsultor.reduce((s, v) => s + Number(v.valor || 0), 0);
                  const ticketMedio = valorTotal / planosConsultor.length;
                  
                  // Calcular comissão total
                  let comissaoTotal = 0;
                  const planoPorDuracao = {};
                  
                  planosConsultor.forEach(plano => {
                    // Use duration from Excel if available, otherwise fallback to date calculation
                    let duracao;
                    if (plano.duracaoMeses && plano.duracaoMeses > 0) {
                      duracao = obterCategoriaDuracao(plano.duracaoMeses);
                    } else if (plano.dataInicio && plano.dataFim) {
                      const inicio = dayjs(plano.dataInicio);
                      const fim = dayjs(plano.dataFim);
                      
                      if (!inicio.isValid() || !fim.isValid()) return;
                      
                      const diffDays = fim.diff(inicio, 'day');
                      
                      // Corrigir lógica de categorização
                      if (diffDays <= 31) duracao = 'Mensal';
                      else if (diffDays <= 95) duracao = 'Trimestral';
                      else if (diffDays <= 185) duracao = 'Semestral';
                      else if (diffDays <= 250) duracao = 'Octomestral';
                      else if (diffDays <= 370) duracao = 'Anual';
                      else duracao = 'Bianual';
                    } else {
                      return; // Skip if no duration data available
                    }
                    
                    planoPorDuracao[duracao] = (planoPorDuracao[duracao] || 0) + 1;
                    
                    // Mapear duração para índice da tabela de comissão
                    const duracaoParaIndice = { 
                      'Mensal': 0, 
                      'Trimestral': 1, 
                      'Semestral': 2, 
                      'Octomestral': 3, 
                      'Anual': 4, 
                      'Bianual': 5 
                    };
                    const indice = duracaoParaIndice[duracao] || 0;
                    
                    let comissaoValor = 0;
                    if (unidadeBatida) {
                      const tabelaTME = [15, 28, 43, 51, 65, 107];
                      comissaoValor = tabelaTME[indice] || 0;
                    } else {
                      const metaConsultor = metas.find(m => m.responsavel === plano.responsavel);
                      const vendasConsultor = vendasFiltradas.filter(v => v.responsavel === plano.responsavel);
                      const totalVendasConsultor = vendasConsultor.reduce((s, v) => s + Number(v.valor || 0), 0);
                      const bateuMetaIndividual = metaConsultor && totalVendasConsultor >= Number(metaConsultor.meta || 0);
                      
                      if (bateuMetaIndividual) {
                        const tabelaComMeta = [12, 24, 37, 47, 60, 103];
                        comissaoValor = tabelaComMeta[indice] || 0;
                      } else {
                        const tabelaSemMeta = [9, 18, 28, 42, 53, 97];
                        comissaoValor = tabelaSemMeta[indice] || 0;
                      }
                    }
                    
                    comissaoTotal += comissaoValor;
                  });

                  return {
                    consultor,
                    planosConsultor,
                    valorTotal,
                    ticketMedio,
                    comissaoTotal,
                    planoPorDuracao,
                    quantidade: planosConsultor.length
                  };
                })
                .filter(Boolean);

              // Ordenar consultores
              consultoresData.sort((a, b) => {
                switch (sortBy) {
                  case 'valor': return b.valorTotal - a.valorTotal;
                  case 'comissao': return b.comissaoTotal - a.comissaoTotal;
                  case 'ticket': return b.ticketMedio - a.ticketMedio;
                  case 'nome': return a.consultor.localeCompare(b.consultor);
                  default: return b.quantidade - a.quantidade;
                }
              });

              return consultoresData.map(({ consultor, planosConsultor, valorTotal, ticketMedio, comissaoTotal, planoPorDuracao, quantidade }) => (
                <div key={consultor} className="consultor-plano-card">
                  <div className="consultor-card-header">
                    <div className="consultor-info">
                      <h5 className="consultor-name">{consultor}</h5>
                      <div className="consultor-badges">
                        <span className="badge badge-primary">{quantidade} planos</span>
                        <span className="badge badge-success">R$ {valorTotal.toLocaleString('pt-BR')}</span>
                        <span className="badge badge-warning">Comissão: R$ {comissaoTotal.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="consultor-metrics">
                      <div className="metric">
                        <span className="metric-label">Ticket Médio</span>
                        <span className="metric-value">R$ {ticketMedio.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="consultor-card-content">
                    <div className="duracao-breakdown">
                      <h6>Distribuição por Duração</h6>
                      <div className="duracao-summary">
                        {Object.entries(planoPorDuracao)
                          .sort(([a], [b]) => {
                            const ordem = ['Mensal', 'Trimestral', 'Semestral', 'Octomestral', 'Anual', 'Bianual'];
                            return ordem.indexOf(a) - ordem.indexOf(b);
                          })
                          .map(([duracao, qtd]) => (
                            <div key={duracao} className="duracao-summary-item">
                              <span className="duracao-text">{duracao}: {qtd} planos</span>
                            </div>
                          ))}
                      </div>
                    </div>

                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Tabela Completa de Todos os Planos */}
          <div className="planos-table-section">
            <div className="section-header">
              <h5>📋 Tabela Completa de Planos</h5>
              <p>Lista detalhada de todos os planos para verificação</p>
            </div>
            
            <div className="planos-table-container">
              <table className="planos-complete-table">
                <thead>
                  <tr>
                    <th>Consultor</th>
                    <th>Tipo</th>
                    <th>Data Início</th>
                    <th>Data Fim</th>
                    <th>Duração</th>
                    <th>Valor</th>
                    <th>Desconto</th>
                    <th>Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Filtrar todos os planos com os filtros aplicados
                    const todosPlanos = vendasFiltradas.filter(v => {
                      if (v.produto?.toLowerCase() !== 'plano') return false;
                      if (selectedConsultor && v.responsavel !== selectedConsultor) return false;
                      
                      // Aplicar filtros de duração e valor
                      if (selectedDuracao) {
                        let duracaoPlano;
                        // Use duration from Excel if available
                        if (v.duracaoMeses && v.duracaoMeses > 0) {
                          duracaoPlano = obterCategoriaDuracao(v.duracaoMeses);
                        } else if (v.dataInicio && v.dataFim) {
                          const inicio = dayjs(v.dataInicio);
                          const fim = dayjs(v.dataFim);
                          
                          if (!inicio.isValid() || !fim.isValid()) return false;
                          
                          const diffDays = fim.diff(inicio, 'day');
                          
                          if (diffDays <= 31) duracaoPlano = 'Mensal';
                          else if (diffDays <= 95) duracaoPlano = 'Trimestral';
                          else if (diffDays <= 185) duracaoPlano = 'Semestral';
                          else if (diffDays <= 250) duracaoPlano = 'Octomestral';
                          else if (diffDays <= 370) duracaoPlano = 'Anual';
                          else duracaoPlano = 'Bianual';
                        } else {
                          return false;
                        }
                        
                        const filtroMap = {
                          '1': 'Mensal',
                          '3': 'Trimestral',
                          '6': 'Semestral',
                          '8': 'Octomestral',
                          '12': 'Anual',
                          '24': 'Bianual'
                        };
                        
                        if (duracaoPlano !== filtroMap[selectedDuracao]) return false;
                      }
                      
                      const valor = Number(v.valor || 0);
                      if (minValue && valor < minValue) return false;
                      if (maxValue && valor > maxValue) return false;
                      
                      return true;
                    });

                    // Ordenar planos
                    todosPlanos.sort((a, b) => {
                      if (sortBy === 'nome') return a.responsavel.localeCompare(b.responsavel);
                      if (sortBy === 'valor') return Number(b.valor || 0) - Number(a.valor || 0);
                      // Por padrão, ordenar por consultor e depois por data
                      const consultorCompare = a.responsavel.localeCompare(b.responsavel);
                      if (consultorCompare !== 0) return consultorCompare;
                      return dayjs(a.dataInicio).diff(dayjs(b.dataInicio));
                    });

                    return todosPlanos.map((plano, index) => {
                      const inicio = dayjs(plano.dataInicio);
                      const fim = dayjs(plano.dataFim);
                      
                      // DEBUG: Log para verificar dados
                      if (index === 0) {
                        console.log('🔍 DEBUG Plano:', {
                          duracaoMeses: plano.duracaoMeses,
                          valor: plano.valor,
                          produto: plano.produto,
                          dataInicio: plano.dataInicio,
                          dataFim: plano.dataFim
                        });
                      }
                      
                      // Use duration from Excel if available, otherwise fallback to date calculation
                      let nomeDuracao;
                      let diffDays = 0;
                      
                      if (plano.duracaoMeses && plano.duracaoMeses > 0) {
                        nomeDuracao = obterCategoriaDuracao(plano.duracaoMeses);
                        // Estimate days for display purposes
                        diffDays = plano.duracaoMeses * 30;
                        console.log(`✅ Usando duracaoMeses: ${plano.duracaoMeses} → ${nomeDuracao}`);
                      } else if (inicio.isValid() && fim.isValid()) {
                        diffDays = fim.diff(inicio, 'day');
                        
                        if (diffDays <= 31) nomeDuracao = 'Mensal';
                        else if (diffDays <= 95) nomeDuracao = 'Trimestral';
                        else if (diffDays <= 185) nomeDuracao = 'Semestral';
                        else if (diffDays <= 250) nomeDuracao = 'Octomestral';
                        else if (diffDays <= 370) nomeDuracao = 'Anual';
                        else nomeDuracao = 'Bianual';
                        console.log(`⚠️ Fallback para datas: ${diffDays} dias → ${nomeDuracao}`);
                      } else {
                        console.log('❌ Sem dados de duração disponíveis');
                        return null;
                      }

                      // Verificar se tem desconto
                      const temDesconto = verificarDescontoPlano(plano, descontos);
                      
                      // Calcular comissão
                      const duracaoParaIndice = { 
                        'Mensal': 0, 
                        'Trimestral': 1, 
                        'Semestral': 2, 
                        'Octomestral': 3, 
                        'Anual': 4, 
                        'Bianual': 5 
                      };
                      const indice = duracaoParaIndice[nomeDuracao] || 0;
                      
                      let comissaoValor = 0;
                      if (unidadeBatida) {
                        // TME (Time Meta Atingida)
                        const tabelaTME = temDesconto 
                          ? [9, 20, 25, 34, 45, 71]    // COM desconto
                          : [15, 28, 43, 51, 65, 107]; // SEM desconto
                        comissaoValor = tabelaTME[indice] || 0;
                      } else {
                        const metaConsultor = metas.find(m => m.responsavel === plano.responsavel);
                        const vendasConsultor = vendasFiltradas.filter(v => v.responsavel === plano.responsavel);
                        const totalVendasConsultor = vendasConsultor.reduce((s, v) => s + Number(v.valor || 0), 0);
                        const bateuMetaIndividual = metaConsultor && totalVendasConsultor >= Number(metaConsultor.meta || 0);
                        
                        if (bateuMetaIndividual) {
                          // Individual COM meta
                          const tabelaComMeta = temDesconto 
                            ? [6, 16, 23, 30, 42, 67]    // COM desconto
                            : [12, 24, 37, 47, 60, 103]; // SEM desconto
                          comissaoValor = tabelaComMeta[indice] || 0;
                        } else {
                          // Individual SEM meta
                          const tabelaSemMeta = temDesconto 
                            ? [3, 11, 21, 25, 38, 61]   // COM desconto
                            : [9, 18, 28, 42, 53, 97];  // SEM desconto
                          comissaoValor = tabelaSemMeta[indice] || 0;
                        }
                      }

                      return (
                        <tr key={index} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                          <td className="consultor-cell">{plano.responsavel}</td>
                          <td>
                            <span className={`duracao-badge duracao-${nomeDuracao.toLowerCase()}`}>
                              {nomeDuracao}
                            </span>
                          </td>
                          <td>{inicio.isValid() ? inicio.format('DD/MM/YYYY') : '-'}</td>
                          <td>{fim.isValid() ? fim.format('DD/MM/YYYY') : '-'}</td>
                          <td className="dias-cell">
                            {plano.duracaoMeses && plano.duracaoMeses > 0 
                              ? `${plano.duracaoMeses} ${plano.duracaoMeses === 1 ? 'mês' : 'meses'}`
                              : `${diffDays} dias`
                            }
                          </td>
                          <td className="valor-cell">R$ {Number(plano.valor || 0).toLocaleString('pt-BR')}</td>
                          <td className="desconto-cell">
                            <span className={`desconto-badge ${temDesconto ? 'com-desconto' : 'sem-desconto'}`}>
                              {temDesconto ? 'COM' : 'SEM'}
                            </span>
                          </td>
                          <td className="comissao-cell">R$ {comissaoValor.toLocaleString('pt-BR')}</td>
                        </tr>
                      );
                    }).filter(Boolean);
                  })()}
                </tbody>
              </table>
            </div>
            
            <div className="table-summary">
              <p>
                <strong>Total de planos exibidos:</strong> {(() => {
                  const todosPlanos = vendasFiltradas.filter(v => {
                    if (v.produto?.toLowerCase() !== 'plano') return false;
                    if (selectedConsultor && v.responsavel !== selectedConsultor) return false;
                    
                    if (selectedDuracao) {
                      let duracaoPlano;
                      // Use duration from Excel if available
                      if (v.duracaoMeses && v.duracaoMeses > 0) {
                        duracaoPlano = obterCategoriaDuracao(v.duracaoMeses);
                      } else if (v.dataInicio && v.dataFim) {
                        const inicio = dayjs(v.dataInicio);
                        const fim = dayjs(v.dataFim);
                        
                        if (!inicio.isValid() || !fim.isValid()) return false;
                        
                        const diffDays = fim.diff(inicio, 'day');
                        
                        if (diffDays <= 31) duracaoPlano = 'Mensal';
                        else if (diffDays <= 95) duracaoPlano = 'Trimestral';
                        else if (diffDays <= 185) duracaoPlano = 'Semestral';
                        else if (diffDays <= 250) duracaoPlano = 'Octomestral';
                        else if (diffDays <= 370) duracaoPlano = 'Anual';
                        else duracaoPlano = 'Bianual';
                      } else {
                        return false;
                      }
                      
                      const filtroMap = {
                        '1': 'Mensal',
                        '3': 'Trimestral',
                        '6': 'Semestral',
                        '8': 'Octomestral',
                        '12': 'Anual',
                        '24': 'Bianual'
                      };
                      
                      if (duracaoPlano !== filtroMap[selectedDuracao]) return false;
                    }
                    
                    const valor = Number(v.valor || 0);
                    if (minValue && valor < minValue) return false;
                    if (maxValue && valor > maxValue) return false;
                    
                    return true;
                  });
                  return todosPlanos.length;
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Seção de Premiação do Supervisor */}
      {configRem?.premiacaoSupervisor && configRem.premiacaoSupervisor.length > 0 && (
        <div className="supervisor-premiacao-section">
          <div className="section-header">
            <Trophy size={24} />
            <h3>Premiação do Supervisor</h3>
          </div>
          
          {(() => {
            const premiacaoSupervisor = calcularPremiacaoSupervisor({
              totalVendasUnidade: totalUnidade,
              metaUnidade: metaUnidadeCalculada,
              premiacaoSupervisor: configRem.premiacaoSupervisor
            });

            return (
              <div className="supervisor-premiacao-content">
                <div className="supervisor-stats-grid">
                  <div className="supervisor-stat-card">
                    <div className="stat-header">
                      <Target size={20} />
                      <span>Meta da Unidade</span>
                    </div>
                    <div className="stat-value">
                      {metaUnidadeCalculada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                  
                  <div className="supervisor-stat-card">
                    <div className="stat-header">
                      <DollarSign size={20} />
                      <span>Total Vendas</span>
                    </div>
                    <div className="stat-value">
                      {totalUnidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                  
                  <div className="supervisor-stat-card">
                    <div className="stat-header">
                      <TrendingUp size={20} />
                      <span>Percentual Atingido</span>
                    </div>
                    <div className="stat-value">
                      {premiacaoSupervisor.percentualMeta.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className={`supervisor-stat-card ${premiacaoSupervisor.totalPremiacao > 0 ? 'success' : ''}`}>
                    <div className="stat-header">
                      <Award size={20} />
                      <span>Premiação Total</span>
                    </div>
                    <div className="stat-value">
                      {premiacaoSupervisor.totalPremiacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                </div>

                {premiacaoSupervisor.faixasAtingidas.length > 0 && (
                  <div className="supervisor-faixas-atingidas">
                    <h4>Faixas Atingidas</h4>
                    <div className="faixas-atingidas-grid">
                      {premiacaoSupervisor.faixasAtingidas.map((faixa, index) => (
                        <div key={index} className="faixa-atingida-card">
                          <div className="faixa-percentual">{faixa.percentual}%</div>
                          <div className="faixa-premio">
                            {Number(faixa.premio).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const ConfigRemuneracao = () => {
  const { unidade } = useParams();
  // Dark mode is handled globally
  
  const { vendas: vendasOriginais, loading: vendasLoading, responsaveis } = useVendas(unidade);
  
  // APLICAR AGRUPAMENTO DE PLANOS DIVIDIDOS
  const vendasAgrupadas = useGroupedVendas(vendasOriginais);
  
  // APLICAR CORREÇÃO DE DIÁRIAS
  const vendas = React.useMemo(() => {
    if (!vendasAgrupadas?.length) return [];
    const { vendasCorrigidas } = processarCorrecaoDiarias(vendasAgrupadas);
    return vendasCorrigidas;
  }, [vendasAgrupadas]);
  const { metas, loading: metasLoading } = useMetas(unidade);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const { configRem, loading: configLoading } = useConfigRem(unidade, selectedMonth);
  
  // Hook para buscar descontos do Firebase
  const { descontos } = useDescontosSimples(unidade);
  
  // Calcular meta da unidade automaticamente baseada na soma das metas dos consultores
  const metaUnidadeCalculada = React.useMemo(() => {
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    const somaMetasConsultores = metasDoMes.reduce((soma, meta) => {
      return soma + Number(meta.meta || 0);
    }, 0);
    return somaMetasConsultores;
  }, [metas, selectedMonth]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('meta');

  const [metaUnidade, setMetaUnidade] = useState('');
  const [faixas, setFaixas] = useState([]);
  const [faixasSupervisor, setFaixasSupervisor] = useState([]);
  const [comissaoPlanos, setComissaoPlanos] = useState([]);
  const [taxaSem, setTaxaSem] = useState('1.2');
  const [taxaCom, setTaxaCom] = useState('1.5');
  const [isSaving, setIsSaving] = useState(false); // ✅ Flag para evitar sobrescrever durante salvamento

  useEffect(() => {
    console.log('🔄 useEffect disparado:', {
      configRemExists: !!configRem,
      configLoading,
      isSaving,
      configRemKeys: configRem ? Object.keys(configRem) : [],
      premiacaoSupervisorLength: configRem?.premiacaoSupervisor?.length
    });
    
    // ✅ NÃO sobrescrever estados se estiver salvando
    if (configRem && !configLoading && !isSaving) {
      console.log('📥 Carregando configuração:', {
        totalFaixasConsultores: configRem.premiacao?.length || 0,
        totalFaixasSupervisor: configRem.premiacaoSupervisor?.length || 0,
        primeirasFaixasSupervisor: configRem.premiacaoSupervisor?.slice(0, 3),
        configRemCompleto: configRem
      });
      // Não mais definir metaUnidade do configRem, usar valor calculado
      // setMetaUnidade(configRem.metaUnidade?.toString() || '');
      setFaixas(configRem.premiacao || []);
      setFaixasSupervisor(configRem.premiacaoSupervisor || []);
      setComissaoPlanos(configRem.comissaoPlanos || []);
      setTaxaSem(((configRem.taxaSem || 0.012) * 100).toString());
      setTaxaCom(((configRem.taxaCom || 0.015) * 100).toString());
      
      console.log('✅ Estados atualizados:', {
        faixasSupervisorState: (configRem.premiacaoSupervisor || []).length
      });
    }
  }, [configRem, configLoading, isSaving]);
  
  // Atualizar metaUnidade automaticamente quando as metas dos consultores mudarem
  useEffect(() => {
    setMetaUnidade(metaUnidadeCalculada.toString());
  }, [metaUnidadeCalculada]);

  if (!unidade) {
    return (
      <div className="config-wrapper">
        <div className="loading-state">
          <RefreshCw className="spinner" size={24} />
          <p>Aguardando dados da unidade...</p>
        </div>
      </div>
    );
  }

  if (vendasLoading || metasLoading || configLoading) {
    return (
      <div className="config-wrapper">
        <div className="loading-state">
          <RefreshCw className="spinner" size={24} />
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  const addFaixa = () => {
    setFaixas([...faixas, { percentual: '', premio: '' }]);
  };

  const updateFaixa = (index, field, value) => {
    const novasFaixas = [...faixas];
    novasFaixas[index][field] = value;
    setFaixas(novasFaixas);
  };

  const removeFaixa = (index) => {
    setFaixas(faixas.filter((_, i) => i !== index));
  };

  const gerarFaixasPadrao = () => {
    if (!unidade) return;
    const novasFaixas = gerarFaixasPremiacaoLocal(unidade);
    setFaixas(novasFaixas);
    setSuccessMessage('Faixas de premiação geradas!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Funções para gerenciar faixas do supervisor
  const addFaixaSupervisor = () => {
    setFaixasSupervisor([...faixasSupervisor, { percentual: '', premio: '' }]);
  };

  const updateFaixaSupervisor = (index, field, value) => {
    const novasFaixas = [...faixasSupervisor];
    novasFaixas[index][field] = value;
    setFaixasSupervisor(novasFaixas);
  };

  const removeFaixaSupervisor = (index) => {
    setFaixasSupervisor(faixasSupervisor.filter((_, i) => i !== index));
  };

  const gerarFaixasPadraoSupervisor = () => {
    if (!unidade) return;
    // ✅ USAR FAIXAS ESPECÍFICAS DO SUPERVISOR (70% → 450, 75% → 900, etc.)
    const novasFaixas = gerarFaixasPremiacaoSupervisorLocal();
    console.log('🏆 Gerando faixas padrão supervisor:', {
      unidade,
      totalFaixas: novasFaixas.length,
      primeirasFaixas: novasFaixas.slice(0, 5)
    });
    setFaixasSupervisor(novasFaixas);
    setSuccessMessage('Faixas de premiação do supervisor geradas!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const addPlano = () => {
    setComissaoPlanos([
      ...comissaoPlanos,
      { plano: '', min: '', max: '', semMeta: '', comMeta: '', metaTME: '' }
    ]);
  };

  const updatePlano = (index, field, value) => {
    const novosPlanos = [...comissaoPlanos];
    novosPlanos[index][field] = value;
    setComissaoPlanos(novosPlanos);
  };

  const removePlano = (index) => {
    setComissaoPlanos(comissaoPlanos.filter((_, i) => i !== index));
  };

  const carregarPlanosPadrao = () => {
    if (!unidade) return;
    console.log('🔍 DEBUG - Carregando planos para unidade:', unidade);
    console.log('🔍 DEBUG - Unidade toLowerCase():', unidade.toLowerCase());
    const planosPadrao = gerarPlanosPadraoLocal(unidade);
    console.log('🔍 DEBUG - Planos retornados:', planosPadrao);
    setComissaoPlanos(planosPadrao);
    setSuccessMessage('Planos padrão carregados!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const salvarConfiguracao = async () => {
    try {
      setIsLoading(true);
      setIsSaving(true); // ✅ Bloquear recarregamento durante salvamento
      setError('');

      const configData = {
        metaUnidade: metaUnidadeCalculada || 0,
        premiacao: faixas.map(f => ({
          percentual: parseFloat(f.percentual) || 0,
          premio: parseFloat(f.premio) || 0
        })),
        premiacaoSupervisor: faixasSupervisor.map(f => ({
          percentual: parseFloat(f.percentual) || 0,
          premio: parseFloat(f.premio) || 0
        })),
        comissaoPlanos: comissaoPlanos.map(p => ({
          plano: p.plano,
          min: parseFloat(p.min) || 0,
          max: parseFloat(p.max) || 0,
          semMeta: parseFloat(p.semMeta) || 0,
          comMeta: parseFloat(p.comMeta) || 0,
          metaTME: parseFloat(p.metaTME) || 0
        })),
        taxaSem: parseFloat(taxaSem) / 100 || 0.012,
        taxaCom: parseFloat(taxaCom) / 100 || 0.015,
        updatedAt: dayjs().toISOString()
      };

      console.log('💾 Salvando configuração:', {
        totalFaixasConsultores: configData.premiacao.length,
        totalFaixasSupervisor: configData.premiacaoSupervisor.length,
        primeirasFaixasSupervisor: configData.premiacaoSupervisor.slice(0, 3)
      });

      const docRef = doc(
        db,
        'faturamento',
        unidade?.toLowerCase() || 'default',
        'configRemuneracao',
        `premiacao-${selectedMonth}`
      );

      await setDoc(docRef, configData);

      setSuccessMessage('Configuração salva com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // ✅ Aguardar um pouco antes de permitir recarregamento
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar configuração. Tente novamente.');
      setIsSaving(false); // ✅ Liberar em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  const configParaVisualizer = {
    metaUnidade: parseInt(metaUnidade, 10) || 0,
    premiacao: faixas,
    premiacaoSupervisor: faixasSupervisor,
    comissaoPlanos: comissaoPlanos,
    taxaSem: parseFloat(taxaSem) / 100 || 0.012,
    taxaCom: parseFloat(taxaCom) / 100 || 0.015
  };

  return (
    <div className="config-wrapper">
      <Navbar />
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <Settings size={24} />
            <h1>Configuração de Remuneração</h1>
            <span className="unidade-badge">{unidade?.toUpperCase()}</span>
          </div>
          
          <div className="header-controls">
            <div className="month-selector">
              <label>Período:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert success">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'meta' ? 'active' : ''}`}
          onClick={() => setActiveTab('meta')}
        >
          <Target size={20} />
          Meta da Unidade
        </button>
        
        <button 
          className={`tab ${activeTab === 'premiacao' ? 'active' : ''}`}
          onClick={() => setActiveTab('premiacao')}
        >
          <Award size={20} />
          Premiação Consultores
        </button>
        
        <button 
          className={`tab ${activeTab === 'premiacaoSupervisor' ? 'active' : ''}`}
          onClick={() => setActiveTab('premiacaoSupervisor')}
        >
          <Trophy size={20} />
          Premiação Supervisor
        </button>
        
        <button 
          className={`tab ${activeTab === 'outros' ? 'active' : ''}`}
          onClick={() => setActiveTab('outros')}
        >
          <Calculator size={20} />
          Outros Produtos
        </button>
        <button 
          className={`tab ${activeTab === 'visualizador' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualizador')}
        >
          <BarChart3 size={20} />
          Visualizador
        </button>
      </div>

      <div className="tab-content">
        {/* Monitor de Correção de Diárias */}
        
        {activeTab === 'meta' && (
          <div className="tab-panel">
            <h2>Meta da Unidade</h2>
            <div className="form-section">
              <div className="input-group">
                <label>Valor da Meta Mensal (R$) - Calculado Automaticamente</label>
                <div className="currency-input calculated">
                  <span className="currency-symbol">R$</span>
                  <input
                    type="number"
                    value={metaUnidadeCalculada}
                    readOnly
                    className="calculated-input"
                  />
                  <div className="auto-badge">
                    <Calculator size={14} />
                    AUTO
                  </div>
                </div>
                <small>
                  <strong>Meta calculada automaticamente</strong> baseada na soma das metas dos consultores do mês selecionado ({selectedMonth}). 
                  Quando atingida, aplica valores TME nos planos.
                </small>
                
                {/* Mostrar detalhamento das metas dos consultores */}
                <div className="meta-breakdown">
                  <h4>Detalhamento das Metas dos Consultores:</h4>
                  <div className="consultores-metas">
                    {metas
                      .filter(m => m.periodo === selectedMonth)
                      .map((meta, index) => (
                        <div key={index} className="consultor-meta-item">
                          <span className="consultor-name">{meta.responsavel}</span>
                          <span className="consultor-meta">R$ {Number(meta.meta || 0).toLocaleString('pt-BR')}</span>
                        </div>
                      ))
                    }
                    {metas.filter(m => m.periodo === selectedMonth).length === 0 && (
                      <div className="no-metas">
                        <AlertCircle size={16} />
                        <span>Nenhuma meta de consultor encontrada para {selectedMonth}</span>
                      </div>
                    )}
                  </div>
                  <div className="total-calculado">
                    <strong>Total: R$ {metaUnidadeCalculada.toLocaleString('pt-BR')}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'premiacao' && (
          <div className="tab-panel">
            <div className="section-header">
              <h2>Faixas de Premiação - Consultores</h2>
              <div className="section-actions">
                <button className="btn secondary" onClick={addFaixa}>
                  <Plus size={16} />
                  Adicionar
                </button>
                <button className="btn secondary" onClick={gerarFaixasPadrao}>
                  <RefreshCw size={16} />
                  Gerar Padrão
                </button>
              </div>
            </div>
            
            {faixas.length === 0 ? (
              <div className="empty-state">
                <Award size={48} />
                <p>Nenhuma faixa de premiação configurada</p>
                <button className="btn primary" onClick={gerarFaixasPadrao}>
                  Gerar Faixas Padrão
                </button>
              </div>
            ) : (
              <div className="faixas-grid">
                {faixas.map((faixa, index) => (
                  <div key={index} className="faixa-card">
                    <div className="card-header">
                      <span className="faixa-number">#{index + 1}</span>
                      <button 
                        className="btn-icon danger"
                        onClick={() => removeFaixa(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="card-content">
                      <div className="input-group">
                        <label>Percentual da Meta (%)</label>
                        <input
                          type="number"
                          value={faixa.percentual}
                          onChange={(e) => updateFaixa(index, 'percentual', e.target.value)}
                          placeholder="0"
                          min="0"
                          max="500"
                        />
                      </div>
                      <div className="input-group">
                        <label>Prêmio (R$)</label>
                        <input
                          type="number"
                          value={faixa.premio}
                          onChange={(e) => updateFaixa(index, 'premio', e.target.value)}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'premiacaoSupervisor' && (
          <div className="tab-panel">
            <div className="section-header">
              <h2>Faixas de Premiação - Supervisor</h2>
              <div className="section-actions">
                <button className="btn secondary" onClick={addFaixaSupervisor}>
                  <Plus size={16} />
                  Adicionar
                </button>
                <button className="btn secondary" onClick={gerarFaixasPadraoSupervisor}>
                  <RefreshCw size={16} />
                  Gerar Padrão
                </button>
              </div>
            </div>
            
            <div className="info-card">
              <Info size={20} />
              <div>
                <h4>Premiação do Supervisor</h4>
                <p>As faixas de premiação do supervisor são baseadas no percentual de atingimento da meta da unidade. O supervisor recebe prêmios conforme a performance geral da equipe.</p>
              </div>
            </div>
            
            {faixasSupervisor.length === 0 ? (
              <div className="empty-state">
                <Trophy size={48} />
                <p>Nenhuma faixa de premiação configurada para o supervisor</p>
                <button className="btn primary" onClick={gerarFaixasPadraoSupervisor}>
                  Gerar Faixas Padrão
                </button>
              </div>
            ) : (
              <div className="faixas-grid">
                {faixasSupervisor.map((faixa, index) => (
                  <div key={index} className="faixa-card supervisor">
                    <div className="card-header">
                      <span className="faixa-number">#{index + 1}</span>
                      <button 
                        className="btn-icon danger"
                        onClick={() => removeFaixaSupervisor(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="card-content">
                      <div className="input-group">
                        <label>Percentual da Meta da Unidade (%)</label>
                        <input
                          type="number"
                          value={faixa.percentual}
                          onChange={(e) => updateFaixaSupervisor(index, 'percentual', e.target.value)}
                          placeholder="0"
                          min="0"
                          max="500"
                        />
                      </div>
                      <div className="input-group">
                        <label>Prêmio (R$)</label>
                        <input
                          type="number"
                          value={faixa.premio}
                          onChange={(e) => updateFaixaSupervisor(index, 'premio', e.target.value)}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'outros' && (
          <div className="tab-panel">
            <h2>Outros Produtos (Taxas %)</h2>
            <div className="taxas-grid">
              <div className="taxa-card">
                <div className="taxa-header">
                  <TrendingUp size={20} />
                  <h4>Meta NÃO Atingida</h4>
                </div>
                <div className="taxa-input">
                  <input
                    type="number"
                    value={taxaSem}
                    onChange={(e) => setTaxaSem(e.target.value)}
                    placeholder="1.2"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                  <span className="taxa-symbol">%</span>
                </div>
                <small>Taxa aplicada quando meta individual não é atingida</small>
              </div>
              
              <div className="taxa-card success">
                <div className="taxa-header">
                  <TrendingUp size={20} />
                  <h4>Meta Atingida</h4>
                </div>
                <div className="taxa-input">
                  <input
                    type="number"
                    value={taxaCom}
                    onChange={(e) => setTaxaCom(e.target.value)}
                    placeholder="1.5"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                  <span className="taxa-symbol">%</span>
                </div>
                <small>Taxa aplicada quando meta individual é atingida</small>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visualizador' && (
          <div className="tab-panel">
            <h2>Visualização dos Planos</h2>
            <PlanosVisualizerIntegrado 
              comissaoPlanos={comissaoPlanos}
              configRem={configParaVisualizer}
              unidade={unidade}
              vendas={vendas}
              responsaveis={responsaveis}
              metas={metas}
              metaUnidadeCalculada={metaUnidadeCalculada}
            />
          </div>
        )}
      </div>

      <div className="page-footer">
        <button 
          className="btn primary large"
          onClick={salvarConfiguracao}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw size={20} className="spinning" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={20} />
              Salvar Configuração
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ConfigRemuneracao;