// src/pages/PactoDebug.jsx — Página temporária para diagnosticar integração PACTO
import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useVendas } from "../hooks/useVendas";
import NavBar from "../components/NavBar";

const PACTO_PROXY_URL =
  "https://southamerica-east1-chatpos-aff1a.cloudfunctions.net/pactoProxy";

export default function PactoDebug() {
  const { unidade } = useParams();

  const { vendasOriginais, loading: vendasLoading } = useVendas(unidade, [], {
    groupPlans: false,
    deriveMetrics: false,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customMatriculas, setCustomMatriculas] = useState("");
  const [expandedContratos, setExpandedContratos] = useState(new Set());

  // Extrai matrículas únicas das vendas
  const matriculasFromVendas = useMemo(() => {
    if (!vendasOriginais || vendasOriginais.length === 0) return [];
    return [
      ...new Set(
        vendasOriginais
          .map((v) => v.matricula)
          .filter(Boolean)
          .map((m) => String(m).replace(/\D/g, ""))
          .filter((m) => m && m !== "000000")
      ),
    ].sort();
  }, [vendasOriginais]);

  const handleFetch = async (matriculas) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${PACTO_PROXY_URL}/contratos-por-matricula`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matriculas, empresa: 1 }),
      });

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        setError(`Resposta não é JSON (status ${res.status}): ${text.slice(0, 500)}`);
        return;
      }

      if (!res.ok) {
        setError(`HTTP ${res.status}: ${json.error || JSON.stringify(json)}`);
        return;
      }

      setResult(json);
    } catch (err) {
      setError(`Erro de rede: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFromVendas = () => {
    if (matriculasFromVendas.length === 0) return;
    handleFetch(matriculasFromVendas);
  };

  const handleFetchCustom = () => {
    const mats = customMatriculas
      .split(/[\n,;]+/)
      .map((m) => m.trim())
      .filter(Boolean);
    if (mats.length === 0) return;
    handleFetch(mats);
  };

  const handleTestMapping = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${PACTO_PROXY_URL}/indice-renovacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: 1,
          colaboradores: [0],
          dataInicial: Date.now() - 180 * 24 * 60 * 60 * 1000,
          dataFinal: Date.now(),
          retornarContratos: false,
          desconsiderarContratosRenovaveis: false,
        }),
      });

      const json = await res.json();
      setResult({ _endpoint: "indice-renovacao", ...json });
    } catch (err) {
      setError(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateCache = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${PACTO_PROXY_URL}/invalidar-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "tudo" }),
      });
      const json = await res.json();
      setResult({ _endpoint: "invalidar-cache", ...json });
    } catch (err) {
      setError(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleContrato = (idx) => {
    setExpandedContratos((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
    
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          🔍 PACTO Debug — {unidade}
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 24 }}>
          Página temporária para diagnosticar a integração com a API PACTO.
        </p>

        {/* Status das vendas */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>📦 Vendas Locais</h3>
          {vendasLoading ? (
            <p>Carregando vendas...</p>
          ) : (
            <div>
              <p><strong>{vendasOriginais?.length || 0}</strong> vendas carregadas</p>
              <p><strong>{matriculasFromVendas.length}</strong> matrículas únicas extraídas</p>
              {matriculasFromVendas.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", color: "#60a5fa" }}>
                    Ver matrículas ({matriculasFromVendas.length})
                  </summary>
                  <pre style={preStyle}>
                    {matriculasFromVendas.join("\n")}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>⚡ Ações</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              style={btnStyle("#2563eb")}
              onClick={handleFetchFromVendas}
              disabled={loading || matriculasFromVendas.length === 0}
            >
              {loading ? "Buscando..." : `Buscar contratos (${matriculasFromVendas.length} matrículas)`}
            </button>

            <button
              style={btnStyle("#7c3aed")}
              onClick={handleTestMapping}
              disabled={loading}
            >
              Testar índice-renovação (raw)
            </button>

            <button
              style={btnStyle("#dc2626")}
              onClick={handleInvalidateCache}
              disabled={loading}
            >
              Limpar cache
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: 13 }}>
              Matrículas customizadas (uma por linha ou separadas por vírgula):
            </label>
            <textarea
              value={customMatriculas}
              onChange={(e) => setCustomMatriculas(e.target.value)}
              placeholder="037736&#10;024646&#10;033950"
              rows={4}
              style={inputStyle}
            />
            <button
              style={{ ...btnStyle("#059669"), marginTop: 8 }}
              onClick={handleFetchCustom}
              disabled={loading || !customMatriculas.trim()}
            >
              Buscar com matrículas customizadas
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div style={{ ...cardStyle, background: "#450a0a", borderColor: "#dc2626" }}>
            <h3 style={{ ...sectionTitle, color: "#fca5a5" }}>❌ Erro</h3>
            <pre style={{ ...preStyle, color: "#fca5a5" }}>{error}</pre>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div style={cardStyle}>
            <h3 style={sectionTitle}>📊 Resultado</h3>

            {/* Stats resumidas */}
            {result.success !== undefined && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                <Stat label="Success" value={String(result.success)} color={result.success ? "#10b981" : "#ef4444"} />
                {result.totalContratos !== undefined && <Stat label="Contratos" value={result.totalContratos} />}
                {result.totalMatriculasEnviadas !== undefined && <Stat label="Matrículas Enviadas" value={result.totalMatriculasEnviadas} />}
                {result.totalMapeadas !== undefined && <Stat label="Mapeadas" value={result.totalMapeadas} color="#10b981" />}
                {result.totalSemMapeamento !== undefined && <Stat label="Sem Mapeamento" value={result.totalSemMapeamento} color="#f59e0b" />}
              </div>
            )}

            {/* Erros do backend */}
            {result.erros && result.erros.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: "#fca5a5", marginBottom: 8 }}>Erros por código:</h4>
                <pre style={preStyle}>{JSON.stringify(result.erros, null, 2)}</pre>
              </div>
            )}

            {/* Lista de contratos */}
            {result.contratos && result.contratos.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 8 }}>Contratos ({result.contratos.length}):</h4>
                <div style={{ maxHeight: 500, overflowY: "auto" }}>
                  {result.contratos.slice(0, 100).map((c, idx) => (
                    <div key={idx} style={contratoRowStyle} onClick={() => toggleContrato(idx)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>
                          <strong>#{c.codigo || c.numeroContrato || idx}</strong>{" "}
                          — {c.pessoaDTO?.nome || c.nome || "?"}{" "}
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>
                            (mat: {c._matriculasAssociadas?.join(", ") || c.pessoaDTO?.matriculaCliente || "?"})
                          </span>
                        </span>
                        <span style={{ fontSize: 12, color: "#60a5fa" }}>
                          {c.tipo || c.situacao || ""} | {c.vigenciaDe?.slice(0, 10) || ""} → {(c.vigenciaAteAjustada || c.vigenciaAte || "")?.slice(0, 10)}
                        </span>
                      </div>
                      {expandedContratos.has(idx) && (
                        <pre style={{ ...preStyle, marginTop: 8, fontSize: 11 }}>
                          {JSON.stringify(c, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                  {result.contratos.length > 100 && (
                    <p style={{ color: "#94a3b8", textAlign: "center", padding: 12 }}>
                      ... e mais {result.contratos.length - 100} contratos (mostrando 100)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* JSON completo */}
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", color: "#60a5fa" }}>
                Ver JSON completo da resposta
              </summary>
              <pre style={{ ...preStyle, maxHeight: 600, overflow: "auto", fontSize: 11 }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color = "#e2e8f0" }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 16px", minWidth: 100 }}>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const cardStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const sectionTitle = { fontSize: 16, fontWeight: 600, marginBottom: 12 };

const preStyle = {
  background: "#0f172a",
  borderRadius: 8,
  padding: 12,
  fontSize: 12,
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
};

const btnStyle = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
});

const inputStyle = {
  width: "100%",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: 12,
  color: "#e2e8f0",
  fontFamily: "monospace",
  fontSize: 13,
  resize: "vertical",
};

const contratoRowStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "10px 14px",
  marginBottom: 6,
  cursor: "pointer",
  fontSize: 13,
};
