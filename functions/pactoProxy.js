const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const admin = require("firebase-admin");

// Inicializa apenas se ainda não foi inicializado (index.js já faz)
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PACTO_BASE_URL = "https://apigw.pactosolucoes.com.br";
const CACHE_COLLECTION = "pactoCache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Busca a chave da API PACTO.
 */
function getPactoApiKey() {
  try {
    const cfg = functions.config();
    if (cfg.pacto && cfg.pacto.api_key) return cfg.pacto.api_key;
  } catch (_) {
    // ignore
  }
  return process.env.PACTO_API_KEY || "";
}

/**
 * Busca todos os contratos de uma pessoa paginando automaticamente.
 */
async function fetchContratosPessoa(codPessoa, apiKey) {
  const contratos = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const res = await axios.get(
      `${PACTO_BASE_URL}/pessoas/${codPessoa}/contratos`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: { page, size: 50, sort: "vigenciaDe,asc" },
        timeout: 15000,
      }
    );

    const data = res.data;
    if (data.content && Array.isArray(data.content)) {
      contratos.push(...data.content);
    }

    totalPages = data.totalPages || 1;
    page++;
  }

  return contratos;
}

// ============ CACHE HELPERS ============

async function getCachedContratos(codPessoa) {
  const docRef = db.collection(CACHE_COLLECTION).doc(`pessoa_${codPessoa}`);
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const cached = snap.data();
  const age = Date.now() - (cached.timestamp || 0);
  if (age > CACHE_TTL_MS) return null;

  return cached.contratos || [];
}

async function setCachedContratos(codPessoa, contratos) {
  const docRef = db.collection(CACHE_COLLECTION).doc(`pessoa_${codPessoa}`);
  await docRef.set({
    contratos,
    timestamp: Date.now(),
    codPessoa: Number(codPessoa),
  });
}

/**
 * Busca o mapeamento matricula → codigoCliente cacheado no Firestore.
 * Retorna null se não existe ou expirou.
 */
async function getCachedMapping(empresa) {
  const docRef = db.collection(CACHE_COLLECTION).doc(`mapping_emp${empresa}`);
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const cached = snap.data();
  const age = Date.now() - (cached.timestamp || 0);
  if (age > CACHE_TTL_MS) return null;

  return cached.mapping || {};
}

async function setCachedMapping(empresa, mapping) {
  const docRef = db.collection(CACHE_COLLECTION).doc(`mapping_emp${empresa}`);
  await docRef.set({
    mapping,
    timestamp: Date.now(),
    empresa,
    totalEntries: Object.keys(mapping).length,
  });
}

// ============ MAPEAMENTO VIA INDICE-RENOVACAO ============

/**
 * Chama v2-indice-renovacao com um range amplo para extrair o mapeamento
 * matriculaCliente → codigoCliente.
 *
 * Faz múltiplas chamadas cobrindo janelas de 6 meses nos últimos 3 anos
 * para capturar o máximo de clientes.
 */
async function buildMatriculaMapping(apiKey, empresa = 1) {
  // Checa cache primeiro
  const cached = await getCachedMapping(empresa);
  if (cached && Object.keys(cached).length > 0) {
    console.log(`[PACTO] Mapping cache HIT: ${Object.keys(cached).length} entries`);
    return cached;
  }

  console.log("[PACTO] Building matricula → codigoCliente mapping...");
  const mapping = {}; // matricula (só dígitos) → codigoCliente

  // Janelas de 6 meses cobrindo os últimos 3 anos
  const now = new Date();
  const windows = [];
  for (let i = 0; i < 6; i++) {
    const end = new Date(now);
    end.setMonth(end.getMonth() - (i * 6));
    const start = new Date(end);
    start.setMonth(start.getMonth() - 6);
    windows.push({
      dataInicial: start.getTime(),
      dataFinal: end.getTime(),
    });
  }

  // Busca em sequência para não sobrecarregar
  for (const win of windows) {
    try {
      const res = await axios.post(
        `${PACTO_BASE_URL}/v2-indice-renovacao`,
        {
          empresa,
          colaboradores: [0],
          dataInicial: win.dataInicial,
          dataFinal: win.dataFinal,
          retornarContratos: true,
          desconsiderarContratosRenovaveis: false,
          token: apiKey,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 60000,
        }
      );

      const raw = res.data?.content?.jsonDados;
      if (!raw) continue;

      // jsonDados vem como STRING JSON da API — precisa parsear
      let dados;
      try {
        dados = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (parseErr) {
        console.error("[PACTO] Erro ao parsear jsonDados:", parseErr.message);
        continue;
      }

      // Extrai de todos os arrays que contenham matriculaCliente + codigoCliente
      const arrays = [
        dados.contratosPrevisaoMes,
        dados.contratosRenovadosDentroMes,
        dados.contratosRenovadosForaMes,
        dados.contratosNaoRenovados,
      ].filter(Array.isArray);

      console.log(`[PACTO] Arrays encontrados: ${arrays.length}, tamanhos: ${arrays.map(a => a.length).join(", ")}`);

      for (const arr of arrays) {
        for (const item of arr) {
          const mat = String(item.matriculaCliente || "").replace(/\D/g, "");
          const cod = item.codigoCliente;
          if (mat && cod) {
            mapping[mat] = Number(cod);
          }
        }
      }

      console.log(`[PACTO] Window ${new Date(win.dataInicial).toISOString().slice(0,7)} → ${new Date(win.dataFinal).toISOString().slice(0,7)}: mapping now has ${Object.keys(mapping).length} entries`);
    } catch (err) {
      console.error(`[PACTO] Erro na janela ${new Date(win.dataInicial).toISOString().slice(0,7)}:`, err.message);
      // Continua com as outras janelas
    }
  }

  // Salva no cache
  if (Object.keys(mapping).length > 0) {
    setCachedMapping(empresa, mapping).catch((err) =>
      console.error("[PACTO] Erro ao salvar mapping cache:", err.message)
    );
  }

  console.log(`[PACTO] Mapping final: ${Object.keys(mapping).length} matrículas mapeadas`);
  return mapping;
}

// ============ ENDPOINTS ============

/**
 * POST /contratos-por-matricula
 * Body: { matriculas: ["12345", "67890", ...], empresa: 1 }
 *
 * Fluxo:
 * 1) Chama v2-indice-renovacao para construir mapeamento matricula → codigoCliente
 * 2) Para cada matrícula encontrada no mapeamento, busca contratos via /pessoas/{cod}/contratos
 * 3) Retorna todos os contratos com a matrícula associada
 */
app.post("/contratos-por-matricula", async (req, res) => {
  try {
    const apiKey = getPactoApiKey();
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Chave da API PACTO não configurada. Use: firebase functions:config:set pacto.api_key=SUA_CHAVE",
      });
    }

    const { matriculas, empresa = 1 } = req.body;
    if (!Array.isArray(matriculas) || matriculas.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Envie um array matriculas com pelo menos uma matrícula.",
      });
    }

    // Normaliza matrículas (só dígitos)
    const matsNorm = [...new Set(
      matriculas
        .map((m) => String(m).replace(/\D/g, ""))
        .filter((m) => m && m !== "000000")
    )];

    // 1) Constrói o mapeamento matricula → codigoCliente
    const mapping = await buildMatriculaMapping(apiKey, empresa);

    // 2) Identifica quais matrículas têm mapeamento
    const matched = [];
    const unmatched = [];
    for (const mat of matsNorm) {
      if (mapping[mat]) {
        matched.push({ matricula: mat, codigoCliente: mapping[mat] });
      } else {
        unmatched.push(mat);
      }
    }

    console.log(`[PACTO] ${matched.length} matrículas mapeadas, ${unmatched.length} sem mapeamento`);

    // 3) Busca contratos para cada codigoCliente mapeado
    const todosContratos = [];
    const erros = [];
    const codigos = [...new Set(matched.map((m) => m.codigoCliente))];

    // Batch de 5 simultâneos
    const BATCH_SIZE = 5;
    for (let i = 0; i < codigos.length; i += BATCH_SIZE) {
      const batch = codigos.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (codCliente) => {
        try {
          // Cache primeiro
          const cached = await getCachedContratos(codCliente);
          if (cached) {
            return { codCliente, contratos: cached, source: "cache" };
          }

          const contratos = await fetchContratosPessoa(codCliente, apiKey);

          setCachedContratos(codCliente, contratos).catch((err) =>
            console.error(`Cache write failed for ${codCliente}:`, err.message)
          );

          return { codCliente, contratos, source: "api" };
        } catch (err) {
          const status = err.response?.status;
          console.error(`Erro ao buscar contratos de codCliente ${codCliente}: ${status || err.message}`);
          erros.push({ codCliente, error: err.message, status });
          return { codCliente, contratos: [], source: "error" };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const r of batchResults) {
        // Associa matrícula a cada contrato
        const matsDoCliente = matched
          .filter((m) => m.codigoCliente === r.codCliente)
          .map((m) => m.matricula);

        for (const c of r.contratos) {
          todosContratos.push({
            ...c,
            _codCliente: r.codCliente,
            _matriculasAssociadas: matsDoCliente,
            _source: r.source,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      totalContratos: todosContratos.length,
      totalMatriculasEnviadas: matsNorm.length,
      totalMapeadas: matched.length,
      totalSemMapeamento: unmatched.length,
      erros: erros.length > 0 ? erros : undefined,
      contratos: todosContratos,
    });
  } catch (err) {
    console.error("Erro geral no contratos-por-matricula:", err);
    return res.status(500).json({
      success: false,
      error: "Erro interno: " + err.message,
    });
  }
});

/**
 * POST /contratos (mantido para compatibilidade)
 * Body: { codPessoas: [123, 456, ...] }
 */
app.post("/contratos", async (req, res) => {
  try {
    const apiKey = getPactoApiKey();
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Chave da API PACTO não configurada.",
      });
    }

    const { codPessoas } = req.body;
    if (!Array.isArray(codPessoas) || codPessoas.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Envie um array codPessoas com pelo menos um código.",
      });
    }

    const codigos = codPessoas.slice(0, 200).map(Number).filter(Boolean);
    const todosContratos = [];
    const erros = [];

    const BATCH_SIZE = 5;
    for (let i = 0; i < codigos.length; i += BATCH_SIZE) {
      const batch = codigos.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (codPessoa) => {
        try {
          const cached = await getCachedContratos(codPessoa);
          if (cached) return { codPessoa, contratos: cached, source: "cache" };

          const contratos = await fetchContratosPessoa(codPessoa, apiKey);
          setCachedContratos(codPessoa, contratos).catch(() => {});
          return { codPessoa, contratos, source: "api" };
        } catch (err) {
          erros.push({ codPessoa, error: err.message, status: err.response?.status });
          return { codPessoa, contratos: [], source: "error" };
        }
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        for (const c of r.contratos) {
          todosContratos.push({ ...c, _codPessoa: r.codPessoa, _source: r.source });
        }
      }
    }

    return res.status(200).json({
      success: true,
      totalContratos: todosContratos.length,
      totalPessoas: codigos.length,
      erros: erros.length > 0 ? erros : undefined,
      contratos: todosContratos,
    });
  } catch (err) {
    console.error("Erro geral no proxy PACTO:", err);
    return res.status(500).json({ success: false, error: "Erro interno: " + err.message });
  }
});

/**
 * POST /indice-renovacao
 * Proxy direto para v2-indice-renovacao da PACTO.
 */
app.post("/indice-renovacao", async (req, res) => {
  try {
    const apiKey = getPactoApiKey();
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "Chave da API PACTO não configurada." });
    }

    const { empresa, colaboradores, dataInicial, dataFinal, retornarContratos, desconsiderarContratosRenovaveis } = req.body;

    const response = await axios.post(
      `${PACTO_BASE_URL}/v2-indice-renovacao`,
      {
        empresa: empresa || 1,
        colaboradores: colaboradores || [0],
        dataInicial,
        dataFinal,
        retornarContratos: retornarContratos ?? false,
        desconsiderarContratosRenovaveis: desconsiderarContratosRenovaveis ?? false,
        token: apiKey,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 30000,
      }
    );

    return res.status(200).json({ success: true, data: response.data });
  } catch (err) {
    console.error("Erro no índice de renovação PACTO:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /invalidar-cache
 * Limpa o cache de mapeamento e/ou contratos.
 * Body: { tipo: "mapping" | "contratos" | "tudo" }
 */
app.post("/invalidar-cache", async (req, res) => {
  try {
    const { tipo = "tudo" } = req.body;
    const deleted = [];

    const snap = await db.collection(CACHE_COLLECTION).get();
    for (const doc of snap.docs) {
      if (tipo === "tudo") {
        await doc.ref.delete();
        deleted.push(doc.id);
      } else if (tipo === "mapping" && doc.id.startsWith("mapping_")) {
        await doc.ref.delete();
        deleted.push(doc.id);
      } else if (tipo === "contratos" && doc.id.startsWith("pessoa_")) {
        await doc.ref.delete();
        deleted.push(doc.id);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Cache invalidado: ${deleted.length} documentos removidos`,
      deleted,
    });
  } catch (err) {
    console.error("Erro ao invalidar cache:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = app;
