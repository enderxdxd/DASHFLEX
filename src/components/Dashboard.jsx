import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    const dataVenda = v.dataFormatada || "";
    const condResponsavel = filtroResponsavel
      ? responsavel.toLowerCase().includes(filtroResponsavel.toLowerCase())
      : true;
    const condProduto = filtroProduto
      ? produto.toLowerCase().includes(filtroProduto.toLowerCase())
      : true;
    const condData = filtroData
      ? dataVenda.includes(filtroData)
      : true;
    return condResponsavel && condProduto && condData;
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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard - {unidade.toUpperCase()}</h1>
        <div className="header-stats">
          <div className="stat-card">
            <span>Total Faturado</span>
            <strong>
              {totalFaturado.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
          <div className="stat-card">
            <span>Vendas (mês)</span>
            <strong>{vendas.length}</strong>
          </div>
          <div className="stat-card">
            <span>Média por Venda</span>
            <strong>
              {(totalFaturado / (vendas.length || 1)).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>
        </div>
      </header>

      {/* Seção de Upload */}
      <section className="upload-section card">
        <h2>Importar Novo Relatório</h2>
        <div className="upload-controls">
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
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={uploading ? "loading" : ""}
          >
            {uploading ? (
              <>
                <span className="spinner"></span>
                Enviando...
              </>
            ) : (
              "Enviar Arquivo"
            )}
          </button>
        </div>
        {error && <div className="alert error">{error}</div>}
        {successMessage && <div className="alert success">{successMessage}</div>}
      </section>

      {/* Seção de Filtros */}
      <section className="filters-section card">
        <h2>Filtros</h2>
        <div className="filter-grid">
          <div className="filter-group">
            <label>Responsável</label>
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
          </div>
          <div className="filter-group">
            <label>Produto</label>
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
          </div>
          <div className="filter-group">
            <label>Data (YYYY-MM-DD)</label>
            <input
              type="text"
              placeholder="Filtrar por data..."
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Estatísticas Filtradas</label>
            <div className="filter-stats">
              <span>
                {vendasFiltradas.length} vendas | Total:{" "}
                {totalFiltrado.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}{" "}
                | Média:{" "}
                {mediaPorVenda.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Carregando dados...</span>
        </div>
      ) : (
        <>
          <section className="chart-section card">
            <h2>Performance por Responsável</h2>
            <div className="chart-wrapper">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "top" },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          return `R$ ${context.raw
                            .toFixed(2)
                            .replace(".", ",")}`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function (value) {
                          return `R$ ${value.toLocaleString("pt-BR")}`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </section>

          <section className="sales-section card">
            <h2>Detalhes das Vendas ({vendasFiltradas.length})</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Matrícula</th>
                    <th>Nome</th>
                    <th>Responsável</th>
                    <th>Valor (R$)</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasFiltradas.length > 0 ? (
                    vendasFiltradas
                      .sort(
                        (a, b) =>
                          dayjs(b.dataFormatada) - dayjs(a.dataFormatada)
                      )
                      .map((venda, index) => (
                        <tr key={index}>
                          <td>
                            {dayjs(venda.dataFormatada).format("DD/MM/YYYY")}
                          </td>
                          <td>{venda.produto}</td>
                          <td>{venda.matricula}</td>
                          <td>{venda.nome}</td>
                          <td>{venda.responsavel}</td>
                          <td className="currency">
                            {Number(venda.valor).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>
                          <td>{venda.formaPagamento}</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="7">
                        Nenhuma venda encontrada com os filtros atuais
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .dashboard-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
        }
        .dashboard-header {
          margin-bottom: 2rem;
        }
        .dashboard-header h1 {
          color: #2c3e50;
          margin-bottom: 1rem;
          font-size: 2rem;
        }
        .header-stats {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          flex: 1;
          background: #fff;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          text-align: center;
        }
        .stat-card span {
          display: block;
          color: #7f8c8d;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .stat-card strong {
          font-size: 1.5rem;
          color: #2c3e50;
        }
        .card {
          background: #fff;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          margin-bottom: 2rem;
        }
        .card h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          color: #2c3e50;
          font-size: 1.5rem;
        }
        .upload-section {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
        }
        .upload-controls {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .upload-controls input[type="file"] {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: #fff;
        }
        .upload-controls button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
        }
        .upload-controls button:hover {
          background: #2563eb;
        }
        .upload-controls button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }
        .upload-controls button.loading {
          background: #60a5fa;
        }
        .filters-section {
          background: #f8fafc;
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
        }
        .filter-group label {
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #475569;
          font-size: 0.9rem;
        }
        .filter-group select,
        .filter-group input {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #fff;
          font-size: 1rem;
        }
        .filter-stats {
          padding: 0.75rem;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #475569;
        }
        .chart-section {
          height: 400px;
        }
        .chart-wrapper {
          height: 350px;
          width: 100%;
        }
        .sales-section {
          overflow: hidden;
        }
        .table-wrapper {
          overflow-x: auto;
          max-height: 600px;
          overflow-y: auto;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        th,
        td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        th {
          background: #f8fafc;
          font-weight: 600;
          color: #475569;
          position: sticky;
          top: 0;
        }
        tr:hover {
          background: #f8fafc;
        }
        .currency {
          font-family: "Courier New", monospace;
          font-weight: 500;
        }
        .alert {
          padding: 1rem;
          border-radius: 6px;
          margin-top: 1rem;
          font-weight: 500;
        }
        .alert.error {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }
        .alert.success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }
        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
          color: #64748b;
        }
        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
