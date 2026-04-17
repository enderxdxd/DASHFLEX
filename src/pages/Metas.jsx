import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { Pencil, RefreshCw, Save, Target, Trash2, TrendingUp, Users, Wallet, X } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import NavBar from "../components/NavBar";
import MonthSelector from "../components/dashboard/MonthSelector";
import Loading3D from "../components/ui/Loading3D";
import { db } from "../firebase";
import { useGlobalProdutos } from "../hooks/useGlobalProdutos";
import { useMetas } from "../hooks/useMetas";
import { useVendas } from "../hooks/useVendas";
import "../styles/Metas.css";

dayjs.locale("pt-br");
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const normalize = (value = "") => value.trim().toLowerCase();
const sortPt = (a, b) => a.localeCompare(b, "pt", { sensitivity: "base" });
const getVendaMonth = (venda) => venda?.dataFormatada ? dayjs(venda.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") : "";
const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const tone = (value) => (value >= 100 ? "success" : value >= 75 ? "warning" : "danger");

export default function Metas() {
  const { unidade } = useParams();
  const unidadeAtual = normalize(unidade || "");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [crossUnitPeriod, setCrossUnitPeriod] = useState(dayjs().format("YYYY-MM"));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newResponsavel, setNewResponsavel] = useState("");
  const [newMeta, setNewMeta] = useState("");
  const [metaPeriodo, setMetaPeriodo] = useState(dayjs().format("YYYY-MM"));
  const [newRemType, setNewRemType] = useState("comissao");
  const [editingId, setEditingId] = useState(null);
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [editPeriodo, setEditPeriodo] = useState("");
  const [editRemType, setEditRemType] = useState("comissao");

  const { produtosSelecionados, loaded: produtosLoaded } = useGlobalProdutos();
  const { vendas: vendasAgrupadas, loading: vendasLoading, error: vendasError, refreshVendas } = useVendas(unidade);
  const { metas, loading: metasLoading, error: metasError, refreshMetas } = useMetas(unidade);

  const produtosSelecionadosSet = useMemo(() => new Set(produtosSelecionados.map((item) => item.trim())), [produtosSelecionados]);
  const vendasFiltradas = useMemo(() => {
    if (!produtosLoaded) return [];
    return vendasAgrupadas.filter((venda) => {
      const produto = venda.produto?.trim();
      if (!produto) return false;
      return produtosSelecionadosSet.size === 0 || produtosSelecionadosSet.has(produto);
    });
  }, [produtosLoaded, produtosSelecionadosSet, vendasAgrupadas]);
  const vendasDoMes = useMemo(() => vendasFiltradas.filter((venda) => getVendaMonth(venda) === selectedMonth), [selectedMonth, vendasFiltradas]);
  const vendasPeriodoCruzado = useMemo(() => vendasFiltradas.filter((venda) => getVendaMonth(venda) === crossUnitPeriod), [crossUnitPeriod, vendasFiltradas]);
  const metasDoMes = useMemo(() => metas.filter((meta) => meta.periodo === selectedMonth).sort((a, b) => sortPt(a.responsavel?.trim() || "", b.responsavel?.trim() || "")), [metas, selectedMonth]);
  const responsaveisUnicos = useMemo(() => Array.from(new Set(metas.map((meta) => meta.responsavel?.trim()).filter(Boolean))).sort(sortPt), [metas]);

  const resumoPorConsultor = useMemo(() => {
    const map = new Map();
    vendasDoMes.forEach((venda) => {
      const chave = normalize(venda.responsavel || "");
      if (!chave) return;
      if (!map.has(chave)) map.set(chave, { total: 0, quantidade: 0 });
      const atual = map.get(chave);
      atual.total += Number(venda.valor || 0);
      atual.quantidade += 1;
    });
    return map;
  }, [vendasDoMes]);

  const metasComPerformance = useMemo(() => metasDoMes.map((meta) => {
    const resumo = resumoPorConsultor.get(normalize(meta.responsavel || ""));
    const totalVendas = resumo?.total || 0;
    const percentualMeta = Number(meta.meta || 0) > 0 ? (totalVendas / Number(meta.meta || 0)) * 100 : 0;
    return { ...meta, totalVendas, quantidadeVendas: resumo?.quantidade || 0, percentualMeta: Number.isFinite(percentualMeta) ? percentualMeta : 0 };
  }), [metasDoMes, resumoPorConsultor]);

  const metaUnidade = useMemo(() => metasDoMes.reduce((sum, meta) => sum + Number(meta.meta || 0), 0), [metasDoMes]);
  const totalUnidade = useMemo(() => vendasDoMes.filter((venda) => normalize(venda.unidade || "") === unidadeAtual).reduce((sum, venda) => sum + Number(venda.valor || 0), 0), [unidadeAtual, vendasDoMes]);
  const totalPlanosUnidade = useMemo(() => vendasDoMes.filter((venda) => normalize(venda.unidade || "") === unidadeAtual).length, [unidadeAtual, vendasDoMes]);
  const progressoUnidade = metaUnidade > 0 ? (totalUnidade / metaUnidade) * 100 : 0;
  const gapMeta = Math.max(metaUnidade - totalUnidade, 0);
  const consultoresAtivos = metasComPerformance.filter((meta) => meta.totalVendas > 0).length;
  const ticketMedio = totalPlanosUnidade > 0 ? totalUnidade / totalPlanosUnidade : 0;

  const chartData = useMemo(() => {
    const linhas = [...metasComPerformance].sort((a, b) => sortPt(a.responsavel || "", b.responsavel || ""));
    return {
      labels: linhas.map((item) => item.responsavel),
      datasets: [
        { type: "bar", label: "Meta", data: linhas.map((item) => Number(item.meta || 0)), backgroundColor: "#94a3b8", borderRadius: 10 },
        { type: "bar", label: "Realizado", data: linhas.map((item) => item.totalVendas), backgroundColor: "#2563eb", borderRadius: 10 },
      ],
    };
  }, [metasComPerformance]);

  const crossUnitCards = useMemo(() => {
    const metaMap = new Map();
    metas.filter((meta) => meta.periodo === crossUnitPeriod).forEach((meta) => metaMap.set(normalize(meta.responsavel || ""), meta));
    const salesMap = new Map();
    vendasPeriodoCruzado.forEach((venda) => {
      const chave = normalize(venda.responsavel || "");
      if (!chave) return;
      if (!salesMap.has(chave)) salesMap.set(chave, { consultor: venda.responsavel?.trim() || "", total: 0, unidades: new Map() });
      const atual = salesMap.get(chave);
      atual.total += Number(venda.valor || 0);
      const unidadeVenda = venda.unidade?.trim() || "Não informado";
      if (!atual.unidades.has(unidadeVenda)) atual.unidades.set(unidadeVenda, { total: 0, quantidade: 0 });
      const item = atual.unidades.get(unidadeVenda);
      item.total += Number(venda.valor || 0);
      item.quantidade += 1;
    });
    return Array.from(metaMap.keys()).map((chave) => {
      const meta = metaMap.get(chave);
      const vendas = salesMap.get(chave);
      const total = vendas?.total || 0;
      if (!meta && total === 0) return null;
      const metaValor = Number(meta?.meta || 0);
      return {
        consultor: meta?.responsavel?.trim() || vendas?.consultor || "Consultor",
        total,
        metaValor,
        percentualMeta: metaValor > 0 ? (total / metaValor) * 100 : 0,
        unidades: vendas ? Array.from(vendas.unidades.entries()).map(([nomeUnidade, dados]) => ({
          nomeUnidade,
          total: dados.total,
          quantidade: dados.quantidade,
          percentual: total > 0 ? (dados.total / total) * 100 : 0,
          isCurrentUnit: normalize(nomeUnidade) === unidadeAtual,
        })).sort((a, b) => b.total - a.total) : [],
      };
    }).filter(Boolean).sort((a, b) => b.total - a.total || sortPt(a.consultor, b.consultor));
  }, [crossUnitPeriod, metas, unidadeAtual, vendasPeriodoCruzado]);

  const combinedError = error || vendasError || metasError;
  const isInitialLoading = !produtosLoaded || (vendasLoading && vendasAgrupadas.length === 0) || (metasLoading && metas.length === 0);
  const pushSuccess = (message) => { setSuccessMessage(message); window.setTimeout(() => setSuccessMessage(""), 3000); };
  const parseBRNumber = (value) => Number(String(value).replace(/\./g, "").replace(",", "."));

  const handleRefreshAll = async () => {
    setError("");
    setIsRefreshing(true);
    try {
      await Promise.all([refreshVendas(), refreshMetas()]);
      pushSuccess("Dados atualizados com sucesso.");
    } catch (refreshError) {
      console.error(refreshError);
      setError("Não foi possível atualizar os dados agora.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddMeta = async (event) => {
    event.preventDefault();
    setError("");
    if (!newResponsavel || !newMeta) return setError("Preencha todos os campos da nova meta.");
    try {
      await addDoc(collection(db, "faturamento", unidade.toLowerCase(), "metas"), { responsavel: newResponsavel.trim(), periodo: metaPeriodo, remuneracaoType: newRemType, meta: parseBRNumber(newMeta), createdAt: dayjs().toISOString() });
      await refreshMetas();
      setNewResponsavel("");
      setNewMeta("");
      pushSuccess("Meta adicionada com sucesso.");
    } catch (saveError) {
      console.error(saveError);
      setError("Erro ao adicionar meta.");
    }
  };

  const handleEditMeta = (meta) => {
    setEditingId(meta.id);
    setEditResponsavel(meta.responsavel || "");
    setEditMeta(String(meta.meta || ""));
    setEditPeriodo(meta.periodo || selectedMonth);
    setEditRemType(meta.remuneracaoType || "comissao");
  };

  const handleSaveEditedMeta = async (id) => {
    setError("");
    if (!editResponsavel || !editMeta || !editPeriodo) return setError("Preencha todos os campos da edição.");
    try {
      await updateDoc(doc(db, "faturamento", unidade.toLowerCase(), "metas", id), { responsavel: editResponsavel.trim(), meta: parseBRNumber(editMeta), periodo: editPeriodo, remuneracaoType: editRemType });
      await refreshMetas();
      setEditingId(null);
      pushSuccess("Meta atualizada com sucesso.");
    } catch (saveError) {
      console.error(saveError);
      setError("Erro ao salvar edição.");
    }
  };

  const handleDeleteMeta = async (id) => {
    if (!window.confirm("Excluir esta meta?")) return;
    try {
      await deleteDoc(doc(db, "faturamento", unidade.toLowerCase(), "metas", id));
      await refreshMetas();
      pushSuccess("Meta excluída com sucesso.");
    } catch (deleteError) {
      console.error(deleteError);
      setError("Erro ao excluir meta.");
    }
  };

  if (isInitialLoading) {
    return <div className="metas-page"><NavBar /><main className="metas-content"><div className="metas-loading"><Loading3D /><p>Carregando metas, vendas e filtros globais...</p></div></main></div>;
  }

  return (
    <div className="metas-page">
      <NavBar />
      <main className="metas-content">
        <section className="metas-header">
          <div className="metas-header-content">
            <div className="metas-header-text">
              <div className={`unit-badge-header ${unidadeAtual}`}>{unidade}</div>
              <h1><Target size={22} />Metas</h1>
              <p>Leitura rápida da operação de {unidade} em {dayjs(`${selectedMonth}-01`).format("MMMM [de] YYYY")}.</p>
            </div>
            <div className="metas-header-side">
              <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
              <button type="button" className="refresh-button" onClick={handleRefreshAll} disabled={isRefreshing}><RefreshCw size={16} className={isRefreshing ? "spin" : ""} />{isRefreshing ? "Atualizando..." : "Atualizar"}</button>
            </div>
          </div>
        </section>

        <section className="metas-stats-grid">
          <article className="meta-stat-card"><div className="meta-stat-header"><div className="meta-stat-icon primary"><Target size={18} /></div><div className="meta-stat-content"><h4>Meta da Unidade</h4><div className="meta-stat-value">{money(metaUnidade)}</div><div className="meta-stat-subtitle">{metasDoMes.length} consultores com meta no período</div></div></div><div className="meta-progress-bar"><div className={`meta-progress-fill ${tone(progressoUnidade)}`} style={{ width: `${Math.min(progressoUnidade, 100)}%` }} /></div></article>
          <article className="meta-stat-card"><div className="meta-stat-header"><div className="meta-stat-icon info"><Wallet size={18} /></div><div className="meta-stat-content"><h4>Realizado</h4><div className="meta-stat-value">{money(totalUnidade)}</div><div className="meta-stat-subtitle">Faltam {money(gapMeta)} para a meta do time</div></div></div></article>
          <article className="meta-stat-card"><div className="meta-stat-header"><div className="meta-stat-icon success"><TrendingUp size={18} /></div><div className="meta-stat-content"><h4>Progresso</h4><div className="meta-stat-value">{pct(progressoUnidade)}</div><div className="meta-stat-subtitle">{totalUnidade >= metaUnidade ? "Meta da unidade batida" : "Operação ainda em construção"}</div></div></div></article>
          <article className="meta-stat-card"><div className="meta-stat-header"><div className="meta-stat-icon warning"><Users size={18} /></div><div className="meta-stat-content"><h4>Ritmo Comercial</h4><div className="meta-stat-value">{consultoresAtivos}</div><div className="meta-stat-subtitle">Ticket médio de {money(ticketMedio)} em {totalPlanosUnidade} planos</div></div></div></article>
        </section>

        {(combinedError || successMessage) && <div className={`alert ${combinedError ? "error" : "success"}`}><span className="alert-icon">{combinedError ? "!" : "✓"}</span>{combinedError || successMessage}</div>}

        <section className="add-meta-section">
          <div className="section-card">
            <div className="card-header"><div className="section-title-stack"><h2 className="card-title">Nova Meta</h2><p className="card-subtitle">Cadastro rápido, sem travar a leitura da página.</p></div></div>
            <form onSubmit={handleAddMeta} className="modern-form">
              <div className="form-grid">
                <div className="form-field"><label className="field-label">Responsável</label><div className="input-wrapper"><input type="text" list="responsaveisList" placeholder="Selecione ou digite o nome" value={newResponsavel} onChange={(event) => setNewResponsavel(event.target.value)} className="modern-input" /><datalist id="responsaveisList">{responsaveisUnicos.map((nome) => <option key={nome} value={nome} />)}</datalist></div></div>
                <div className="form-field"><label className="field-label">Valor da Meta</label><div className="input-wrapper currency-wrapper"><span className="currency-prefix">R$</span><input type="number" placeholder="0,00" value={newMeta} onChange={(event) => setNewMeta(event.target.value)} step="0.01" className="modern-input currency-input" /></div></div>
                <div className="form-field"><label className="field-label">Período</label><input type="month" value={metaPeriodo} onChange={(event) => setMetaPeriodo(event.target.value)} className="modern-input" /></div>
                <div className="form-field"><label className="field-label">Tipo de Remuneração</label><select value={newRemType} onChange={(event) => setNewRemType(event.target.value)} className="modern-select"><option value="comissao">Comissão</option><option value="premiacao">Premiação</option></select></div>
              </div>
              <div className="form-actions"><button type="submit" className="submit-btn">Adicionar Meta</button></div>
            </form>
          </div>
        </section>

        <section className="metas-table-container">
          <div className="metas-table-header">
            <div className="section-title-stack"><h3>Metas Cadastradas</h3><p className="table-muted">A tabela já nasce filtrada pelo período e pelos produtos globais configurados.</p></div>
            <div className="metas-toolbar-row"><span className="total-metas">{metasDoMes.length} consultores no período</span><MonthSelector value={selectedMonth} onChange={setSelectedMonth} /></div>
          </div>
          <div className="metas-table-scroll">
            <table className="metas-table-modern">
              <thead><tr><th>Período</th><th>Responsável</th><th>Meta</th><th>Realizado</th><th>% Meta</th><th>Tipo</th><th>Ações</th></tr></thead>
              <tbody>
                {metasComPerformance.length > 0 ? metasComPerformance.map((meta) => {
                  const isEditing = editingId === meta.id;
                  const currentTone = tone(meta.percentualMeta);
                  return (
                    <tr key={meta.id}>
                      <td>{isEditing ? <input type="month" value={editPeriodo} onChange={(event) => setEditPeriodo(event.target.value)} className="modern-input" /> : meta.periodo}</td>
                      <td className="meta-name-cell">{isEditing ? <input type="text" value={editResponsavel} onChange={(event) => setEditResponsavel(event.target.value)} className="modern-input" /> : meta.responsavel}</td>
                      <td className="meta-value-cell">{isEditing ? <input type="number" value={editMeta} onChange={(event) => setEditMeta(event.target.value)} className="modern-input" /> : money(meta.meta)}</td>
                      <td>{money(meta.totalVendas)}</td>
                      <td className="meta-progress-cell"><div className="meta-progress-inline"><div className="meta-progress-inline-bar"><div className="meta-progress-inline-fill" style={{ width: `${Math.min(meta.percentualMeta, 100)}%`, background: currentTone === "success" ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : currentTone === "warning" ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)" }} /></div><span className="meta-progress-text">{pct(meta.percentualMeta)}</span></div></td>
                      <td>{isEditing ? <select value={editRemType} onChange={(event) => setEditRemType(event.target.value)} className="modern-input"><option value="comissao">Comissão</option><option value="premiacao">Premiação</option></select> : <span className={`meta-tag meta-tag--${currentTone}`}>{meta.remuneracaoType === "premiacao" ? "Premiação" : "Comissão"}</span>}</td>
                      <td className="meta-actions-cell">{isEditing ? <><button type="button" className="meta-action-btn edit" onClick={() => handleSaveEditedMeta(meta.id)} title="Salvar"><Save size={14} /></button><button type="button" className="meta-action-btn" onClick={() => setEditingId(null)} title="Cancelar"><X size={14} /></button></> : <><button type="button" className="meta-action-btn edit" onClick={() => handleEditMeta(meta)} title="Editar"><Pencil size={14} /></button><button type="button" className="meta-action-btn delete" onClick={() => handleDeleteMeta(meta.id)} title="Excluir"><Trash2 size={14} /></button></>}</td>
                    </tr>
                  );
                }) : <tr><td colSpan="7"><div className="empty-card empty-card--inline">Nenhuma meta cadastrada para {dayjs(`${selectedMonth}-01`).format("MMMM [de] YYYY")}.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cross-unit-performance">
          <div className="section-card">
            <div className="card-header card-header--row"><div className="section-title-stack"><h2 className="card-title">Performance Cruzada por Unidade</h2><p className="card-subtitle">Onde cada consultor performou melhor dentro do período analisado.</p></div><MonthSelector value={crossUnitPeriod} onChange={setCrossUnitPeriod} /></div>
            <div className="performance-content">
              {crossUnitCards.length > 0 ? <div className="performance-grid">{crossUnitCards.map((card) => <article key={card.consultor} className="consultant-performance-card"><div className="card-header"><div className="consultant-info"><div className="consultant-avatar">{card.consultor.charAt(0).toUpperCase()}</div><div className="consultant-details"><h4 className="consultant-name">{card.consultor}</h4><div className="consultant-stats"><div className="total-sales">{money(card.total)}</div><div className="meta-progress">{card.metaValor > 0 ? `${pct(card.percentualMeta)} da meta` : "Sem meta cadastrada no período"}</div></div></div></div><div className="performance-summary"><div className="units-count"><div className="count">{card.unidades.length}</div><div className="label">Unidades</div></div></div></div><div className="card-body"><div className="units-breakdown">{card.unidades.length > 0 ? card.unidades.map((item) => <div key={`${card.consultor}-${item.nomeUnidade}`} className={`unit-item ${item.isCurrentUnit ? "current-unit" : ""}`}><div className="unit-header"><div className="unit-info"><div className="unit-name">{item.nomeUnidade}</div><div className="unit-count">{item.quantidade} {item.quantidade === 1 ? "venda" : "vendas"}</div></div><div className="unit-value"><div className="value">{money(item.total)}</div><div className="percentage">{pct(item.percentual)}</div></div></div><div className="unit-progress-row"><div className="unit-progress-track"><div className="unit-progress-fill" style={{ width: `${Math.min(item.percentual, 100)}%` }} /></div></div></div>) : <div className="empty-card empty-card--inline">Nenhuma venda encontrada para este consultor no período.</div>}</div></div></article>)}</div> : <div className="empty-card">Nenhum consultor com vendas ou metas encontrado em {dayjs(`${crossUnitPeriod}-01`).format("MMMM [de] YYYY")}.</div>}
            </div>
          </div>
        </section>


        <section className="chart-section-modern">
          <div className="chart-header-modern"><div className="section-title-stack"><h3>Desempenho vs Meta</h3><p className="table-muted">Comparativo direto entre objetivo cadastrado e realizado.</p></div><div className="chart-legend-modern"><div className="legend-item-modern"><span className="legend-dot-modern meta" />Meta</div><div className="legend-item-modern"><span className="legend-dot-modern vendas" />Realizado</div></div></div>
          {metasComPerformance.length > 0 ? <div style={{ height: 360 }}><Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${money(context.raw)}` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => money(value) } } } }} /></div> : <div className="empty-card">Sem dados suficientes para gerar o gráfico deste período.</div>}
        </section>
      </main>
    </div>
  );
}
