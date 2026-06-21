/**
 * Integração Pacto -> RD Station (função de SUPORTE).
 *
 * Fluxo: Pacto /meta-diaria (CRM por data) -> Cloud Function -> RD Station.
 * NÃO altera nenhum fluxo existente do sistema. É apenas uma função extra.
 *
 * Fonte dos dados: GET /meta-diaria — a lista do CRM por data (a tela de metas
 * do consultor). Traz, por contato: nomeContato, telefones, emails, fase/
 * descricaoFase (a "origem": Visitantes 24h, Renovação, Aniversariantes, etc.),
 * matricula, situacaoCliente. Filtra por dataInicio/dataFim + codigoEmpresa.
 *
 * Padrões seguidos (iguais ao pactoProxy.js):
 *  - firebase-functions v1, axios, admin.firestore()
 *  - credenciais via functions.config() ou variáveis de ambiente
 *
 * Configuração (não fica no código):
 *   firebase functions:config:set pacto.api_key="..." rd.api_key="..."
 *   # opcional OAuth (em vez de rd.api_key):
 *     rd.client_id="..." rd.client_secret="..." rd.refresh_token="..."
 *   # ligar o agendamento automático:
 *     integration.pacto_rd_enabled="true"
 *
 * Endpoints HTTP:
 *   GET  /  -> status (sem efeito colateral)
 *   POST / -> executa a sincronização
 *             body: { date?, dryRun?, debug?, limit?, empresas?[], fase? }
 *
 * Observação: o RD Station Marketing identifica o lead pelo EMAIL (obrigatório).
 * Contatos sem email são contados em "semEmail" e não são enviados.
 */

const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");

// Inicializa apenas se ainda não foi inicializado (index.js já faz)
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ============ CONSTANTES ============

const PACTO_BASE_URL = "https://apigw.pactosolucoes.com.br";
const PACTO_META_DIARIA_PATH = "/meta-diaria";

const RD_TOKEN_URL = "https://api.rd.services/auth/token";
const RD_EVENTS_URL = "https://api.rd.services/platform/events?event_type=conversion";
const RD_CONVERSIONS_URL = "https://api.rd.services/platform/conversions";

const PAGE_SIZE = 50;

// Unidades (codigoEmpresa). Códigos 1–4 retornam dados; 5 vem vazio.
const EMPRESAS_PADRAO = [1, 2, 3, 4];
// ⚠️ Mapeamento código → nome da unidade. 4 = Palmas (DDD 63). Os códigos 1/2/3
// são as unidades de Goiânia (DDD 62) — CONFIRMAR a ordem exata se necessário.
const EMPRESA_NOMES = {
  1: "Alphaville",
  2: "Buena Vista",
  3: "Marista",
  4: "Palmas",
};

function empresaNome(codigo) {
  return EMPRESA_NOMES[codigo] || `Empresa ${codigo}`;
}

// ============ CONFIG / CREDENCIAIS ============

function cfg() {
  try {
    return functions.config() || {};
  } catch (_) {
    return {};
  }
}

function getPactoApiKey() {
  const c = cfg();
  if (c.pacto && c.pacto.api_key) return c.pacto.api_key;
  return process.env.PACTO_API_KEY || "";
}

function getRdConfig() {
  const c = cfg();
  const rd = c.rd || {};
  return {
    clientId: rd.client_id || process.env.RD_CLIENT_ID || "",
    clientSecret: rd.client_secret || process.env.RD_CLIENT_SECRET || "",
    refreshToken: rd.refresh_token || process.env.RD_REFRESH_TOKEN || "",
    apiKey: rd.api_key || process.env.RD_API_KEY || "",
    conversionIdentifier:
      rd.conversion_identifier || process.env.RD_CONVERSION_IDENTIFIER || "Sync Pacto",
  };
}

/**
 * Trava de segurança: o agendamento automático só envia se esta flag estiver "true".
 * Habilitar com: firebase functions:config:set integration.pacto_rd_enabled="true"
 * (runs manuais via POST não exigem a flag — são disparados intencionalmente.)
 */
function getEnabled() {
  const c = cfg();
  const v =
    (c.integration && c.integration.pacto_rd_enabled) ||
    process.env.PACTO_RD_ENABLED ||
    "";
  return String(v).toLowerCase() === "true";
}

function readiness() {
  const rd = getRdConfig();
  const hasOAuth = !!(rd.clientId && rd.clientSecret && rd.refreshToken);
  const hasApiKey = !!rd.apiKey;
  return {
    pacto: !!getPactoApiKey(),
    rdOAuth: hasOAuth,
    rdApiKey: hasApiKey,
    agendamentoHabilitado: getEnabled(),
    ready: !!getPactoApiKey() && (hasOAuth || hasApiKey),
  };
}

// ============ TOKEN RD STATION ============

const RD_TOKEN_DOC = () => db.collection("integrations").doc("rd_station_tokens");

/**
 * Retorna um access_token válido do RD Station, usando cache no Firestore e
 * renovando via refresh_token quando necessário.
 */
async function getRdAccessToken() {
  const { clientId, clientSecret, refreshToken } = getRdConfig();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "RD Station OAuth não configurado (rd.client_id, rd.client_secret, rd.refresh_token)."
    );
  }

  const snap = await RD_TOKEN_DOC().get();
  if (snap.exists) {
    const d = snap.data();
    if (d.accessToken && d.expiresAt && Date.now() < d.expiresAt - 60_000) {
      return d.accessToken;
    }
  }

  const res = await axios.post(
    RD_TOKEN_URL,
    { client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken },
    { timeout: 20000 }
  );

  const accessToken = res.data.access_token;
  const expiresIn = Number(res.data.expires_in) || 86400;
  if (!accessToken) throw new Error("RD Station não retornou access_token.");

  await RD_TOKEN_DOC().set(
    {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      refreshedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return accessToken;
}

// ============ PACTO (/meta-diaria) ============

async function fetchMetaDiaria({ apiKey, codigoEmpresa, date, page, fase, path, rawParams }) {
  const usePath = path || PACTO_META_DIARIA_PATH;

  // rawParams: sobrescreve os query params (diagnóstico). Senão usa o contrato
  // padrão do /meta-diaria: dataInicio/dataFim + codigoEmpresa + paginação.
  let usedParams;
  if (rawParams) {
    usedParams = { page, size: PAGE_SIZE, ...rawParams };
  } else {
    usedParams = { dataInicio: date, dataFim: date, codigoEmpresa, page, size: PAGE_SIZE };
    if (fase) usedParams.fase = fase;
  }

  const res = await axios.get(`${PACTO_BASE_URL}${usePath}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: usedParams,
    timeout: 30000,
  });

  return { data: res.data || {}, usePath, usedParams };
}

// ============ MAPEAMENTO ============

// "a@x.com, b@y.com" -> primeiro email válido
function firstEmail(s) {
  if (!s) return "";
  return (
    String(s)
      .split(/[;,/]/)
      .map((x) => x.trim())
      .find((x) => /\S+@\S+\.\S+/.test(x)) || ""
  );
}

// "(62)99999-0000, (62)3333-1111" -> primeiro telefone (só dígitos)
function firstPhone(s) {
  if (!s) return "";
  const parts = String(s).split(/[;,/]/).map((x) => x.trim()).filter(Boolean);
  return (parts[0] || "").replace(/\D/g, "");
}

function slug(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function extractContact(c, codigoEmpresa) {
  return {
    email: firstEmail(c.emails),
    name: String(c.nomeContato || c.nome || "").trim(),
    phone: firstPhone(c.telefones || c.telefone),
    origem: c.descricaoFase || c.fase || "",
    matricula: c.matricula || "",
    situacao: c.situacaoCliente || "",
    codigoEmpresa,
    raw: c,
  };
}

function buildRdPayload(contact, { date, conversionIdentifier }) {
  return {
    event_type: "CONVERSION",
    event_family: "CDP",
    payload: {
      conversion_identifier: conversionIdentifier,
      email: contact.email,
      name: contact.name || undefined,
      mobile_phone: contact.phone || undefined,
      tags: ["pacto", contact.origem ? `origem-${slug(contact.origem)}` : null].filter(Boolean),
      cf_origem: contact.origem || "",
      cf_unidade: empresaNome(contact.codigoEmpresa),
      cf_status_aluno: contact.situacao || "",
      cf_matricula: contact.matricula || "",
      cf_data_sync: date,
    },
  };
}

// ============ RD STATION (envio) ============

async function sendToRd(payload, { accessToken, apiKey }) {
  if (accessToken) {
    return axios.post(RD_EVENTS_URL, payload, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      timeout: 20000,
    });
  }
  // Fallback legado via api_key (endpoint de conversões)
  return axios.post(
    `${RD_CONVERSIONS_URL}?api_key=${encodeURIComponent(apiKey)}`,
    { event_type: "CONVERSION", event_family: "CDP", payload: payload.payload },
    { headers: { "Content-Type": "application/json" }, timeout: 20000 }
  );
}

// ============ NÚCLEO DA SINCRONIZAÇÃO ============

/**
 * Sincroniza os contatos do CRM (/meta-diaria) de uma data para o RD Station.
 * Nunca lança em caso de "não configurado": retorna { success:false, ... } para
 * que o agendador não gere ruído antes das credenciais existirem.
 */
async function runSync({
  date,
  dryRun = false,
  debug = false,
  limit = 0,
  maxEnviar = 0,
  empresas = null,
  fase = null,
  source = "manual",
  path = null,
  rawParams = null,
  requireEnabled = false,
} = {}) {
  const startedAt = Date.now();
  const targetDate = date || new Date().toISOString().slice(0, 10);
  let debugInfo = null;

  const pactoApiKey = getPactoApiKey();
  const rdConf = getRdConfig();
  const hasOAuth = !!(rdConf.clientId && rdConf.clientSecret && rdConf.refreshToken);
  const hasApiKey = !!rdConf.apiKey;

  if (!pactoApiKey) {
    return { success: false, configured: false, error: "PACTO api_key não configurada." };
  }
  if (!hasOAuth && !hasApiKey) {
    return { success: false, configured: false, error: "RD Station não configurado (OAuth ou api_key)." };
  }

  // Trava do agendamento automático (não afeta runs manuais nem dryRun).
  if (requireEnabled && !dryRun && !getEnabled()) {
    return {
      success: false,
      enabled: false,
      message:
        "Agendamento desabilitado. Habilite com integration.pacto_rd_enabled=true para ligar a sync automática.",
    };
  }

  let accessToken = "";
  if (hasOAuth && !dryRun) {
    accessToken = await getRdAccessToken();
  }

  const empresaList =
    Array.isArray(empresas) && empresas.length
      ? empresas.map(Number).filter(Boolean)
      : EMPRESAS_PADRAO;

  let processados = 0;
  let enviados = 0;
  let semEmail = 0;
  let duplicados = 0;
  let erros = 0;
  const amostra = [];
  const errosAmostra = [];
  const seenEmails = new Set();
  const porEmpresa = {};

  for (const codigoEmpresa of empresaList) {
    let page = 0;
    let hasMore = true;
    let empCount = 0;

    while (hasMore) {
      const fetched = await fetchMetaDiaria({
        apiKey: pactoApiKey,
        codigoEmpresa,
        date: targetDate,
        page,
        fase,
        path,
        rawParams,
      });
      const data = fetched.data;
      const itens = data.content || [];

      if (debug && !debugInfo) {
        debugInfo = {
          httpOk: true,
          path: fetched.usePath,
          paramsUsed: fetched.usedParams,
          topLevelKeys: data && typeof data === "object" ? Object.keys(data) : typeof data,
          totalElements: data.totalElements ?? null,
          sampleRaw: itens[0] || null,
        };
      }

      for (const item of itens) {
        if ((limit && processados >= limit) || (maxEnviar && enviados + erros >= maxEnviar)) {
          hasMore = false;
          break;
        }
        processados++;
        empCount++;

        const contact = extractContact(item, codigoEmpresa);
        if (!contact.email) {
          semEmail++;
          continue;
        }
        if (seenEmails.has(contact.email)) {
          duplicados++;
          continue;
        }
        seenEmails.add(contact.email);

        const payload = buildRdPayload(contact, {
          date: targetDate,
          conversionIdentifier: rdConf.conversionIdentifier,
        });

        if (dryRun) {
          if (amostra.length < 5) amostra.push(payload.payload);
          enviados++;
          continue;
        }

        try {
          await sendToRd(payload, { accessToken, apiKey: rdConf.apiKey });
          enviados++;
        } catch (err) {
          erros++;
          const responseData = err.response?.data;
          if (errosAmostra.length < 3) {
            errosAmostra.push({
              email: contact.email,
              status: err.response?.status || null,
              response:
                typeof responseData === "object"
                  ? responseData
                  : String(responseData || err.message).slice(0, 400),
            });
          }
          await db
            .collection("errors")
            .add({
              source: "rd_station",
              integration: "pacto_rd",
              email: contact.email,
              codigoEmpresa,
              status: err.response?.status || null,
              response:
                typeof responseData === "object"
                  ? JSON.stringify(responseData)
                  : responseData || err.message,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
            .catch(() => {});
        }
      }

      page++;
      if ((limit && processados >= limit) || (maxEnviar && enviados + erros >= maxEnviar)) {
        hasMore = false;
      } else if (typeof data.totalPages === "number" && data.totalPages > 0) {
        hasMore = page < data.totalPages;
      } else {
        hasMore = itens.length >= PAGE_SIZE;
      }
      if (page > 5000) hasMore = false; // trava de segurança
    }

    porEmpresa[codigoEmpresa] = empCount;
    if ((limit && processados >= limit) || (maxEnviar && enviados + erros >= maxEnviar)) break;
  }

  const result = {
    success: true,
    dryRun,
    date: targetDate,
    enviados,
    semEmail,
    duplicados,
    erros,
    processados,
    porEmpresa,
    durationMs: Date.now() - startedAt,
    amostra: dryRun ? amostra : undefined,
    errosAmostra: errosAmostra.length ? errosAmostra : undefined,
    _debug: debug ? debugInfo : undefined,
  };

  if (!dryRun) {
    await db
      .collection("sync_logs")
      .add({
        integration: "pacto_rd",
        source,
        date: targetDate,
        enviados,
        semEmail,
        duplicados,
        erros,
        processados,
        porEmpresa,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch(() => {});

    await db
      .collection("sync_state")
      .doc("pacto_rd")
      .set(
        {
          lastSyncDate: targetDate,
          lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
          status: erros > 0 ? "partial_success" : "success",
          enviados,
          semEmail,
          erros,
        },
        { merge: true }
      )
      .catch(() => {});
  }

  return result;
}

// ============ HTTP APP ============

const syncApp = express();
syncApp.use(cors({ origin: true }));
syncApp.use(express.json());

// GET: status (sem efeito colateral)
syncApp.get("/", async (req, res) => {
  try {
    const stateSnap = await db.collection("sync_state").doc("pacto_rd").get();
    return res.status(200).json({
      success: true,
      integration: "pacto_rd",
      fonte: "/meta-diaria (CRM por data)",
      unidades: EMPRESA_NOMES,
      configurado: readiness(),
      ultimaSincronizacao: stateSnap.exists ? stateSnap.data() : null,
      uso: {
        executar: "POST / body { date, dryRun, debug, limit, empresas[], fase }",
        teste: 'POST / { "dryRun": true, "limit": 1 }',
      },
    });
  } catch (err) {
    console.error("[pacto_rd] erro no status:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST: executa a sincronização
syncApp.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const q = req.query || {};
    const result = await runSync({
      date: b.date || q.date,
      dryRun: b.dryRun === true || q.dryRun === "true",
      debug: b.debug === true || q.debug === "true",
      limit: Number(b.limit || q.limit) || 0,
      maxEnviar: Number(b.maxEnviar || q.maxEnviar) || 0,
      empresas: Array.isArray(b.empresas) ? b.empresas : null,
      fase: typeof b.fase === "string" ? b.fase : null,
      path: typeof b.path === "string" ? b.path : null,
      rawParams: b && typeof b.params === "object" ? b.params : null,
      source: "http",
    });

    const code = result.success ? 200 : result.configured === false ? 400 : 500;
    return res.status(code).json(result);
  } catch (err) {
    console.error("[pacto_rd] erro na sincronização:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { syncApp, runSync, readiness };
