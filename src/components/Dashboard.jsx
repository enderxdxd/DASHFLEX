import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { unidade } = useParams();
  return (
    <nav className="nav-bar">
      <Link to={`/metas/${unidade}`} className="nav-link">Metas</Link>
      <Link to = "/unidade" className="nav-link">Unidade</Link>
    </nav>
  );
};


ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Dashboard() {
  const { unidade } = useParams();
  const navigate = useNavigate();

  const [vendas, setVendas] = useState([]);
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [totalFaturado, setTotalFaturado] = useState(0);
  const [responsaveis, setResponsaveis] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState('month');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState("");

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError("");
    }
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Função para paginação - adicione isso antes do return
  


  // Busca dados do Firestore com realtime updates
  useEffect(() => {
    if (!unidade) {
      navigate("/login");
      return;
    }
  
    const fetchData = async () => {
      try {
        setLoading(true);
        // Consulta todas as vendas da unidade (você pode usar filtros por data se desejar)
        const vendasRef = collection(db, "faturamento", unidade.toLowerCase(), "vendas");
        const unsubscribe = onSnapshot(vendasRef, (snapshot) => {
          let todasVendas = [];
          let responsaveisSet = new Set();
          let produtosSet = new Set();
          let faturamentoTotal = 0;
  
          snapshot.forEach((doc) => {
            const data = doc.data();
            todasVendas.push(data);
            if (data.responsavel) responsaveisSet.add(data.responsavel);
            if (data.produto) produtosSet.add(data.produto);
            faturamentoTotal += Number(data.valor) || 0;
          });
  
          setVendas(todasVendas);
          setResponsaveis(Array.from(responsaveisSet).sort());
          setProdutos(Array.from(produtosSet).sort());
          setTotalFaturado(faturamentoTotal);
          setError("");
        });
  
        return () => unsubscribe();
      } catch (err) {
        console.error("Erro ao carregar vendas:", err);
        setError("Falha ao carregar dados. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [unidade, navigate]);

  // Upload do arquivo XLS
  const handleUpload = async () => {
    try {
      if (!file) {
        setError("Por favor, selecione um arquivo antes de enviar");
        return;
      }

      // Verificação de extensão
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!['xls', 'xlsx'].includes(fileExt)) {
        setError("Apenas arquivos .xls ou .xlsx são permitidos");
        return;
      }

      setUploading(true);
      setError("");
      setSuccessMessage("");

      const formData = new FormData();
      formData.append("file", file); // O campo 'file' deve ser o mesmo do backend
      formData.append("unidade", unidade);

      // Log para debug
      console.log("Enviando arquivo:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const response = await fetch(
        "https://southamerica-east1-chatpos-aff1a.cloudfunctions.net/uploadXLS",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta:", errorText);
        throw new Error(errorText || "Erro no servidor");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Erro ao processar arquivo");
      }

      setSuccessMessage(result.message || "Arquivo processado com sucesso!");
      setFile(null);
    } catch (error) {
      console.error("Erro no upload:", error);
      let errorMessage = "Erro ao enviar arquivo";
      if (error.message.includes("Nenhum arquivo foi recebido")) {
        errorMessage = "O servidor não recebeu o arquivo. Verifique o console para mais detalhes";
      } else {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Filtros e processamento de dados para exibição
  const vendasFiltradas = vendas.filter((v) => {
    const responsavel = v.responsavel || "";
    const produto = v.produto || "";
    const dataVenda = v.dataFormatada || ""; // Espera o formato "YYYY-MM-DD"

    const condResponsavel = filtroResponsavel
      ? responsavel.toLowerCase().includes(filtroResponsavel.toLowerCase())
      : true;
    const condProduto = filtroProduto
      ? produto.toLowerCase().includes(filtroProduto.toLowerCase())
      : true;

    // Filtro por data (usando o intervalo selecionado)
    let condData = true;
    if (startDate && endDate && dataVenda) {
      const saleDate = dayjs(dataVenda, "YYYY-MM-DD");
      condData = saleDate.isBetween(dayjs(startDate), dayjs(endDate), "day", "[]");
    }
    const condSearch = searchTerm
      ? Object.values(v).some(
          (val) =>
            val &&
            val.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true;
    return condResponsavel && condProduto && condData && condSearch;
  });

  const somaPorResponsavel = vendasFiltradas.reduce((acc, v) => {
    const key = v.responsavel || "Desconhecido";
    const valor = Number(v.valor) || 0;
    acc[key] = (acc[key] || 0) + valor;
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(somaPorResponsavel),
    datasets: [
      {
        label: "Faturamento por Responsável (R$)",
        data: Object.values(somaPorResponsavel),
        backgroundColor: "rgba(54, 162, 235, 0.7)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const totalFiltrado = vendasFiltradas.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
  const mediaPorVenda = vendasFiltradas.length > 0
    ? totalFiltrado / vendasFiltradas.length
    : 0;

  if (!unidade) return <div>Redirecionando...</div>;

  const paginatedVendas = vendasFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  

  return (
    <div className="dashboard-container">
      <NavBar />
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Dashboard - {unidade.toUpperCase()}</h1>
            <p className="last-update">
              Última atualização: {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
          
        </div>
        <div className="header-stats">
          <div className="stat-card primary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 1V23"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="stat-info">
              <span>Total Faturado</span>
              <strong>
                {totalFaturado.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
              <div className="stat-trend up">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 19V5M5 12L12 5L19 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>12%</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card secondary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21V12H15V21M3 7H21V11H3V7ZM5 11V21H19V11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="stat-info">
              <span>Vendas (mês)</span>
              <strong>{vendas.length}</strong>
              <div className="stat-trend up">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 19V5M5 12L12 5L19 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>8%</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card tertiary">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M12 8V14M12 14V14.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="stat-info">
              <span>Média/Venda</span>
              <strong>
                {(totalFaturado / (vendas.length || 1)).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
              <div className="stat-trend down">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5V19M19 12L12 19L5 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>3%</span>
              </div>
            </div>
          </div>
        </div>
      </header>
  
      <section className="card upload-section">
        <div className="section-header">
          <h2>Importar Novo Relatório</h2>
          <p>Adicione um novo arquivo Excel para atualizar os dados do dashboard</p>
        </div>
        <div
          className="upload-area"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              setFile(e.dataTransfer.files[0]);
              setError("");
            }
          }}
        >
          <div className={`upload-content ${file ? "has-file" : ""}`}>
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 8L12 3L7 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 3V15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="upload-text">
              {file ? (
                <>
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                </>
              ) : (
                <>
                  <p>Arraste e solte seu arquivo aqui ou</p>
                  <label className="browse-button">
                    Selecione no computador
                    <input
                      type="file"
                      name="file"
                      accept=".xls,.xlsx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                          setError("");
                        }
                      }}
                      disabled={uploading}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
          {file && (
            <div className="upload-actions">
              <button
                className="cancel-button"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`upload-button ${uploading ? "loading" : ""}`}
              >
                {uploading ? (
                  <>
                    <span className="spinner"></span>
                    Enviando...
                  </>
                ) : (
                  <>
                    <span className="upload-icon">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    Enviar Arquivo
                  </>
                )}
              </button>
            </div>
          )}
          {error && (
            <div className="alert error">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 8V12V8ZM12 16H12.01H12ZM21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="alert success">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 4L12 14.01L9 11.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}
        </div>
      </section>
  
      <section className="card filters-section">
        <div className="section-header">
          <h2>Filtros e Controles</h2>
          <p>Personalize a visualização dos dados conforme suas necessidades</p>
        </div>
        
        <div className="filter-container">
          <div className="filter-controls">
            <div className="filter-group">
              <label>Responsável</label>
              <div className="select-wrapper">
                <select
                  value={filtroResponsavel}
                  onChange={(e) => setFiltroResponsavel(e.target.value)}
                >
                  <option value="">Todos</option>
                  {responsaveis.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="select-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="filter-group">
              <label>Produto</label>
              <div className="select-wrapper">
                <select
                  value={filtroProduto}
                  onChange={(e) => setFiltroProduto(e.target.value)}
                >
                  <option value="">Todos</option>
                  {produtos.map((p, i) => (
                    <option key={i} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <div className="select-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="filter-group">
              <label>Data (Texto)</label>
              <input
                type="text"
                placeholder="Filtrar por data..."
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
              />
            </div>
            
            <div className="filter-group date-range">
              <label>Intervalo de Datas</label>
              <div
                className="date-range-display"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                {startDate ? startDate.toLocaleDateString("pt-BR") : "Data inicial"}{" "}
                <span>a</span>{" "}
                {endDate ? endDate.toLocaleDateString("pt-BR") : "Data final"}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15.6947 13.7H15.7037M15.6947 16.7H15.7037M11.9955 13.7H12.0045M11.9955 16.7H12.0045M8.29431 13.7H8.30329M8.29431 16.7H8.30329"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {showDatePicker && (
                <div className="date-picker-popup">
                  <DatePicker
                    selected={startDate}
                    onChange={(dates) => {
                      const [start, end] = dates;
                      setStartDate(start);
                      setEndDate(end);
                      if (start && end) setShowDatePicker(false);
                    }}
                    startDate={startDate}
                    endDate={endDate}
                    selectsRange
                    inline
                    monthsShown={2}
                    locale="pt-BR"
                    dateFormat="dd/MM/yyyy"
                  />
                </div>
              )}
            </div>
            
            <div className="filter-group search-filter">
              <label>Pesquisar</label>
              <input
                type="text"
                placeholder="Digite para pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="filter-stats-card">
            <div className="stats-header">
              <h3>Estatísticas Filtradas</h3>
              <div className="stats-period">
                {startDate && endDate
                  ? `${startDate.toLocaleDateString("pt-BR")} - ${endDate.toLocaleDateString("pt-BR")}`
                  : "Período completo"}
              </div>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{vendasFiltradas.length}</div>
                <div className="stat-label">Vendas</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {totalFiltrado.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <div className="stat-label">Total Faturado</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {mediaPorVenda.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <div className="stat-label">Média por Venda</div>
              </div>
            </div>
          </div>
        </div>
      </section>
  
      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Carregando dados...</span>
        </div>
      ) : (
        <>
          <section className="card chart-section">
            <div className="section-header">
              <div className="section-title">
                <h2>Performance por Responsável</h2>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color primary"></span>
                    <span>Valor Total</span>
                  </div>
                </div>
              </div>
              <div className="chart-actions">
                <button
                  className={`chart-action ${chartTimeRange === "week" ? "active" : ""}`}
                  onClick={() => setChartTimeRange("week")}
                >
                  Semana
                </button>
                <button
                  className={`chart-action ${chartTimeRange === "month" ? "active" : ""}`}
                  onClick={() => setChartTimeRange("month")}
                >
                  Mês
                </button>
                <button
                  className={`chart-action ${chartTimeRange === "year" ? "active" : ""}`}
                  onClick={() => setChartTimeRange("year")}
                >
                  Ano
                </button>
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
                      backgroundColor: "#1E293B",
                      titleColor: "#F8FAFC",
                      bodyColor: "#F8FAFC",
                      borderColor: "#334155",
                      borderWidth: 1,
                      padding: 12,
                      cornerRadius: 8,
                      displayColors: true,
                      callbacks: {
                        label: (context) =>
                          `R$ ${context.raw.toFixed(2).replace(".", ",")}`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: "#E2E8F0",
                        borderDash: [4, 4],
                        drawBorder: false,
                      },
                      ticks: {
                        color: "#64748B",
                        callback: (value) =>
                          `R$ ${value.toLocaleString("pt-BR")}`,
                      },
                    },
                    x: { grid: { display: false }, ticks: { color: "#64748B" } },
                  },
                }}
              />
            </div>
          </section>
  
          <section className="card table-section">
            <div className="section-header">
              <div className="section-title">
                <h2>Detalhes das Vendas</h2>
                <div className="results-count">
                  <span>{vendasFiltradas.length}</span> resultados encontrados
                </div>
              </div>
              <div className="table-actions">
                <button className="export-button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 10L12 15L17 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 15V3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Exportar
                </button>
              </div>
            </div>
            
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort("dataFormatada")}>
                      Data {sortConfig.key === "dataFormatada" && (
                        <span className="sort-icon">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th>Produto</th>
                    <th>Matrícula</th>
                    <th>Nome</th>
                    <th className="sortable" onClick={() => handleSort("responsavel")}>
                      Responsável {sortConfig.key === "responsavel" && (
                        <span className="sort-icon">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th className="sortable numeric" onClick={() => handleSort("valor")}>
                      Valor {sortConfig.key === "valor" && (
                        <span className="sort-icon">
                          {sortConfig.direction === "ascending" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVendas.length > 0 ? (
                    paginatedVendas.map((venda, index) => (
                      <tr key={index}>
                        <td data-label="Data">{dayjs(venda.dataFormatada).format("DD/MM/YYYY")}</td>
                        <td data-label="Produto">
                          <span className="product-badge">{venda.produto}</span>
                        </td>
                        <td data-label="Matrícula">{venda.matricula}</td>
                        <td data-label="Nome">{venda.nome}</td>
                        <td data-label="Responsável">
                          <div className="responsible-cell">
                            <span className="avatar">{venda.responsavel.charAt(0)}</span>
                            {venda.responsavel}
                          </div>
                        </td>
                        <td data-label="Valor" className="currency">
                          <span className={`value ${Number(venda.valor) > 5000 ? "highlight" : ""}`}>
                            {Number(venda.valor).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </td>
                        <td data-label="Pagamento">{venda.formaPagamento}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="no-results">
                      <td colSpan="7">
                        <div className="empty-state">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <p>Nenhuma venda encontrada com os filtros atuais</p>
                          <button onClick={() => {
                            setFiltroResponsavel("");
                            setFiltroProduto("");
                            setStartDate(null);
                            setEndDate(null);
                          }} className="reset-button">
                            Limpar filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {vendasFiltradas.length > itemsPerPage && (
              <div className="pagination">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {Array.from({ length: Math.ceil(vendasFiltradas.length / itemsPerPage) }, (_, i) => (
                  <button 
                    key={i} 
                    className={currentPage === i + 1 ? "active" : ""}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button disabled={currentPage === Math.ceil(vendasFiltradas.length / itemsPerPage)} onClick={() => setCurrentPage(currentPage + 1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </section>
        </>
      )}
  
      <style jsx>{`
        :root {
          --primary: #4F46E5;
          --primary-light: #6366F1;
          --primary-dark: #4338CA;
          --secondary: #10B981;
          --secondary-light: #34D399;
          --secondary-dark: #059669;
          --tertiary: #F59E0B;
          --tertiary-light: #FBBF24;
          --tertiary-dark: #D97706;
          --danger: #EF4444;
          --danger-light: #F87171;
          --danger-dark: #DC2626;
          --gray-50: #F8FAFC;
          --gray-100: #F1F5F9;
          --gray-200: #E2E8F0;
          --gray-300: #CBD5E1;
          --gray-400: #94A3B8;
          --gray-500: #64748B;
          --gray-600: #475569;
          --gray-700: #334155;
          --gray-800: #1E293B;
          --gray-900: #0F172A;
        }
        navbar {
          background: white;
          padding: 1rem 2rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--primary);
          text-decoration: none;
        }

        .nav-links {
          display: flex;
          gap: 1.5rem;
        }

        .nav-link {
          color: var(--gray-500);
          text-decoration: none;
          font-weight: 500;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .nav-link.active {
          color: var(--primary);
          background-color: rgba(79, 70, 229, 0.1);
        }
        
        .logo-icon {
          width: 32px;
          height: 32px;
          stroke-width: 1.5;
        }
        
        .nav-links {
          display: flex;
          gap: 2rem;
          align-items: center;
          transition: all 0.3s ease;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--gray-600);
          font-weight: 500;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        
        .nav-link:hover {
          background: var(--gray-50);
          color: var(--primary);
        }
        
        .nav-link:hover .nav-icon {
          stroke: var(--primary);
        }
        
        .nav-icon {
          width: 20px;
          height: 20px;
          stroke: var(--gray-600);
          stroke-width: 1.75;
          transition: stroke 0.2s ease;
        }
        
        .menu-toggle {
          display: none;
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          color: var(--gray-600);
        }
        
        .menu-toggle svg {
          width: 24px;
          height: 24px;
        }
        
        @media (max-width: 768px) {
          .navbar-container {
            padding: 1rem;
          }
          
          .nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            gap: 0;
            padding: 1rem 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            max-height: 0;
            overflow: hidden;
            opacity: 0;
          }
          
          .nav-links.active {
            max-height: 500px;
            opacity: 1;
          }
          
          .nav-link {
            width: 100%;
            padding: 1rem 2rem;
            border-radius: 0;
          }
          
          .menu-toggle {
            display: block;
          }
        }
        
        .dashboard-container {
          padding: 2rem;
          max-width: 1600px;
          margin: 0 auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          color: var(--gray-800);
          background-color: var(--gray-50);
        }
        
        /* Header Moderno */
        .dashboard-header {
          margin-bottom: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          padding: 1.5rem 2rem;
        }
        
        .header-title h1 {
          color: var(--gray-900);
          margin-bottom: 0.25rem;
          font-size: 1.75rem;
          font-weight: 700;
        }
        
        .last-update {
          color: var(--gray-500);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }
        
        .header-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        
        .stat-card {
          background: white;
          padding: 1.25rem;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid var(--gray-100);
          transition: all 0.2s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        }
        
        .stat-card.primary {
          border-top: 4px solid var(--primary);
        }
        
        .stat-card.secondary {
          border-top: 4px solid var(--secondary);
        }
        
        .stat-card.tertiary {
          border-top: 4px solid var(--tertiary);
        }
        
        .stat-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        
        .stat-card.primary .stat-icon {
          background-color: rgba(79, 70, 229, 0.1);
          color: var(--primary);
        }
        
        .stat-card.secondary .stat-icon {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--secondary);
        }
        
        .stat-card.tertiary .stat-icon {
          background-color: rgba(245, 158, 11, 0.1);
          color: var(--tertiary);
        }
        
        .stat-info span {
          display: block;
          color: var(--gray-500);
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          font-weight: 500;
        }
        
        .stat-info strong {
          font-size: 1.5rem;
          color: var(--gray-900);
          font-weight: 700;
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .stat-trend {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
        }
        
        .stat-trend.up {
          color: var(--secondary-dark);
          background-color: rgba(16, 185, 129, 0.1);
        }
        
        .stat-trend.down {
          color: var(--danger-dark);
          background-color: rgba(239, 68, 68, 0.1);
        }
        
        /* Seção de Upload Modernizada */
        .upload-section {
          margin-bottom: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          padding: 1.5rem 2rem;
        }
        
        .section-header h2 {
          color: var(--gray-900);
          margin-top: 0;
          margin-bottom: 0.5rem;
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .section-header p {
          color: var(--gray-500);
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }
        
        .upload-area {
          border: 2px dashed var(--gray-200);
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s ease;
          background-color: var(--gray-50);
        }
        
        .upload-area:hover {
          border-color: var(--primary-light);
          background-color: rgba(79, 70, 229, 0.02);
        }
        
        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        
        .upload-content.has-file {
          flex-direction: row;
          justify-content: center;
          text-align: left;
          gap: 1.5rem;
        }
        
        .upload-icon {
          color: var(--primary);
        }
        
        .upload-text p {
          margin: 0;
          color: var(--gray-600);
        }
        
        .file-name {
          font-weight: 500;
          color: var(--gray-800) !important;
        }
        
        .file-size {
          font-size: 0.875rem;
          color: var(--gray-500) !important;
        }
        
        .browse-button {
          display: inline-block;
          padding: 0.5rem 1rem;
          background-color: var(--primary);
          color: white;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 0.5rem;
        }
        
        .browse-button:hover {
          background-color: var(--primary-dark);
        }
        
        .browse-button input {
          display: none;
        }
        
        .upload-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          justify-content: center;
        }
        
        .upload-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background-color: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .upload-button:hover {
          background-color: var(--primary-dark);
          transform: translateY(-1px);
        }
        
        .upload-button:disabled {
          background-color: var(--gray-300);
          cursor: not-allowed;
          transform: none;
        }
        
        .upload-button.loading {
          background-color: var(--primary-light);
        }
        
        .cancel-button {
          padding: 0.625rem 1.25rem;
          background-color: white;
          color: var(--gray-700);
          border: 1px solid var(--gray-300);
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .cancel-button:hover {
          background-color: var(--gray-100);
          border-color: var(--gray-400);
        }
        
        /* Alertas Modernos */
        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .alert.error {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--danger-dark);
          border-left: 4px solid var(--danger);
        }
        
        .alert.success {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--secondary-dark);
          border-left: 4px solid var(--secondary);
        }
        
        /* Seção de Filtros Modernizada */
        .filters-section {
          margin-bottom: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          padding: 1.5rem 2rem;
        }
        
        .filter-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }
        
        @media (max-width: 1024px) {
          .filter-container {
            grid-template-columns: 1fr;
          }
        }
        
        .filter-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
        }
        
        .filter-group label {
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--gray-700);
          font-size: 0.875rem;
        }
        
        .select-wrapper {
          position: relative;
        }
        
        .select-wrapper select {
          width: 100%;
          padding: 0.625rem 1rem;
          padding-right: 2.5rem;
          border: 1px solid var(--gray-300);
          border-radius: 6px;
          background-color: white;
          font-size: 0.875rem;
          color: var(--gray-800);
          appearance: none;
          transition: border-color 0.2s;
        }
        
        .select-wrapper select:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
        }
        
        .select-arrow {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: var(--gray-400);
        }
        
        .date-range {
          position: relative;
        }
        
        .date-range-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border: 1px solid var(--gray-300);
          border-radius: 6px;
          background-color: white;
          font-size: 0.875rem;
          color: var(--gray-800);
          cursor: pointer;
          transition: border-color 0.2s;
        }
        
        .date-range-display:hover {
          border-color: var(--gray-400);
        }
        
        .date-range-display svg {
          margin-left: auto;
        }
        
        .date-picker-popup {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 100;
          margin-top: 0.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 1rem;
        }
        
        .reset-filters {
          align-self: flex-end;
          padding: 0.625rem 1rem;
          background-color: white;
          color: var(--gray-700);
          border: 1px solid var(--gray-300);
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .reset-filters:hover {
          background-color: var(--gray-100);
          border-color: var(--gray-400);
        }
        
        /* Cartão de Estatísticas */
        .filter-stats-card {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
          border-radius: 10px;
          padding: 1.5rem;
          color: white;
        }
        
        .stats-header {
          margin-bottom: 1.5rem;
        }
        
        .stats-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .stats-period {
          font-size: 0.75rem;
          opacity: 0.8;
          margin-top: 0.25rem;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        
        .stat-label {
          font-size: 0.75rem;
          opacity: 0.8;
        }
        
        /* Seção de Gráficos */
        .chart-section {
          margin-bottom: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          padding: 1.5rem 2rem;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        
        .chart-legend {
          display: flex;
          gap: 1rem;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--gray-600);
        }
        
        .legend-color {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 4px;
        }
        
        .legend-color.primary {
          background-color: var(--primary);
        }
        
        .chart-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        
        .chart-action {
          padding: 0.375rem 0.75rem;
          background-color: white;
          color: var(--gray-600);
          border: 1px solid var(--gray-300);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .chart-action:hover {
          background-color: var(--gray-100);
        }
        
        .chart-action.active {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        
        .chart-wrapper {
          height: 400px;
          width: 100%;
        }
        
        /* Seção de Tabela Modernizada */
        .sales-section {
          margin-bottom: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          padding: 1.5rem 2rem;
        }
        
        .results-count {
          font-size: 0.875rem;
          color: var(--gray-500);
        }
        
        .results-count span {
          font-weight: 600;
          color: var(--gray-800);
        }
        
        .table-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 1rem;
        }
        
        .export-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: white;
          color: var(--gray-700);
          border: 1px solid var(--gray-300);
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .export-button:hover {
          background-color: var(--gray-100);
          border-color: var(--gray-400);
        }
        
        .table-container {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid var(--gray-200);
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        
        th {
          background-color: var(--gray-50);
          color: var(--gray-600);
          font-weight: 600;
          text-align: left;
          padding: 0.75rem 1rem;
          white-space: nowrap;
          position: sticky;
          top: 0;
        }
        
        th.sortable {
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        th.sortable:hover {
          background-color: var(--gray-100);
        }
        
        .sort-icon {
          margin-left: 0.25rem;
        }
        
        th.numeric {
          text-align: right;
        }
        
        td {
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--gray-200);
          color: var(--gray-700);
        }
        
        tr:hover td {
          background-color: var(--gray-50);
        }
        
        .product-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background-color: var(--gray-100);
          color: var(--gray-700);
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .responsible-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background-color: var(--primary);
          color: white;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .value {
          font-family: 'Roboto Mono', monospace;
          font-weight: 500;
        }
        
        .value.highlight {
          color: var(--primary);
          font-weight: 600;
        }
        
        .payment-method {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .payment-method.cartão {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--secondary-dark);
        }
        
        .payment-method.boleto {
          background-color: rgba(245, 158, 11, 0.1);
          color: var(--tertiary-dark);
        }
        
        .payment-method.dinheiro {
          background-color: rgba(99, 102, 241, 0.1);
          color: var(--primary-dark);
        }
        
        .payment-method.pix {
          background-color: rgba(139, 92, 246, 0.1);
          color: #7C3AED;
        }
        
        .no-results td {
          padding: 2rem;
          text-align: center;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        
        .empty-state svg {
          color: var(--gray-400);
        }
        
        .empty-state p {
          color: var(--gray-500);
          margin: 0;
        }
        
        .reset-button {
          padding: 0.5rem 1rem;
          background-color: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 1rem;
        }
        
        .reset-button:hover {
          background-color: var(--primary-dark);
        }
        
        /* Rodapé da Tabela */
        .table-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1rem;
        }
        
        .rows-count {
          font-size: 0.875rem;
          color: var(--gray-500);
        }
        
        .pagination {
          display: flex;
          gap: 0.5rem;
        }
        
        .pagination button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background-color: white;
          color: var(--gray-700);
          border: 1px solid var(--gray-300);
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .pagination button:hover:not(:disabled) {
          background-color: var(--gray-100);
          border-color: var(--gray-400);
        }
        
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .pagination button.active {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        
        /* Loading Indicator */
        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        
        .spinner {
          display: inline-block;
          width: 2rem;
          height: 2rem;
          border: 3px solid rgba(79, 70, 229, 0.1);
          border-radius: 50%;
          border-top-color: var(--primary);
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        /* Responsividade */
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 1rem;
          }
          
          .header-stats {
            grid-template-columns: 1fr;
          }
          
          .upload-content.has-file {
            flex-direction: column;
            text-align: center;
          }
          
          .upload-actions {
            flex-direction: column;
          }
          
          .upload-button, .cancel-button {
            width: 100%;
            justify-content: center;
          }
          
          table {
            display: block;
          }
          
          th, td {
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
 }
