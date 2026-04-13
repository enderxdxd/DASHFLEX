// src/utils/studentLifecycle.js
// Índice de Ciclo do Aluno: matrícula, rematrícula, renovação
// Funções puras — sem dependências React

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { corrigirClassificacaoDiarias, ehPlanoAposCorrecao } from './correcaoDiarias';

dayjs.extend(customParseFormat);

// ============ BLACKLIST — não entra no índice de ciclo ============
const BLACKLIST = [
  'taxa de matricula',
  'taxa matricula',
  'estorno',
  'ajuste contabil',
  'ajuste contábil',
  'multa',
  'juros',
  'cancelamento',
  'cancelamentos',
];

// ============ HELPERS ============

/**
 * Normaliza matrícula como somente dígitos (padrão já usado nos descontos).
 * Retorna string vazia se inválida.
 */
export function normalizeMatricula(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits || digits === '000000') return '';
  return digits;
}

/**
 * Retorna a data de referência do ciclo, priorizando o início do novo plano
 * (dataInicio > dataFormatada > dataCadastro).
 * Retorna dayjs instance ou null quando a data não for válida.
 */
export function getDataInicioNovoPlano(venda) {
  const candidates = [
    venda.dataInicio,
    venda.dataFormatada,
    venda.dataCadastro,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const d = parseDateFlexible(c);
    if (d) return d;
  }
  return null;
}

/**
 * Retorna a data final efetiva do plano.
 * Se não existir, deriva a partir de dataInicio + duracaoMeses.
 */
export function getDataFimEfetiva(venda) {
  const candidates = [venda.dataFim, venda.dataTermino, venda.data_termino];
  for (const c of candidates) {
    if (!c) continue;
    const d = parseDateFlexible(c);
    if (d) return d;
  }

  // Fallback: dataInicio + duracaoMeses
  const duracaoMeses = Number(venda.duracaoMeses || 0);
  if (duracaoMeses > 0) {
    const inicio = getDataInicioNovoPlano(venda);
    if (inicio) {
      return inicio.add(duracaoMeses, 'month');
    }
  }

  return null;
}

function parseDateFlexible(d) {
  if (!d) return null;

  const s = String(d).trim();
  if (!s) return null;

  let parsed = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    parsed = dayjs(s);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    parsed = dayjs(s, 'DD/MM/YYYY', true);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    parsed = dayjs(s, 'DD-MM-YYYY', true);
  } else {
    parsed = dayjs(s);
  }

  return parsed.isValid() ? parsed : null;
}

function norm(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isBlacklisted(venda) {
  const produto = norm(venda.produto);
  const plano = norm(venda.plano);
  return BLACKLIST.some(item => {
    const n = norm(item);
    return produto.includes(n) || plano.includes(n);
  });
}

/**
 * Verifica se uma venda é um evento de plano válido para o índice de ciclo.
 * Usa corrigirClassificacaoDiarias + ehPlanoAposCorrecao (mesma lógica do projeto).
 */
function isEventoDePlano(venda) {
  if (isBlacklisted(venda)) return false;
  const vendaCorrigida = corrigirClassificacaoDiarias(venda);
  return ehPlanoAposCorrecao(vendaCorrigida);
}

// ============ CONSOLIDAÇÃO ============

/**
 * Consolida vendas originais em eventos de plano únicos.
 *
 * Agrupa por numeroContrato quando existir, senão por
 * (matricula normalizada + dataInicio + dataFim + plano/produto).
 *
 * Ignora registros sem matrícula válida.
 * Ignora diárias, produtos avulsos, taxas, estornos, cancelamentos.
 */
export function consolidarEventosDePlano(vendasOriginais) {
  const eventos = new Map();

  for (const venda of vendasOriginais) {
    if (!isEventoDePlano(venda)) continue;

    const matriculaNorm = normalizeMatricula(venda.matricula);
    if (!matriculaNorm) continue;

    const dataInicioNovoPlano = getDataInicioNovoPlano(venda);
    if (!dataInicioNovoPlano) continue;

    // Chave de agrupamento
    let chave;
    const contrato = String(venda.numeroContrato || '').trim();
    if (contrato && contrato !== '' && contrato !== '0') {
      chave = `contrato_${contrato}`;
    } else {
      const dataInicioStr = dataInicioNovoPlano.format('YYYY-MM-DD');
      const dataFim = getDataFimEfetiva(venda);
      const dataFimStr = dataFim ? dataFim.format('YYYY-MM-DD') : 'sem-fim';
      const produto = norm(venda.produto || venda.plano || '');
      chave = `${matriculaNorm}_${dataInicioStr}_${dataFimStr}_${produto}`;
    }

    const existente = eventos.get(chave);
    if (!existente) {
      eventos.set(chave, {
        matricula: matriculaNorm,
        matriculaOriginal: venda.matricula,
        nome: venda.nome || '',
        unidade: venda.unidade || '',
        responsavel: venda.responsavel || '',
        dataInicioNovoPlano,
        dataFim: getDataFimEfetiva(venda),
        produto: venda.produto || '',
        plano: venda.plano || '',
        numeroContrato: contrato,
        valor: Number(venda.valor || 0),
        parcelas: 1,
      });
    } else {
      existente.valor += Number(venda.valor || 0);
      existente.parcelas += 1;
      if (!existente.nome && venda.nome) existente.nome = venda.nome;
      if (!existente.responsavel && venda.responsavel) existente.responsavel = venda.responsavel;
    }
  }

  return Array.from(eventos.values());
}

// ============ CLASSIFICAÇÃO ============

/**
 * Classifica o histórico de eventos por matrícula.
 *
 * Para cada matrícula, ordena os eventos por data e classifica:
 * - Sem anterior → matrícula
 * - Sobreposição/continuidade ou até 30 dias após dataFim → renovação
 * - 31 dias a <6 meses → rematrícula
 * - ≥6 meses → matrícula (retorno)
 */
export function classificarHistoricoPorMatricula(eventosConsolidados) {
  const porMatricula = new Map();
  for (const ev of eventosConsolidados) {
    const lista = porMatricula.get(ev.matricula) || [];
    lista.push(ev);
    porMatricula.set(ev.matricula, lista);
  }

  const resultado = [];

  for (const [, eventos] of porMatricula) {
    eventos.sort((a, b) => a.dataInicioNovoPlano.valueOf() - b.dataInicioNovoPlano.valueOf());

    let anterior = null;
    for (const ev of eventos) {
      let classificacao;
      let motivoClassificacao;
      let diasInativo = null;
      let dataFimAnterior = null;

      if (!anterior) {
        classificacao = 'matricula';
        motivoClassificacao = 'Primeiro plano da matrícula';
      } else {
        dataFimAnterior = anterior.dataFim;

        if (!dataFimAnterior) {
          classificacao = 'matricula';
          motivoClassificacao = 'Evento anterior sem data fim — tratado como matrícula';
        } else {
          const diasDiff = ev.dataInicioNovoPlano.diff(dataFimAnterior, 'day');
          diasInativo = diasDiff;

          const limite6Meses = dataFimAnterior.add(6, 'month');

          if (ev.dataInicioNovoPlano.isBefore(dataFimAnterior) || ev.dataInicioNovoPlano.isSame(dataFimAnterior, 'day')) {
            classificacao = 'renovacao';
            motivoClassificacao = `Sobreposição/continuidade (${diasDiff} dias)`;
          } else if (diasDiff <= 30) {
            classificacao = 'renovacao';
            motivoClassificacao = `Novo plano em ${diasDiff} dias após fim do anterior (≤30 dias)`;
          } else if (ev.dataInicioNovoPlano.isBefore(limite6Meses)) {
            classificacao = 'rematricula';
            motivoClassificacao = `Retorno após ${diasDiff} dias (>30 dias, <6 meses)`;
          } else {
            classificacao = 'matricula';
            motivoClassificacao = `Retorno após ${diasDiff} dias (≥6 meses)`;
          }
        }
      }

      resultado.push({
        ...ev,
        classificacao,
        motivoClassificacao,
        diasInativo,
        dataFimAnterior: dataFimAnterior ? dataFimAnterior.format('YYYY-MM-DD') : null,
        dataInicioNovoPlanoStr: ev.dataInicioNovoPlano.format('YYYY-MM-DD'),
        dataFimStr: ev.dataFim ? ev.dataFim.format('YYYY-MM-DD') : null,
      });

      anterior = ev;
    }
  }

  return resultado;
}

// ============ CÁLCULO FINAL ============

/**
 * Pipeline completo: consolida → classifica → filtra contexto → resume.
 *
 * @param {Object} params
 * @param {Array}  params.vendasOriginais       - todas as vendas brutas
 * @param {string} params.unidade               - unidade atual
 * @param {string} params.selectedMonth          - "YYYY-MM"
 * @param {Array}  params.responsaveisOficiais   - consultores com meta (lowercase)
 * @param {Array}  params.produtosSelecionados   - filtro global de produtos
 */
export function calcularIndicesDeCiclo({
  vendasOriginais,
  unidade,
  selectedMonth,
  responsaveisOficiais = [],
  produtosSelecionados = [],
}) {
  if (!vendasOriginais || !vendasOriginais.length) {
    return resultadoVazio();
  }

  // 1) Consolida todos os eventos de plano do histórico global
  const eventosConsolidados = consolidarEventosDePlano(vendasOriginais);

  // 2) Classifica pelo histórico global da matrícula
  const todosClassificados = classificarHistoricoPorMatricula(eventosConsolidados);

  // 3) Filtra para o contexto da página
  const eventosDoContexto = todosClassificados.filter(ev => {
    if (selectedMonth) {
      const mesEvento = ev.dataInicioNovoPlano.format('YYYY-MM');
      if (mesEvento !== selectedMonth) return false;
    }

    if (unidade) {
      const unidadeEvento = (ev.unidade || '').toLowerCase();
      if (unidadeEvento !== unidade.toLowerCase()) return false;
    }

    if (responsaveisOficiais.length > 0) {
      const resp = (ev.responsavel || '').trim().toLowerCase();
      if (!responsaveisOficiais.includes(resp)) return false;
    }

    if (produtosSelecionados.length > 0) {
      const produtoEvento = (ev.produto || '').trim().toLowerCase();
      const match = produtosSelecionados.some(p => p.toLowerCase() === produtoEvento);
      if (!match) return false;
    }

    return true;
  });

  // 4) Resumo
  const matriculas = eventosDoContexto.filter(e => e.classificacao === 'matricula').length;
  const rematriculas = eventosDoContexto.filter(e => e.classificacao === 'rematricula').length;
  const renovacoes = eventosDoContexto.filter(e => e.classificacao === 'renovacao').length;
  const total = matriculas + rematriculas + renovacoes;

  return {
    resumo: {
      matriculas,
      rematriculas,
      renovacoes,
      totalEventosClassificados: total,
      percentualMatriculas: total > 0 ? (matriculas / total) * 100 : 0,
      percentualRematriculas: total > 0 ? (rematriculas / total) * 100 : 0,
      percentualRenovacoes: total > 0 ? (renovacoes / total) * 100 : 0,
    },
    eventosDetalhados: eventosDoContexto.map(ev => ({
      matricula: ev.matriculaOriginal || ev.matricula,
      nome: ev.nome,
      unidade: ev.unidade,
      responsavel: ev.responsavel,
      dataInicioNovoPlano: ev.dataInicioNovoPlanoStr,
      dataFimAnterior: ev.dataFimAnterior,
      diasInativo: ev.diasInativo,
      classificacao: ev.classificacao,
      motivoClassificacao: ev.motivoClassificacao,
      valor: ev.valor,
      parcelas: ev.parcelas,
    })),
  };
}

function resultadoVazio() {
  return {
    resumo: {
      matriculas: 0,
      rematriculas: 0,
      renovacoes: 0,
      totalEventosClassificados: 0,
      percentualMatriculas: 0,
      percentualRematriculas: 0,
      percentualRenovacoes: 0,
    },
    eventosDetalhados: [],
  };
}
