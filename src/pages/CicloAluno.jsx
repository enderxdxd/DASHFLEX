// @refresh reset
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import {
  RefreshCw, UserPlus, RotateCcw, Repeat, Search,
  ChevronLeft, ChevronRight, X, Hash, Percent, Users,
  TrendingUp, CircleDollarSign, Database, Loader2, AlertTriangle, ListChecks,
  Check, Pencil, Activity
} from "lucide-react";
import NavBar from "../components/NavBar";
import MonthSelector from "../components/dashboard/MonthSelector";
import Loading3D from "../components/ui/Loading3D";
import { db } from "../firebase";
import { useVendas } from "../hooks/useVendas";
import { useMetas } from "../hooks/useMetas";
import { useGlobalProdutos } from "../hooks/useGlobalProdutos";
import { useStudentLifecycle } from "../hooks/useStudentLifecycle";
import { usePactoContratos } from "../hooks/usePactoContratos";

dayjs.locale("pt-br");

const ITEMS_PER_PAGE = 15;

const CLASSIFICACAO_CONFIG = {
  matricula: { label: "Matrícula", icon: UserPlus, accent: "#10b981" },
  rematricula: { label: "Rematrícula", icon: RotateCcw, accent: "#f59e0b" },
  renovacao: { label: "Renovação", icon: Repeat, accent: "#6366f1" },
};

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;
const formatCurrency = (value) =>
  `R$ ${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const normalizeConsultorKey = (value = "") =>
  String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

function CicloAluno() {
  const { unidade } = useParams();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem("selectedMonth");
    return saved || dayjs().format("YYYY-MM");
  });

  useEffect(() => {
    localStorage.setItem("selectedMonth", selectedMonth);
  }, [selectedMonth]);

  const {
    vendasOriginais,
    loading: vendasLoading,
    refreshVendas,
  } = useVendas(unidade, [], { groupPlans: false, deriveMetrics: false });

  const { metas, loading: metasLoading, refreshMetas } = useMetas(unidade);
  const { produtosSelecionados, loaded: produtosLoaded } = useGlobalProdutos();

  // Integração PACTO: busca contratos históricos
  const {
    contratos: contratosPacto,
    loading: pactoLoading,
    error: pactoError,
    enabled: pactoEnabled,
    setEnabled: setPactoEnabled,
    refresh: refreshPacto,
    stats: pactoStats,
  } = usePactoContratos({ vendas: vendasOriginais });

  const responsaveisOficiais = useMemo(() => {
    const metasDoMes = metas.filter((m) => m.periodo === selectedMonth);
    return [...new Set(metasDoMes.map((m) => (m.responsavel || "").trim().toLowerCase()))];
  }, [metas, selectedMonth]);

  const { resumo, eventosDetalhados } = useStudentLifecycle({
    vendasOriginais,
    unidade,
    selectedMonth,
    responsaveisOficiais,
    produtosSelecionados,
    contratosPacto: pactoEnabled ? contratosPacto : [],
  });

  // Mapa de metas do mês: nome consultor (lowercase) -> { id, metaRenovacoes, ... }
  const metasDoMesPorConsultor = useMemo(() => {
    const map = new Map();
    for (const m of metas) {
      if (m.periodo !== selectedMonth) continue;
      const key = normalizeConsultorKey(m.responsavel);
      if (!key) continue;
      map.set(key, m);
    }
    return map;
  }, [metas, selectedMonth]);

  // Estado de edição inline da meta de renovações
  const [editingRenovacao, setEditingRenovacao] = useState(null); // consultor key (lowercase)
  const [editingRenovacaoValue, setEditingRenovacaoValue] = useState("");
  const [savingRenovacao, setSavingRenovacao] = useState(false);

  const handleStartEditRenovacao = useCallback((consultorKey, currentValue) => {
    setEditingRenovacao(consultorKey);
    setEditingRenovacaoValue(currentValue ? String(currentValue) : "");
  }, []);

  const handleCancelEditRenovacao = useCallback(() => {
    setEditingRenovacao(null);
    setEditingRenovacaoValue("");
  }, []);

  const handleSaveRenovacao = useCallback(async (consultorKey, consultorNome) => {
    if (!unidade || savingRenovacao) return;
    const parsed = Math.max(0, Math.floor(Number(editingRenovacaoValue) || 0));
    setSavingRenovacao(true);
    try {
      const metaExistente = metasDoMesPorConsultor.get(consultorKey);
      if (metaExistente?.id) {
        await updateDoc(
          doc(db, "faturamento", unidade.toLowerCase(), "metas", metaExistente.id),
          { metaRenovacoes: parsed }
        );
      } else {
        // Cria doc mínimo só com a meta de renovações (mantém compat com Metas.jsx)
        await addDoc(
          collection(db, "faturamento", unidade.toLowerCase(), "metas"),
          {
            responsavel: consultorNome,
            periodo: selectedMonth,
            remuneracaoType: "comissao",
            meta: 0,
            metaRenovacoes: parsed,
            createdAt: dayjs().toISOString(),
          }
        );
      }
      await refreshMetas();
      setEditingRenovacao(null);
      setEditingRenovacaoValue("");
    } catch (err) {
      console.error("Erro ao salvar meta de renovações:", err);
    } finally {
      setSavingRenovacao(false);
    }
  }, [editingRenovacaoValue, metasDoMesPorConsultor, refreshMetas, savingRenovacao, selectedMonth, unidade]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtroClassificacao, setFiltroClassificacao] = useState("todos");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showPercentBoard, setShowPercentBoard] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroClassificacao, filtroResponsavel, selectedMonth]);

  const eventosFiltrados = useMemo(() => {
    return eventosDetalhados.filter((ev) => {
      if (filtroClassificacao !== "todos" && ev.classificacao !== filtroClassificacao) return false;
      if (filtroResponsavel) {
        const resp = (ev.responsavel || "").toLowerCase();
        if (!resp.includes(filtroResponsavel.toLowerCase())) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const haystack = [ev.matricula, ev.nome, ev.responsavel, ev.classificacao, ev.motivoClassificacao]
          .join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [eventosDetalhados, filtroClassificacao, filtroResponsavel, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(eventosFiltrados.length / ITEMS_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return eventosFiltrados.slice(start, start + ITEMS_PER_PAGE);
  }, [eventosFiltrados, currentPage]);

  const rangeStart = eventosFiltrados.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, eventosFiltrados.length);

  const responsaveisDisponiveis = useMemo(() => {
    const set = new Set();
    for (const ev of eventosDetalhados) {
      if (ev.responsavel) set.add(ev.responsavel.trim());
    }
    return Array.from(set).sort();
  }, [eventosDetalhados]);

  const quadroPercentual = useMemo(() => {
    const totalPlanos = eventosDetalhados.length;
    const valorTotal = eventosDetalhados.reduce((acc, ev) => acc + Number(ev.valor || 0), 0);
    const porConsultor = new Map();

    for (const ev of eventosDetalhados) {
      const responsavelOriginal = (ev.responsavel || "Sem consultor").trim() || "Sem consultor";
      const key = normalizeConsultorKey(responsavelOriginal);
      const atual = porConsultor.get(key) || {
        responsavel: responsavelOriginal,
        total: 0,
        valorTotal: 0,
        matricula: 0,
        rematricula: 0,
        renovacao: 0,
      };

      atual.total += 1;
      atual.valorTotal += Number(ev.valor || 0);
      atual[ev.classificacao] += 1;
      porConsultor.set(key, atual);
    }

    // Inclui consultores que têm meta de renovações cadastrada no mês mesmo
    // que ainda não tenham fechado nada — pra eles aparecerem na lista.
    for (const m of metasDoMesPorConsultor.values()) {
      const responsavel = (m.responsavel || "").trim();
      if (!responsavel) continue;
      const meta = Number(m.metaRenovacoes || 0);
      if (meta <= 0) continue;
      const key = normalizeConsultorKey(responsavel);
      if (!porConsultor.has(key)) {
        porConsultor.set(key, {
          responsavel,
          total: 0,
          valorTotal: 0,
          matricula: 0,
          rematricula: 0,
          renovacao: 0,
        });
      }
    }

    let totalMetaRenovacoes = 0;

    const consultores = Array.from(porConsultor.values())
      .map((item) => {
        const consultorKey = normalizeConsultorKey(item.responsavel);
        const metaDoc = metasDoMesPorConsultor.get(consultorKey);
        const metaRenovacoes = Number(metaDoc?.metaRenovacoes || 0);
        totalMetaRenovacoes += metaRenovacoes;
        const conversaoRenovacaoPct =
          metaRenovacoes > 0 ? (item.renovacao / metaRenovacoes) * 100 : 0;
        return {
          ...item,
          consultorKey,
          metaDocId: metaDoc?.id || null,
          participacaoPct: totalPlanos > 0 ? (item.total / totalPlanos) * 100 : 0,
          matriculaPct: item.total > 0 ? (item.matricula / item.total) * 100 : 0,
          rematriculaPct: item.total > 0 ? (item.rematricula / item.total) * 100 : 0,
          renovacaoPct: item.total > 0 ? (item.renovacao / item.total) * 100 : 0,
          ticketMedio: item.total > 0 ? item.valorTotal / item.total : 0,
          metaRenovacoes,
          conversaoRenovacaoPct,
        };
      })
      .sort((a, b) => b.total - a.total || a.responsavel.localeCompare(b.responsavel, "pt-BR"));

    return {
      totalPlanos,
      valorTotal,
      consultoresAtivos: consultores.length,
      ticketMedio: totalPlanos > 0 ? valorTotal / totalPlanos : 0,
      consultores,
      topParticipacao: [...consultores].slice(0, 5),
      topRenovacao: [...consultores]
        .sort((a, b) => b.renovacaoPct - a.renovacaoPct || b.total - a.total)
        .slice(0, 5),
      totalMetaRenovacoes,
      consultoresComMetaRenovacao: [...consultores]
        .sort((a, b) => b.metaRenovacoes - a.metaRenovacoes || a.responsavel.localeCompare(b.responsavel, "pt-BR")),
    };
  }, [eventosDetalhados, metasDoMesPorConsultor]);

  const mixPercentual = [
    {
      key: "matricula",
      label: "Matrícula",
      total: resumo.matriculas,
      percentual: resumo.percentualMatriculas,
      accent: CLASSIFICACAO_CONFIG.matricula.accent,
    },
    {
      key: "rematricula",
      label: "Rematrícula",
      total: resumo.rematriculas,
      percentual: resumo.percentualRematriculas,
      accent: CLASSIFICACAO_CONFIG.rematricula.accent,
    },
    {
      key: "renovacao",
      label: "Renovação",
      total: resumo.renovacoes,
      percentual: resumo.percentualRenovacoes,
      accent: CLASSIFICACAO_CONFIG.renovacao.accent,
    },
  ];

  const handleRefresh = useCallback(async () => {
    await refreshVendas();
  }, [refreshVendas]);

  const hasActiveFilters = searchTerm || filtroClassificacao !== "todos" || filtroResponsavel;

  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setFiltroClassificacao("todos");
    setFiltroResponsavel("");
  }, []);

  useEffect(() => {
    if (!showPercentBoard) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowPercentBoard(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showPercentBoard]);

  const handleCardKeyDown = useCallback((e, key) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFiltroClassificacao((prev) => (prev === key ? "todos" : key));
    }
  }, []);

  const loading = vendasLoading || metasLoading || !produtosLoaded;

  if (loading) {
    return (
      <div className="ca-loading">
        <Loading3D size={120} />
      </div>
    );
  }

  const formattedMonth = dayjs(`${selectedMonth}-01`).format("MMMM [de] YYYY");

  return (
    <div className="ca-layout">
      <aside className="ca-sidebar">
        <div className="ca-sidebar-hdr"><h2>GestãoApp</h2></div>
        <NavBar />
      </aside>

      <main className="ca-main">
        {/* ── Header ── */}
        <header className="ca-hdr">
          <div className="ca-hdr-left">
            <div className="ca-hdr-badge"><Activity size={20} strokeWidth={2.2} /></div>
            <div className="ca-hdr-titles">
              <span className="ca-unit-tag">{(unidade || "").toUpperCase()}</span>
              <h1 className="ca-page-title">Ciclo do Aluno</h1>
              <p className="ca-page-sub">{formattedMonth}</p>
            </div>
          </div>
          <div className="ca-hdr-right">
            <button onClick={handleRefresh} disabled={loading} className="ca-btn-refresh" aria-label="Atualizar dados">
              <RefreshCw size={14} style={{ animation: loading ? "spin .8s linear infinite" : "none" }} />
              Atualizar
            </button>
            <button
              type="button"
              className={`ca-btn-board-toggle ${showPercentBoard ? "active" : ""}`}
              onClick={() => setShowPercentBoard((prev) => !prev)}
              aria-pressed={showPercentBoard}
              aria-label="Abrir quadro percentual"
            >
              <Percent size={14} />
              Quadro %
            </button>
            <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          </div>
        </header>

        {/* ── PACTO Integration Badge ── */}
        <div className="ca-pacto-bar">
          <button
            type="button"
            className={`ca-pacto-toggle ${pactoEnabled ? "on" : ""}`}
            onClick={() => setPactoEnabled((p) => !p)}
            aria-pressed={pactoEnabled}
            title={pactoEnabled ? "Desabilitar dados PACTO" : "Habilitar dados PACTO"}
          >
            <Database size={13} />
            <span>PACTO</span>
            <span className={`ca-pacto-dot ${pactoEnabled ? "on" : ""}`} />
          </button>
          {pactoEnabled && (
            <>
              {pactoLoading && (
                <span className="ca-pacto-status loading">
                  <Loader2 size={12} className="ca-spin" /> Buscando contratos...
                </span>
              )}
              {!pactoLoading && !pactoError && contratosPacto.length > 0 && (
                <span className="ca-pacto-status ok">
                  {pactoStats.totalContratos} contratos de {pactoStats.pessoasUnicas} alunos
                </span>
              )}
              {!pactoLoading && !pactoError && contratosPacto.length === 0 && (
                <span className="ca-pacto-status empty">Nenhum contrato encontrado</span>
              )}
              {pactoError && (
                <span className="ca-pacto-status error">
                  <AlertTriangle size={12} /> {pactoError}
                </span>
              )}
              <button type="button" className="ca-pacto-refresh" onClick={refreshPacto} disabled={pactoLoading} aria-label="Recarregar PACTO">
                <RefreshCw size={12} />
              </button>
            </>
          )}
        </div>

        {/* ── Cards ── */}
        <div className="ca-cards">
          {Object.entries(CLASSIFICACAO_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const count = resumo[key === "matricula" ? "matriculas" : key === "rematricula" ? "rematriculas" : "renovacoes"];
            const pct = resumo[key === "matricula" ? "percentualMatriculas" : key === "rematricula" ? "percentualRematriculas" : "percentualRenovacoes"];
            const isActive = filtroClassificacao === key;

            return (
              <div
                key={key}
                className={`ca-card ${isActive ? "active" : ""}`}
                onClick={() => setFiltroClassificacao(isActive ? "todos" : key)}
                onKeyDown={(e) => handleCardKeyDown(e, key)}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                style={{ "--card-accent": cfg.accent }}
              >
                <div className="ca-card-top">
                  <div className="ca-card-icon">
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                  <span className="ca-card-pct">{pct.toFixed(1)}%</span>
                </div>
                <span className="ca-card-count">{count}</span>
                <span className="ca-card-label">{cfg.label}</span>
                <div className="ca-card-bar">
                  <div className="ca-card-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}

          <div className="ca-card ca-card-total">
            <div className="ca-card-top">
              <div className="ca-card-icon"><Hash size={18} strokeWidth={2.2} /></div>
              <span className="ca-card-total-badge">Mix do mês</span>
            </div>
            <span className="ca-card-count">{resumo.totalEventosClassificados}</span>
            <span className="ca-card-label">Eventos classificados</span>
            <div className="ca-card-stack" role="img" aria-label="Composição do mix de eventos">
              {mixPercentual.map((m) => (
                m.percentual > 0 ? (
                  <div
                    key={m.key}
                    className="ca-card-stack-seg"
                    style={{ width: `${m.percentual}%`, background: m.accent }}
                    title={`${m.label}: ${m.percentual.toFixed(1)}% (${m.total})`}
                  />
                ) : null
              ))}
            </div>
          </div>
        </div>

        {/* ── Filters + Table ── */}
        <div className="ca-snapshot">
          <div className="ca-snapshot-pill">
            <Users size={14} />
            <span><strong>{quadroPercentual.consultoresAtivos}</strong> consultor{quadroPercentual.consultoresAtivos !== 1 ? "es" : ""} ativos</span>
          </div>
          <div className="ca-snapshot-pill">
            <TrendingUp size={14} />
            <span><strong>{quadroPercentual.totalPlanos}</strong> planos classificados no mês</span>
          </div>
          <div className="ca-snapshot-pill">
            <CircleDollarSign size={14} />
            <span>Ticket médio <strong>{formatCurrency(quadroPercentual.ticketMedio)}</strong></span>
          </div>
          <div className="ca-snapshot-pill ca-snapshot-pill-accent" title="Soma das metas de renovação definidas para o time no mês">
            <ListChecks size={14} />
            <span>
              Meta time: {quadroPercentual.totalMetaRenovacoes} renovaç{quadroPercentual.totalMetaRenovacoes === 1 ? "ão" : "ões"}
            </span>
          </div>
          <button type="button" className="ca-snapshot-cta" onClick={() => setShowPercentBoard(true)}>
            Ver quadro em %
          </button>
        </div>

        <div className="ca-panel">
          {/* Toolbar */}
          <div className="ca-toolbar">
            <div className="ca-search-box">
              <Search size={15} />
              <input
                type="text"
                placeholder="Buscar matrícula, nome ou consultor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar eventos"
              />
              {searchTerm && (
                <button className="ca-search-x" onClick={() => setSearchTerm("")} aria-label="Limpar busca">
                  <X size={13} />
                </button>
              )}
            </div>

            <select className="ca-sel" value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)} aria-label="Consultor">
              <option value="">Consultor</option>
              {responsaveisDisponiveis.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>

            <select className="ca-sel" value={filtroClassificacao} onChange={(e) => setFiltroClassificacao(e.target.value)} aria-label="Classificação">
              <option value="todos">Classificação</option>
              <option value="matricula">Matrícula</option>
              <option value="rematricula">Rematrícula</option>
              <option value="renovacao">Renovação</option>
            </select>

            {hasActiveFilters && (
              <button className="ca-btn-clear" onClick={clearAllFilters}>
                <X size={13} /> Limpar
              </button>
            )}

            <span className="ca-count">{eventosFiltrados.length} resultado{eventosFiltrados.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Table */}
          {eventosFiltrados.length === 0 ? (
            <div className="ca-empty">
              <p className="ca-empty-t">Nenhum evento encontrado</p>
              <p className="ca-empty-d">
                {hasActiveFilters ? "Ajuste os filtros para ver resultados." : "Sem eventos de plano para este mês."}
              </p>
              {hasActiveFilters && <button className="ca-empty-btn" onClick={clearAllFilters}>Limpar filtros</button>}
            </div>
          ) : (
            <>
              <div className="ca-table-wrap">
                <table className="ca-tbl">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Matrícula</th>
                      <th>Nome</th>
                      <th>Consultor</th>
                      <th>Início Novo Plano</th>
                      <th>Fim Anterior</th>
                      <th>Inativo</th>
                      <th>Valor</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEvents.map((ev, i) => {
                      const cfg = CLASSIFICACAO_CONFIG[ev.classificacao] || {};
                      return (
                        <tr key={`${ev.matricula}-${ev.dataInicioNovoPlano}-${i}`}>
                          <td>
                            <span className="ca-tag" style={{ "--tag-c": cfg.accent || "var(--text-secondary)" }}>
                              {cfg.label || ev.classificacao}
                            </span>
                          </td>
                          <td className="ca-mono">{ev.matricula}</td>
                          <td className="ca-name">{ev.nome || "—"}</td>
                          <td>{ev.responsavel || "—"}</td>
                          <td className="ca-mono">{ev.dataInicioNovoPlano ? dayjs(ev.dataInicioNovoPlano).format("DD/MM/YYYY") : "—"}</td>
                          <td className="ca-mono">{ev.dataFimAnterior ? dayjs(ev.dataFimAnterior).format("DD/MM/YYYY") : "—"}</td>
                          <td className="ca-center">
                            {ev.diasInativo !== null && ev.diasInativo !== undefined ? (
                              <span className={`ca-dias ${ev.diasInativo <= 30 ? "g" : ev.diasInativo < 180 ? "y" : "r"}`}>
                                {ev.diasInativo}d
                              </span>
                            ) : "—"}
                          </td>
                          <td className="ca-mono">
                            {ev.valor ? `R$ ${Number(ev.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                          <td className="ca-motivo" title={ev.motivoClassificacao || ""}>{ev.motivoClassificacao || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="ca-pag">
                  <span className="ca-pag-range">{rangeStart}–{rangeEnd} de {eventosFiltrados.length}</span>
                  <div className="ca-pag-ctrls">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="ca-pag-btn" aria-label="Anterior">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="ca-pag-info">{currentPage}/{totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="ca-pag-btn" aria-label="Próximo">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showPercentBoard && (
        <div
          className="ca-board-overlay"
          onClick={() => setShowPercentBoard(false)}
          role="presentation"
        >
          <aside
            className="ca-board"
            role="dialog"
            aria-modal="true"
            aria-label="Quadro em porcentagem"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ca-board-head">
              <div>
                <span className="ca-board-kicker">Quadro em %</span>
                <h2>Leitura percentual do ciclo</h2>
                <p>
                  Base do mês: {quadroPercentual.totalPlanos} planos classificados em {formattedMonth}.
                </p>
              </div>
              <button type="button" className="ca-board-close" onClick={() => setShowPercentBoard(false)} aria-label="Fechar painel">
                <X size={16} />
              </button>
            </div>

            <div className="ca-board-body">
              <section className="ca-board-hero">
                <div className="ca-board-stat">
                  <span className="ca-board-stat-label">Consultores ativos</span>
                  <strong>{quadroPercentual.consultoresAtivos}</strong>
                </div>
                <div className="ca-board-stat">
                  <span className="ca-board-stat-label">Ticket médio</span>
                  <strong>{formatCurrency(quadroPercentual.ticketMedio)}</strong>
                </div>
                <div className="ca-board-stat">
                  <span className="ca-board-stat-label">Volume da base</span>
                  <strong>{formatCurrency(quadroPercentual.valorTotal)}</strong>
                </div>
              </section>

              <section className="ca-board-section">
                <div className="ca-board-section-hdr">
                  <ListChecks size={15} />
                  <div>
                    <h3>Meta de renovações do mês</h3>
                    <p>
                      Defina quantas renovações cada consultor tem que fechar no mês
                      (a quantidade da lista deles). O sistema acompanha a conversão.
                    </p>
                  </div>
                </div>
                {quadroPercentual.consultores.length === 0 ? (
                  <p className="ca-board-empty">
                    Nenhum consultor ativo encontrado neste mês.
                  </p>
                ) : (
                  <div className="ca-board-renlist">
                    <div className="ca-board-renlist-summary">
                      <div>
                        <span className="ca-board-renlist-kicker">Meta total</span>
                        <strong>{quadroPercentual.totalMetaRenovacoes}</strong>
                        <small>renovaç{quadroPercentual.totalMetaRenovacoes === 1 ? "ão" : "ões"} no time</small>
                      </div>
                      <div>
                        <span className="ca-board-renlist-kicker">Já fechadas</span>
                        <strong>{resumo.renovacoes}</strong>
                        <small>
                          {quadroPercentual.totalMetaRenovacoes > 0
                            ? `${formatPercent((resumo.renovacoes / quadroPercentual.totalMetaRenovacoes) * 100)} da meta`
                            : "Defina as metas abaixo"}
                        </small>
                      </div>
                    </div>
                    <div className="ca-board-renlist-rows">
                      {quadroPercentual.consultoresComMetaRenovacao.map((item) => {
                        const isEditing = editingRenovacao === item.consultorKey;
                        const meta = item.metaRenovacoes;
                        const conv = Math.min(item.conversaoRenovacaoPct, 100);
                        const tone = meta === 0 ? "n" : conv >= 80 ? "g" : conv >= 50 ? "y" : "r";

                        return (
                          <div key={`ren-${item.responsavel}`} className="ca-board-renlist-row">
                            <div className="ca-board-renlist-meta">
                              <strong>{item.responsavel}</strong>
                              <small>
                                {meta > 0
                                  ? `${item.renovacao} de ${meta} fechada${item.renovacao === 1 ? "" : "s"}`
                                  : "Sem meta definida"}
                              </small>
                            </div>

                            <div className="ca-board-renlist-bar">
                              {meta > 0 && (
                                <div
                                  className={`ca-board-renlist-fill ${tone}`}
                                  style={{ width: `${Math.max(conv, 4)}%` }}
                                />
                              )}
                            </div>

                            {isEditing ? (
                              <form
                                className="ca-meta-edit"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleSaveRenovacao(item.consultorKey, item.responsavel);
                                }}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={editingRenovacaoValue}
                                  onChange={(e) => setEditingRenovacaoValue(e.target.value)}
                                  autoFocus
                                  className="ca-meta-input"
                                  aria-label={`Meta de renovações para ${item.responsavel}`}
                                  disabled={savingRenovacao}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      handleCancelEditRenovacao();
                                    }
                                  }}
                                />
                                <button
                                  type="submit"
                                  className="ca-meta-btn save"
                                  disabled={savingRenovacao}
                                  aria-label="Salvar meta"
                                >
                                  {savingRenovacao ? <Loader2 size={12} className="ca-spin" /> : <Check size={12} />}
                                </button>
                                <button
                                  type="button"
                                  className="ca-meta-btn cancel"
                                  onClick={handleCancelEditRenovacao}
                                  disabled={savingRenovacao}
                                  aria-label="Cancelar edição"
                                >
                                  <X size={12} />
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className={`ca-meta-display ${tone}`}
                                onClick={() => handleStartEditRenovacao(item.consultorKey, meta)}
                                title="Clique para editar a meta de renovações deste consultor"
                              >
                                <span className="ca-meta-display-value">
                                  {meta > 0 ? `${item.renovacao}/${meta}` : "Definir"}
                                </span>
                                <Pencil size={11} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className="ca-board-section">
                <div className="ca-board-section-hdr">
                  <Percent size={15} />
                  <div>
                    <h3>Mix do time</h3>
                    <p>Percentual de matrículas, rematrículas e renovações sobre o total de planos do mês.</p>
                  </div>
                </div>
                <div className="ca-board-mix">
                  {mixPercentual.map((item) => (
                    <article key={item.key} className="ca-board-mix-card" style={{ "--mix-accent": item.accent }}>
                      <span>{item.label}</span>
                      <strong>{formatPercent(item.percentual)}</strong>
                      <small>{item.total} plano{item.total !== 1 ? "s" : ""}</small>
                    </article>
                  ))}
                </div>
              </section>

              <section className="ca-board-section">
                <div className="ca-board-section-hdr">
                  <Users size={15} />
                  <div>
                    <h3>Participação no total</h3>
                    <p>Quanto cada consultor representa dentro do total de planos classificados da página.</p>
                  </div>
                </div>
                <div className="ca-board-rank">
                  {quadroPercentual.topParticipacao.map((item, index) => (
                    <div key={`part-${item.responsavel}`} className="ca-board-rank-row">
                      <div className="ca-board-rank-meta">
                        <span className="ca-board-rank-pos">{index + 1}</span>
                        <div>
                          <strong>{item.responsavel}</strong>
                          <small>{item.total} plano{item.total !== 1 ? "s" : ""}</small>
                        </div>
                      </div>
                      <div className="ca-board-rank-bar">
                        <div className="ca-board-rank-fill" style={{ width: `${Math.min(item.participacaoPct, 100)}%` }} />
                      </div>
                      <span className="ca-board-rank-value">{formatPercent(item.participacaoPct)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ca-board-section">
                <div className="ca-board-section-hdr">
                  <TrendingUp size={15} />
                  <div>
                    <h3>Taxa por consultor</h3>
                    <p>Mat% e Remat% usam o total de planos do consultor; Ren% usa a meta de renovações.</p>
                  </div>
                </div>
                <div className="ca-board-table-wrap">
                  <div className="ca-board-table">
                    <div className="ca-board-table-head">
                      <span>Consultor</span>
                      <span>Total</span>
                      <span>Part.</span>
                      <span>Mat%</span>
                      <span>Remat%</span>
                      <span>Ren%</span>
                      <span title="Fechadas / Meta de renovações do mês">Meta</span>
                    </div>
                    {quadroPercentual.consultores.map((item) => (
                      <div key={`mix-${item.consultorKey}`} className="ca-board-table-row">
                        <span className="ca-board-table-name">{item.responsavel}</span>
                        <span>{item.total}</span>
                        <span>{formatPercent(item.participacaoPct)}</span>
                        <span>{formatPercent(item.matriculaPct)}</span>
                        <span>{formatPercent(item.rematriculaPct)}</span>
                        <span>{formatPercent(item.conversaoRenovacaoPct)}</span>
                        <span className="ca-board-table-lista">
                          {item.metaRenovacoes > 0 ? (
                            <span title={`${item.renovacao} fechada${item.renovacao === 1 ? "" : "s"} de ${item.metaRenovacoes} na meta`}>
                              {item.renovacao}/{item.metaRenovacoes}
                            </span>
                          ) : (
                            <span className="ca-board-table-lista-empty">—</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <p className="ca-board-footnote">
                As porcentagens usam os eventos classificados desta página, respeitando mês, unidade e filtros globais de produto/consultores.
              </p>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        /* ===== LAYOUT ===== */
        .ca-loading{display:flex;align-items:center;justify-content:center;height:100vh;width:100vw;position:fixed;top:0;left:0;background:var(--background);z-index:9999}
        .ca-layout{display:flex;min-height:100vh;background:var(--background)}
        .ca-sidebar{width:260px;background:var(--card);border-right:1px solid var(--border);position:fixed;height:100vh;display:flex;flex-direction:column}
        .ca-sidebar-hdr{padding:1.25rem 1rem;border-bottom:1px solid var(--border)}
        .ca-sidebar-hdr h2{font-size:1rem;font-weight:600;color:var(--primary);margin:0}
        .ca-main{flex:1;margin-left:260px;padding:24px 32px;max-width:1400px}

        /* ===== HEADER ===== */
        .ca-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:16px;flex-wrap:wrap}
        .ca-hdr-left{display:flex;align-items:center;gap:14px}
        .ca-hdr-badge{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;flex-shrink:0;box-shadow:0 8px 20px color-mix(in srgb,var(--primary) 32%,transparent)}
        .ca-hdr-titles{display:flex;flex-direction:column;gap:2px}
        .ca-unit-tag{align-self:flex-start;background:color-mix(in srgb,var(--primary) 10%,transparent);color:var(--primary);padding:2px 9px;border-radius:6px;font-size:.62rem;font-weight:700;letter-spacing:.07em;margin-bottom:1px}
        .ca-page-title{font-size:1.4rem;font-weight:700;color:var(--text-primary);margin:0;line-height:1.2;letter-spacing:-.02em}
        .ca-page-sub{font-size:.78rem;color:var(--text-secondary);margin:0;text-transform:capitalize}
        .ca-hdr-right{display:flex;align-items:center;gap:10px}
        .ca-btn-refresh{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;background:var(--card);color:var(--text-primary);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:.78rem;font-weight:500;font-family:var(--font-sans);transition:all var(--transition-fast)}
        .ca-btn-refresh:hover:not(:disabled){border-color:var(--primary);color:var(--primary)}
        .ca-btn-refresh:disabled{opacity:.5;cursor:not-allowed}
        .ca-btn-board-toggle{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;border:1px solid transparent;border-radius:var(--radius-sm);cursor:pointer;font-size:.78rem;font-weight:600;font-family:var(--font-sans);transition:all var(--transition-fast);box-shadow:0 10px 24px rgba(15,23,42,.18)}
        .ca-btn-board-toggle:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(15,23,42,.22)}
        .ca-btn-board-toggle.active{background:linear-gradient(135deg,#1d4ed8,#312e81)}

        /* ===== CARDS ===== */
        .ca-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .ca-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;cursor:pointer;transition:transform var(--transition-fast),box-shadow var(--transition-fast),border-color var(--transition-fast);position:relative;overflow:hidden;user-select:none}
        .ca-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:var(--card-accent);opacity:0;transition:opacity var(--transition-fast)}
        .ca-card::after{content:'';position:absolute;inset:0;background:radial-gradient(130% 130% at 100% 0,color-mix(in srgb,var(--card-accent) 9%,transparent),transparent 55%);opacity:0;transition:opacity var(--transition-fast);pointer-events:none}
        .ca-card:hover{border-color:color-mix(in srgb,var(--card-accent) 40%,transparent);box-shadow:var(--shadow-md);transform:translateY(-2px)}
        .ca-card:hover::before,.ca-card:hover::after{opacity:1}
        .ca-card:active{transform:translateY(0) scale(.99)}
        .ca-card.active{border-color:var(--card-accent);box-shadow:0 0 0 1px var(--card-accent),var(--shadow-md)}
        .ca-card.active::before,.ca-card.active::after{opacity:1}
        .ca-card-total{cursor:default;--card-accent:var(--primary);background:linear-gradient(135deg,var(--card),color-mix(in srgb,var(--primary) 4%,var(--card)))}
        .ca-card-total::after{display:none}
        .ca-card-total:hover{transform:none;box-shadow:var(--shadow-sm);border-color:var(--border)}
        .ca-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .ca-card-icon{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--card-accent) 12%,transparent);color:var(--card-accent)}
        .ca-card-pct{font-size:.78rem;font-weight:600;color:var(--card-accent);font-variant-numeric:tabular-nums}
        .ca-card-count{font-size:1.75rem;font-weight:700;color:var(--text-primary);line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.02em;display:block}
        .ca-card-label{font-size:.72rem;color:var(--text-secondary);font-weight:500;letter-spacing:.02em;text-transform:uppercase;margin-top:2px;display:block}
        .ca-card-bar{height:3px;background:var(--border);border-radius:99px;margin-top:12px;overflow:hidden}
        .ca-card-bar-fill{height:100%;border-radius:99px;background:var(--card-accent);transition:width .5s cubic-bezier(.22,1,.36,1)}
        .ca-card-total-badge{font-size:.62rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-secondary);background:var(--background);border:1px solid var(--border);padding:3px 8px;border-radius:99px}
        .ca-card-stack{display:flex;gap:2px;height:6px;margin-top:12px;border-radius:99px;overflow:hidden;background:var(--border)}
        .ca-card-stack-seg{height:100%;transition:width .5s cubic-bezier(.22,1,.36,1)}
        .ca-card-stack-seg:first-child{border-radius:99px 0 0 99px}
        .ca-card-stack-seg:last-child{border-radius:0 99px 99px 0}

        /* ===== SNAPSHOT ===== */
        .ca-snapshot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 18px}
        .ca-snapshot-pill{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--text-secondary);font-size:.76rem;box-shadow:var(--shadow-sm);transition:border-color var(--transition-fast),box-shadow var(--transition-fast)}
        .ca-snapshot-pill:hover{border-color:color-mix(in srgb,var(--primary) 35%,var(--border));box-shadow:var(--shadow-md)}
        .ca-snapshot-pill strong{color:var(--text-primary);font-weight:700;font-variant-numeric:tabular-nums}
        .ca-snapshot-pill svg{color:var(--primary);flex-shrink:0}
        .ca-snapshot-cta{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;border:none;border-radius:999px;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;font-size:.76rem;font-weight:700;font-family:var(--font-sans);cursor:pointer;transition:transform var(--transition-fast),box-shadow var(--transition-fast);box-shadow:0 6px 16px color-mix(in srgb,var(--primary) 28%,transparent)}
        .ca-snapshot-cta:hover{transform:translateY(-1px);box-shadow:0 10px 24px color-mix(in srgb,var(--primary) 36%,transparent)}

        /* ===== PANEL (filters+table) ===== */
        .ca-panel{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm)}

        /* ===== TOOLBAR ===== */
        .ca-toolbar{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap}
        .ca-search-box{display:flex;align-items:center;gap:6px;padding:0 10px;height:34px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--background);flex:1;min-width:180px;max-width:300px;color:var(--text-secondary);transition:border-color var(--transition-fast)}
        .ca-search-box:focus-within{border-color:var(--primary)}
        .ca-search-box input{border:none;outline:none;background:transparent;flex:1;font-size:.78rem;color:var(--text-primary);font-family:var(--font-sans);min-width:0}
        .ca-search-box input::placeholder{color:var(--text-secondary);opacity:.6}
        .ca-search-x{display:flex;align-items:center;justify-content:center;width:18px;height:18px;border:none;border-radius:50%;background:var(--border);color:var(--text-secondary);cursor:pointer;padding:0;flex-shrink:0;transition:all var(--transition-fast)}
        .ca-search-x:hover{background:var(--text-secondary);color:var(--card)}
        .ca-sel{height:34px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--background);color:var(--text-primary);font-size:.78rem;font-family:var(--font-sans);cursor:pointer;outline:none;transition:border-color var(--transition-fast)}
        .ca-sel:focus{border-color:var(--primary)}
        .ca-btn-clear{display:inline-flex;align-items:center;gap:3px;height:34px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--background);color:var(--text-secondary);font-size:.72rem;font-family:var(--font-sans);cursor:pointer;transition:all var(--transition-fast)}
        .ca-btn-clear:hover{border-color:var(--danger);color:var(--danger)}
        .ca-count{font-size:.72rem;color:var(--text-secondary);margin-left:auto;font-variant-numeric:tabular-nums;white-space:nowrap}

        /* ===== TABLE ===== */
        .ca-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
        .ca-tbl{width:100%;border-collapse:collapse;font-size:.8rem}
        .ca-tbl thead{position:sticky;top:0;z-index:1}
        .ca-tbl th{padding:10px 14px;text-align:left;font-weight:600;color:var(--text-secondary);font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;background:var(--background);border-bottom:1px solid var(--border);white-space:nowrap}
        .ca-tbl td{padding:10px 14px;border-bottom:1px solid var(--border);color:var(--text-primary);vertical-align:middle}
        .ca-tbl tbody tr:last-child td{border-bottom:none}
        .ca-tbl tbody tr{transition:background .12s}
        .ca-tbl tbody tr:nth-child(even){background:color-mix(in srgb,var(--background) 55%,transparent)}
        .ca-tbl tbody tr:hover{background:var(--primary-light)}

        /* tag */
        .ca-tag{display:inline-block;padding:3px 9px;border-radius:99px;font-size:.67rem;font-weight:600;white-space:nowrap;color:var(--tag-c);background:color-mix(in srgb,var(--tag-c) 12%,transparent)}

        .ca-mono{font-variant-numeric:tabular-nums;font-family:var(--font-mono);font-size:.73rem}
        .ca-center{text-align:center}
        .ca-name{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ca-motivo{max-width:200px;font-size:.73rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

        /* dias badge */
        .ca-dias{display:inline-block;padding:2px 7px;border-radius:99px;font-size:.67rem;font-weight:600;font-variant-numeric:tabular-nums}
        .ca-dias.g{background:var(--success-light);color:var(--success)}
        .ca-dias.y{background:var(--warning-light);color:var(--warning)}
        .ca-dias.r{background:var(--error-light);color:var(--danger)}

        /* ===== EMPTY ===== */
        .ca-empty{padding:48px 24px;text-align:center}
        .ca-empty-t{font-size:.95rem;font-weight:600;color:var(--text-primary);margin:0 0 6px}
        .ca-empty-d{font-size:.82rem;color:var(--text-secondary);margin:0 0 16px}
        .ca-empty-btn{padding:7px 16px;border:1px solid var(--primary);border-radius:var(--radius-sm);background:transparent;color:var(--primary);font-size:.78rem;font-weight:500;font-family:var(--font-sans);cursor:pointer;transition:all var(--transition-fast)}
        .ca-empty-btn:hover{background:var(--primary);color:#fff}

        /* ===== PAGINATION ===== */
        .ca-pag{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid var(--border)}
        .ca-pag-range{font-size:.72rem;color:var(--text-secondary);font-variant-numeric:tabular-nums}
        .ca-pag-ctrls{display:flex;align-items:center;gap:6px}
        .ca-pag-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--card);color:var(--text-primary);cursor:pointer;transition:all var(--transition-fast)}
        .ca-pag-btn:hover:not(:disabled){border-color:var(--primary);color:var(--primary)}
        .ca-pag-btn:disabled{opacity:.3;cursor:not-allowed}
        .ca-pag-info{font-size:.78rem;color:var(--text-secondary);font-variant-numeric:tabular-nums;min-width:44px;text-align:center}

        /* ===== QUADRO EM % (modal centralizado) ===== */
        .ca-board-overlay{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.55);animation:ca-fade .18s ease}
        .ca-board{width:min(820px,100%);max-height:88vh;background:var(--card);border:1px solid var(--border);border-radius:20px;box-shadow:0 24px 70px rgba(15,23,42,.4);display:flex;flex-direction:column;overflow:hidden;animation:ca-pop .22s cubic-bezier(.22,1,.36,1)}
        .ca-board-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:22px 24px 18px;border-bottom:1px solid var(--border)}
        .ca-board-head h2{margin:5px 0;font-size:1.35rem;line-height:1.2;color:var(--text-primary);font-weight:700;letter-spacing:-.01em}
        .ca-board-head p{margin:0;font-size:.85rem;color:var(--text-secondary);max-width:430px;line-height:1.45}
        .ca-board-kicker{display:inline-block;padding:5px 11px;border-radius:999px;background:var(--primary-light);color:var(--primary);font-size:.7rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
        .ca-board-close{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--text-primary);cursor:pointer;flex-shrink:0;transition:all var(--transition-fast)}
        .ca-board-close:hover{border-color:var(--danger);color:var(--danger);background:var(--error-light)}
        .ca-board-body{display:flex;flex-direction:column;gap:18px;padding:20px 24px 26px;overflow-y:auto}
        .ca-board-hero{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .ca-board-stat{padding:15px 16px;border-radius:14px;background:var(--background);border:1px solid var(--border)}
        .ca-board-stat-label{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-secondary);font-weight:600;margin-bottom:8px}
        .ca-board-stat strong{font-size:1.3rem;line-height:1.15;color:var(--text-primary);font-weight:700;font-variant-numeric:tabular-nums}
        .ca-board-section{padding:18px;border-radius:16px;background:var(--background);border:1px solid var(--border)}
        .ca-board-section-hdr{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}
        .ca-board-section-hdr svg{margin-top:2px;color:var(--primary);flex-shrink:0}
        .ca-board-section-hdr h3{margin:0 0 4px;font-size:1.02rem;color:var(--text-primary);font-weight:700}
        .ca-board-section-hdr p{margin:0;font-size:.8rem;color:var(--text-secondary);line-height:1.5}

        /* mix do time (cards) */
        .ca-board-mix{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .ca-board-mix-card{padding:15px 16px;border-radius:14px;background:color-mix(in srgb,var(--mix-accent) 12%,var(--card));border:1px solid color-mix(in srgb,var(--mix-accent) 30%,var(--border));display:flex;flex-direction:column;gap:6px}
        .ca-board-mix-card span{font-size:.76rem;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:.03em}
        .ca-board-mix-card strong{font-size:1.6rem;line-height:1;color:var(--text-primary);font-weight:700;font-variant-numeric:tabular-nums}
        .ca-board-mix-card small{font-size:.76rem;color:var(--text-secondary);font-weight:500}

        /* participação no total (rank) */
        .ca-board-rank{display:flex;flex-direction:column;gap:12px}
        .ca-board-rank-row{display:grid;grid-template-columns:minmax(0,200px) 1fr auto;gap:14px;align-items:center}
        .ca-board-rank-meta{display:flex;align-items:center;gap:11px;min-width:0}
        .ca-board-rank-meta>div{min-width:0}
        .ca-board-rank-meta strong,.ca-board-table-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.86rem;color:var(--text-primary);font-weight:600}
        .ca-board-rank-meta small{font-size:.74rem;color:var(--text-secondary)}
        .ca-board-rank-pos{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:var(--primary-light);color:var(--primary);font-size:.76rem;font-weight:700;flex-shrink:0}
        .ca-board-rank-bar{height:10px;border-radius:999px;background:var(--border);overflow:hidden}
        .ca-board-rank-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--secondary),var(--primary))}
        .ca-board-rank-value{font-size:.85rem;font-weight:700;color:var(--text-primary);font-variant-numeric:tabular-nums;min-width:52px;text-align:right}

        /* taxa por consultor (tabela) */
        .ca-board-table-wrap{overflow-x:auto;margin:0 -4px;padding:0 4px}
        .ca-board-table{min-width:560px}
        .ca-board-table-head,.ca-board-table-row{display:grid;grid-template-columns:minmax(150px,1.5fr) repeat(5,minmax(52px,.8fr)) minmax(60px,.9fr);gap:10px;align-items:center}
        .ca-board-table-lista{font-weight:700;color:var(--text-primary)}
        .ca-board-table-lista-empty{color:var(--text-secondary);opacity:.55}
        .ca-board-table-head{padding:0 0 12px;border-bottom:1px solid var(--border);font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;color:var(--text-secondary);font-weight:700}
        .ca-board-table-row{padding:12px 0;border-bottom:1px solid var(--border);font-size:.84rem;color:var(--text-primary);font-variant-numeric:tabular-nums}
        .ca-board-table-row:last-child{border-bottom:none}
        .ca-board-table-name{font-weight:600}
        .ca-board-footnote{margin:0;font-size:.76rem;line-height:1.55;color:var(--text-secondary)}
        .ca-board-empty{margin:0;padding:16px;border-radius:12px;background:var(--card);border:1px dashed var(--border);font-size:.82rem;color:var(--text-secondary);text-align:center}

        @keyframes ca-fade{from{opacity:0}to{opacity:1}}
        @keyframes ca-pop{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}

        /* ===== LISTA DE RENOVAÇÕES ===== */
        .ca-snapshot-pill-accent{background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-color:#c7d2fe;color:#3730a3;font-weight:600}
        .ca-snapshot-pill-accent svg{color:#4338ca}
        .ca-board-renlist{display:flex;flex-direction:column;gap:16px}
        .ca-board-renlist-summary{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ca-board-renlist-summary>div{padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid var(--border);display:flex;flex-direction:column;gap:3px}
        .ca-board-renlist-kicker{font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-secondary);font-weight:700}
        .ca-board-renlist-summary strong{font-size:1.55rem;line-height:1.1;color:var(--text-primary);font-weight:700;font-variant-numeric:tabular-nums}
        .ca-board-renlist-summary small{font-size:.76rem;color:var(--text-secondary)}
        .ca-board-renlist-rows{display:flex;flex-direction:column;gap:10px}
        .ca-board-renlist-row{display:grid;grid-template-columns:minmax(0,180px) 1fr auto;gap:14px;align-items:center}
        .ca-board-renlist-meta{min-width:0;display:flex;flex-direction:column;gap:2px}
        .ca-board-renlist-meta strong{font-size:.86rem;color:var(--text-primary);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ca-board-renlist-meta small{font-size:.74rem;color:var(--text-secondary);font-variant-numeric:tabular-nums}
        .ca-board-renlist-bar{height:9px;border-radius:999px;background:var(--border);overflow:hidden}
        .ca-board-renlist-fill{height:100%;border-radius:999px;transition:width .4s cubic-bezier(.22,1,.36,1)}
        .ca-board-renlist-fill.g{background:linear-gradient(90deg,#34d399,#10b981)}
        .ca-board-renlist-fill.y{background:linear-gradient(90deg,#fbbf24,#f59e0b)}
        .ca-board-renlist-fill.r{background:linear-gradient(90deg,#fb7185,#ef4444)}

        /* edição inline da meta */
        .ca-meta-display{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--text-primary);font-size:.76rem;font-weight:700;font-variant-numeric:tabular-nums;font-family:var(--font-sans);cursor:pointer;transition:all var(--transition-fast);min-width:72px;justify-content:center}
        .ca-meta-display:hover{border-color:var(--primary);color:var(--primary);transform:translateY(-1px);box-shadow:0 4px 10px rgba(15,23,42,.08)}
        .ca-meta-display svg{opacity:.5;transition:opacity var(--transition-fast)}
        .ca-meta-display:hover svg{opacity:1}
        .ca-meta-display.g{border-color:#34d399;background:#ecfdf5;color:#059669}
        .ca-meta-display.y{border-color:#fbbf24;background:#fffbeb;color:#b45309}
        .ca-meta-display.r{border-color:#fb7185;background:#fef2f2;color:#dc2626}
        .ca-meta-display.n{border-style:dashed;color:var(--text-secondary)}
        .ca-meta-display.n:hover{color:var(--primary);border-color:var(--primary)}
        .ca-meta-display-value{line-height:1}
        .ca-meta-edit{display:inline-flex;align-items:center;gap:4px}
        .ca-meta-input{width:64px;height:28px;padding:0 8px;border:1px solid var(--primary);border-radius:6px;background:var(--card);color:var(--text-primary);font-size:.78rem;font-weight:600;font-variant-numeric:tabular-nums;font-family:var(--font-sans);outline:none;text-align:center}
        .ca-meta-input:focus{box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 18%,transparent)}
        .ca-meta-input::-webkit-outer-spin-button,.ca-meta-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .ca-meta-input[type=number]{-moz-appearance:textfield}
        .ca-meta-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;border-radius:6px;cursor:pointer;transition:all var(--transition-fast);padding:0}
        .ca-meta-btn:disabled{opacity:.5;cursor:not-allowed}
        .ca-meta-btn.save{background:#10b981;color:#fff}
        .ca-meta-btn.save:hover:not(:disabled){background:#059669}
        .ca-meta-btn.cancel{background:var(--background);color:var(--text-secondary);border:1px solid var(--border)}
        .ca-meta-btn.cancel:hover:not(:disabled){border-color:var(--danger);color:var(--danger)}

        /* ===== PACTO BAR ===== */
        .ca-pacto-bar{display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap}
        .ca-pacto-toggle{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--text-secondary);font-size:.72rem;font-weight:600;font-family:var(--font-sans);cursor:pointer;transition:all var(--transition-fast)}
        .ca-pacto-toggle:hover{border-color:var(--primary);color:var(--primary)}
        .ca-pacto-toggle.on{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 8%,var(--card));color:var(--primary)}
        .ca-pacto-dot{width:7px;height:7px;border-radius:50%;background:var(--border);transition:background var(--transition-fast)}
        .ca-pacto-dot.on{background:#10b981;box-shadow:0 0 6px rgba(16,185,129,.4)}
        .ca-pacto-status{display:inline-flex;align-items:center;gap:5px;font-size:.72rem;color:var(--text-secondary)}
        .ca-pacto-status.loading{color:var(--primary)}
        .ca-pacto-status.ok{color:#10b981}
        .ca-pacto-status.empty{color:var(--text-secondary);opacity:.7}
        .ca-pacto-status.error{color:var(--danger)}
        .ca-pacto-refresh{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--border);border-radius:50%;background:var(--card);color:var(--text-secondary);cursor:pointer;transition:all var(--transition-fast);padding:0}
        .ca-pacto-refresh:hover:not(:disabled){border-color:var(--primary);color:var(--primary)}
        .ca-pacto-refresh:disabled{opacity:.4;cursor:not-allowed}
        .ca-spin{animation:spin .8s linear infinite}

        /* ===== DARK MODE FIXES (hardcoded light tokens) ===== */
        .dark .ca-snapshot-pill-accent{background:linear-gradient(135deg,rgba(99,102,241,.16),rgba(79,70,229,.20));border-color:rgba(99,102,241,.34);color:#c7d2fe}
        .dark .ca-snapshot-pill-accent svg{color:#a5b4fc}
        .dark .ca-board-renlist-summary>div{background:linear-gradient(135deg,rgba(255,255,255,.03),rgba(99,102,241,.10))}
        .dark .ca-meta-display.g{border-color:rgba(16,185,129,.42);background:rgba(16,185,129,.14);color:#34d399}
        .dark .ca-meta-display.y{border-color:rgba(245,158,11,.42);background:rgba(245,158,11,.14);color:#fbbf24}
        .dark .ca-meta-display.r{border-color:rgba(239,68,68,.42);background:rgba(239,68,68,.14);color:#f87171}

        @keyframes spin{to{transform:rotate(360deg)}}

        @media(prefers-reduced-motion:reduce){
          .ca-card,.ca-btn-refresh,.ca-tbl tbody tr,.ca-pag-btn,.ca-card-bar-fill,.ca-btn-board-toggle,.ca-snapshot-cta,.ca-board{transition:none!important}
          .ca-card:hover,.ca-card:active{transform:none!important}
          .ca-board,.ca-board-overlay{animation:none!important}
        }

        /* ===== RESPONSIVE ===== */
        @media(max-width:1200px){.ca-cards{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){
          .ca-main{margin-left:0;padding:16px}
          .ca-sidebar{display:none}
          .ca-hdr{flex-direction:column;align-items:flex-start}
          .ca-hdr-right{width:100%;flex-wrap:wrap}
          .ca-btn-board-toggle{justify-content:center}
          .ca-cards{grid-template-columns:1fr 1fr}
          .ca-snapshot-cta{margin-left:0;width:100%}
          .ca-toolbar{flex-direction:column;align-items:stretch}
          .ca-search-box{max-width:100%}
          .ca-count{margin-left:0}
          .ca-pag{flex-direction:column;gap:8px}
          .ca-board-overlay{padding:12px}
          .ca-board{max-height:92vh}
          .ca-board-head{padding:18px 18px 14px}
          .ca-board-body{padding:16px 18px 20px}
          .ca-board-hero,.ca-board-mix{grid-template-columns:1fr}
          .ca-board-renlist-summary{grid-template-columns:1fr}
          .ca-board-renlist-row{grid-template-columns:1fr auto}
          .ca-board-rank-row{grid-template-columns:minmax(0,1fr) auto;row-gap:8px}
          .ca-board-rank-bar{grid-column:1 / -1;order:3}
        }
        @media(max-width:480px){
          .ca-cards{grid-template-columns:1fr}
          .ca-snapshot{align-items:stretch}
          .ca-snapshot-pill{width:100%}
        }
      `}</style>
    </div>
  );
}

export default CicloAluno;
