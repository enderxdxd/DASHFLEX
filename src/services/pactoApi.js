// src/services/pactoApi.js
// Serviço para buscar contratos da PACTO via Cloud Function proxy
// e normalizar para o formato esperado por consolidarEventosDePlano()

const PACTO_PROXY_URL =
  "https://southamerica-east1-chatpos-aff1a.cloudfunctions.net/pactoProxy";

/**
 * Busca contratos por matrículas via Cloud Function.
 * Fluxo interno (Cloud Function):
 *   1) Chama v2-indice-renovacao para mapear matrícula → codigoCliente
 *   2) Busca contratos via /pessoas/{codigoCliente}/contratos
 *   3) Retorna tudo junto
 *
 * @param {string[]} matriculas - Array de matrículas (só dígitos ou com formatação)
 * @param {number}   empresa    - Código da empresa na PACTO (default: 1)
 * @returns {Promise<{ contratos: Object[], stats: Object }>}
 */
export async function fetchContratosPacto(matriculas, empresa = 1) {
  if (!Array.isArray(matriculas) || matriculas.length === 0) {
    return { contratos: [], stats: { totalMapeadas: 0, totalSemMapeamento: 0 } };
  }

  const res = await fetch(`${PACTO_PROXY_URL}/contratos-por-matricula`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matriculas, empresa }),
  });

  if (!res.ok) {
    throw new Error(`Erro ao buscar contratos PACTO: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Falha ao buscar contratos PACTO");
  }

  const contratos = (json.contratos || []).map(normalizarContratoPacto);

  return {
    contratos,
    stats: {
      totalContratos: json.totalContratos || 0,
      totalMatriculasEnviadas: json.totalMatriculasEnviadas || 0,
      totalMapeadas: json.totalMapeadas || 0,
      totalSemMapeamento: json.totalSemMapeamento || 0,
    },
  };
}

/**
 * Normaliza um contrato da API PACTO para o formato que
 * consolidarEventosDePlano() em studentLifecycle.js espera.
 *
 * Mapeamento (workspace.md):
 *   matricula      ← pessoaDTO.matriculaCliente OU _matriculasAssociadas[0]
 *   nome           ← pessoaDTO.nome
 *   dataInicio     ← vigenciaDe (ISO → YYYY-MM-DD)
 *   dataFim        ← vigenciaAteAjustada || vigenciaAte
 *   produto/plano  ← tipo (MENSAL, TRIMESTRAL, etc.)
 *   numeroContrato ← codigo
 *   valor          ← N/A (0)
 *   responsavel    ← N/A ("")
 */
function normalizarContratoPacto(contrato) {
  const pessoa = contrato.pessoaDTO || {};

  // Matrícula: prioriza a associação feita pelo mapeamento, fallback para pessoaDTO
  const matriculaFromMapping = (contrato._matriculasAssociadas || [])[0] || "";
  const matriculaFromPessoa = String(pessoa.matriculaCliente || "").replace(/\D/g, "");
  const matricula = matriculaFromMapping || matriculaFromPessoa;

  // Datas: ISO 8601 → YYYY-MM-DD
  const dataInicio = formatISODate(contrato.vigenciaDe);
  const dataFim = formatISODate(
    contrato.vigenciaAteAjustada || contrato.vigenciaAte
  );

  return {
    matricula,
    nome: pessoa.nome || "",
    dataInicio,
    dataFormatada: dataInicio,
    dataFim,
    dataTermino: dataFim,
    produto: contrato.tipo || "",
    plano: contrato.tipo || "",
    numeroContrato: String(contrato.codigo || ""),
    valor: 0,
    responsavel: "",
    unidade: "",
    duracaoMeses: 0,

    // Metadado para identificar origem
    _source: "pacto",
    _codCliente: contrato._codCliente,
    _situacao: contrato.situacao,
    _situacaoContrato: pessoa.situacaoContrato,
  };
}

/**
 * Converte ISO 8601 (ex: "2019-04-18T00:00:00Z") para "YYYY-MM-DD".
 */
function formatISODate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
