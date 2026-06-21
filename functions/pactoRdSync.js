/**
 * Integração Pacto -> RD Station (função de SUPORTE).
 *
 * Fluxo: Pacto API -> Cloud Function -> RD Station (eventos de conversão).
 * NÃO altera nenhum fluxo existente do sistema. É apenas uma função extra.
 *
 * Padrões seguidos (iguais ao pactoProxy.js):
 *  - firebase-functions v1, axios, admin.firestore()
 *  - credenciais via functions.config() ou variáveis de ambiente
 *
 * Configuração esperada (não fica no código):
 *   firebase functions:config:set \
 *     pacto.api_key="..." \
 *     rd.client_id="..." rd.client_secret="..." rd.refresh_token="..."
 *   # alternativa legada (sem OAuth):
 *     rd.api_key="..."
 *
 * Endpoints HTTP:
 *   GET  /  -> status da integração (sem efeito colateral)
 *   POST / -> executa a sincronização
 *             query/body: { date?, dryRun?, limit?, empresa? }
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
// ⚠️ Endpoint de contatos da Pacto — CONFIRMAR com a Pacto. O nome dos campos
// também precisa ser validado (ver extractContact). O modo dryRun ajuda nisso.
const PACTO_CONTACTS_PATH = "/historico-contato";

const RD_TOKEN_URL = "https://api.rd.services/auth/token";
const RD_EVENTS_URL = "https://api.rd.services/platform/events?event_type=conversion";
const RD_CONVERSIONS_URL = "https://api.rd.services/platform/conversions";

const PAGE_SIZE = 50;

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

function readiness() {
  const rd = getRdConfig();
  const hasOAuth = !!(rd.clientId && rd.clientSecret && rd.refreshToken);
  const hasApiKey = !!rd.apiKey;
  return {
    pacto: !!getPactoApiKey(),
    rdOAuth: hasOAuth,
    rdApiKey: hasApiKey,
    ready: !!getPactoApiKey() && (hasOAuth || hasApiKey),
  };
}

// ============ TOKEN RD STATION ============

const RD_TOKEN_DOC = () =>
  db.collection("integrations").doc("rd_station_tokens");

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

  // Cache
  const snap = await RD_TOKEN_DOC().get();
  if (snap.exists) {
    const d = snap.data();
    if (d.accessToken && d.expiresAt && Date.now() < d.expiresAt - 60_000) {
      return d.accessToken;
    }
  }

  // Renova
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

// ============ PACTO ============

async function fetchPactoContatosPage({ apiKey, empresa, date, page }) {
  const filtros = {
    empresas: [Number(empresa) || 1],
    dataInicioMeta: date,
    dataTerminoMeta: date,
  };

  const res = await axios.get(`${PACTO_BASE_URL}${PACTO_CONTACTS_PATH}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: { filters: JSON.stringify(filtros), page, size: PAGE_SIZE },
    timeout: 30000,
  });

  return res.data || {};
}

// ============ MAPEAMENTO ============

/**
 * Extrai email/nome/telefone de um contato da Pacto de forma tolerante,
 * já que os nomes exatos dos campos dependem do endpoint/conta.
 */
function extractContact(c) {
  const email = String(c.emailAluno || c.email || c.emailCliente || "").trim();
  const name = String(c.nomeAluno || c.nome || c.nomeCliente || "").trim();
  const phone = String(
    c.telefone || c.celular || c.telefoneCliente || c.fone || ""
  ).replace(/\D/g, "");
  return { email, name, phone, raw: c };
}

function buildRdPayload(contact, { date, conversionIdentifier }) {
  const c = contact.raw;
  return {
    event_type: "CONVERSION",
    event_family: "CDP",
    payload: {
      conversion_identifier: conversionIdentifier,
      email: contact.email,
      name: contact.name || undefined,
      mobile_phone: contact.phone || undefined,
      tags: ["pacto", c.fase ? `fase-${c.fase}` : null].filter(Boolean),
      cf_fase_crm: c.fase || "",
      cf_canal: c.tipoContato || "",
      cf_resultado: c.resultado || "",
      cf_unidade: c.unidade || c.nomeEmpresa || "",
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
 * Executa a sincronização Pacto -> RD.
 * Nunca lança em caso de "não configurado": retorna { success:false, configured:false }
 * para que o agendador não gere ruído antes das credenciais existirem.
 */
async function runSync({ date, dryRun = false, limit = 0, empresa = 1, source = "manual" } = {}) {
  const startedAt = Date.now();
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const pactoApiKey = getPactoApiKey();
  const rdConf = getRdConfig();
  const hasOAuth = !!(rdConf.clientId && rdConf.clientSecret && rdConf.refreshToken);
  const hasApiKey = !!rdConf.apiKey;

  if (!pactoApiKey) {
    return { success: false, configured: false, error: "PACTO api_key não configurada." };
  }
  if (!hasOAuth && !hasApiKey) {
    return {
      success: false,
      configured: false,
      error: "RD Station não configurado (OAuth ou api_key).",
    };
  }

  let accessToken = "";
  if (hasOAuth && !dryRun) {
    accessToken = await getRdAccessToken();
  }

  let page = 0;
  let totalPages = 1;
  let enviados = 0;
  let ignorados = 0;
  let erros = 0;
  let processados = 0;
  const amostra = [];

  while (page < totalPages) {
    const data = await fetchPactoContatosPage({
      apiKey: pactoApiKey,
      empresa,
      date: targetDate,
      page,
    });

    totalPages = data.totalPages || 1;
    const itens = data.content || data.itens || [];

    for (const item of itens) {
      if (limit && processados >= limit) break;
      processados++;

      const contact = extractContact(item);
      if (!contact.email) {
        ignorados++;
        continue;
      }

      const payload = buildRdPayload(contact, {
        date: targetDate,
        conversionIdentifier: rdConf.conversionIdentifier,
      });

      if (dryRun) {
        if (amostra.length < 5) amostra.push(payload.payload);
        enviados++; // contabiliza como "seria enviado"
        continue;
      }

      try {
        await sendToRd(payload, { accessToken, apiKey: rdConf.apiKey });
        enviados++;
      } catch (err) {
        erros++;
        const responseData = err.response?.data;
        await db
          .collection("errors")
          .add({
            source: "rd_station",
            integration: "pacto_rd",
            email: contact.email,
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

    if (limit && processados >= limit) break;
    page++;
  }

  const result = {
    success: true,
    dryRun,
    date: targetDate,
    enviados,
    ignorados,
    erros,
    processados,
    durationMs: Date.now() - startedAt,
    amostra: dryRun ? amostra : undefined,
  };

  if (!dryRun) {
    await db
      .collection("sync_logs")
      .add({
        integration: "pacto_rd",
        source,
        date: targetDate,
        enviados,
        ignorados,
        erros,
        processados,
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
          ignorados,
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
      configurado: readiness(),
      ultimaSincronizacao: stateSnap.exists ? stateSnap.data() : null,
      uso: {
        executar: "POST / com body opcional { date, dryRun, limit, empresa }",
        teste: "POST /?dryRun=true&limit=1",
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
    const q = { ...req.query, ...req.body };
    const result = await runSync({
      date: q.date,
      dryRun: q.dryRun === true || q.dryRun === "true",
      limit: Number(q.limit) || 0,
      empresa: Number(q.empresa) || 1,
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
