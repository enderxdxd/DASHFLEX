// src/pages/Metas.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  collection,
  collectionGroup,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import dayjs from "dayjs";
import NavBar from "../components/NavBar";
import { usePersistedProdutos } from "../hooks/usePersistedProdutos";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import "react-datepicker/dist/react-datepicker.css";


ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Metas() {
  const { unidade } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();

  // --- Estados gerais ---
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [metas, setMetas]     = useState([]);
  const [vendas, setVendas]   = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [configRem, setConfigRem] = useState({
    premiacao: [],
    comissaoPlanos: [],
    metaUnidade: 0
  });
  

  // --- Filtros e persistência ---
  const [produtosSelecionados, setProdutosSelecionados, produtosLoaded] =
    usePersistedProdutos();
  const [showProductFilter, setShowProductFilter] = useState(false);
  const [selectedMonth, setSelectedMonth]         = useState(dayjs().format("YYYY-MM"));

  function calcularRemuneracao(
    metaValor,
    vendasArr,
    tipo,
    unidadeBatida,
    configRem
  ) {
    const {
      comissaoPlanos = [],
      premiacao = [],
      taxaSem = 0.012, // taxa para produtos “não-plano”
      taxaCom = 0.015
    } = configRem || {};
  
    if (tipo === "comissao") {
      const totalV = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
  
      return vendasArr.reduce((soma, venda) => {
        const valorVenda = Number(venda.valor || 0);
  
        // 1) Se não for “plano”, usa taxa percentual
        if (venda.produto.trim().toLowerCase() !== "plano") {
          const taxa = totalV >= metaValor ? taxaCom : taxaSem;
          return soma + valorVenda * taxa;
        }
  
        // 2) Se for “plano”, procura intervalo nos planos configurados
        const plano = comissaoPlanos.find(
          (p) => valorVenda >= p.min && valorVenda <= p.max
        );
        if (!plano) return soma; // plano desconhecido → ignora
  
        // 3) Aplica valor fixo conforme meta da unidade ou individual
        const unit = unidadeBatida
          ? plano.metaTME
          : totalV >= metaValor
          ? plano.comMeta
          : plano.semMeta;
  
        return soma + unit;
      }, 0);
    }
  
    // --- caso “premiação” continua inalterado ---
    const acumulado = vendasArr.reduce((s, v) => s + Number(v.valor || 0), 0);
    const percentual = metaValor > 0 ? (acumulado / metaValor) * 100 : 0;
    const faixa = premiacao
      .filter((f) => f.percentual <= percentual)
      .sort((a, b) => a.percentual - b.percentual)
      .pop();
    return faixa?.premio || 0;
  }
  
  
  
  
  

  // --- Configuração de remuneração ---
  

  useEffect(() => {
    async function loadConfig() {
      const ref = doc(db, "faturamento", unidade, "configRemuneracao", "premiacao");
      const snap = await getDoc(ref);
      setConfigRem(snap.exists()
        ? { premiacao: snap.data().premiacao, comissaoPlanos: snap.data().comissaoPlanos, metaUnidade: snap.data().metaUnidade }
        : { premiacao: [], comissaoPlanos: [], metaUnidade: 0 }
      );
    }
    loadConfig();
  }, [unidade]);


  
  

  // --- Carrega metas, vendas e produtos ---
  useEffect(() => {
    if (!unidade) return;
    // Metas
    const metasRef = collection(db, "faturamento", unidade.toLowerCase(), "metas");
    const unsubMetas = onSnapshot(
      metasRef,
      snap => setMetas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => {
        console.error(e);
        setError("Falha ao carregar metas");
        setLoading(false);
      }
    );

    // Vendas
    const vendasQuery = collectionGroup(db, "vendas");
    const unsubVendas = onSnapshot(
      vendasQuery,
      snap => {
        const data = snap.docs.map(d => d.data());
        setVendas(data);
        // extrai produtos únicos
        const setProd = new Set();
        data.forEach(v => v.produto && setProd.add(v.produto.trim()));
        setProdutos(Array.from(setProd).sort());
        setLoading(false);
      },
      e => {
        console.error(e);
        setError("Falha ao carregar vendas");
        setLoading(false);
      }
    );

    return () => {
      unsubMetas();
      unsubVendas();
    };
  }, [unidade]);

  // --- Filtra vendas por produto e mês ---
  const vendasParaMeta = useMemo(() => {
    if (!produtosLoaded) return [];
    return vendas.filter(v => {
      const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
      return (
        v.produto &&
        produtosSelecionados.includes(v.produto.trim()) &&
        mes === selectedMonth
      );
    });
  }, [vendas, produtosSelecionados, selectedMonth, produtosLoaded]);

  // --- Checa meta da unidade ---
  const totalUnidade = useMemo(
    () => vendasParaMeta.reduce((s, v) => s + Number(v.valor || 0), 0),
    [vendasParaMeta]
  );
  
  // metaUnidade vem do configRem.metaUnidade
  const unidadeBatida = totalUnidade >= Number(configRem?.metaUnidade || 0);
  

  // --- Responsáveis únicos ---
  const responsaveisUnicos = useMemo(
    () => metas.map(m => m.responsavel.trim()),
    [metas]
  );

  // --- CRUD de Metas ---
  const [newResponsavel, setNewResponsavel]   = useState("");
  const [newMeta, setNewMeta]                 = useState("");
  const [metaPeriodo, setMetaPeriodo]         = useState(dayjs().format("YYYY-MM"));
  const [editingId, setEditingId]             = useState(null);
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editMeta, setEditMeta]               = useState("");
  const [editPeriodo, setEditPeriodo]         = useState("");
  const [newRemType, setNewRemType]           = useState("comissao");
  const [editRemType, setEditRemType]         = useState("comissao");

  function parseBRNumber(str) {
    return Number(str.replace(/\./g, "").replace(",", "."));
  }

  const handleAddMeta = async e => {
    e.preventDefault(); setError("");
    if (!newResponsavel || !newMeta) { setError("Preencha todos os campos"); return; }
    try {
      await addDoc(
        collection(db, "faturamento", unidade.toLowerCase(), "metas"),
        {
          responsavel: newResponsavel.trim(),
          periodo: metaPeriodo,
          remuneracaoType: newRemType,
          meta: parseBRNumber(newMeta),
          createdAt: dayjs().toISOString(),
        }
      );
      setSuccessMessage("Meta adicionada!");
      setNewResponsavel(""); setNewMeta("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch(err) {
      console.error(err); setError("Erro ao adicionar meta");
    }
  };

  const handleEditMeta = m => {
    setEditingId(m.id);
    setEditResponsavel(m.responsavel);
    setEditMeta(m.meta.toString());
    setEditPeriodo(m.periodo);
    setEditRemType(m.remuneracaoType||"comissao");
  };

  const handleSaveEditedMeta = async id => {
    if (!editResponsavel||!editMeta||!editPeriodo) {
      setError("Preencha todos os campos de edição."); return;
    }
    try {
      await updateDoc(
        doc(db, "faturamento", unidade.toLowerCase(), "metas", id),
        {
          responsavel: editResponsavel.trim(),
          meta: parseBRNumber(editMeta),
          periodo: editPeriodo,
          remuneracaoType: editRemType,
        }
      );
      setSuccessMessage("Meta atualizada!"); setEditingId(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch(err) {
      console.error(err); setError("Erro ao salvar edição");
    }
  };

  const handleDeleteMeta = async id => {
    if (!window.confirm("Excluir esta meta?")) return;
    try {
      await deleteDoc(
        doc(db, "faturamento", unidade.toLowerCase(), "metas", id)
      );
      setSuccessMessage("Meta excluída!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch(err) {
      console.error(err); setError("Erro ao excluir meta");
    }
  };

  // --- Dados para gráfico ---
  const dadosGrafico = useMemo(() => {
    return metas
      .filter(m => m.periodo === selectedMonth)
      .map(m => {
        const totalV = vendasParaMeta
          .filter(v => v.responsavel.trim().toLowerCase() === m.responsavel.trim().toLowerCase())
          .reduce((s,v) => s + Number(v.valor||0), 0);
        return { nome: m.responsavel, vendas: totalV, meta: Number(m.meta) };
      });
  }, [metas, vendasParaMeta, selectedMonth]);

  const ordenado = useMemo(() =>
    [...dadosGrafico].sort((a,b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }))
  ,[dadosGrafico]);

  const chartData = {
    labels: ordenado.map(d => d.nome),
    datasets: [
      { type: "bar", label: "Meta", data: ordenado.map(d => d.meta), borderRadius:4, backgroundColor: "#10B981" },
      { type: "bar", label: "Realizado", data: ordenado.map(d => d.vendas), borderRadius:4, backgroundColor: "#3B82F6" }
    ],
  };

  // --- Paginação ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const paginatedVendas = vendasParaMeta.slice(
    (currentPage-1)*itemsPerPage,
    currentPage*itemsPerPage
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="metas-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>GestãoApp</h2>
        </div>
        <NavBar />
      </aside>
      <main className="metas-content">
      <header className="metas-header">
      <div className="header-content">
        <h1>
          <span className="decorative-line"></span>
          Metas de Vendas - {unidade.toUpperCase()}
        </h1>
        <form onSubmit={handleAddMeta} className="meta-form">
          <div className="form-group">
            {/* Campo para selecionar o Responsável */}
            <div className="input-group">
              <input
                type="text"
                list="responsaveisList"
                placeholder="Selecione ou digite o Responsável"
                value={newResponsavel}
                onChange={(e) => setNewResponsavel(e.target.value)}
                className="modern-input"
              />
              <datalist id="responsaveisList">
                {responsaveisUnicos.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
            </div>


        {/* Campo para digitar o valor da meta */}
        <div className="input-group currency-input">
          <input
            type="number"
            placeholder="Valor da Meta"
            value={newMeta}
            onChange={(e) => setNewMeta(e.target.value)}
            className="modern-input"
          />
        </div>

        {/* Campo para selecionar o período da meta */}
        <div className="input-group">
          <input 
            type="month"
            value={metaPeriodo}
            onChange={(e) => setMetaPeriodo(e.target.value)}
            className="modern-input"
          />
        </div>
        {/* Tipo de Remuneração */}
        <div className="input-group radio-group">
          <label>
            <input
              type="radio"
              name="tipo"
              value="comissao"
              checked={newRemType === "comissao"}
              onChange={() => setNewRemType("comissao")}
            />
            <span /> {/* Elemento visual do radio */}
            <span>Comissão</span> {/* Texto */}
          </label>
          <label>
            <input
              type="radio"
              name="tipo"
              value="premiacao"
              checked={newRemType === "premiacao"}
              onChange={() => setNewRemType("premiacao")}
            />
            <span /> {/* Elemento visual do radio */}
            <span>Premiação</span> {/* Texto */}
          </label>
        </div>


        <button type="submit" className="primary-button">
          <svg xmlns="http://www.w3.org/2000/svg" className="button-icon" viewBox="0 0 24 24">
            <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
          </svg>
          Adicionar Meta
        </button>
      </div>
    </form>
  </div>
</header>
  
        {(error || successMessage) && (
          <div className={`alert ${error ? 'error' : 'success'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="alert-icon" viewBox="0 0 24 24">
              {error ? (
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              ) : (
                <path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-3-7l-9 9 3 3 9-9-3-3z" />
              )}
            </svg>
            {error || successMessage}
          </div>
        )}
<section className="metas-list">
  <div className="section-header">
    <h2>Metas Cadastradas</h2>
    <span className="total-metas">{metas.length} metas registradas</span>
    <div className="filter-group month-filter" style={{ marginTop: "1rem" }}>
      <label>Selecione o Período:</label>
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="modern-input"
      />
    </div>
  </div>

   {/* Tabela de Metas */}
          <table className="data-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Responsável</th>
                <th>Meta (R$)</th>
                <th>Vendas (R$)</th>
                <th>% Meta</th>
                <th>Remuneração (R$)</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
            {metas
    .filter((m) => m.periodo === selectedMonth)
    .sort((a, b) =>
      a.responsavel
        .trim()
        .localeCompare(b.responsavel.trim(), "pt", { sensitivity: "base" })
    )
    .map((m) => {
      // 1) filtra vendas por consultor
      const vendasDoResp = vendasParaMeta.filter(
        (v) =>
          v.responsavel.trim().toLowerCase() ===
          m.responsavel.trim().toLowerCase()
      );

      // 1.1) soma total das vendas para exibir e calcular % Meta
      const totalV = vendasDoResp.reduce(
        (soma, v) => soma + Number(v.valor || 0),
        0
      );

      // 2) chama a função única que engloba toda a lógica de remuneração
      const remuneracao = calcularRemuneracao(
        Number(m.meta),     // meta individual
        vendasDoResp,       // array de vendas do consultor
        m.remuneracaoType,  // "comissao" ou "premiacao"
        unidadeBatida,
        configRem
      );

      // 3) percentual de meta atingido
      const pctMeta =
        m.meta > 0 ? (totalV / Number(m.meta)) * 100 : 0;

      const isEditing = editingId === m.id;

      return (
        <tr key={m.id}>
          <td>{isEditing ? (
            <input
              type="month"
              value={editPeriodo}
              onChange={(e) => setEditPeriodo(e.target.value)}
              className="modern-input"
            />
          ) : (
            m.periodo
          )}</td>

          <td>{isEditing ? (
            <input
              type="text"
              value={editResponsavel}
              onChange={(e) => setEditResponsavel(e.target.value)}
              className="modern-input"
            />
          ) : (
            m.responsavel
          )}</td>

          <td>{isEditing ? (
            <input
              type="number"
              value={editMeta}
              onChange={(e) => setEditMeta(e.target.value)}
              className="modern-input"
            />
          ) : (
            Number(m.meta).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          )}</td>

          <td>
            {totalV.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </td>

          <td>{pctMeta.toFixed(2)}%</td>

          <td>
            {remuneracao.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              
            })}
          </td>

          <td>{isEditing ? (
            <select
              value={editRemType}
              onChange={(e) => setEditRemType(e.target.value)}
              className="modern-input"
            >
              <option value="comissao">Comissão</option>
              <option value="premiacao">Premiação</option>
              
            </select>
          ) : m.remuneracaoType === "comissao" ? (
            "Comissão"
          ) : (
            "Premiação"
          )}</td>

          <td className="actions">
          {isEditing ? (
                    <>
                      <button
                        className="success-button"
                        onClick={() => handleSaveEditedMeta(m.id)}
                      >
                        ✓
                      </button>
                      <button
                        className="cancel-button"
                        onClick={() => setEditingId(null)}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="edit-button"
                        onClick={() => handleEditMeta(m)}
                      >
                        ✎
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteMeta(m.id)}
                      >
                        🗑
                      </button>
              </>
            )}
          </td>
        </tr>
      );
    })}
</tbody>

          </table>
        </section>
        

        




  
        <section className="product-filter-section">
          <button
            className="toggle-product-filter"
            onClick={() => setShowProductFilter(!showProductFilter)}
          >
            {showProductFilter ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="filter-icon" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
                Fechar Filtro
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="filter-icon" viewBox="0 0 24 24">
                  <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                </svg>
                Filtrar Produtos
              </>
            )}
          </button>
          
          {showProductFilter && (
            <div className="product-filter-grid">
              {produtos.map((produto, index) => (
                <label key={index} className="product-card">
                  <input
                    type="checkbox"
                    checked={produtosSelecionados.includes(produto)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProdutosSelecionados(prev => [...prev, produto]);
                      } else {
                        setProdutosSelecionados(prev => prev.filter(p => p !== produto));
                      }
                    }}
                  />
                  <div className="card-content">
                    <span className="checkmark">
                      <svg viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </span>
                    {produto}
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>
  
        <section className="chart-section">
          <div className="section-header">
            <h2>Desempenho vs Metas</h2>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="color-box achieved"></div>
                Atingido
              </div>
              <div className="legend-item">
                <div className="color-box pending"></div>
                Meta
              </div>
            </div>
          </div>
          <div className="chart-wrapper">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: {
                    // inverte a ordem na legenda, pra bater com o gráfico
                    filter: (_, i) => i > -1,
                  },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      `R$ ${ctx.raw.toLocaleString("pt-BR")}`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (v) => `R$ ${v.toLocaleString("pt-BR")}`,
                  },
                },
              },
            }}
          />
          </div>
        </section>  
      </main>
  
<style jsx>{`
    /* Base Styles & Variables */
  :root {
    --primary-color: #3b82f6;
    --primary-hover: #2563eb;
    --accent-color: #10b981;
    --error-color: #ef4444;
    --success-color: #10b981;
    --text-color: #1e293b;
    --text-light: #64748b;
    --border-color: #e2e8f0;
    --bg-color: #f8fafc;
    --card-bg: #ffffff;
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    --radius: 8px;
    --transition: all 0.3s ease;
    --header-height: 72px;
  }
.sidebar {
    width: 250px;
    background-color: white;
    border-right: 1px solid #e2e8f0;
    position: fixed;
    height: 100vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  metas-layout {
    display: flex;
    min-height: 100vh;
    background-color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
    .sidebar-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
    .sidebar-header h2 { font-size: 1.25rem; font-weight: 600; color: #4f46e5; margin: 0; }
    .main-content { flex: 1; margin-left: 250px; padding: 2rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    .header-content h1 { font-size: 1.75rem; font-weight: 600; margin: 0 1rem 0 0; }
    .badge { background-color: #eef2ff; color: #4f46e5; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-weight: 600; font-size: 0.875rem; }
    .header-actions { display: flex; align-items: center; gap: 1.5rem; }
    .last-update { font-size: 0.875rem; color: #64748b; }
    .dashboard-section { margin-bottom: 2rem; }
    .section-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: #1e293b; }
    .alert { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; }
    .alert.error { background-color: #fee2e2; color: #ef4444; }
    .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 1rem; }
    .loading-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-radius: 50%; border-top-color: #4f46e5; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    line-height: 1.5;
  }

  /* Layout Structure */
  .metas-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .metas-content {
    padding: 2rem;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
  }

  /* Header Styles */
  .metas-header {
    background-color: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .header-content h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    color: var(--text-color);
  }

  .decorative-line {
    display: inline-block;
    width: 4px;
    height: 24px;
    background-color: var(--primary-color);
    margin-right: 12px;
    border-radius: 2px;
  }

  /* Navigation Bar */
  .NavBar {
    background-color: var(--card-bg);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    height: var(--header-height);
    display: flex;
    align-items: center;
    padding: 0 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  /* Form Styles */
  .meta-form {
    background-color: var(--bg-color);
    border-radius: var(--radius);
    padding: 1.5rem;
  }

  .form-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    align-items: center;
  }

  .input-group {
    position: relative;
  }

  .modern-input {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    font-size: 14px;
    color: var(--text-color);
    background-color: white;
    transition: var(--transition);
  }

  .modern-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .modern-input::placeholder {
    color: var(--text-light);
  }

  /* Radio Group */
  .radio-group {
    display: flex;
    gap: 1rem;
  }

  .radio-group label {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-size: 14px;
  }

  .radio-group input[type="radio"] {
    position: absolute;
    opacity: 0;
  }

  .radio-group label span:first-of-type {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-color);
    border-radius: 50%;
    margin-right: 8px;
    position: relative;
    transition: var(--transition);
  }

  .radio-group input[type="radio"]:checked + span {
    border-color: var(--primary-color);
  }

  .radio-group input[type="radio"]:checked + span::after {
    content: "";
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: var(--primary-color);
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  /* Buttons */
  .primary-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--radius);
    padding: 0 20px;
    height: 42px;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
  }

  .primary-button:hover {
    background-color: var(--primary-hover);
  }

  .button-icon {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  /* Alert Styles */
  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--radius);
    margin: 1rem 0;
  }

  .alert.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--error-color);
    border-left: 4px solid var(--error-color);
  }

  .alert.success {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
    border-left: 4px solid var(--success-color);
  }

  .alert-icon {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  /* Table Styles */
  .section-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-right: auto;
  }

  .total-metas {
    color: var(--text-light);
    font-size: 14px;
    background-color: var(--bg-color);
    padding: 4px 12px;
    border-radius: 50px;
  }

  .metas-list {
    background-color: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .month-filter {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .month-filter label {
    font-size: 14px;
    color: var(--text-light);
  }

  .table-wrapper {
    overflow-x: auto;
    border-radius: var(--radius);
    border: 1px solid var(--border-color);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th,
  .data-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .data-table th {
    background-color: var(--bg-color);
    font-weight: 600;
    font-size: 14px;
    color: var(--text-light);
  }

  .data-table tr:last-child td {
    border-bottom: none;
  }

  .data-table tbody tr:hover {
    background-color: rgba(0, 0, 0, 0.01);
  }

  /* Action buttons */
  .actions {
    display: flex;
    gap: 8px;
  }

  .edit-button,
  .delete-button,
  .success-button,
  .cancel-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius);
    border: none;
    cursor: pointer;
    transition: var(--transition);
  }

  .edit-button {
    background-color: rgba(59, 130, 246, 0.1);
    color: var(--primary-color);
  }

  .edit-button:hover {
    background-color: rgba(59, 130, 246, 0.2);
  }

  .delete-button {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--error-color);
  }

  .delete-button:hover {
    background-color: rgba(239, 68, 68, 0.2);
  }

  .success-button {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--success-color);
  }

  .success-button:hover {
    background-color: rgba(16, 185, 129, 0.2);
  }

  .cancel-button {
    background-color: rgba(100, 116, 139, 0.1);
    color: var(--text-light);
  }

  .cancel-button:hover {
    background-color: rgba(100, 116, 139, 0.2);
  }

  .edit-button svg,
  .delete-button svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  /* Product Filter */
  .product-filter-section {
    background-color: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .toggle-product-filter {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-light);
    cursor: pointer;
    transition: var(--transition);
  }

  .toggle-product-filter:hover {
    background-color: var(--bg-color);
    color: var(--text-color);
  }

  .filter-icon {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  .product-filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .product-card {
    position: relative;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    overflow: hidden;
    cursor: pointer;
    transition: var(--transition);
  }

  .product-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
  }

  .product-card input[type="checkbox"] {
    position: absolute;
    opacity: 0;
  }

  .card-content {
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
  }

  .checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);
  }

  .checkmark svg {
    width: 16px;
    height: 16px;
    fill: white;
    opacity: 0;
    transition: var(--transition);
  }

  .product-card input[type="checkbox"]:checked + .card-content .checkmark {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
  }

  .product-card input[type="checkbox"]:checked + .card-content .checkmark svg {
    opacity: 1;
  }

  /* Chart Section */
  .chart-section {
    background-color: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .chart-wrapper {
    height: 400px;
    position: relative;
  }

  .chart-legend {
    display: flex;
    gap: 1.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-light);
  }

  .color-box {
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }

  .color-box.achieved {
    background-color: var(--primary-color);
  }

  .color-box.pending {
    background-color: var(--accent-color);
  }

  /* Custom tipo-group for editing */
  .tipo-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tipo-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    cursor: pointer;
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .form-group {
      grid-template-columns: 1fr;
    }
    
    .chart-wrapper {
      height: 300px;
    }
  }

  @media (max-width: 768px) {
    .metas-content {
      padding: 1rem;
    }
    
    .metas-header, 
    .metas-list,
    .product-filter-section,
    .chart-section {
      padding: 1.5rem;
    }
    
    .section-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .section-header h2 {
      margin-right: 0;
    }
    
    .chart-legend {
      margin-top: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .header-content h1 {
      font-size: 1.5rem;
    }
    
    .product-filter-grid {
      grid-template-columns: 1fr;
    }
    
    .chart-wrapper {
      height: 250px;
    }
  }
  
}

      `}</style>
    </div>
  );
 }
