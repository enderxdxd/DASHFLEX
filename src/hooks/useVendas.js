// File: src/hooks/useVendas.js
import { useState, useEffect, useMemo } from "react";
import {
  collection,
  collectionGroup,
  onSnapshot,
  getDocs,
  writeBatch,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import { useGroupedVendas } from './useGroupedVendas';

export const useVendas = (unidade, metas = []) => {
  // Estados brutos
  const [vendas, setVendas] = useState([]);
  
  // APLICAR AGRUPAMENTO DE PLANOS DIVIDIDOS
  const vendasAgrupadas = useGroupedVendas(vendas);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Upload XLS
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  // flag para conversão automática do 'Administrador'
  const [autoConvertAdmin, setAutoConvertAdmin] = useState(true);

  // Filtros e seleção de período
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [filtroNome, setFiltroNome] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [chartTimeRange, setChartTimeRange] = useState("month"); // "week" | "month" | "year"

  // Ordenação e paginação
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dados auxiliares extraídos
  const [responsaveis, setResponsaveis] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState([]);

  // Comparativo mês atual x anterior
  const [totalCurrent, setTotalCurrent] = useState(0);
  const [totalPrevious, setTotalPrevious] = useState(0);
  const [percentChange, setPercentChange] = useState(0);
  const [processedVendasCount, setProcessedVendasCount] = useState(0);


  // ——————————————————————————————————————————————————————————————
  // ▲ Helpers para CRUD e batch delete
  const deleteAllDocumentsFromSubcollection = async (subName) => {
    const subcolRef = collection(db, "faturamento", unidade.toLowerCase(), subName);
    const snap = await getDocs(subcolRef);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  };
  const deleteAllUnitData = () => deleteAllDocumentsFromSubcollection("vendas");

  const updateVenda = async (id, dados) => {
    try {
      if (!id) throw new Error("ID faltando");
      await updateDoc(
        doc(db, "faturamento", unidade.toLowerCase(), "vendas", id),
        dados
      );
      setSuccessMessage("Venda atualizada!");
      setTimeout(() => setSuccessMessage(""), 3000);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // ▲ Upload XLS
  const handleUpload = async () => {
    // 1) Valida se tem arquivo selecionado
    if (!file) {
      setError("Selecione um arquivo antes de enviar");
      return;
    }
  
    // 2) Prepara o FormData com arquivo, unidade e flag de conversão
    const form = new FormData();
    form.append("file", file);
    form.append("unidade", unidade);
  form.append("autoConvertAdmin", String(autoConvertAdmin));
  
    try {
      setUploading(true);
      setError("");
      
      // 3) Chama sua Cloud Function
      const res = await fetch(
        "https://southamerica-east1-chatpos-aff1a.cloudfunctions.net/uploadXLS",
        { method: "POST", body: form }
      );
  
      // 4) Trata erro de HTTP
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro desconhecido no upload");
      }
  
      // 5) Extrai o JSON – a função deve retornar algo como { success: true, count: 123 }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Falha no processamento");
      }
  
      // 6) Atualiza estado para exibir quantas vendas vieram
      const count = json.count ?? json.processedCount ?? 0;
      setProcessedVendasCount(count);
      setSuccessMessage(`Foram processadas ${json.count} vendas!`);
  
      // 7) Limpa o arquivo selecionado da UI
      setFile(null);
  
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  

  // ▲ Busca em tempo real
  useEffect(() => {
    if (!unidade) return;
    setLoading(true);
    const unsub = onSnapshot(
      collectionGroup(db, "vendas"),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVendas(data);
        setLoading(false);

        // preenche produtos e responsáveis
        const ps = [...new Set(data.map((v) => v.produto?.trim()).filter(Boolean))].sort();
        setProdutos(ps);
        if (!localStorage.getItem("produtosSelecionados"))
          setProdutosSelecionados(ps);

        const rs = [...new Set(data.map((v) => v.responsavel?.trim()).filter(Boolean))].sort();
        setResponsaveis(rs);
      },
      (err) => {
        setError("Falha ao carregar: " + err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [unidade]);

  // ▲ Sincroniza produtosSelecionados com localStorage
  useEffect(() => {
    localStorage.setItem(
      "produtosSelecionados",
      JSON.stringify(produtosSelecionados)
    );
  }, [produtosSelecionados]);

  // ▲ Comparativo mês atual x anterior
  useEffect(() => {
    if (!vendasAgrupadas.length) return;
    const cur = selectedMonth;
    const prev = dayjs(cur + "-01", "YYYY-MM-DD")
      .subtract(1, "month")
      .format("YYYY-MM");

    const sum = (month) => {
      const filtered = vendasAgrupadas.filter((v) => {
        const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
        return mes === month;
      });
      return filtered.reduce((s, v) => s + Number(v.valor || 0), 0);
    };
    setTotalCurrent(sum(cur));
    setTotalPrevious(sum(prev));
    setPercentChange(prev && sum(prev) > 0 ? ((sum(cur) - sum(prev)) / sum(prev)) * 100 : 0);
  }, [vendasAgrupadas, selectedMonth]);

  // ——————————————————————————————————————————————————————————————
  // ▼ Filtragem por metas/responsáveis oficiais
  const responsaveisOficiais = useMemo(
    () => metas.map((m) => m.responsavel.trim().toLowerCase()),
    [metas]
  );

  // ▼ Vendas da unidade atual (para métricas específicas da unidade)
  const vendasUnidadeAtual = useMemo(() => {
    if (!unidade) return [];
    return vendasAgrupadas.filter((v) => {
      const unidadeVenda = (v.unidade || "").toLowerCase();
      return unidadeVenda === unidade.toLowerCase();
    });
  }, [vendasAgrupadas, unidade]);

  // ▼ Vendas já filtradas de acordo com todos os critérios (TODAS as unidades para filtro global)
  const vendasFiltradas = useMemo(() => {
    if (!unidade) return [];
    return vendasAgrupadas.filter((v) => {
      // ✅ CORREÇÃO: Não filtra por unidade - permite vendas de todas as unidades
  
      // seu filtro por responsável
      const resp = (v.responsavel || "").trim().toLowerCase();
      if (filtroResponsavel &&
          !resp.includes(filtroResponsavel.toLowerCase())
      ) return false;
  
      // filtro por produto
      const prod = (v.produto || "").trim().toLowerCase();
      if (filtroProduto &&
          !prod.includes(filtroProduto.toLowerCase())
      ) return false;
  
      // filtro por nome
      const nome = (v.nome || "").trim().toLowerCase();
      if (filtroNome &&
          !nome.includes(filtroNome.toLowerCase())
      ) return false;
  
      // filtro de intervalo de datas
      if (startDate && endDate && v.dataFormatada) {
        const d = dayjs(v.dataFormatada, "YYYY-MM-DD");
        if (!d.isBetween(dayjs(startDate), dayjs(endDate), "day", "[]"))
          return false;
      }
  
      // filtro de busca livre
      if (searchTerm) {
        const all = Object.values(v).join(" ").toLowerCase();
        if (!all.includes(searchTerm.toLowerCase())) return false;
      }
  
      // filtro de metas/responsáveis oficiais
      if (
        responsaveisOficiais.length > 0 &&
        !responsaveisOficiais.includes(resp)
      ) return false;
  
      // filtro de mês selecionado
      if (selectedMonth) {
        const mes = dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM");
        if (mes !== selectedMonth) return false;
      }
  
      return true;
    });
  }, [
    vendasAgrupadas,
    unidade,
    filtroResponsavel,
    filtroProduto,
    filtroNome,
    searchTerm,
    startDate,
    endDate,
    selectedMonth,
    produtosSelecionados,
    responsaveisOficiais,
  ]);
  

  // ▼ Ordenação
  const vendasOrdenadas = useMemo(() => {
    if (!sortConfig.key) return vendasFiltradas;
    return [...vendasFiltradas].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      if (a[sortConfig.key] < b[sortConfig.key]) return -1 * dir;
      if (a[sortConfig.key] > b[sortConfig.key]) return 1 * dir;
      return 0;
    });
  }, [vendasFiltradas, sortConfig]);

  // ▼ Paginação
  const paginatedVendas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return vendasOrdenadas.slice(start, start + itemsPerPage);
  }, [vendasOrdenadas, currentPage]);

  //---------------------------------
  // ▲ Métricas e estatísticas
  const totalFaturado = useMemo(() =>
    vendasAgrupadas.reduce((sum, v) => sum + Number(v.valor || 0), 0)
  , [vendasAgrupadas]);

  const totalFiltrado = useMemo(() =>
    vendasFiltradas.reduce((sum, v) => sum + Number(v.valor || 0), 0)
  , [vendasFiltradas]);

  const mediaPorVenda = useMemo(() => (
    vendasFiltradas.length ? totalFiltrado / vendasFiltradas.length : 0
  ), [totalFiltrado, vendasFiltradas]);

  // ▲ Dados para gráfico
  const chartData = useMemo(() => {
    const byResp = {};
    vendasAgrupadas.forEach((v) => {
      const d = dayjs(v.dataFormatada, "YYYY-MM-DD");
      const ok =
        chartTimeRange === "week"  ? d.isSame(dayjs(), "week")  :
        chartTimeRange === "month" ? d.isSame(dayjs(), "month") : true;
      if (!ok) return;
      const key = (v.responsavel || "desconhecido").trim().toLowerCase();
      byResp[key] = (byResp[key] || 0) + Number(v.valor || 0);
    });
    return {
      labels: Object.keys(byResp),
      datasets: [{ label: "Vendas (R$)", data: Object.values(byResp) }],
    };
  }, [vendasAgrupadas, chartTimeRange]);

  // ▲ Contagens e variações em número de vendas
  const prevMonth = dayjs(selectedMonth + "-01", "YYYY-MM-DD").subtract(1, "month").format("YYYY-MM");
  const vendasMesAtual    = useMemo(() => vendasAgrupadas.filter((v) => dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === selectedMonth), [vendasAgrupadas, selectedMonth]);
  const vendasMesAnterior = useMemo(() => vendasAgrupadas.filter((v) => dayjs(v.dataFormatada, "YYYY-MM-DD").format("YYYY-MM") === prevMonth), [vendasAgrupadas, prevMonth]);
  const countAtual        = vendasMesAtual.length;
  const countAnterior     = vendasMesAnterior.length;
  const pctVendas         = countAnterior ? ((countAtual - countAnterior) / countAnterior) * 100 : 0;

  // Exposição da API do hook
  return {
    vendas: vendasAgrupadas, // RETORNAR AS VENDAS JÁ AGRUPADAS (TODAS as unidades)
    vendasUnidadeAtual, // ✅ NOVO: Vendas apenas da unidade atual
    vendasOriginais: vendas, // Opcional: manter acesso às vendas originais se necessário
    loading,
    error,
    successMessage,
    file,
    setFile,
    uploading,
    autoConvertAdmin,
    setAutoConvertAdmin,
    handleUpload,

    filtroResponsavel,
    setFiltroResponsavel,
    filtroProduto,
    setFiltroProduto,
    filtroNome,
    setFiltroNome,
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedMonth,
    setSelectedMonth,
    chartTimeRange,
    setChartTimeRange,

    sortConfig,
    setSortConfig,
    currentPage,
    setCurrentPage,
    itemsPerPage,

    responsaveis,
    produtos,
    produtosSelecionados,
    setProdutosSelecionados,

    vendasFiltradas,
    vendasOrdenadas,
    paginatedVendas,

    totalFaturado,
    totalFiltrado,
    mediaPorVenda,

    totalCurrent,
    totalPrevious,
    percentChange,

    chartData,

    countAtual,
    countAnterior,
    pctVendas,

    updateVenda,
    deleteAllUnitData,
  };
};
