import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { collectionGroup, collection, onSnapshot,getDocs, writeBatch,updateDoc,doc } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
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
import { useLocation } from "react-router-dom";
dayjs.extend(isBetween);

const NavBar = () => {
  const { unidade } = useParams();
  const location = useLocation();
  const isActive = (path) => {
    return location.pathname.includes(path);
  };
  return (
    <nav className="nav-bar">
      <Link 
        to={`/metas/${unidade}`} 
        className={`nav-link ${isActive('/metas/') ? 'active' : ''}`}
      >
        Metas
      </Link>
      
      <Link 
        to="/unidade" 
        className={`nav-link ${isActive('/unidade') ? 'active' : ''}`}
      >
        Unidade
      </Link>
      
      <Link 
        to={`/add-sale/${unidade}`} 
        className={`nav-link ${isActive('/add-sale/') ? 'active' : ''}`}
      >
        Adicionar Venda
      </Link>
      
      <Link 
        to={`/config-remuneracao/${unidade}`}
        className={`nav-link ${isActive('/config-remuneracao/') ? 'active' : ''}`}
      >
        Config Remuneração
      </Link>
    </nav>
  );
};

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Dashboard() {
  const { unidade } = useParams();
  const navigate = useNavigate();

  // Estados gerais
  const [vendas, setVendas] = useState([]);
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [totalFaturado, setTotalFaturado] = useState(0);
  const [totalCurrent, setTotalCurrent] = useState(0);
  const [totalPrevious, setTotalPrevious] = useState(0);
  const [percentChange, setPercentChange] = useState(0);

  // Estados para filtros, datas e pesquisa
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filtroNome, setFiltroNome] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [editingId, setEditingId] = useState(null);
  const [editedVenda, setEditedVenda] = useState({});
  const [produtosSelecionados, setProdutosSelecionados] = useState([]);



  // Estados para upload de arquivo
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Estados para ordenação, paginação e gráficos
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "ascending" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [chartTimeRange, setChartTimeRange] = useState("month");

  // Estados para extrair responsáveis e produtos das vendas
  const [responsaveis, setResponsaveis] = useState([]);
  const [produtos, setProdutos] = useState([]);
  async function deleteAllDocumentsFromSubcollection(unidade, subcollectionName) {
    const subcolRef = collection(db, "faturamento", unidade.toLowerCase(), subcollectionName);
    const snapshot = await getDocs(subcolRef);
  
    if (snapshot.empty) {
      console.log(`Nenhum documento encontrado na subcoleção "${subcollectionName}"`);
      return;
    }
  
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
  
    await batch.commit();
    console.log(`Todos os documentos da subcoleção "${subcollectionName}" foram excluídos.`);
  }
  
  // Função que exclui os dados da unidade (neste exemplo, a subcoleção "vendas")
  // Se desejar excluir outras subcoleções, como "metas", adicione outra chamada à função.
    async function deleteAllUnitData(unidade) {
    await deleteAllDocumentsFromSubcollection(unidade, "vendas");
    // Exemplo: para excluir também as metas, descomente a linha abaixo
    // await deleteAllDocumentsFromSubcollection(unidade, "metas");
  }

  // Redireciona se a unidade não estiver definida
  useEffect(() => {
    if (!unidade) {
      navigate("/login");
      return;
    }
  }, [unidade, navigate]);
  useEffect(() => {
    if (!selectedMonth) return;
  
    // mês atual e mês anterior no formato "YYYY-MM"
    const current = selectedMonth;
    const previous = dayjs(selectedMonth + "-01", "YYYY-MM-DD")
                       .subtract(1, "month")
                       .format("YYYY-MM");
  
    // soma faturamento de cada um
    const sumByMonth = (month) =>
      vendas
        .filter(v =>
          dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === month
        )
        .reduce((acc, v) => acc + (Number(v.valor) || 0), 0);
  
    const totalCurr = sumByMonth(current);
    const totalPrev = sumByMonth(previous);
  
    setTotalCurrent(totalCurr);
    setTotalPrevious(totalPrev);
  
    // evita divisão por zero
    const change =
      totalPrev > 0 ? ((totalCurr - totalPrev) / totalPrev) * 100 : 0;
    setPercentChange(change);
  }, [vendas, selectedMonth]);
  

  // Busca as metas da unidade atual (para obter os responsáveis oficiais)
  useEffect(() => {
    if (!unidade) return;
    const metasRef = collection(db, "faturamento", unidade.toLowerCase(), "metas");
    const unsubscribeMetas = onSnapshot(
      metasRef,
      (snapshot) => {
        const metasData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMetas(metasData);
      },
      (err) => {
        console.error("Erro ao carregar metas:", err);
        setError("Falha ao carregar metas.");
      }
    );
    return () => unsubscribeMetas();
  }, [unidade]);

  // Busca todas as vendas de todas as unidades usando collectionGroup
  useEffect(() => {
    const fetchVendas = async () => {
      try {
        setLoading(true);
        const vendasQuery = collectionGroup(db, "vendas");
        const unsubscribe = onSnapshot(
          vendasQuery,
          (snapshot) => {
            // Mapeia cada documento para incluir o id (doc.id) e os dados (doc.data())
            const vendasData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            // Atualiza o estado de vendas com o array que contém os id's
            setVendas(vendasData);
            setLoading(false);
            
            // Obtém os produtos únicos das vendas
            const prodSet = new Set();
            vendasData.forEach((v) => {
              if (v.produto) {
                prodSet.add(v.produto.trim());
              }
            });
            const prodArray = Array.from(prodSet).sort();
            setProdutos(prodArray);
            
            // Se não houver seleção de produtos persistida, seleciona todos os produtos
            if (!localStorage.getItem("produtosSelecionados") || produtosSelecionados.length === 0) {
              setProdutosSelecionados(prodArray);
            }
            
            // Obtém os responsáveis únicos e calcula o total faturado
            const responsaveisSet = new Set();
            let faturamentoTotal = 0;
            vendasData.forEach((v) => {
              if (v.responsavel) {
                responsaveisSet.add(v.responsavel);
              }
              faturamentoTotal += Number(v.valor) || 0;
            });
            setResponsaveis(Array.from(responsaveisSet).sort());
            setTotalFaturado(faturamentoTotal);
            setError("");
          },
          (err) => {
            console.error("Erro ao carregar vendas:", err);
            setError("Falha ao carregar dados. Tente novamente mais tarde.");
          }
        );
        return () => unsubscribe();
      } catch (err) {
        console.error("Erro no fetch de vendas:", err);
        setError("Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchVendas();
  }, [metas]);
  
  

  // Upload do arquivo XLS
  const handleUpload = async () => {
    try {
      if (!file) {
        setError("Por favor, selecione um arquivo antes de enviar");
        return;
      }

      // Verificação de extensão
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (!["xls", "xlsx"].includes(fileExt)) {
        setError("Apenas arquivos .xls ou .xlsx são permitidos");
        return;
      }

      setUploading(true);
      setError("");
      setSuccessMessage("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("unidade", unidade);

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
        errorMessage =
          "O servidor não recebeu o arquivo. Verifique o console para mais detalhes";
      } else {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Cria a lista de responsáveis oficiais (das metas) para a unidade atual
  const responsaveisOficiais = metas.map((m) =>
    m.responsavel.trim().toLowerCase()
  );

  // Filtra as vendas considerando todas as vendas registradas em qualquer unidade,
  // mas inclui apenas aquelas cujo responsável (normalizado) esteja cadastrado nas metas da unidade atual.
  const vendasFiltradas = vendas.filter((v) => {
    const responsavel = (v.responsavel || "").trim();
    const produto = (v.produto || "").trim();
    const nome = (v.nome || "").trim();
    const dataVenda = v.dataFormatada || ""; // formato "YYYY-MM-DD"
  
    // Condições dos outros filtros:
    const condResponsavel = filtroResponsavel
      ? responsavel.toLowerCase().includes(filtroResponsavel.toLowerCase())
      : true;
    const condProduto = filtroProduto
      ? produto.toLowerCase().includes(filtroProduto.toLowerCase())
      : true;
    const condNome = filtroNome
      ? nome.toLowerCase().includes(filtroNome.toLowerCase())
      : true;
    
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
    
    // Condição para filtrar por responsáveis oficiais (metas)
    const condMeta =
      responsaveisOficiais.length > 0
        ? responsaveisOficiais.includes(responsavel.toLowerCase())
        : true;
  
    // Nova condição: filtrar pelo mês selecionado.
    const condMes = selectedMonth
      ? dayjs(dataVenda, "YYYY-MM-DD").format("YYYY-MM") === selectedMonth
      : true;
    
  
    return condResponsavel && condProduto && condNome && condData && condSearch && condMeta && condMes;
  });
  

  // Ordenação das vendas filtradas
  const vendasOrdenadas = sortConfig.key
    ? [...vendasFiltradas].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      })
    : vendasFiltradas;

  // Paginação
  const paginatedVendas = vendasOrdenadas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Soma das vendas por responsável para exibição no gráfico
  const somaPorResponsavel = vendasFiltradas.reduce((acc, v) => {
    const key = v.responsavel ? v.responsavel.trim().toLowerCase() : "desconhecido";
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

  const totalFiltrado = vendasFiltradas.reduce(
    (sum, v) => sum + (Number(v.valor) || 0),
    0
  );
  const mediaPorVenda =
    vendasFiltradas.length > 0 ? totalFiltrado / vendasFiltradas.length : 0;

  if (!unidade) return <div>Redirecionando...</div>;

  // Função de ordenação única (já utilizada acima)
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };
  const filteredSalesForChart = vendas.filter((v) => {
    // Certifique-se de que v.dataFormatada está no formato "YYYY-MM-DD"
    const saleDate = dayjs(v.dataFormatada, "YYYY-MM-DD");
    if (chartTimeRange === "week") {
      // Filtra para as vendas da mesma semana que a data atual
      return saleDate.isSame(dayjs(), "week");
    } else if (chartTimeRange === "month") {
      // Filtra para as vendas do mesmo mês que a data atual
      return saleDate.isSame(dayjs(), "month");
    } else if (chartTimeRange === "year") {
      // Filtra para as vendas do mesmo ano que a data atual
      return saleDate.isSame(dayjs(), "year");
    }
    // Caso algum outro valor venha, traz todas
    return true;
  });
  
  // Calcula a soma das vendas por responsável para os dados filtrados
  const somaPorResponsavelChart = filteredSalesForChart.reduce((acc, v) => {
    // Usa o nome do responsável em minúsculas para unificar as chaves
    const key = v.responsavel ? v.responsavel.trim().toLowerCase() : "desconhecido";
    const valor = Number(v.valor) || 0;
    acc[key] = (acc[key] || 0) + valor;
    return acc;
  }, {});
  
  const chartDataUpdated = {
    labels: Object.keys(somaPorResponsavelChart),
    datasets: [
      {
        type: "bar",
        label: "Vendas Realizadas",
        data: Object.values(somaPorResponsavelChart),
        backgroundColor: "rgba(54, 162, 235, 0.7)",
        borderRadius: 4,
      },
    ],
  };
  const handleSaveVenda = async (id) => {
    try {
      // Cria um objeto com os dados editados removendo as entradas undefined
      const sanitizedData = Object.fromEntries(
        Object.entries(editedVenda).filter(([key, value]) => value !== undefined)
      );
      if (!id) {
        throw new Error("ID da venda não encontrado.");
      }
      if (!unidade) {
        throw new Error("Unidade não definida.");
      }
      // Atualiza o documento no Firestore
      await updateDoc(
        doc(db, "faturamento", unidade.toLowerCase(), "vendas", id),
        sanitizedData
      );
      // Encerra o modo edição e limpa os dados editados
      setEditingId(null);
      setEditedVenda({});
      // Exibe a mensagem de sucesso e limpa após 3 segundos
      setSuccessMessage("Atualizado com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Erro ao salvar a venda atualizada:", error);
      // Opcional: você pode definir uma mensagem de erro aqui se desejar
    }
  };
  // mês atual e anterior
// mês atual e anterior
const prevMonth = dayjs(selectedMonth + "-01", "YYYY-MM-DD")
  .subtract(1, "month")
  .format("YYYY-MM");

const unidadeLower = unidade.toLowerCase();

// Filtra só as vendas DA UNIDADE e do mês atual / anterior
const vendasMesAtual = vendas.filter((v) => {
  const mesmoUnidade = v.unidade === unidadeLower;
  const mesmoMes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === selectedMonth;
  return mesmoUnidade && mesmoMes;
});
const vendasMesAnterior = vendas.filter((v) => {
  const mesmoUnidade = v.unidade === unidadeLower;
  const mesmoMes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === prevMonth;
  return mesmoUnidade && mesmoMes;
});

// Conta vendas
const countAtual   = vendasMesAtual.length;
const countAnterior= vendasMesAnterior.length;

// Soma total para média
const totalAtual   = vendasMesAtual.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
const totalAnterior= vendasMesAnterior.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);

// Calcula médias
const mediaAtual   = countAtual > 0   ? totalAtual / countAtual     : 0;
const mediaAnterior= countAnterior> 0  ? totalAnterior / countAnterior: 0;

// Variações percentuais
const pctVendas = countAnterior > 0
  ? ((countAtual - countAnterior) / countAnterior) * 100
  : 0;
const pctMedia  = mediaAnterior > 0
  ? ((mediaAtual - mediaAnterior) / mediaAnterior) * 100
  : 0;


  
  
  

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
          <div className={`month-filter ${selectedMonth ? 'has-value' : ''}`}>
  <label htmlFor="month-selector-3">Filtrar por Mês</label>
  <div className="month-selector-wrapper">
    <input
      id="month-selector-3"
      type="month"
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
      className="month-input"
    />
    
    <div className="month-selector-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    </div>
  </div>
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
                {totalFiltrado.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
              <div className={`stat-trend ${percentChange >= 0 ? "up" : "down"}`}>
                {percentChange >= 0 ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 19V5M5 12L12 5L19 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5V19M5 12L12 19L19 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span>
                  {Math.abs(percentChange).toFixed(2)}%
                </span>
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
            {/* Vendas no mês */}
            <div className="stat-info">
              <span>Vendas (mês)</span>
              <strong>{countAtual}</strong>
              <div className={`stat-trend ${pctVendas>=0?'up':'down'}`}>
                {pctVendas>=0 ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12L12 19L19 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
                <span>{Math.abs(pctVendas).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Média por Venda no mês */}
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
                {vendasFiltradas.length > 0
                  ? mediaPorVenda.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "R$ 0,00"}
              </strong>
              <div className={`stat-trend ${pctMedia>=0?'up':'down'}`}>
                {pctMedia>=0 ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12L12 19L19 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
                <span>{Math.abs(pctMedia).toFixed(2)}%</span>
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
  <header className="section-header">
    <div className="title-area">
      <h2>Filtros e Controles</h2>
      <p>Personalize a visualização dos dados conforme suas necessidades</p>
    </div>
  </header>

  <div className="filter-layout">
    <div className="filters-area">
      <div className="filter-row">
        <div className="filter-group">
          <label>Responsável</label>
          <div className="select-container">
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
            <span className="select-arrow"></span>
          </div>
        </div>
        
        <div className="filter-group">
          <label>Produto</label>
          <div className="select-container">
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
            <span className="select-arrow"></span>
          </div>
        </div>
      </div>
      
      <div className="filter-row">
        <div className="filter-group">
          <label>Data (Texto)</label>
          <input
            type="text"
            placeholder="Filtrar por data..."
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
  <label>Intervalo de Datas</label>
  <div
    className="date-picker-trigger"
    onClick={() => setShowDatePicker(!showDatePicker)}
  >
    <span>{startDate ? startDate.toLocaleDateString("pt-BR") : "Data inicial"}</span>
    <span className="date-separator">a</span>
    <span>{endDate ? endDate.toLocaleDateString("pt-BR") : "Data final"}</span>
    <svg 
      className="calendar-icon" 
      xmlns="http://www.w3.org/2000/svg" 
      width="18" 
      height="18" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  </div>
  
  {showDatePicker && (
    <div className="date-picker-wrapper">
      <div className="date-picker-header">
        <button 
          className="clear-dates-button"
          onClick={() => {
            setStartDate(null);
            setEndDate(null);
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          Limpar
        </button>
        <button 
          className="close-picker-button"
          onClick={() => setShowDatePicker(false)}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Fechar
        </button>
      </div>
      
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
      </div>
      
      <div className="filter-row">
        <div className="filter-group search-group">
          <label>Pesquisar</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Digite para pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon"></span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="stats-area">
      <div className="stats-header">
        <h3>Estatísticas Filtradas</h3>
        <div className="period-tag">
          {startDate && endDate
            ? `${startDate.toLocaleDateString("pt-BR")} - ${endDate.toLocaleDateString("pt-BR")}`
            : "Período completo"}
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{vendasFiltradas.length}</div>
          <div className="stat-label">Vendas</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {totalFiltrado.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
          <div className="stat-label">Total Faturado</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {vendasFiltradas.length > 0
              ? mediaPorVenda.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              : "R$ 0,00"}
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
      data={chartDataUpdated}
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
                {/* Novo campo de filtro para Nome */}
                <div className="filter-by-name" style={{ marginTop: "1rem" }}>
                  <input 
                    type="text"
                    placeholder="Filtrar por Nome..."
                    value={filtroNome}
                    onChange={(e) => setFiltroNome(e.target.value)}
                    className="modern-input"
                  />
                </div>
              </div>

              <div className="table-actions">
              <button 
              className="delete-button"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja deletar todas as vendas?')) {
                  deleteAllDocumentsFromSubcollection(unidade, "vendas");
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6H5H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 11V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 11V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Deletar
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
          <th className="sortable numeric" onClick={() => handleSort("empresa")}>
            Empresa {sortConfig.key === "empresa" && (
              <span className="sort-icon">
                {sortConfig.direction === "ascending" ? "↑" : "↓"}
              </span>
            )}
          </th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {paginatedVendas.length > 0 ? (
          paginatedVendas.map((venda, index) => {
            // Verifica se o registro atual está em modo de edição
            const isEditing = venda.id === editingId;
            return (
              <tr key={venda.id || index}>
                <td data-label="Data">
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedVenda.dataFormatada || venda.dataFormatada}
                      onChange={(e) =>
                        setEditedVenda({
                          ...editedVenda,
                          dataFormatada: e.target.value,
                        })
                      }
                      className="edit-input"
                    />
                  ) : (
                    dayjs(venda.dataFormatada).format("DD/MM/YYYY")
                  )}
                </td>
                <td data-label="Produto">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedVenda.produto || venda.produto}
                      onChange={(e) =>
                        setEditedVenda({
                          ...editedVenda,
                          produto: e.target.value,
                        })
                      }
                      className="edit-input"
                    />
                  ) : (
                    <span className="product-badge">{venda.produto}</span>
                  )}
                </td>
                <td data-label="Matrícula">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedVenda.matricula || venda.matricula}
                      onChange={(e) =>
                        setEditedVenda({
                          ...editedVenda,
                          matricula: e.target.value,
                        })
                      }
                      className="edit-input"
                    />
                  ) : (
                    venda.matricula
                  )}
                </td>
                <td data-label="Nome">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedVenda.nome || venda.nome}
                      onChange={(e) =>
                        setEditedVenda({
                          ...editedVenda,
                          nome: e.target.value,
                        })
                      }
                      className="edit-input"
                    />
                  ) : (
                    venda.nome
                  )}
                </td>
                <td data-label="Responsável">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedVenda.responsavel || venda.responsavel}
                      onChange={(e) =>
                        setEditedVenda({
                          ...editedVenda,
                          responsavel: e.target.value,
                        })
                      }
                      className="edit-input"
                    />
                  ) : (
                    <div className="responsible-cell">
                      {successMessage && (
  <div className="toast-message success-toast">
    <div className="toast-icon">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    </div>
    <div className="toast-content">
      {successMessage}
    </div>
    <button
      className="toast-close"
      onClick={() => setSuccessMessage("")}
      aria-label="Fechar mensagem"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
                        </div>
                      )}
                      <span className="avatar">{venda.responsavel.charAt(0)}</span>
                      {venda.responsavel}
                    </div>
                  )}
                </td>
                <td data-label="Valor" className="currency">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedVenda.valor || venda.valor}
                      onChange={(e) =>
                        setEditedVenda({
                          ...editedVenda,
                          valor: e.target.value,
                        })
                      }
                      className="edit-input"
                    />
                  ) : (
                    <span className={`value ${Number(venda.valor) > 5000 ? "highlight" : ""}`}>
                      {Number(venda.valor).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  )}
                </td>
                <td data-label="Empresa">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedVenda.empresa || venda.empresa}
                      onChange={(e) =>
                        setEditedVenda({
                          ...editedVenda,
                          empresa: e.target.value,
                        })
                      }
                      className="edit-input"
                    />
                  ) : (
                    venda.empresa
                  )}
                </td>
                <td data-label="Ações">
                  {isEditing ? (
                    <>
                      <button 
                        className="success-button" 
                        onClick={() => handleSaveVenda(venda.id)}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Salvar
                      </button>
                      <button
                        className="cancel-button"
                        onClick={() => {
                          setEditingId(null);
                          setEditedVenda({});
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      className="edit-button"
                      onClick={() => {
                        setEditingId(venda.id);
                        setEditedVenda(venda);
                      }}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            );
          })
        ) : (
          <tr className="no-results">
            <td colSpan="8">
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p>Nenhuma venda encontrada com os filtros atuais</p>
                <button
                  onClick={() => {
                    setFiltroResponsavel("");
                    setFiltroProduto("");
                    setStartDate(null);
                    setEndDate(null);
                  }}
                  className="reset-button"
                >
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
    <button 
      className="pagination-arrow"
      disabled={currentPage === 1} 
      onClick={() => setCurrentPage(currentPage - 1)}
      aria-label="Página anterior"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>

    {/* Primeira página */}
    {currentPage > 2 && (
      <button 
        onClick={() => setCurrentPage(1)}
        className="pagination-number"
      >
        1
      </button>
    )}
    
    {/* Indicador de páginas anteriores */}
    {currentPage > 3 && <span className="ellipsis">...</span>}
    
    {/* Páginas visíveis */}
    {Array.from({ length: Math.ceil(vendasFiltradas.length / itemsPerPage) }, (_, i) => {
      const page = i + 1;
      const maxVisible = 5; // Número máximo de páginas visíveis
      const start = Math.max(1, currentPage - Math.floor(maxVisible/2));
      const end = Math.min(start + maxVisible - 1, Math.ceil(vendasFiltradas.length / itemsPerPage));

      if (page >= start && page <= end) {
        return (
          <button 
            key={i} 
            className={`pagination-number ${currentPage === page ? "active" : ""}`}
            onClick={() => setCurrentPage(page)}
            aria-label={`Página ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </button>
        );
      }
      return null;
    })}

    {/* Indicador de próximas páginas */}
    {currentPage < Math.ceil(vendasFiltradas.length / itemsPerPage) - 2 && (
      <span className="ellipsis">...</span>
    )}

    {/* Última página */}
    {currentPage < Math.ceil(vendasFiltradas.length / itemsPerPage) - 1 && (
      <button 
        onClick={() => setCurrentPage(Math.ceil(vendasFiltradas.length / itemsPerPage))}
        className="pagination-number"
        aria-label={`Última página, ${Math.ceil(vendasFiltradas.length / itemsPerPage)}`}
      >
        {Math.ceil(vendasFiltradas.length / itemsPerPage)}
      </button>
    )}

    <button 
      className="pagination-arrow"
      disabled={currentPage === Math.ceil(vendasFiltradas.length / itemsPerPage)} 
      onClick={() => setCurrentPage(currentPage + 1)}
      aria-label="Próxima página"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
    
    <div className="pagination-info">
      <span>
        Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, vendasFiltradas.length)}-
        {Math.min(currentPage * itemsPerPage, vendasFiltradas.length)} de {vendasFiltradas.length}
      </span>
    </div>
  </div>
)}
          </section>
        </>
      )}
  
      <style jsx>{`
        /* Variáveis Globais */
:root {
  --color-primary: #3b82f6;
  --color-primary-light: #60a5fa;
  --color-primary-dark: #2563eb;
  --color-secondary: #10b981;
  --color-tertiary: #8b5cf6;
  --color-success: #22c55e;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;
  --color-text: #1e293b;
  --color-text-light: #64748b;
  --color-background: #f8fafc;
  --color-card: #ffffff;
  --color-border: #e2e8f0;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
  
  --transition: all 0.2s ease;
}

/* Estilos Globais */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background-color: var(--color-background);
  color: var(--color-text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.dashboard-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 1.5rem;
  max-width: 1440px;
  margin: 0 auto;
}

/* Navbar */
.nav-bar {
  display: flex;
  justify-content: flex-start;
  background-color: #fff;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-md);
}

.nav-link {
  padding: 0.75rem 1.25rem;
  color: var(--color-text-light);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--color-primary);
}

.nav-link.active {
  color: var(--color-primary);
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--color-primary);
}

.nav-link:not(:last-child) {
  margin-right: 1rem;
}

/* Header */
.dashboard-header {
  margin-bottom: 2rem;
}

.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-title h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.last-update {
  font-size: 0.875rem;
  color: var(--color-text-light);
  margin-top: 0.25rem;
}

/* Estilos para o seletor de mês */
/* Estilos completos para o filtro de mês */
.month-filter {
  position: relative;
  margin-top: 1rem;
  max-width: 300px;
}

.month-filter label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-light);
  margin-bottom: 0.5rem;
}

.month-selector-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.month-input {
  width: 100%;
  padding: 0.75rem;
  padding-right: 2.5rem; /* Espaço para o ícone */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: var(--color-text);
  background-color: var(--color-card);
  cursor: pointer;
  transition: var(--transition);
}

.month-input:focus {
  outline: none;
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.month-selector-icon {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  color: var(--color-text-light);
  pointer-events: none;
  z-index: 1;
}

/* Personalização do calendário nativo */
.month-input::-webkit-calendar-picker-indicator {
  opacity: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
}

/* Feedback visual quando há um mês selecionado */
.month-filter.has-value .month-selector-icon {
  color: var(--color-primary);
}

/* Estado selecionado dinamicamente */
.month-input[value]:not([value=""]) {
  color: var(--color-primary);
  font-weight: 500;
}

/* Adicione esta classe ao componente quando um mês estiver selecionado */
.month-filter.has-value .month-input {
  border-color: var(--color-primary-light);
  background-color: rgba(59, 130, 246, 0.05);
}

/* Botão para limpar a seleção - versão 1 (abaixo do input) */
.month-clear-button {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border: none;
  background-color: transparent;
  color: var(--color-text-light);
  font-size: 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}

.month-clear-button:hover {
  background-color: rgba(241, 245, 249, 0.8);
  color: var(--color-danger);
}

.month-clear-button span {
  font-weight: 500;
}

/* Botão para limpar a seleção - versão 2 (ao lado do input) */
.month-clear-button-inline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.625rem 0.75rem;
  margin-left: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-card);
  color: var(--color-text-light);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
  height: 40px; /* Para alinhar com o input */
}

.month-clear-button-inline:hover {
  background-color: rgba(241, 245, 249, 0.8);
  color: var(--color-danger);
  border-color: var(--color-border-dark);
}

/* Versão com ícone X */
.month-clear-icon {
  position: absolute;
  top: 50%;
  right: 2.5rem;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--color-border);
  color: var(--color-text-light);
  opacity: 0.7;
  cursor: pointer;
  transition: var(--transition);
  z-index: 2;
}

.month-clear-icon:hover {
  opacity: 1;
  background-color: var(--color-border-dark);
  color: var(--color-danger);
}

/* Filtro com rótulo e botão limpar no mesmo nível */
.month-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.month-filter-row label {
  margin-bottom: 0;
}

.month-clear-text {
  font-size: 0.75rem;
  color: var(--color-primary);
  cursor: pointer;
  transition: var(--transition);
}

.month-clear-text:hover {
  color: var(--color-danger);
  text-decoration: underline;
}

/* Versão minimalista para o cabeçalho */
.header-month-filter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-month-filter label {
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  margin-bottom: 0;
}

.header-month-wrapper {
  position: relative;
  min-width: 180px;
}

/* Media queries para responsividade */
@media (max-width: 768px) {
  .month-filter {
    width: 100%;
    max-width: none;
  }
  
  .header-month-filter {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .header-month-wrapper {
    width: 100%;
    min-width: 0;
  }
  
  .month-clear-button-inline {
    padding: 0.625rem 0.5rem;
  }
}

/* Variações de cores para temas diferentes */
.month-filter.light .month-input {
  background-color: #f8fafc;
  border-color: #e2e8f0;
}

.month-filter.dark .month-input {
  background-color: #1e293b;
  border-color: #334155;
  color: #f8fafc;
}

.month-filter.dark .month-selector-icon {
  color: #94a3b8;
}

.month-filter.dark.has-value .month-selector-icon {
  color: var(--color-primary-light);
}

/* Transição suave quando o botão de limpar aparece */
.month-clear-button,
.month-clear-button-inline,
.month-clear-icon {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  background-color: var(--color-card);
  transition: var(--transition);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-card.primary {
  background-color: rgba(59, 130, 246, 0.06);
  border-left: 4px solid var(--color-primary);
}

.stat-card.secondary {
  background-color: rgba(16, 185, 129, 0.06);
  border-left: 4px solid var(--color-secondary);
}

.stat-card.tertiary {
  background-color: rgba(139, 92, 246, 0.06);
  border-left: 4px solid var(--color-tertiary);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
}

.stat-card.primary .stat-icon {
  color: var(--color-primary);
}

.stat-card.secondary .stat-icon {
  color: var(--color-secondary);
}

.stat-card.tertiary .stat-icon {
  color: var(--color-tertiary);
}

.stat-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.stat-info span {
  font-size: 0.875rem;
  color: var(--color-text-light);
  margin-bottom: 0.25rem;
}

.stat-info strong {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-trend.up {
  color: var(--color-success);
}

.stat-trend.down {
  color: var(--color-danger);
}

/* Cards */
.card {
  background-color: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.section-title {
  display: flex;
  flex-direction: column;
}

.section-title h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.section-header p {
  font-size: 0.875rem;
  color: var(--color-text-light);
}

/* Upload Section */
.upload-section {
  margin-bottom: 2rem;
}

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  transition: var(--transition);
  background-color: rgba(226, 232, 240, 0.1);
}

.upload-area:hover {
  border-color: var(--color-primary-light);
  background-color: rgba(59, 130, 246, 0.02);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
}

.upload-icon {
  color: var(--color-primary);
  opacity: 0.7;
  transform: scale(1.25);
  transition: var(--transition);
}

.upload-area:hover .upload-icon {
  opacity: 1;
  transform: scale(1.4);
}

.upload-text p {
  margin-bottom: 0.75rem;
  color: var(--color-text-light);
  font-size: 1rem;
}

.browse-button {
  cursor: pointer;
  color: var(--color-primary);
  font-weight: 600;
  transition: var(--transition);
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-md);
  display: inline-block;
  margin-top: 0.5rem;
}

.browse-button:hover {
  color: white;
  background-color: var(--color-primary);
}

.browse-button input[type="file"] {
  display: none;
}

.upload-content.has-file .upload-icon {
  display: none;
}

.file-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 1rem;
}

.file-size {
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.upload-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-button {
  padding: 0.625rem 1.25rem;
  background-color: transparent;
  color: var(--color-text-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.cancel-button:hover {
  background-color: var(--color-border);
  color: var(--color-text);
}

.upload-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.upload-button:hover {
  background-color: var(--color-primary-dark);
}

.upload-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.upload-button.loading {
  opacity: 0.8;
  pointer-events: none;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-radius: var(--radius-md);
  margin-top: 1rem;
  font-size: 0.875rem;
}

.alert.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
  border-left: 3px solid var(--color-danger);
}

.alert.success {
  background-color: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
  border-left: 3px solid var(--color-success);
}

/* Filters Section */
/* Estilos modernos para a seção de filtros */
.filters-section {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  margin-bottom: 2rem;
  padding: 2rem;
}

.section-header {
  margin-bottom: 1.75rem;
}

.title-area h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #202939;
  margin-bottom: 0.5rem;
}

.title-area p {
  color: #6B7280;
  font-size: 0.875rem;
}

.filter-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.filters-area {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-row {
  display: flex;
  gap: 1.5rem;
}

.filter-group {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #4B5563;
}

.select-container {
  position: relative;
}

.filter-group select,
.filter-group input,
.date-picker-trigger {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background-color: #ffffff;
  color: #1F2937;
  transition: all 0.2s ease;
}

.filter-group select {
  appearance: none;
  padding-right: 2.5rem;
  cursor: pointer;
}

.filter-group input::placeholder {
  color: #9CA3AF;
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.select-arrow {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #6B7280;
  pointer-events: none;
}

.search-group {
  grid-column: span 2;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: none;
}

.date-picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.date-separator {
  color: #9CA3AF;
  margin: 0 0.5rem;
}

.calendar-icon {
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  margin-left: 0.5rem;
}

.date-picker-wrapper {
  position: absolute;
  z-index: 10;
  margin-top: 0.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #E5E7EB;
  overflow: hidden;
}

/* Estatísticas */
.stats-area {
  background-color: #F9FAFB;
  border-radius: 12px;
  padding: 1.5rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #E5E7EB;
}

.stats-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.period-tag {
  font-size: 0.75rem;
  color: #6B7280;
  padding: 0.375rem 0.75rem;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #E5E7EB;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.stat-card {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6B7280;
}

/* Responsive */
@media (max-width: 1024px) {
  .filter-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .filters-section {
    padding: 1.5rem;
  }
  
  .filter-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.select-wrapper {
  position: relative;
}

.select-wrapper select {
  appearance: none;
  padding-right: 2rem;
  width: 100%;
}

.select-arrow {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--color-text-light);
}

.date-range {
  grid-column: span 2;
}

.date-range-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
  background-color: var(--color-card);
}

.date-range-display:hover {
  border-color: var(--color-primary-light);
}

.date-range-display span {
  color: var(--color-text-light);
  margin: 0 0.25rem;
}

.date-picker-popup {
  position: absolute;
  z-index: 100;
  margin-top: 0.5rem;
  background-color: var(--color-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 1rem;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.search-filter {
  grid-column: span 2;
}

.filter-stats-card {
  background-color: rgba(59, 130, 246, 0.05);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  padding-bottom: 0.75rem;
}

.stats-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.stats-period {
  font-size: 0.875rem;
  color: var(--color-text-light);
  padding: 0.375rem 0.75rem;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: var(--radius-md);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  border-radius: var(--radius-md);
  background-color: var(--color-card);
  box-shadow: var(--shadow-sm);
  transition: var(--transition);
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-value {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-light);
}

/* Chart Section */
.chart-section {
  margin-bottom: 2rem;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.legend-color {
  width: 1.25rem;
  height: 0.5rem;
  border-radius: 1rem;
}

.legend-color.primary {
  background-color: var(--color-primary);
}

.chart-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chart-action {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: transparent;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-light);
  cursor: pointer;
  transition: var(--transition);
}

.chart-action:hover {
  background-color: rgba(59, 130, 246, 0.05);
  color: var(--color-primary);
}

.chart-action.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.chart-wrapper {
  height: 300px;
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm) inset;
}

/* Table Section */
.table-section {
  margin-bottom: 2rem;
}

.results-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-light);
  margin-top: 0.5rem;
}

.results-count span {
  font-weight: 700;
  color: var(--color-primary);
}

.filter-by-name {
  margin-top: 1rem;
  max-width: 300px;
}

.modern-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: var(--color-text);
  transition: var(--transition);
  background-color: var(--color-card);
}

.modern-input:focus {
  outline: none;
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.delete-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: transparent;
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.delete-button:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.table-container {
  margin-top: 1.5rem;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
  background-color: var(--color-card);
}

.data-table th {
  padding: 1rem 0.75rem;
  font-weight: 600;
  color: var(--color-text-light);
  border-bottom: 1px solid var(--color-border);
  background-color: rgba(241, 245, 249, 0.5);
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: var(--transition);
}

.data-table th.sortable:hover {
  color: var(--color-primary);
  background-color: rgba(241, 245, 249, 0.8);
}

.sort-icon {
  display: inline-block;
  margin-left: 0.25rem;
}

.data-table td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  vertical-align: middle;
  transition: var(--transition);
}

.data-table tr:nth-child(even) {
  background-color: rgba(248, 250, 252, 0.5);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover td {
  background-color: rgba(59, 130, 246, 0.05);
}

.product-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 2rem;
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.responsible-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

/* Cores diferentes para avatares diferentes */
.avatar[data-initial="A"] {
  background-color: #3b82f6;
}

.avatar[data-initial="V"] {
  background-color: #8b5cf6;
}

.avatar[data-initial="M"] {
  background-color: #10b981;
}

.avatar[data-initial="J"] {
  background-color: #f59e0b;
}

.avatar[data-initial="F"] {
  background-color: #ef4444;
}

.currency {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.value {
  transition: var(--transition);
}

.value.highlight {
  color: var(--color-primary);
  font-weight: 600;
}

.edit-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: transparent;
  color: var(--color-text-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.edit-button:hover {
  background-color: rgba(59, 130, 246, 0.05);
  color: var(--color-primary);
  border-color: var(--color-primary-light);
}

.success-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: var(--color-success);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  margin-right: 0.5rem;
}

.success-button:hover {
  background-color: #15803d; /* Darker shade of success */
}

.edit-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  outline: none;
  background-color: rgba(255, 255, 255, 0.9);
  transition: var(--transition);
}

.edit-input:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.no-results td {
  padding: 3rem 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
  color: var(--color-text-light);
}

.reset-button {
  padding: 0.5rem 1.25rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.reset-button:hover {
  background-color: var(--color-primary-dark);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.pagination button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: transparent;
  font-size: 0.875rem;
  color: var(--color-text);
  cursor: pointer;
  transition: var(--transition);
}

.pagination button:hover:not(:disabled) {
  background-color: rgba(59, 130, 246, 0.05);
  border-color: var(--color-primary-light);
  color: var(--color-primary);
}

.pagination button.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ellipsis {
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: var(--color-text-light);
}

.loading-indicator .spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top-color: var(--color-primary);
}

/* Success Message in Cell */
.success-message {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: rgba(34, 197, 94, 0.1);
  border-left: 3px solid var(--color-success);
  color: var(--color-success);
  font-size: 0.75rem;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.success-message-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-message-content {
  flex: 1;
}

.success-message-close {
  background: none;
  border: none;
  color: currentColor;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: var(--transition);
}

.success-message-close:hover {
  opacity: 1;
}

/* Ajustes para o calendário de datas */
.react-datepicker {
  font-family: var(--font-sans);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.react-datepicker__header {
  background-color: #f8fafc;
  border-bottom: 1px solid var(--color-border);
}

.react-datepicker__day--selected,
.react-datepicker__day--in-selecting-range,
.react-datepicker__day--in-range {
  background-color: var(--color-primary);
  color: white;
  border-radius: 0.3rem;
}

.react-datepicker__day--keyboard-selected {
  background-color: var(--color-primary-light);
  color: white;
}

.react-datepicker__day:hover {
  background-color: rgba(59, 130, 246, 0.2);
}

.react-datepicker__day--in-selecting-range:not(.react-datepicker__day--in-range) {
  background-color: rgba(59, 130, 246, 0.5);
}

.react-datepicker__current-month {
  font-weight: 600;
  color: var(--color-text);
}

.react-datepicker__day-name {
  color: var(--color-text-light);
}

/* Responsividade */
@media (max-width: 1024px) {
  .header-stats {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  
  .filter-container {
    grid-template-columns: 1fr;
  }
  
  .filter-stats-card {
    grid-column: span 1;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem;
  }
  
  .nav-bar {
    overflow-x: auto;
    white-space: nowrap;
    padding: 0.75rem 1rem;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .chart-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .chart-wrapper {
    height: 250px;
  }
  
  .data-table {
    display: block;
  }
  
  .data-table thead {
    display: none;
  }
  
  .data-table tbody {
    display: block;
  }
  
  .data-table tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    background-color: var(--color-card);
  }
  
  .data-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px dashed var(--color-border);
    text-align: right;
    background-color: transparent !important;
  }
  
  .data-table td:last-child {
    border-bottom: none;
  }
  
  .data-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: var(--color-text-light);
  }
  
  .responsible-cell, .currency {
    justify-content: flex-end;
  }
  
  .product-badge {
    margin-left: auto;
  }
  
  .filter-controls {
    grid-template-columns: 1fr;
  }
  
  .upload-area {
    padding: 1.5rem 1rem;
  }
}

@media (max-width: 480px) {
  .dashboard-container {
    padding: 0.5rem;
  }
  
  .card, .upload-area {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  
  .pagination button {
    min-width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
  }
  
  .upload-content {
    gap: 0.75rem;
  }
  
  .upload-text p {
    font-size: 0.875rem;
  }
  
  .stat-info strong {
    font-size: 1.25rem;
  }
}

/* Animações e hover effects */
.card, .stat-card, .stat-item, .upload-button, .edit-button, .success-button, 
.delete-button, .reset-button, .chart-action, .browse-button {
  transition: all 0.3s ease;
}

.card:hover, .stat-card:hover, .stat-item:hover {
  transform: translateY(-2px);
}

.upload-button:hover, .reset-button:hover, .chart-action.active:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Ajustes para botões de ação na tabela */
.actions-cell {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Cores personalizadas para os produtos */
.product-badge[data-product*="EVOLUTION"] {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
}

.product-badge[data-product*="DIÁRIAS"] {
  background-color: rgba(139, 92, 246, 0.1);
  color: var(--color-tertiary);
}

/* Estilos para o formulário de adição de vendas */
.form-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-light);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: var(--color-text);
  transition: var(--transition);
  background-color: var(--color-card);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary-light);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.form-submit {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.form-submit button {
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}

.btn-cancel {
  background-color: transparent;
  color: var(--color-text-light);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover {
  background-color: var(--color-border);
  color: var(--color-text);
}

.btn-submit {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.btn-submit:hover {
  background-color: var(--color-primary-dark);
}

/* Estilos adicionais para tornar o design mais alinhado com as imagens fornecidas */
body {
  background-color: #f8fafc;
}

.data-table th,
.data-table td {
  padding: 0.875rem 1rem;
}

.data-table tr:nth-child(even) {
  background-color: rgba(248, 250, 252, 0.5);
}

.data-table tr:hover {
  background-color: rgba(248, 250, 252, 0.8);
}

/* Estilos para o modal de confirmação */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  margin-bottom: 1rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.modal-body {
  margin-bottom: 1.5rem;
  color: var(--color-text-light);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.modal-close {
  padding: 0.5rem 1rem;
  background-color: transparent;
  color: var(--color-text-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.modal-close:hover {
  background-color: var(--color-border);
  color: var(--color-text);
}

.modal-confirm {
  padding: 0.5rem 1rem;
  background-color: var(--color-danger);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.modal-confirm:hover {
  background-color: #b91c1c; /* Darker shade of danger */
}
  
/* Estilos para mensagens toast */
.toast-message {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-width: 380px;
  width: calc(100% - 3rem);
  z-index: 1000;
  animation: slideIn 0.3s ease-out, fadeIn 0.3s ease-out;
  background-color: white;
  overflow: hidden;
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.success-toast {
  border-left: 4px solid var(--color-success);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background-color: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 500;
  line-height: 1.4;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background-color: transparent;
  color: var(--color-text-light);
  border: none;
  cursor: pointer;
  transition: var(--transition);
  flex-shrink: 0;
}

.toast-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--color-text);
}

/* Barra de progresso para auto-fechamento */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: var(--color-success);
  width: 100%;
  animation: progress 5s linear forwards;
}

@keyframes progress {
  from { width: 100%; }
  to { width: 0; }
}

/* Variante para mensagens de erro */
.error-toast {
  border-left: 4px solid var(--color-danger);
}

.error-toast .toast-icon {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

.error-toast .toast-progress {
  background-color: var(--color-danger);
}

/* Variante para mensagens de aviso */
.warning-toast {
  border-left: 4px solid var(--color-warning);
}

.warning-toast .toast-icon {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.warning-toast .toast-progress {
  background-color: var(--color-warning);
}

/* Variante para mensagens informativas */
.info-toast {
  border-left: 4px solid var(--color-primary);
}

.info-toast .toast-icon {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
}

.info-toast .toast-progress {
  background-color: var(--color-primary);
}

/* Responsividade */
@media (max-width: 768px) {
  .toast-message {
    top: auto;
    bottom: 1.5rem;
    right: 1.5rem;
    left: 1.5rem;
    width: calc(100% - 3rem);
    max-width: none;
  }
}

/* Adicione esta classe se quiser que o toast seja fixo em uma célula */
.responsible-cell .toast-message {
  position: absolute;
  top: -2rem;
  right: 0;
  left: 0;
  max-width: none;
  width: auto;
  z-index: 10;
  box-shadow: var(--shadow-md);
  padding: 0.5rem 0.75rem;
}

.responsible-cell .toast-icon,
.responsible-cell .toast-close {
  width: 1.5rem;
  height: 1.5rem;
}

.responsible-cell .toast-content {
  font-size: 0.75rem;
}

.responsible-cell {
  position: relative;
}
  .clear-dates-button,
    .close-picker-button {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .clear-dates-button {
      color: #ef4444;
    }
    
    .clear-dates-button:hover {
      background-color: #fee2e2;
    }
    
    .close-picker-button {
      color: #64748b;
    }
    
    .close-picker-button:hover {
      background-color: #f1f5f9;
    }
      `}</style>
    </div>
  );
 }
