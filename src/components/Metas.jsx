import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collection, collectionGroup, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
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

const NavBar = () => {
  const { unidade } = useParams();
  return (
    <nav className="nav-bar">
      <Link to={`/dashboard/${unidade}`} className="nav-link">Dashboard</Link>
      <Link to="/unidade" className="nav-link">Unidade</Link>
      <Link to={`/add-sale/${unidade}`} className="nav-link">Adicionar Venda</Link>
    </nav>
  );
};

export default function Metas() {
  const { unidade } = useParams();
  const navigate = useNavigate();

  // Estados para cadastro/edição de meta
  const [newResponsavel, setNewResponsavel] = useState("");
  const [newMeta, setNewMeta] = useState("");
  const [metaPeriodo, setMetaPeriodo] = useState(dayjs().format("YYYY-MM")); // Período da meta
  const [editingId, setEditingId] = useState(null);
  const [editResponsavel, setEditResponsavel] = useState("");
  const [editMeta, setEditMeta] = useState("");

  // Estados para mensagens e carregamento
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados para dados
  const [metas, setMetas] = useState([]);
  const [vendas, setVendas] = useState([]);

  // Estados para filtro de produtos (e persistência no localStorage)
  const [produtos, setProdutos] = useState([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState(() => {
    const stored = localStorage.getItem("produtosSelecionados");
    return stored ? JSON.parse(stored) : [];
  });
  const [showProductFilter, setShowProductFilter] = useState(false);

  // Outros estados para filtros, se necessário
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Estado para selecionar o mês/ano para a visualização dos dados
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));

  // Persistência da seleção de produtos
  useEffect(() => {
    localStorage.setItem("produtosSelecionados", JSON.stringify(produtosSelecionados));
  }, [produtosSelecionados]);

  // Redireciona se a unidade não estiver definida
  useEffect(() => {
    if (!unidade) {
      navigate("/login");
      return;
    }
  }, [unidade, navigate]);

  // Busca metas e vendas do Firestore
  useEffect(() => {
    // Carrega as metas da unidade atual
    const metasRef = collection(db, "faturamento", unidade.toLowerCase(), "metas");
    const unsubscribeMetas = onSnapshot(metasRef, (snapshot) => {
      const metasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMetas(metasData);
    });

    // Usa collectionGroup para puxar vendas de todas as unidades
    const vendasQuery = collectionGroup(db, "vendas");
    const unsubscribeVendas = onSnapshot(
      vendasQuery,
      (snapshot) => {
        const vendasData = snapshot.docs.map((doc) => doc.data());
        setVendas(vendasData);
        setLoading(false);

        // Extrai produtos únicos das vendas
        const prodSet = new Set();
        vendasData.forEach((v) => {
          if (v.produto) {
            prodSet.add(v.produto.trim());
          }
        });
        const prodArray = Array.from(prodSet).sort();
        setProdutos(prodArray);

        // Se não há seleção persistida, seleciona todos os produtos
        if (!localStorage.getItem("produtosSelecionados") || produtosSelecionados.length === 0) {
          setProdutosSelecionados(prodArray);
        }
      },
      (err) => {
        console.error("Erro ao carregar vendas:", err);
        setError("Falha ao carregar dados. Tente novamente mais tarde.");
      }
    );

    return () => {
      unsubscribeMetas();
      unsubscribeVendas();
    };
  }, [unidade, navigate]);

  // Função para cadastrar nova meta com período
  function parseBRNumber(str) {
    return Number(str.replace(/\./g, "").replace(",", "."));
  }
  const handleAddMeta = async (e) => {
    e.preventDefault();
    setError("");
    if (!newResponsavel || !newMeta) {
      setError("Preencha todos os campos");
      return;
    }
    try {
      const metaValor = parseBRNumber(newMeta);
      await addDoc(collection(db, "faturamento", unidade.toLowerCase(), "metas"), {
        responsavel: newResponsavel.trim(),
        meta: metaValor,
        periodo: metaPeriodo, // Armazena o período da meta (ex: "2025-04")
        createdAt: dayjs().toISOString(),
      });
      setSuccessMessage("Meta adicionada com sucesso!");
      setNewResponsavel("");
      setNewMeta("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Erro ao adicionar meta");
    }
  };

  const handleEditMeta = (meta) => {
    setEditingId(meta.id);
    setEditResponsavel(meta.responsavel);
    setEditMeta(meta.meta.toString());
  };

  const handleUpdateMeta = async (id) => {
    if (!editResponsavel || !editMeta) {
      setError("Preencha todos os campos");
      return;
    }
    try {
      await updateDoc(doc(db, "faturamento", unidade.toLowerCase(), "metas", id), {
        responsavel: editResponsavel.trim(),
        meta: Number(editMeta),
      });
      setSuccessMessage("Meta atualizada com sucesso!");
      setEditingId(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Erro ao atualizar meta");
      console.error(err);
    }
  };

  const handleDeleteMeta = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta meta?")) {
      try {
        await deleteDoc(doc(db, "faturamento", unidade.toLowerCase(), "metas", id));
        setSuccessMessage("Meta excluída com sucesso!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        setError("Erro ao excluir meta");
        console.error(err);
      }
    }
  };

  // Filtra as vendas para o cálculo das metas: somente vendas cujo produto esteja selecionado
  // E filtradas pelo período selecionado (usando selectedMonth)
  const vendasParaMeta = vendas.filter((v) => {
    if (!v.produto) return false;
    const condProduto = produtosSelecionados.includes(v.produto.trim());
    const condMes = selectedMonth
      ? dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === selectedMonth
      : true;
    return condProduto && condMes;
  });

  // Calcula a soma das vendas por responsável (para as vendas filtradas por período)
  const somaPorResponsavel = vendasParaMeta.reduce((acc, v) => {
    const key = v.responsavel || "Desconhecido";
    const valor = Number(v.valor) || 0;
    acc[key] = (acc[key] || 0) + valor;
    return acc;
  }, {});

  // Monta os dados do gráfico: para cada responsável, pega a meta cadastrada para o período selecionado
  const metasDoPeriodo = metas.filter((m) => m.periodo === selectedMonth);

// Para cada meta do período, pega as vendas do consultor correspondente filtradas pelo mês
const dadosGrafico = metasDoPeriodo.map((meta) => {
  const vendasResponsavel = vendas.filter((v) => {
    // Padroniza os nomes para comparação case-insensitive
    const respVenda = (v.responsavel || "").trim().toLowerCase();
    const metaResp = (meta.responsavel || "").trim().toLowerCase();
    // Filtra também por período: converte a data da venda para "YYYY-MM"
    const condMes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === selectedMonth;
    return respVenda === metaResp && condMes;
  });

  const totalVendas = vendasResponsavel.reduce(
    (acc, v) => acc + (Number(v.valor) || 0),
    0
  );

  return {
    nome: meta.responsavel,
    vendas: totalVendas,
    meta: Number(meta.meta) || 0,
  };
});

const chartData = {
  labels: dadosGrafico.map((d) => d.nome),
  datasets: [
    {
      type: "bar",
      label: "Vendas Realizadas",
      data: dadosGrafico.map((d) => d.vendas),
      backgroundColor: "#10B981",
      borderRadius: 4,
    },
    {
      label: "Meta",
      data: dadosGrafico.map((d) => d.meta),
      backgroundColor: "#F59E0B",
      borderRadius: 4,
    },
  ],
};

  // Paginação para a lista de vendas (caso seja necessário)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const paginatedVendas = vendas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calcula a média das vendas filtradas para o período (mês)
  const totalFiltrado = vendasParaMeta.reduce(
    (sum, v) => sum + (Number(v.valor) || 0),
    0
  );
  const mediaPorVenda =
    vendasParaMeta.length > 0 ? totalFiltrado / vendasParaMeta.length : 0;

  if (!unidade) return <div>Redirecionando...</div>;

  return (
    <div className="metas-container">
      <NavBar />
      
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
    {metas.map((meta) => (
      <option key={meta.id} value={meta.responsavel} />
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
    {/* Campo para selecionar o período se necessário */}
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
  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Responsável</th>
          <th>Meta (R$)</th>
          <th>Vendas (R$)</th>
          <th>% Meta</th>
          <th>Comissão</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {metas
          .filter((m) => m.periodo === selectedMonth) // Só exibe metas do período selecionado
          .map((m) => {
            // Filtra as vendas deste responsável para o período selecionado
            const vendasResponsavel = vendas.filter((v) => {
              const respVenda = (v.responsavel || "").trim().toLowerCase();
              const metaResp = (m.responsavel || "").trim().toLowerCase();
              // Filtra também pelo mês: extrai "YYYY-MM" da data da venda
              const condMes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === selectedMonth;
              return respVenda === metaResp && condMes;
            });
  
            // Soma os valores das vendas filtradas
            const totalVendas = vendasResponsavel.reduce(
              (acc, v) => acc + (Number(v.valor) || 0),
              0
            );
  
            const metaValor = Number(m.meta) || 0;
            const computedPercent = metaValor > 0 ? (totalVendas / metaValor) * 100 : 0;
            const excedente = computedPercent > 100 ? computedPercent - 100 : 0;
  
            
            const taxaSemMeta = 0.0084;
            const taxaComMeta = 0.0087;
            const comissao =
              totalVendas >= metaValor
                ? totalVendas * taxaComMeta
                : totalVendas * taxaSemMeta;
  
            return (
              <tr key={m.id}>
                <td>{m.responsavel}</td>
                <td>
                  {metaValor.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td>
                  {totalVendas.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td>
                  {metaValor
                    ? `${computedPercent.toFixed(2)}%` +
                      (excedente > 0 ? ` (+${excedente.toFixed(2)}%)` : "")
                    : "N/A"}
                </td>
                <td>
                  {comissao.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td className="actions">
                  {editingId === m.id ? (
                    <div className="action-buttons">
                      <button
                        className="success-button"
                        onClick={() => handleUpdateMeta(m.id)}
                      >
                        {/* Ícone de confirmação */}
                      </button>
                      <button
                        className="cancel-button"
                        onClick={() => setEditingId(null)}
                      >
                        {/* Ícone de cancelamento */}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="edit-button"
                        onClick={() => handleEditMeta(m)}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeleteMeta(m.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                          <path d="M3 6v18h18v-18h-18zm5 14c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm5 0c0 .552-.448 1-1 1s-1-.448-1-1v-10c0-.552.448-1 1-1s1 .448 1 1v10zm4-18v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.315c0 .901.73 2 1.631 2h5.712z"/>
                        </svg>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
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
                        setProdutosSelecionados([...produtosSelecionados, produto]);
                      } else {
                        setProdutosSelecionados(produtosSelecionados.filter(p => p !== produto));
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
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                      label: (ctx) => `R$ ${ctx.raw.toLocaleString('pt-BR')}`
                    }
                  }
                },
                scales: {
                  y: {
                    grid: { color: '#e2e8f0' },
                    ticks: {
                      color: '#64748b',
                      callback: (value) => `R$ ${value.toLocaleString('pt-BR')}`
                    }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { color: '#64748b' }
                  }
                }
              }}
            />
          </div>
        </section>
  
        
      </main>
  
      <style jsx>{`
          .delete-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            background-color: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
    }

        .delete-button svg {
          width: 1.25rem;
          height: 1.25rem;
          fill: #dc2626;
          transition: fill 0.2s ease;
        }

    /* Hover State */
    .delete-button:hover {
      background-color: #fee2e2;
      border-color: #fca5a5;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
    }

    /* Active State */
    .delete-button:active {
      background-color: #fecaca;
      transform: translateY(0);
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    /* Focus State */
    .delete-button:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3);
    }

    /* Loading State */
    .delete-button.loading {
      pointer-events: none;
      opacity: 0.8;
    }

    .delete-button.loading::after {
      content: "";
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid #fff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Disabled State */
    .delete-button:disabled {
      background-color: #f3f4f6;
      border-color: #e5e7eb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    .delete-button:disabled svg {
      fill: #9ca3af;
    }

    /* Icon Only Variation */
    .delete-button.icon-only {
      padding: 0.5rem;
      border-radius: 50%;
    }

    .delete-button.icon-only svg {
      margin: 0;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .metas-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f8fafc;
    }
  
    .nav-bar {
      display: flex;
      gap: 1.5rem;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #1e293b,rgb(61, 111, 228));
      border-radius: 16px;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
  
    .nav-link {
      color: #94a3b8;
      font-weight: 500;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      
      &:hover {
        color: #e2e8f0;
        background: rgba(255,255,255,0.05);
      }
      
      &::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background: #3b82f6;
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }
      
      &:hover::after {
        transform: scaleX(1);
      }
    }
  
        /* Estilos Gerais - Atualizados */
        .metas-content {
          padding: 2rem;
          flex: 1;
        }

        /* Cabeçalho - Estilo Mais Clean */
        .metas-header {
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
        padding: 1.75rem 2rem;
        margin-bottom: 1.5rem;
        border: 1px solid #e2e8f0;
      }

      .metas-header {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
      padding: 1.75rem 2rem;
      margin-bottom: 1.5rem;
      border: 1px solid #e2e8f0;
      }
      .header-content h1 {
      display: flex;
      align-items: center;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 1.5rem;
      margin-top: 0;
    }

      .decorative-line {
      display: inline-block;
      width: 4px;
      height: 24px;
      background-color: #3b82f6;
      margin-right: 12px;
      border-radius: 2px;
    }

        .meta-form {
        margin-top: 1rem;
      }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .form-group {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 1rem;
          align-items: center;
          }

          /* Improved Input Groups with Better Spacing */
          .input-group {
          position: relative;
        }

          .input-group label {
            font-size: 0.85rem;
            color: #64748b;
            font-weight: 500;
            margin-left: 0.2rem;
            transition: color 0.2s ease;
          }

          .input-group:focus-within label {
            color: #3b82f6;
          }

          /* Enhanced Modern Inputs */
          .modern-input {
            width: 100%;
            height: 45px;
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
            color: #1e293b;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            transition: all 0.2s ease;
          }

          .modern-input:hover {
            border-color: #cbd5e0;
            background-color: #fff;
          }

          .modern-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          background-color: #fff;
        }

          /* Polished Select Input */
          select.modern-input {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 16px;
          padding-right: 2.5rem;
          cursor: pointer;
        }

          .input-group select.modern-input:hover {
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
          }

          /* Enhanced Currency Input */
          .currency-input {
            position: relative;
          }

          .currency-input::before {
            content: 'R$';
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            font-weight: 500;
            font-size: 0.95rem;
            pointer-events: none;
          }
          
          .currency-input input {
          padding-left: 2.5rem;
        }

          .currency-input:focus-within::before {
            color: #3b82f6;
          }

          .input-group input[type="number"] {
            padding-left: 2.4rem;
          }

          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
          .input-group input[type="number"] {
            -moz-appearance: textfield;
          }

          /* Enhanced Month Input */
          .input-group input[type="month"] {
            padding: 0.65rem 0.8rem;
            cursor: pointer;
          }

          /* Modern Sleek Button */
          .primary-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          height: 45px;
          padding: 0 1.25rem;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          min-width: 160px;
        }
          .primary-button:hover {
          background-color: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

          .primary-button:active {
            background-color: #1d4ed8;
            transform: translateY(0);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }

          .primary-button .button-icon {
            width: 16px;
            height: 16px;
            fill: white;
          }

          /* Enhanced Period Display */
          .period-display {
            padding: 0.65rem 0.85rem;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.9rem;
            background-color: #f8fafc;
            color: #1e293b;
            height: 42px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }

          /* Header Styles */
          .metas-header {
            padding: 1.5rem 1.75rem;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }

          .header-content h1 {
            display: flex;
            align-items: center;
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1.25rem;
          }

          .decorative-line {
            display: inline-block;
            width: 3px;
            height: 24px;
            background-color: #3b82f6;
            margin-right: 10px;
            border-radius: 2px;
          }

          /* Improved Responsiveness */
          @media (max-width: 992px) {
            .form-group {
              grid-template-columns: 1.5fr 1fr 1fr;
              gap: 0.75rem;
            }
            
            .primary-button {
              grid-column: 1 / -1;
              margin-top: 0.5rem;
            }
          }

          @media (max-width: 768px) {
            .metas-header {
              padding: 1.25rem;
            }
            
            .form-group {
              grid-template-columns: 1fr 1fr;
            }
            
            .input-group:first-child {
              grid-column: 1 / -1;
            }
          }

          @media (max-width: 576px) {
            .form-group {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }
            
            .header-content h1 {
              font-size: 1.35rem;
            }
            
            .primary-button {
              width: 100%;
              margin-top: 0.5rem;
            }
          }

          /* Optional: Subtle Form Field Animation */
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            70% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          }

          .input-group:focus-within .modern-input {
            animation: pulse 1.5s;
          }

        /* Acessibilidade - Foco Visível */
        .modern-input:focus-visible, 
        .primary-button:focus-visible {
          outline: 2px solid #2b6cb0;
          outline-offset: 1px;
        }

        /* Efeitos de foco acessível */
        .modern-input:focus-visible, 
        .primary-button:focus-visible {
          outline: 2px solid #2b6cb0;
          outline-offset: 2px;
        }
  
        .primary-button {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          padding: 1rem 2rem;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
          border: none;
          width: 100%;
          justify-content: center;
  
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
  
          .button-icon {
            width: 20px;
            height: 20px;
            fill: currentColor;
          }
        }
  
        .alert {
          padding: 1.25rem 2rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 2rem auto;
          max-width: 800px;
          font-weight: 500;
          border-left: 6px solid;
  
          &.error {
            background: #fff5f5;
            border-color: #dc2626;
            color: #dc2626;
          }
  
          &.success {
            background: #f0fdf4;
            border-color: #16a34a;
            color: #16a34a;
          }
  
          .alert-icon {
            width: 24px;
            height: 24px;
            flex-shrink: 0;
          }
        }
  
        .product-filter-section {
          margin: 3rem 0;
  
          .toggle-product-filter {
            background: white;
            color: #1e293b;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin: 0 auto;
            transition: all 0.3s ease;
  
            &:hover {
              border-color: #94a3b8;
              transform: translateY(-1px);
            }
  
            .filter-icon {
              width: 20px;
              height: 20px;
              fill: currentColor;
            }
          }
        }
  
        .product-filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 2rem;
          max-width: 1200px;
          margin: 2rem auto;
  
          .product-card {
            position: relative;
            input { display: none; }
  
            .card-content {
              background: white;
              padding: 1.5rem;
              border-radius: 12px;
              border: 2px solid #e2e8f0;
              transition: all 0.3s ease;
              position: relative;
              cursor: pointer;
              text-align: center;
              font-weight: 500;
              color: #64748b;
  
              &:hover {
                border-color: #94a3b8;
                transform: translateY(-2px);
              }
            }
  
            input:checked + .card-content {
              background: #dbeafe;
              border-color: #3b82f6;
              color: #1d4ed8;
              font-weight: 600;
            }
  
            .checkmark {
              position: absolute;
              top: -8px;
              right: -8px;
              background: #3b82f6;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              transform: scale(0.8);
              transition: all 0.3s ease;
  
              svg {
                width: 16px;
                height: 16px;
                fill: white;
              }
            }
  
            input:checked + .card-content .checkmark {
              opacity: 1;
              transform: scale(1);
            }
          }
        }
  
        .chart-section {
          background: white;
          padding: 2.5rem;
          border-radius: 24px;
          margin: 3rem 0;
          box-shadow: 0 8px 24px rgba(0,0,0,0.05);
  
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
          }
  
          h2 {
            color: #0f172a;
            font-size: 1.75rem;
            font-weight: 700;
          }
  
          .chart-legend {
            display: flex;
            gap: 1.5rem;
  
            .legend-item {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              font-size: 0.875rem;
              color: #64748b;
            }
  
            .color-box {
              width: 16px;
              height: 16px;
              border-radius: 4px;
  
              &.achieved { background: #10b981 }
              &.pending { background: #f59e0b }
            }
          }
  
          .chart-wrapper {
            height: 500px;
            position: relative;
          }
        }
  
        .metas-list {
          background: white;
          padding: 2.5rem;
          border-radius: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.05);
          margin: 3rem 0;
  
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
          }
  
          h2 {
            color: #0f172a;
            font-size: 1.75rem;
            font-weight: 700;
          }
  
          .total-metas {
            color: #64748b;
            font-weight: 500;
            background: #f1f5f9;
            padding: 0.5rem 1rem;
            border-radius: 8px;
          }
  
          .table-wrapper {
            border: 2px solid #f1f5f9;
            border-radius: 16px;
            overflow: hidden;
          }
  
          table {
            width: 100%;
            background: white;
  
            th {
              background: #f8fafc;
              color: #64748b;
              padding: 1.25rem;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 0.875rem;
              letter-spacing: 0.5px;
            }
  
            td {
              padding: 1.25rem;
              border-bottom: 2px solid #f1f5f9;
              color: #334155;
            }
  
            tr:last-child td {
              border-bottom: none;
            }
  
            tr:hover td {
              background: #f8fafc;
            }
          }
  
          .user-info {
            display: flex;
            align-items: center;
            gap: 1rem;
          }
  
          .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #3b82f6;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
          }
  
          .meta-value {
            font-weight: 500;
            color: #1e293b;
          }
  
          .edit-input {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
  
            &:focus {
              border-color: #3b82f6;
              outline: none;
            }
          }
  
          .action-buttons {
            display: flex;
            gap: 0.5rem;
          }
  
          button {
            padding: 0.5rem;
            border-radius: 8px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
  
            svg {
              width: 20px;
              height: 20px;
              fill: currentColor;
            }
  
            &.save-button {
              background: #dcfce7;
              color: #16a34a;
  
              &:hover {
                background: #bbf7d0;
              }
            }
  
            &.cancel-button {
              background: #fee2e2;
              color: #dc2626;
  
              &:hover {
                background: #fecaca;
              }
            }
  
            &.edit-button {
              background: #dbeafe;
              color: #2563eb;
  
              &:hover {
                background: #bfdbfe;
              }
            }
          }
        }
  
        @media (max-width: 768px) {
          .metas-container {
            padding: 1rem;
          }
  
          .nav-bar {
            flex-direction: column;
            padding: 1rem;
          }
  
          .metas-header {
            h1 {
              font-size: 1.75rem;
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }
          }
  
          .product-filter-grid {
            grid-template-columns: 1fr;
          }
  
          .chart-section, .metas-list {
            padding: 1.5rem;
          }
  
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
 }
