// @refresh reset
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import {
  RefreshCw, UserPlus, RotateCcw, Repeat, Search,
  ChevronLeft, ChevronRight, X, Hash, Percent, Users,
  TrendingUp, CircleDollarSign
} from "lucide-react";
import NavBar from "../components/NavBar";
import MonthSelector from "../components/dashboard/MonthSelector";
import Loading3D from "../components/ui/Loading3D";
import { useVendas } from "../hooks/useVendas";
import { useMetas } from "../hooks/useMetas";
import { useGlobalProdutos } from "../hooks/useGlobalProdutos";
import { useStudentLifecycle } from "../hooks/useStudentLifecycle";

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
  } = useVendas(unidade, [], { groupPlans: false });

  const { metas, loading: metasLoading } = useMetas(unidade);
  const { produtosSelecionados, loaded: produtosLoaded } = useGlobalProdutos();

  const responsaveisOficiais = useMemo(() => {
    const metasDoMes = metas.filter((m) => m.periodo === selectedMonth);
    return [...new Set(metasDoMes.map((m) => m.responsavel.trim().toLowerCase()))];
  }, [metas, selectedMonth]);

  const { resumo, eventosDetalhados } = useStudentLifecycle({
    vendasOriginais,
    unidade,
    selectedMonth,
    responsaveisOficiais,
    produtosSelecionados,
  });

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
      const responsavel = (ev.responsavel || "Sem consultor").trim() || "Sem consultor";
      const atual = porConsultor.get(responsavel) || {
        responsavel,
        total: 0,
        valorTotal: 0,
        matricula: 0,
        rematricula: 0,
        renovacao: 0,
      };

      atual.total += 1;
      atual.valorTotal += Number(ev.valor || 0);
      atual[ev.classificacao] += 1;
      porConsultor.set(responsavel, atual);
    }

    const consultores = Array.from(porConsultor.values())
      .map((item) => ({
        ...item,
        participacaoPct: totalPlanos > 0 ? (item.total / totalPlanos) * 100 : 0,
        matriculaPct: item.total > 0 ? (item.matricula / item.total) * 100 : 0,
        rematriculaPct: item.total > 0 ? (item.rematricula / item.total) * 100 : 0,
        renovacaoPct: item.total > 0 ? (item.renovacao / item.total) * 100 : 0,
        ticketMedio: item.total > 0 ? item.valorTotal / item.total : 0,
      }))
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
    };
  }, [eventosDetalhados]);

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
            <span className="ca-unit-tag">{(unidade || "").toUpperCase()}</span>
            <div>
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
            </div>
            <span className="ca-card-count">{resumo.totalEventosClassificados}</span>
            <span className="ca-card-label">Total</span>
          </div>
        </div>

        {/* ── Filters + Table ── */}
        <div className="ca-snapshot">
          <div className="ca-snapshot-pill">
            <Users size={14} />
            <span>{quadroPercentual.consultoresAtivos} consultor{quadroPercentual.consultoresAtivos !== 1 ? "es" : ""} ativos</span>
          </div>
          <div className="ca-snapshot-pill">
            <TrendingUp size={14} />
            <span>{quadroPercentual.totalPlanos} planos classificados no mês</span>
          </div>
          <div className="ca-snapshot-pill">
            <CircleDollarSign size={14} />
            <span>Ticket médio {formatCurrency(quadroPercentual.ticketMedio)}</span>
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
        <button
          type="button"
          className="ca-board-backdrop"
          onClick={() => setShowPercentBoard(false)}
          aria-label="Fechar quadro em porcentagem"
        />
      )}

      <aside className={`ca-board ${showPercentBoard ? "open" : ""}`} aria-hidden={!showPercentBoard}>
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
                <p>Cada percentual usa como base o total de planos do próprio consultor no mês.</p>
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
                </div>
                {quadroPercentual.consultores.map((item) => (
                  <div key={`mix-${item.responsavel}`} className="ca-board-table-row">
                    <span className="ca-board-table-name">{item.responsavel}</span>
                    <span>{item.total}</span>
                    <span>{formatPercent(item.participacaoPct)}</span>
                    <span>{formatPercent(item.matriculaPct)}</span>
                    <span>{formatPercent(item.rematriculaPct)}</span>
                    <span>{formatPercent(item.renovacaoPct)}</span>
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
        .ca-unit-tag{background:var(--primary);color:#fff;padding:4px 10px;border-radius:6px;font-size:.65rem;font-weight:700;letter-spacing:.06em}
        .ca-page-title{font-size:1.25rem;font-weight:700;color:var(--text-primary);margin:0;line-height:1.3}
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
        .ca-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;cursor:pointer;transition:all var(--transition-fast);position:relative;overflow:hidden;user-select:none}
        .ca-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:var(--card-accent);opacity:0;transition:opacity var(--transition-fast)}
        .ca-card:hover{border-color:color-mix(in srgb,var(--card-accent) 40%,transparent);box-shadow:var(--shadow-md)}
        .ca-card:hover::before{opacity:1}
        .ca-card:active{transform:scale(.985)}
        .ca-card.active{border-color:var(--card-accent);box-shadow:0 0 0 1px var(--card-accent)}
        .ca-card.active::before{opacity:1}
        .ca-card-total{cursor:default;--card-accent:var(--primary)}
        .ca-card-total:hover{transform:none;box-shadow:none;border-color:var(--border)}
        .ca-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .ca-card-icon{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--card-accent) 12%,transparent);color:var(--card-accent)}
        .ca-card-pct{font-size:.78rem;font-weight:600;color:var(--card-accent);font-variant-numeric:tabular-nums}
        .ca-card-count{font-size:1.75rem;font-weight:700;color:var(--text-primary);line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.02em;display:block}
        .ca-card-label{font-size:.72rem;color:var(--text-secondary);font-weight:500;letter-spacing:.02em;text-transform:uppercase;margin-top:2px;display:block}
        .ca-card-bar{height:3px;background:var(--border);border-radius:99px;margin-top:12px;overflow:hidden}
        .ca-card-bar-fill{height:100%;border-radius:99px;background:var(--card-accent);transition:width .5s cubic-bezier(.22,1,.36,1)}

        /* ===== SNAPSHOT ===== */
        .ca-snapshot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 18px}
        .ca-snapshot-pill{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--text-secondary);font-size:.76rem;box-shadow:var(--shadow-sm)}
        .ca-snapshot-pill svg{color:var(--primary);flex-shrink:0}
        .ca-snapshot-cta{margin-left:auto;display:inline-flex;align-items:center;justify-content:center;padding:9px 14px;border:none;border-radius:999px;background:linear-gradient(135deg,#eef2ff,#dbeafe);color:#1d4ed8;font-size:.76rem;font-weight:700;font-family:var(--font-sans);cursor:pointer;transition:all var(--transition-fast)}
        .ca-snapshot-cta:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(59,130,246,.18)}

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
        .ca-tbl tbody tr:hover{background:var(--background)}

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

        /* ===== QUADRO EM % ===== */
        .ca-board-backdrop{position:fixed;inset:0;border:none;background:rgba(15,23,42,.38);backdrop-filter:blur(3px);z-index:40}
        .ca-board{position:fixed;top:0;right:0;height:100vh;width:min(560px,100vw);background:var(--background);border-left:1px solid var(--border);box-shadow:-24px 0 60px rgba(15,23,42,.18);transform:translateX(106%);transition:transform .28s cubic-bezier(.22,1,.36,1);z-index:41;display:flex;flex-direction:column;overflow:hidden}
        .ca-board.open{transform:translateX(0)}
        .ca-board-head{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:22px 22px 18px;border-bottom:1px dashed var(--border)}
        .ca-board-head h2{margin:3px 0 4px;font-size:1.2rem;line-height:1.2;color:var(--text-primary)}
        .ca-board-head p{margin:0;font-size:.78rem;color:var(--text-secondary);max-width:360px}
        .ca-board-kicker{display:inline-block;padding:5px 10px;border-radius:999px;background:var(--primary-light);color:var(--primary);font-size:.68rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
        .ca-board-close{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--text-primary);cursor:pointer;transition:all var(--transition-fast)}
        .ca-board-close:hover{border-color:var(--primary);color:var(--primary)}
        .ca-board-body{position:relative;display:flex;flex-direction:column;gap:16px;padding:18px 22px 24px;overflow-y:auto}
        .ca-board-hero{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .ca-board-stat{padding:14px 15px;border-radius:18px;background:var(--card);border:1px solid var(--border);box-shadow:var(--shadow)}
        .ca-board-stat-label{display:block;font-size:.69rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary);margin-bottom:8px}
        .ca-board-stat strong{font-size:1.05rem;line-height:1.2;color:var(--text-primary)}
        .ca-board-section{padding:16px;border-radius:22px;background:var(--card);border:1px solid var(--border);box-shadow:var(--shadow)}
        .ca-board-section-hdr{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}
        .ca-board-section-hdr svg{margin-top:2px;color:var(--primary);flex-shrink:0}
        .ca-board-section-hdr h3{margin:0 0 4px;font-size:.95rem;color:var(--text-primary)}
        .ca-board-section-hdr p{margin:0;font-size:.76rem;color:var(--text-secondary);line-height:1.45}
        .ca-board-mix{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .ca-board-mix-card{padding:14px;border-radius:16px;background:color-mix(in srgb,var(--mix-accent) 10%,var(--card));border:1px solid color-mix(in srgb,var(--mix-accent) 20%,var(--border));display:flex;flex-direction:column;gap:6px}
        .ca-board-mix-card span{font-size:.74rem;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:.04em}
        .ca-board-mix-card strong{font-size:1.35rem;line-height:1;color:var(--text-primary)}
        .ca-board-mix-card small{font-size:.72rem;color:var(--text-secondary)}
        .ca-board-rank{display:flex;flex-direction:column;gap:10px}
        .ca-board-rank-row{display:grid;grid-template-columns:minmax(0,180px) 1fr auto;gap:10px;align-items:center}
        .ca-board-rank-meta{display:flex;align-items:center;gap:10px;min-width:0}
        .ca-board-rank-meta strong,.ca-board-table-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ca-board-rank-meta small{font-size:.72rem;color:var(--text-secondary)}
        .ca-board-rank-pos{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:var(--primary-light);color:var(--primary);font-size:.72rem;font-weight:700;flex-shrink:0}
        .ca-board-rank-bar{height:9px;border-radius:999px;background:var(--border);overflow:hidden}
        .ca-board-rank-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--secondary),var(--primary))}
        .ca-board-rank-value{font-size:.78rem;font-weight:700;color:var(--text-primary);font-variant-numeric:tabular-nums}
        .ca-board-table-wrap{overflow-x:auto}
        .ca-board-table{min-width:520px}
        .ca-board-table-head,.ca-board-table-row{display:grid;grid-template-columns:minmax(170px,1.4fr) repeat(5,minmax(58px,.75fr));gap:8px;align-items:center}
        .ca-board-table-head{padding:0 0 10px;border-bottom:1px dashed var(--border);font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary)}
        .ca-board-table-row{padding:11px 0;border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-primary);font-variant-numeric:tabular-nums}
        .ca-board-table-row:last-child{border-bottom:none}
        .ca-board-footnote{margin:0;font-size:.72rem;line-height:1.5;color:var(--text-secondary)}

        @keyframes spin{to{transform:rotate(360deg)}}

        @media(prefers-reduced-motion:reduce){
          .ca-card,.ca-btn-refresh,.ca-tbl tbody tr,.ca-pag-btn,.ca-card-bar-fill,.ca-btn-board-toggle,.ca-snapshot-cta,.ca-board{transition:none!important}
          .ca-card:hover,.ca-card:active{transform:none!important}
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
          .ca-board{width:100vw}
          .ca-board-hero,.ca-board-mix{grid-template-columns:1fr}
          .ca-board-rank-row{grid-template-columns:1fr}
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
