/**
 * Integração RD Station Conversas -> Pacto (Simples Registro). Função de SUPORTE.
 *
 * Fluxo (inverso do pactoRdSync.js):
 *   Pacto /meta-diaria (contatos do dia) -> RD Conversas (histórico da conversa)
 *   -> grava o diálogo como "Simples Registro" na meta do contato no Pacto.
 *
 * NÃO altera nenhum fluxo existente. É apenas uma função extra.
 *
 * Fonte dos contatos: GET /meta-diaria (apigw, mesma API key já configurada).
 *   Cada contato traz: codigoMetaDetalhada (chave do registro), fase, telefones,
 *   nomeContato, matricula, codigoCliente, descricaoFase, dataMeta.
 *
 * RD Conversas (api.tallos.com.br, JWT):
 *   GET /v2/contacts/{telE164}/exists      -> customer_id (_id) pelo telefone
 *   GET /v2/messages/history?customer_id=.. -> { messages: <JWE criptografado> }
 *   Descriptografia com node-jose usando a chave privada (JWK) da conta.
 *
 * Escrita no Pacto (Simples Registro), endpoint capturado da tela do CRM:
 *   POST /meta-crm/simples-registro
 *     { codigoFecharMetaDetalhado, observacao, fase, tipoContato:"TE" }
 *   O caminho exato no apigw é configurável (pacto.registro_path); o default
 *   tenta alguns aliases. "TE" (Contato Telefônico) NÃO dispara mensagem ao cliente.
 *
 * Configuração (firebase functions:config:set):
 *   pacto.api_key="..."                         (já existe; usado p/ ler e gravar via apigw)
 *   rdconversas.jwt="<token JWT do Conversas>"
 *   rdconversas.jwk_private='{"kty":"RSA",...}'  (chave privada JWK, JSON em string)
 *   # opcionais:
 *   pacto.registro_path="/meta-crm/simples-registro"   (override do caminho de escrita)
 *   pacto.write_base="https://apigw.pactosolucoes.com.br" (ou o zw-boot, se preferir)
 *   pacto.empresa_id_header="false"             ("true" envia header empresaId — necessário no zw-boot)
 *   rdconversas.tipo_contato="TE"
 *   integration.conversas_rd_enabled="true"     (trava do agendamento)
 *
 * HTTP:
 *   GET  / -> status (sem efeito colateral)
 *   POST / -> executa { date?, dryRun?, dryRunPacto?, debug?, limit?, empresas?[] }
 *             dryRun=true       -> não grava no Pacto e não exige nada
 *             dryRunPacto=true  -> lê tudo (inclui RD) mas NÃO grava o registro
 */

const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");

let jose = null;
try {
  // node-jose é usado só para descriptografar o histórico do RD Conversas.
  jose = require("node-jose");
} catch (_) {
  jose = null;
}

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ============ CONSTANTES ============

const PACTO_BASE_URL = "https://apigw.pactosolucoes.com.br";
const PACTO_META_DIARIA_PATH = "/meta-diaria";

// Candidatos de caminho para a escrita (Simples Registro). O primeiro que
// responder != 404/405 é memorizado e reutilizado.
const REGISTRO_PATH_CANDIDATOS = [
  "/meta-crm/simples-registro",
  "/meta-diaria/simples-registro",
  "/simples-registro",
];

const RD_CONVERSAS_BASE = "https://api.tallos.com.br";

const PAGE_SIZE = 50;
const RD_HISTORY_LIMIT = 100;
const DEFAULT_COUNTRY_CODE = "55";

const EMPRESAS_PADRAO = [1, 2, 3, 4];
const EMPRESA_NOMES = { 1: "Buena Vista", 2: "Alphaville", 3: "Marista", 4: "Palmas" };
function empresaNome(c) { return EMPRESA_NOMES[c] || `Empresa ${c}`; }

const DEDUP_COLLECTION = "conversas_rd_sync";

// ============ CONFIG / CREDENCIAIS ============

function cfg() {
  try { return functions.config() || {}; } catch (_) { return {}; }
}

function getPactoApiKey() {
  const c = cfg();
  if (c.pacto && c.pacto.api_key) return c.pacto.api_key;
  return process.env.PACTO_API_KEY || "";
}

function getRdConversasConfig() {
  const c = cfg();
  const rc = c.rdconversas || {};
  return {
    jwt: rc.jwt || process.env.RD_CONVERSAS_JWT || "",
    jwkPrivate: rc.jwk_private || process.env.RD_CONVERSAS_JWK_PRIVATE || "",
    tipoContato: rc.tipo_contato || process.env.RD_CONVERSAS_TIPO_CONTATO || "TE",
    channel: rc.channel || process.env.RD_CONVERSAS_CHANNEL || "whatsapp",
  };
}

function getWriteConfig() {
  const c = cfg();
  const p = c.pacto || {};
  return {
    base: p.write_base || process.env.PACTO_WRITE_BASE || PACTO_BASE_URL,
    path: p.registro_path || process.env.PACTO_REGISTRO_PATH || "",
    sendEmpresaIdHeader:
      String(p.empresa_id_header || process.env.PACTO_EMPRESA_ID_HEADER || "")
        .toLowerCase() === "true",
  };
}

function getEnabled() {
  const c = cfg();
  const v =
    (c.integration && c.integration.conversas_rd_enabled) ||
    process.env.CONVERSAS_RD_ENABLED || "";
  return String(v).toLowerCase() === "true";
}

function readiness() {
  const rd = getRdConversasConfig();
  return {
    pacto: !!getPactoApiKey(),
    rdJwt: !!rd.jwt,
    rdJwk: !!rd.jwkPrivate,
    joseDisponivel: !!jose,
    agendamentoHabilitado: getEnabled(),
    ready: !!getPactoApiKey() && !!rd.jwt && !!rd.jwkPrivate && !!jose,
  };
}

// ============ PACTO: LER CONTATOS DO DIA (/meta-diaria, apigw) ============

async function fetchMetaDiaria({ apiKey, codigoEmpresa, date, page }) {
  const res = await axios.get(`${PACTO_BASE_URL}${PACTO_META_DIARIA_PATH}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: { dataInicio: date, dataFim: date, codigoEmpresa, page, size: PAGE_SIZE },
    timeout: 30000,
  });
  return res.data || {};
}

// "(62)98432-7894, ..." -> primeiro telefone só dígitos, normalizado E.164 (55DDDNUMERO)
function toE164(telefones) {
  if (!telefones) return "";
  const first = String(telefones).split(/[;,/]/)[0] || "";
  let d = first.replace(/\D/g, "");
  if (!d) return "";
  // remove zeros à esquerda
  d = d.replace(/^0+/, "");
  // já tem código do país (13 díg com 9, ou 12 sem 9)?
  if (d.startsWith(DEFAULT_COUNTRY_CODE) && (d.length === 12 || d.length === 13)) return d;
  // número nacional (10 = fixo, 11 = celular com 9) -> prefixa 55
  if (d.length === 10 || d.length === 11) return DEFAULT_COUNTRY_CODE + d;
  return d;
}

function extractContato(c, codigoEmpresa) {
  return {
    codigoMetaDetalhada: c.codigoMetaDetalhada,
    fase: c.fase || "",
    descricaoFase: c.descricaoFase || "",
    codigoCliente: c.codigoCliente || "",
    matricula: c.matricula || "",
    nome: String(c.nomeContato || "").trim(),
    telefoneE164: toE164(c.telefones),
    codigoEmpresa,
  };
}

// ============ RD CONVERSAS ============

async function rdGetCustomerIdByPhone({ jwt, phoneE164, channel }) {
  try {
    const res = await axios.get(
      `${RD_CONVERSAS_BASE}/v2/contacts/${encodeURIComponent(phoneE164)}/exists`,
      { headers: { Authorization: `Bearer ${jwt}`, Accept: "application/json" },
        params: { channel }, timeout: 20000 }
    );
    const data = res.data && res.data.data;
    return data && data._id ? String(data._id) : "";
  } catch (err) {
    if (err.response && err.response.status === 404) return "";
    throw err;
  }
}

async function rdGetHistoryEncrypted({ jwt, customerId, channel, startDate, endDate }) {
  const all = [];
  let page = 1;
  // O histórico vem criptografado por página; acumulamos as strings JWE.
  while (page <= 50) {
    const res = await axios.get(`${RD_CONVERSAS_BASE}/v2/messages/history`, {
      headers: { Authorization: `Bearer ${jwt}`, Accept: "application/json" },
      params: {
        customer_id: customerId,
        channel,
        sent_by: ["customer", "operator", "bot"],
        type: ["text"],
        start_date: startDate,
        end_date: endDate,
        limit: RD_HISTORY_LIMIT,
        page,
      },
      timeout: 30000,
    });
    const enc = res.data && res.data.messages;
    if (!enc) break;
    all.push(enc);
    // Sem cursor: paramos quando a página vem vazia depois de descriptografar.
    // (a contagem real é resolvida no decrypt; aqui limitamos por segurança)
    if (typeof enc === "string" && enc.length < 50) break;
    page++;
    // heurística: se a API repetir conteúdo, o dedup posterior cobre.
    if (all.length >= 5) break;
  }
  return all;
}

let _jwkKeyCache = null;
async function getJwkKey(jwkPrivate) {
  if (_jwkKeyCache) return _jwkKeyCache;
  const json = typeof jwkPrivate === "string" ? JSON.parse(jwkPrivate) : jwkPrivate;
  _jwkKeyCache = await jose.JWK.asKey(json, "json");
  return _jwkKeyCache;
}

async function decryptMessages({ jwkPrivate, encryptedList }) {
  const key = await getJwkKey(jwkPrivate);
  const messages = [];
  for (const jwe of encryptedList) {
    try {
      const result = await jose.JWE.createDecrypt(key).decrypt(jwe);
      const text = result.plaintext.toString();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.messages || parsed.data || [];
      for (const m of arr) messages.push(m);
    } catch (_) {
      // página que não descriptografa é ignorada
    }
  }
  return messages;
}

// ============ MONTAGEM DA OBSERVAÇÃO (resumo + transcrição) ============

function quem(sentBy) {
  if (sentBy === "customer") return "Cliente";
  if (sentBy === "bot") return "Bot";
  if (sentBy === "operator") return "Operador";
  return sentBy || "?";
}

function hhmm(s) {
  const d = new Date(s);
  if (isNaN(d)) return "";
  const sp = new Date(d.getTime() - 3 * 3600 * 1000); // America/Sao_Paulo
  return sp.toISOString().slice(11, 16);
}

function buildObservacao(messages) {
  const ordered = [...messages].sort(
    (a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0)
  );
  const cont = { Cliente: 0, Bot: 0, Operador: 0 };
  const linhas = [];
  for (const m of ordered) {
    const q = quem(m.sent_by || m.sentBy);
    if (cont[q] !== undefined) cont[q]++;
    const texto = String(m.content || m.text || m.message || "").replace(/\s+/g, " ").trim();
    if (!texto) continue;
    const t = hhmm(m.created_at || m.createdAt);
    linhas.push(`${t ? `[${t}] ` : ""}${q}: ${texto}`);
  }
  const primeira = ordered.length ? String(ordered[0].content || "").slice(0, 80) : "";
  const ultima = ordered.length ? String(ordered[ordered.length - 1].content || "").slice(0, 80) : "";
  const resumo =
    `RESUMO (RD Conversas): ${ordered.length} mensagens ` +
    `(cliente ${cont.Cliente}, bot ${cont.Bot}, operador ${cont.Operador}). ` +
    (primeira ? `Início: "${primeira}". ` : "") +
    (ultima ? `Última: "${ultima}".` : "");
  const transcricao = linhas.join("\n");
  return { resumo, transcricao, texto: `${resumo}\n\n--- TRANSCRIÇÃO ---\n${transcricao}`, total: ordered.length };
}

// ============ PACTO: GRAVAR O SIMPLES REGISTRO ============

let _registroPathOk = null;

async function postSimplesRegistro({ apiKey, write, codigoMetaDetalhada, observacao, fase, tipoContato, codigoEmpresa }) {
  const body = {
    codigoFecharMetaDetalhado: codigoMetaDetalhada,
    observacao,
    fase,
    tipoContato,
  };
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  if (write.sendEmpresaIdHeader) headers.empresaId = String(codigoEmpresa);

  const candidatos = write.path
    ? [write.path]
    : (_registroPathOk ? [_registroPathOk, ...REGISTRO_PATH_CANDIDATOS.filter((p) => p !== _registroPathOk)] : REGISTRO_PATH_CANDIDATOS);

  let lastErr = null;
  for (const path of candidatos) {
    try {
      const res = await axios.post(`${write.base}${path}`, body, { headers, timeout: 25000 });
      _registroPathOk = path; // memoriza o caminho que funcionou
      return { ok: true, path, status: res.status, data: res.data };
    } catch (err) {
      const st = err.response && err.response.status;
      lastErr = { path, status: st || null, msg: (err.response && err.response.data) || err.message };
      // 404/405 -> caminho errado, tenta o próximo. Outros erros -> aborta.
      if (st !== 404 && st !== 405) break;
    }
  }
  return { ok: false, error: lastErr };
}

// ============ NÚCLEO ============

async function runSync({
  date,
  dryRun = false,        // não grava no Pacto e não exige RD configurado
  dryRunPacto = false,   // lê tudo (inclui RD) mas não grava o registro
  debug = false,
  limit = 0,
  empresas = null,
  requireEnabled = false,
  source = "manual",
} = {}) {
  const startedAt = Date.now();
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const apiKey = getPactoApiKey();
  const rd = getRdConversasConfig();
  const write = getWriteConfig();

  if (!apiKey) return { success: false, configured: false, error: "PACTO api_key não configurada." };
  if (!dryRun) {
    if (!rd.jwt) return { success: false, configured: false, error: "RD Conversas JWT não configurado (rdconversas.jwt)." };
    if (!rd.jwkPrivate) return { success: false, configured: false, error: "Chave de criptografia não configurada (rdconversas.jwk_private)." };
    if (!jose) return { success: false, configured: false, error: "Pacote node-jose não instalado nas functions." };
  }
  if (requireEnabled && !dryRun && !getEnabled()) {
    return { success: false, enabled: false, message: "Agendamento desabilitado (integration.conversas_rd_enabled=true)." };
  }

  const empresaList = Array.isArray(empresas) && empresas.length ? empresas.map(Number).filter(Boolean) : EMPRESAS_PADRAO;

  let processados = 0, semTelefone = 0, semConversa = 0, gravados = 0, semMensagem = 0, jaProcessado = 0, erros = 0;
  const amostra = [];
  const errosAmostra = [];
  const debugInfo = debug ? { contatos: 0 } : null;

  for (const codigoEmpresa of empresaList) {
    let page = 0, hasMore = true;
    while (hasMore) {
      const data = await fetchMetaDiaria({ apiKey, codigoEmpresa, date: targetDate, page });
      const itens = data.content || [];

      for (const item of itens) {
        if (limit && processados >= limit) { hasMore = false; break; }
        processados++;
        const contato = extractContato(item, codigoEmpresa);

        if (!contato.telefoneE164) { semTelefone++; continue; }
        if (!contato.codigoMetaDetalhada) { continue; }

        // dedup: já gravamos registro para esta meta detalhada?
        const dedupRef = db.collection(DEDUP_COLLECTION).doc(String(contato.codigoMetaDetalhada));

        let customerId = "";
        try {
          if (!dryRun) {
            customerId = await rdGetCustomerIdByPhone({ jwt: rd.jwt, phoneE164: contato.telefoneE164, channel: rd.channel });
          }
        } catch (err) {
          erros++;
          if (errosAmostra.length < 3) errosAmostra.push({ etapa: "rd_contact", tel: contato.telefoneE164, msg: err.message });
          continue;
        }

        if (!dryRun && !customerId) { semConversa++; continue; }

        let obs = null;
        if (!dryRun) {
          try {
            const enc = await rdGetHistoryEncrypted({
              jwt: rd.jwt, customerId, channel: rd.channel,
              startDate: targetDate, endDate: targetDate,
            });
            const msgs = await decryptMessages({ jwkPrivate: rd.jwkPrivate, encryptedList: enc });
            if (!msgs.length) { semMensagem++; continue; }
            obs = buildObservacao(msgs);
          } catch (err) {
            erros++;
            if (errosAmostra.length < 3) errosAmostra.push({ etapa: "rd_history", customerId, msg: err.message });
            continue;
          }

          // dedup por total de mensagens (evita regravar a mesma conversa)
          const snap = await dedupRef.get().catch(() => null);
          if (snap && snap.exists && snap.data().totalMensagens === obs.total) { jaProcessado++; continue; }
        }

        if (dryRun || dryRunPacto) {
          if (amostra.length < 5) amostra.push({
            empresa: empresaNome(codigoEmpresa),
            nome: contato.nome, tel: contato.telefoneE164,
            codigoMetaDetalhada: contato.codigoMetaDetalhada, fase: contato.fase,
            customerId: customerId || undefined,
            preview: obs ? obs.texto.slice(0, 240) : undefined,
            totalMensagens: obs ? obs.total : undefined,
          });
          if (!dryRun) gravados++; // contabiliza "seria gravado"
          continue;
        }

        // grava o registro
        const r = await postSimplesRegistro({
          apiKey, write,
          codigoMetaDetalhada: contato.codigoMetaDetalhada,
          observacao: obs.texto,
          fase: contato.fase,
          tipoContato: rd.tipoContato,
          codigoEmpresa,
        });

        if (r.ok) {
          gravados++;
          await dedupRef.set({
            codigoMetaDetalhada: contato.codigoMetaDetalhada,
            codigoCliente: contato.codigoCliente,
            empresa: codigoEmpresa,
            totalMensagens: obs.total,
            date: targetDate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true }).catch(() => {});
        } else {
          erros++;
          if (errosAmostra.length < 3) errosAmostra.push({ etapa: "pacto_write", ...r.error });
          await db.collection("errors").add({
            source: "pacto_simples_registro", integration: "conversas_rd",
            codigoMetaDetalhada: contato.codigoMetaDetalhada, codigoEmpresa,
            error: r.error, createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }).catch(() => {});
        }
      }

      page++;
      if (limit && processados >= limit) hasMore = false;
      else if (typeof data.totalPages === "number" && data.totalPages > 0) hasMore = page < data.totalPages;
      else hasMore = itens.length >= PAGE_SIZE;
      if (page > 5000) hasMore = false;
    }
    if (limit && processados >= limit) break;
  }

  const result = {
    success: true, dryRun, dryRunPacto, date: targetDate,
    processados, semTelefone, semConversa, semMensagem, jaProcessado, gravados, erros,
    registroPath: _registroPathOk || undefined,
    durationMs: Date.now() - startedAt,
    amostra: amostra.length ? amostra : undefined,
    errosAmostra: errosAmostra.length ? errosAmostra : undefined,
    _debug: debugInfo,
  };

  if (!dryRun && !dryRunPacto) {
    await db.collection("sync_logs").add({
      integration: "conversas_rd", source, date: targetDate,
      processados, semTelefone, semConversa, semMensagem, jaProcessado, gravados, erros,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
    await db.collection("sync_state").doc("conversas_rd").set({
      lastSyncDate: targetDate, lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
      status: erros > 0 ? "partial_success" : "success", gravados, erros,
    }, { merge: true }).catch(() => {});
  }

  return result;
}

// ============ AGENDAMENTO (catch-up por dia) ============

const SCHED_CURSOR_DOC = () => db.collection("sync_state").doc("conversas_rd_scheduler");
const START_DATE_PADRAO = "2026-06-19";

function getStartDate() {
  const c = cfg();
  return (c.integration && c.integration.conversas_rd_start_date) || process.env.CONVERSAS_RD_START_DATE || START_DATE_PADRAO;
}
function addDaysISO(iso, n) { const d = new Date(`${iso}T12:00:00.000Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function hojeSaoPaulo() { return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10); }

async function runScheduledCatchup({ maxDias = 3, source = "scheduler" } = {}) {
  if (!getEnabled()) return { success: false, enabled: false, message: "Agendamento desabilitado (integration.conversas_rd_enabled=true)." };
  const startDate = getStartDate();
  const hoje = hojeSaoPaulo();
  const snap = await SCHED_CURSOR_DOC().get();
  const lastDone = snap.exists ? snap.data().lastDate : null;
  let cursor = lastDone ? addDaysISO(lastDone, 1) : startDate;
  const dias = [];
  while (cursor <= hoje && dias.length < maxDias) {
    const r = await runSync({ date: cursor, source, requireEnabled: false });
    dias.push({ date: cursor, gravados: r.gravados, semConversa: r.semConversa, erros: r.erros, success: r.success });
    if (!r.success) break;
    await SCHED_CURSOR_DOC().set({ lastDate: cursor, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
    cursor = addDaysISO(cursor, 1);
  }
  return { success: true, hoje, startDate, diasProcessados: dias.length, dias, pendentes: cursor <= hoje };
}

// ============ HTTP APP ============

const conversasApp = express();
conversasApp.use(cors({ origin: true }));
conversasApp.use(express.json());

conversasApp.get("/", async (req, res) => {
  try {
    const stateSnap = await db.collection("sync_state").doc("conversas_rd").get();
    return res.status(200).json({
      success: true, integration: "conversas_rd",
      fonte: "/meta-diaria (apigw) -> RD Conversas -> Pacto simples-registro",
      unidades: EMPRESA_NOMES, configurado: readiness(),
      ultimaSincronizacao: stateSnap.exists ? stateSnap.data() : null,
      uso: { teste: 'POST / { "dryRun": true, "limit": 1, "empresas":[2], "date":"2026-06-19" }',
             testeComRD: 'POST / { "dryRunPacto": true, "limit": 5 }' },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

conversasApp.post("/", async (req, res) => {
  try {
    const b = req.body || {}, q = req.query || {};
    if (b.catchup === true || q.catchup === "true") {
      const result = await runScheduledCatchup({ maxDias: Number(b.maxDias || q.maxDias) || 3, source: "http-catchup" });
      return res.status(result.success ? 200 : (result.enabled === false ? 400 : 500)).json(result);
    }
    const result = await runSync({
      date: b.date || q.date,
      dryRun: b.dryRun === true || q.dryRun === "true",
      dryRunPacto: b.dryRunPacto === true || q.dryRunPacto === "true",
      debug: b.debug === true || q.debug === "true",
      limit: Number(b.limit || q.limit) || 0,
      empresas: Array.isArray(b.empresas) ? b.empresas : null,
      source: "http",
    });
    return res.status(result.success ? 200 : (result.configured === false ? 400 : 500)).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { conversasApp, runSync, runScheduledCatchup, readiness };
