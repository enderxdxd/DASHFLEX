import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import NavBar from "../components/NavBar";
import CurrencyInput from "../utils/CurrencyInput";
import gerarPlanosPadrao, { gerarFaixasPremiacao } from "../utils/planosPadrao";
import Loading3D from '../components/ui/Loading3D';

// Componente Principal
const ConfigRemuneracao = () => {
  const { unidade } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("premiacao");
  const [isLoading, setIsLoading] = useState(false);
  const [metaUnidade, setMetaUnidade] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [faixas, setFaixas] = useState([]);
  const [comissaoPlanos, setComissaoPlanos] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Lista de meses para seleção
  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" }
  ];

  // Gerar anos para seleção (ano atual e 5 anos para frente)
  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 6 }, (_, i) => anoAtual + i);

  // Carrega os dados iniciais
  useEffect(() => {
    if (unidade) {
      loadConfig();
    }
  }, [unidade, selectedMonth]);

  
  
  // Carrega configuração do mês anterior ou configução padrão
  const loadPreviousConfig = async () => {
    try {
      // Primeiro tentamos o mês anterior
      const mesAnterior = selectedMonth.split('-')[1] === '01' 
        ? `${parseInt(selectedMonth.split('-')[0]) - 1}-12`
        : `${selectedMonth.split('-')[0]}-${String(parseInt(selectedMonth.split('-')[1]) - 1).padStart(2, '0')}`;
      
      const refAnterior = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${mesAnterior}`);
      const snapAnterior = await getDoc(refAnterior);
      
      if (snapAnterior.exists()) {
        const data = snapAnterior.data();
        setMetaUnidade(data.metaUnidade || 0);
        setFaixas(Array.isArray(data.premiacao) ? data.premiacao : []);
        setComissaoPlanos(Array.isArray(data.comissaoPlanos) ? data.comissaoPlanos : []);
        setSuccessMessage("Carregada configuração do mês anterior. Salve para confirmar para este mês.");
        setTimeout(() => setSuccessMessage(""), 5000);
      } else {
        // Se não existir configuração anterior, carregamos a configuração padrão
        // ou inicializamos com valores vazios
        setMetaUnidade(0);
        setFaixas([]);
        setComissaoPlanos(gerarPlanosPadrao(unidade));
      }
    } catch (err) {
      console.error(err);
      // Inicializa com valores padrão em caso de erro
      setMetaUnidade(0);
      setFaixas([]);
      setComissaoPlanos([]);
    }
  };
  
  // Funções para gerenciar faixas
  const addFaixa = () => setFaixas([...faixas, { percentual: "", premio: "" }]);
  
  const updateFaixa = (i, field, value) => {
    const arr = [...faixas];
    arr[i][field] = value;
    setFaixas(arr);
  };
  
  const removeFaixa = (i) => setFaixas(faixas.filter((_, idx) => idx !== i));

  const handleGerarFaixasPadrao = () => {
    const novasFaixas = gerarFaixasPremiacao(unidade);
    setFaixas(novasFaixas);
    setSuccessMessage("Faixas de premiação geradas automaticamente!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Funções para gerenciar planos
  const addPlano = () => setComissaoPlanos([
    ...comissaoPlanos,
    { plano: "", min: "", max: "", semMeta: "", comMeta: "", metaTME: "" },
  ]);
  
  const updatePlano = (i, field, value) => {
    const arr = [...comissaoPlanos];
    arr[i][field] = value;
    setComissaoPlanos(arr);
  };
  
  const removePlano = (i) => setComissaoPlanos(comissaoPlanos.filter((_, idx) => idx !== i));

  // Correção na função para carregar os planos padrão
  const handleCarregarPlanosPadrao = () => {
    if (!unidade) return;
    
    // Obter os planos padrão sem modificação
    const planosPadrao = gerarPlanosPadrao(unidade);
    setComissaoPlanos(planosPadrao);
  };

  // Funções para salvar dados
  const handleApplyMeta = async () => {
    try {
      setIsLoading(true);
      setError("");
  
      const unidadeLower = unidade.toLowerCase();
      const ref = doc(
        db,
        "faturamento",
        unidadeLower,
        "configRemuneracao",
        `premiacao-${selectedMonth}`
      );
  
      const metaUnidadeNum = metaUnidade ? parseInt(metaUnidade, 10) : 0;
  
      await setDoc(ref, {
        metaUnidade: metaUnidadeNum,
        updatedAt: dayjs().toISOString(),
      });
  
      setSuccessMessage(`Meta de ${meses[parseInt(selectedMonth.split('-')[1]) - 1].label}/${selectedMonth.split('-')[0]} atualizada com sucesso!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Falha ao atualizar a meta da unidade.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🔧 CORREÇÕES NECESSÁRIAS:

// 1. Corrigir handleSaveFaixas para usar o mês selecionado:
const handleSaveFaixas = async () => {
  try {
    setIsLoading(true);
    setError("");
    
    // ✅ CORREÇÃO: Usar selectedMonth no caminho
    const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${selectedMonth}`);
    
    await setDoc(
      ref,
      {
        premiacao: faixas.map((f) => ({
          percentual: Number(f.percentual),
          premio: f.premio ? parseInt(f.premio) : 0,
        })),
        updatedAt: dayjs().toISOString(),
      },
      { merge: true }
    );
    setSuccessMessage("Faixas de premiação atualizadas com sucesso!");
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err) {
    console.error(err);
    setError("Falha ao atualizar faixas de premiação.");
  } finally {
    setIsLoading(false);
  }
};

// 2. Corrigir handleSavePlanos para usar o mês selecionado:
const handleSavePlanos = async () => {
  try {
    setIsLoading(true);
    setError("");
    
    // ✅ CORREÇÃO: Usar selectedMonth no caminho
    const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${selectedMonth}`);
    
    await setDoc(
      ref,
      {
        comissaoPlanos: comissaoPlanos.map((p) => ({
          plano: p.plano.trim(),
          min: p.min ? parseInt(p.min) : 0,
          max: p.max ? parseInt(p.max) : 0,
          semMeta: p.semMeta ? parseInt(p.semMeta) : 0,
          comMeta: p.comMeta ? parseInt(p.comMeta) : 0,
          metaTME: p.metaTME ? parseInt(p.metaTME) : 0,
        })),
        updatedAt: dayjs().toISOString(),
      },
      { merge: true }
    );
    setSuccessMessage("Comissões por plano atualizadas com sucesso!");
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err) {
    console.error(err);
    setError("Falha ao atualizar comissões por plano.");
  } finally {
    setIsLoading(false);
  }
};

// 3. Corrigir handleSave para usar o mês selecionado:
const handleSave = async () => {
  try {
    setIsLoading(true);
    setError("");
    
    // ✅ CORREÇÃO: Usar selectedMonth no caminho
    const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${selectedMonth}`);
    
    const metaUnidadeNum = metaUnidade ? parseInt(metaUnidade) : 0;
    
    await setDoc(
      ref,
      {
        metaUnidade: metaUnidadeNum,
        premiacao: faixas.map((f) => ({
          percentual: Number(f.percentual),
          premio: f.premio ? parseInt(f.premio) : 0,
        })),
        comissaoPlanos: comissaoPlanos.map((p) => ({
          plano: p.plano.trim(),
          min: p.min ? parseInt(p.min) : 0,
          max: p.max ? parseInt(p.max) : 0,
          semMeta: p.semMeta ? parseInt(p.semMeta) : 0,
          comMeta: p.comMeta ? parseInt(p.comMeta) : 0, 
          metaTME: p.metaTME ? parseInt(p.metaTME) : 0,
        })),
        updatedAt: dayjs().toISOString(),
      },
      { merge: true }
    );
    setSuccessMessage("Configurações salvas com sucesso!");
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err) {
    console.error(err);
    setError("Falha ao salvar configuração.");
  } finally {
    setIsLoading(false);
  }
};

// 4. ADICIONAR: Função para limpar configurações antigas (opcional)
const handleLimparConfiguracoes = async () => {
  try {
    setIsLoading(true);
    setError("");
    
    // Resetar os estados
    setMetaUnidade(0);
    setFaixas([]);
    setComissaoPlanos([]);
    
    setSuccessMessage("Configurações limpas! Não esqueça de salvar as novas configurações.");
    setTimeout(() => setSuccessMessage(""), 3000);
  } catch (err) {
    console.error(err);
    setError("Falha ao limpar configurações.");
  } finally {
    setIsLoading(false);
  }
};

// 5. MELHORAR: Adicionar logs para debug
const loadConfig = async () => {
  try {
    setLoading(true);
    const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${selectedMonth}`);
    
    console.log("🔍 Carregando de:", ref.path); // Debug
    
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      
      console.log("📊 Dados carregados:", data); // Debug
      
      setMetaUnidade(data.metaUnidade || 0);
      setFaixas(Array.isArray(data.premiacao) ? data.premiacao : []);
      setComissaoPlanos(Array.isArray(data.comissaoPlanos) ? data.comissaoPlanos : []);
      
      console.log("✅ Faixas carregadas:", data.premiacao); // Debug
    } else {
      console.log("❌ Documento não encontrado, carregando config anterior..."); // Debug
      await loadPreviousConfig();
    }
  } catch (err) {
    console.error("🚨 Erro ao carregar config:", err);
    setError("Falha ao carregar configuração.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="dashboard-wrapper">
      <NavBar />
      
      <div className="main-content">
        <div className="config-header">
          <h1>Configuração de Remuneração - {unidade.toUpperCase()}</h1>
          <p className="last-update">Última atualização: {new Date().toLocaleString("pt-BR")}</p>
        </div>
        
        {error && (
          <div className="alert error">
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        
        {successMessage && (
          <div className="alert success">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage("")}>×</button>
          </div>
        )}
        
        {loading ? (
          <div className="loading-overlay">
            <Loading3D size={120} />
            <p>Carregando configurações...</p>
          </div>
        ) : (
          <>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === "premiacao" ? "active" : ""}`}
                onClick={() => setActiveTab("premiacao")}
              >
                Premiação por Meta
              </button>
              <button 
                className={`tab ${activeTab === "comissao" ? "active" : ""}`}
                onClick={() => setActiveTab("comissao")}
              >
                Comissão por Plano
              </button>
            </div>
            
            {activeTab === "premiacao" && (
              <div className="tab-content">
                {/* Meta da Unidade */}
                <div className="config-section">
                  <div className="section-header">
                    <h2>Meta da Unidade</h2>
                    <p>Configure a meta mensal da unidade</p>
                  </div>
                  
                  <div className="meta-config">
                    <div className="form-group">
                      <label>Mês/Ano</label>
                      <div className="month-year-selector">
                        <select
                          value={selectedMonth.split('-')[1]}
                          onChange={(e) => {
                            const [year] = selectedMonth.split('-');
                            setSelectedMonth(`${year}-${e.target.value}`);
                          }}
                          className="form-select"
                        >
                          {meses.map((mes) => (
                            <option key={mes.value} value={String(mes.value).padStart(2, '0')}>
                              {mes.label}
                            </option>
                          ))}
                        </select>
                        
                        <select
                          value={selectedMonth.split('-')[0]}
                          onChange={(e) => {
                            const [, month] = selectedMonth.split('-');
                            setSelectedMonth(`${e.target.value}-${month}`);
                          }}
                          className="form-select"
                        >
                          {anos.map((ano) => (
                            <option key={ano} value={ano}>
                              {ano}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Meta (R$)</label>
                      <CurrencyInput
                        value={metaUnidade}
                        onChange={(value) => setMetaUnidade(value)}
                      />
                    </div>
                    
                    <button 
                      className="btn primary"
                      onClick={handleApplyMeta}
                      disabled={isLoading}
                    >
                      {isLoading ? "Atualizando..." : "Atualizar Meta"}
                    </button>
                  </div>
                </div>
                
                {/* Faixas de Premiação */}
                <div className="config-section">
                  <div className="section-header">
                    <h2>Faixas de Premiação</h2>
                    <p>Configure os valores de premiação por faixa percentual atingida da meta</p>
                  </div>
                  
                  <div className="import-action">
                    <button
                      className="btn secondary"
                      onClick={handleGerarFaixasPadrao}
                    >
                      Gerar Faixas Padrão
                    </button>
                  </div>

                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Percentual Atingido (%)</th>
                          <th>Valor do Prêmio (R$)</th>
                          <th className="action-column"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {faixas.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="empty-state">
                              Nenhuma faixa configurada. Adicione uma faixa abaixo.
                            </td>
                          </tr>
                        ) : (
                          faixas.map((faixa, index) => (
                            <tr key={index}>
                              <td>
                                <div className="percent-input">
                                  <input
                                    type="number"
                                    min="0"
                                    max="200"
                                    value={faixa.percentual}
                                    onChange={(e) => updateFaixa(index, "percentual", e.target.value)}
                                    placeholder="Ex: 90"
                                  />
                                  <span className="percent-symbol">%</span>
                                </div>
                              </td>
                              <td>
                                <CurrencyInput
                                  value={faixa.premio}
                                  onChange={(value) => updateFaixa(index, "premio", value)}
                                />
                              </td>
                              <td>
                                <button 
                                  className="btn icon delete"
                                  onClick={() => removeFaixa(index)}
                                  title="Remover faixa"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="table-actions">
                    <button 
                      className="btn secondary"
                      onClick={addFaixa}
                    >
                      Adicionar Faixa
                    </button>
                    
                    <button 
                      className="btn primary"
                      onClick={handleSaveFaixas}
                      disabled={isLoading || faixas.length === 0}
                    >
                      {isLoading ? "Salvando..." : "Salvar Faixas"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "comissao" && (
              <div className="tab-content">
                <div className="config-section">
                  <div className="section-header">
                    <h2>Comissão por Plano</h2>
                    <p>Configure os valores de comissão para cada tipo de plano</p>
                  </div>
                  
                  <div className="import-action">
                    <button 
                      className="btn secondary"
                      onClick={handleCarregarPlanosPadrao}
                    >
                      Carregar Planos Padrão
                    </button>
                  </div>
                  
                  <div className="table-wrapper">
                    <table className="data-table comissao-table">
                      <thead>
                        <tr>
                          <th>Plano</th>
                          <th>Min (R$)</th>
                          <th>Max (R$)</th>
                          <th>Sem Meta (R$)</th>
                          <th>Com Meta (R$)</th>
                          <th>Meta TME (R$)</th>
                          <th className="action-column"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {comissaoPlanos.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="empty-state">
                              Nenhum plano configurado. Adicione um plano ou carregue os planos padrão.
                            </td>
                          </tr>
                        ) : (
                          comissaoPlanos.map((plano, index) => (
                            <tr key={index}>
                              <td>
                                <input
                                  type="text"
                                  value={plano.plano}
                                  onChange={(e) => updatePlano(index, "plano", e.target.value)}
                                  placeholder="Nome do plano"
                                  className="text-input"
                                />
                              </td>
                              <td>
                                <CurrencyInput
                                  value={plano.min}
                                  onChange={(value) => updatePlano(index, "min", value)}
                                />
                              </td>
                              <td>
                                <CurrencyInput
                                  value={plano.max}
                                  onChange={(value) => updatePlano(index, "max", value)}
                                />
                              </td>
                              <td>
                                <CurrencyInput
                                  value={plano.semMeta}
                                  onChange={(value) => updatePlano(index, "semMeta", value)}
                                />
                              </td>
                              <td>
                                <CurrencyInput
                                  value={plano.comMeta}
                                  onChange={(value) => updatePlano(index, "comMeta", value)}
                                />
                              </td>
                              <td>
                                <CurrencyInput
                                  value={plano.metaTME}
                                  onChange={(value) => updatePlano(index, "metaTME", value)}
                                />
                              </td>
                              <td>
                                <button 
                                  className="btn icon delete"
                                  onClick={() => removePlano(index)}
                                  title="Remover plano"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="table-actions">
                    <button 
                      className="btn secondary"
                      onClick={addPlano}
                    >
                      Adicionar Plano
                    </button>
                    
                    <button 
                      className="btn primary"
                      onClick={handleSavePlanos}
                      disabled={isLoading || comissaoPlanos.length === 0}
                    >
                      {isLoading ? "Salvando..." : "Salvar Comissões"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="page-actions">
              <button 
                className="btn tertiary"
                onClick={() => navigate(`/dashboard/${unidade}`)}
              >
                Voltar ao Dashboard
              </button>
              
              <button 
                className="btn primary large"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Salvar Todas as Configurações"}
              </button>
            </div>
          </>
        )}
        <style jsx>{`
/* Light Mode Default Values */
:root {
  --primary-color: #0066cc;
  --primary-dark: #0053aa;
  --primary-light: rgba(0, 102, 204, 0.1);
  --primary-lighter: rgba(0, 102, 204, 0.05);
  --primary-focus: rgba(0, 102, 204, 0.2);
  --primary-shadow: rgba(0, 102, 204, 0.3);
  --secondary-color: #f8f9fa;
  --secondary-hover: #e9ecef;
  --tertiary-color: #6c757d;
  --tertiary-hover: #5a6268;
  --success-color: #28a745;
  --success-light: rgba(40, 167, 69, 0.1);
  --success-bg: #d4edda;
  --success-border: #c3e6cb;
  --success-text: #155724;
  --danger-color: #dc3545;
  --danger-light: rgba(220, 53, 69, 0.1);
  --danger-bg: #f8d7da;
  --danger-border: #f5c6cb;
  --danger-text: #721c24;
  --danger-hover-bg: #ffebee;
  --warning-color: #ffc107;
  --warning-light: rgba(255, 193, 7, 0.1);
  --light-gray: #e9ecef;
  --medium-gray: #adb5bd;
  --dark-gray: #495057;
  --page-bg: #f5f7f9;
  --card-bg: #ffffff;
  --input-bg: #ffffff;
  --input-disabled-bg: #f8f9fa;
  --table-bg: #ffffff;
  --table-header-bg: #f8f9fa;
  --table-hover: rgba(0, 102, 204, 0.05);
  --navbar-bg: #2c3e50;
  --navbar-hover: rgba(255, 255, 255, 0.1);
  --navbar-border: rgba(255, 255, 255, 0.1);
  --text-primary: #333333;
  --text-secondary: #495057;
  --text-muted: #6c757d;
  --text-light: #adb5bd;
  --text-white: #ffffff;
  --text-navbar: rgba(255, 255, 255, 0.8);
  --text-navbar-active: #ffffff;
  --text-navbar-title: rgba(255, 255, 255, 0.5);
  --border-color: #e9ecef;
  --border-light: #dee2e6;
  --border-focus: #0066cc;
  --border-radius: 4px;
  --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --box-shadow-hover: 0 4px 8px rgba(0, 0, 0, 0.15);
  --box-shadow-focus: 0 0 0 2px rgba(0, 102, 204, 0.2);
  --spinner-bg: rgba(0, 0, 0, 0.1);
  --spinner-border: #0066cc;
  --transition: all 0.2s ease-in-out;
}

/* Manual Dark Mode Classes */
.dark,
[data-theme="dark"] {
  --primary-color: #4da6ff;
  --primary-dark: #3399ff;
  --primary-light: rgba(77, 166, 255, 0.15);
  --primary-lighter: rgba(77, 166, 255, 0.08);
  --primary-focus: rgba(77, 166, 255, 0.25);
  --primary-shadow: rgba(77, 166, 255, 0.4);
  --secondary-color: #374151;
  --secondary-hover: #4b5563;
  --tertiary-color: #9ca3af;
  --tertiary-hover: #d1d5db;
  --success-color: #34d399;
  --success-light: rgba(52, 211, 153, 0.15);
  --success-bg: rgba(52, 211, 153, 0.1);
  --success-border: rgba(52, 211, 153, 0.3);
  --success-text: #6ee7b7;
  --danger-color: #f87171;
  --danger-light: rgba(248, 113, 113, 0.15);
  --danger-bg: rgba(248, 113, 113, 0.1);
  --danger-border: rgba(248, 113, 113, 0.3);
  --danger-text: #fca5a5;
  --danger-hover-bg: rgba(248, 113, 113, 0.08);
  --warning-color: #fbbf24;
  --warning-light: rgba(251, 191, 36, 0.15);
  --light-gray: #4b5563;
  --medium-gray: #6b7280;
  --dark-gray: #d1d5db;
  --page-bg: #0f172a;
  --card-bg: #1e293b;
  --input-bg: #334155;
  --input-disabled-bg: #1e293b;
  --table-bg: #1e293b;
  --table-header-bg: #334155;
  --table-hover: rgba(77, 166, 255, 0.08);
  --navbar-bg: #1e293b;
  --navbar-hover: rgba(255, 255, 255, 0.1);
  --navbar-border: rgba(255, 255, 255, 0.1);
  --text-primary: #f1f5f9;
  --text-secondary: #e2e8f0;
  --text-muted: #94a3b8;
  --text-light: #64748b;
  --text-white: #0f172a;
  --text-navbar: rgba(255, 255, 255, 0.8);
  --text-navbar-active: #ffffff;
  --text-navbar-title: rgba(255, 255, 255, 0.5);
  --border-color: #475569;
  --border-light: #64748b;
  --border-focus: #4da6ff;
  --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  --box-shadow-hover: 0 4px 8px rgba(0, 0, 0, 0.4);
  --box-shadow-focus: 0 0 0 2px rgba(77, 166, 255, 0.3);
  --spinner-bg: rgba(255, 255, 255, 0.1);
  --spinner-border: #4da6ff;
}

/* Global Styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--page-bg);
  transition: background-color var(--transition), color var(--transition);
}

/* Layout Principal */
.dashboard-wrapper {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 2rem;
  margin-left: 250px; /* Espaço para o NavBar */
}

/* Cabeçalho da Página */
.config-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  transition: border-color var(--transition);
}

.config-header h1 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  transition: color var(--transition);
}

.last-update {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
  transition: color var(--transition);
}

/* Alertas */
.alert {
  padding: 0.75rem 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: var(--border-radius);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all var(--transition);
}

.alert.error {
  background-color: var(--danger-bg);
  border: 1px solid var(--danger-border);
  color: var(--danger-text);
}

.alert.success {
  background-color: var(--success-bg);
  border: 1px solid var(--success-border);
  color: var(--success-text);
}

.alert button {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  transition: opacity var(--transition);
  border-radius: var(--border-radius);
  padding: 0.25rem;
}

.alert button:hover {
  opacity: 1;
  transform: scale(1.1);
}

.alert button:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Loading Spinner */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  border: 4px solid var(--spinner-bg);
  border-top: 4px solid var(--spinner-border);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Tabs */
.tabs {
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  transition: border-color var(--transition);
}

.tab {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}

.tab:hover {
  color: var(--primary-color);
  transform: translateY(-2px);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.tab-content {
  background: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  margin-bottom: 2rem;
  border: 1px solid var(--border-color);
  transition: all var(--transition);
}

.tab-content:hover {
  box-shadow: var(--box-shadow-hover);
}

/* Seções de Configuração */
.config-section {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  transition: border-color var(--transition);
}

.config-section:last-child {
  border-bottom: none;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.35rem;
  transition: color var(--transition);
}

.section-header p {
  color: var(--text-muted);
  font-size: 0.9rem;
  transition: color var(--transition);
}

/* Meta da Unidade */
.meta-config {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-end;
}

/* Form Elements */
.form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  transition: color var(--transition);
}

input, select, textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  transition: var(--transition);
  background-color: var(--input-bg);
  color: var(--text-primary);
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--box-shadow-focus);
  transform: translateY(-1px);
}

input:hover, select:hover, textarea:hover {
  border-color: var(--border-light);
}

input:disabled {
  background-color: var(--input-disabled-bg);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Currency Input */
.currency-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-prefix {
  position: absolute;
  left: 10px;
  color: var(--text-secondary);
  font-weight: 500;
  z-index: 1;
  transition: color var(--transition);
}

.currency-input-wrapper input {
  padding-left: 40px;
}

/* Percent Input */
.percent-input {
  position: relative;
  display: flex;
  align-items: center;
}

.percent-symbol {
  position: absolute;
  right: 10px;
  color: var(--text-secondary);
  z-index: 1;
  transition: color var(--transition);
}

.percent-input input {
  padding-right: 30px;
}

/* Number Input */
.number-input {
  text-align: center;
}

/* Text Input */
.text-input {
  width: 100%;
}

/* Table Styles */
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 1rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  border: 1px solid var(--border-color);
  background-color: var(--table-bg);
  transition: all var(--transition);
}

.table-wrapper:hover {
  box-shadow: var(--box-shadow-hover);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, 
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  transition: all var(--transition);
}

.data-table th {
  background-color: var(--table-header-bg);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.data-table td {
  color: var(--text-primary);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover td {
  background-color: var(--table-hover);
}

.data-table tr {
  transition: background-color var(--transition);
}

.comissao-table th, 
.comissao-table td {
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 2rem !important;
  font-style: italic;
  transition: color var(--transition);
}

.action-column {
  width: 50px;
}

/* Table Actions */
.table-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}

.import-action {
  margin-bottom: 1.25rem;
}

/* Buttons */
.btn {
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: var(--border-radius);
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
  font-size: 0.95rem;
}

.btn:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.btn.primary {
  background-color: var(--primary-color);
  color: var(--text-white);
}

.btn.primary:hover:not(:disabled) {
  background-color: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--box-shadow-hover);
}

.btn.primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn.secondary {
  background-color: var(--secondary-color);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn.secondary:hover:not(:disabled) {
  background-color: var(--secondary-hover);
  transform: translateY(-1px);
  box-shadow: var(--box-shadow);
}

.btn.secondary:active:not(:disabled) {
  transform: translateY(0);
}

.btn.tertiary {
  background-color: transparent;
  color: var(--text-muted);
}

.btn.tertiary:hover:not(:disabled) {
  color: var(--text-secondary);
  background-color: var(--secondary-color);
  transform: translateY(-1px);
}

.btn.tertiary:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.btn.icon {
  padding: 0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn.delete {
  color: var(--danger-color);
}

.btn.delete:hover {
  background-color: var(--danger-hover-bg);
  transform: translateY(-1px);
}

.btn.delete:active {
  transform: translateY(0);
}

/* Page Actions */
.page-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  transition: border-color var(--transition);
}

/* Navbar Styles */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 250px;
  height: 100vh;
  background-color: var(--navbar-bg);
  z-index: 1000;
  transition: all var(--transition);
}

.navbar-header {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid var(--navbar-border);
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-navbar-active);
  text-decoration: none;
  transition: color var(--transition);
}

.navbar-brand:hover {
  color: var(--primary-color);
}

.navbar-menu {
  padding: 1rem 0;
}

.nav-item {
  display: block;
  padding: 0.75rem 1.5rem;
  color: var(--text-navbar);
  text-decoration: none;
  transition: all var(--transition);
  border-left: 3px solid transparent;
}

.nav-item:hover, .nav-item.active {
  background-color: var(--navbar-hover);
  color: var(--text-navbar-active);
  border-left-color: var(--primary-color);
  transform: translateX(4px);
}

.nav-item:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: -2px;
}

.nav-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--navbar-border);
}

.nav-section-title {
  padding: 0.5rem 1.5rem;
  color: var(--text-navbar-title);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: color var(--transition);
}

/* Month Year Selector */
.month-year-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.month-year-selector select {
  flex: 1;
  min-width: 120px;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
  
  @keyframes spin {
    0%, 100% { transform: rotate(0deg); }
  }
}

/* Print styles */
@media print {
  body {
    background: white;
    color: black;
  }
  
  .navbar {
    display: none;
  }
  
  .main-content {
    margin-left: 0;
  }
  
  .tab-content,
  .table-wrapper {
    box-shadow: none;
    border: 1px solid #ccc;
    background: white;
  }
  
  .btn {
    display: none;
  }
}

/* Responsividade */
@media (max-width: 992px) {
  .main-content {
    margin-left: 0;
    padding: 1rem;
  }
  
  .navbar {
    transform: translateX(-250px);
    transition: transform 0.3s ease;
  }
  
  .navbar.open {
    transform: translateX(0);
  }
  
  .menu-toggle {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 100;
    background-color: var(--primary-color);
    color: var(--text-white);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--box-shadow);
    border: none;
    transition: all var(--transition);
  }
  
  .menu-toggle:hover {
    background-color: var(--primary-dark);
    transform: scale(1.1);
  }
  
  .menu-toggle:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  
  .menu-toggle.open {
    left: 260px;
  }
}

@media (max-width: 768px) {
  .meta-config {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-actions {
    flex-direction: column;
    gap: 1rem;
  }
  
  .table-actions .btn {
    width: 100%;
  }
  
  .page-actions {
    flex-direction: column;
    gap: 1rem;
  }
  
  .page-actions .btn {
    width: 100%;
  }
  
  .month-year-selector {
    flex-direction: column;
  }

  .month-year-selector select {
    width: 100%;
  }
  
  .config-header {
    padding-bottom: 0.75rem;
  }
  
  .config-header h1 {
    font-size: 1.5rem;
  }
  
  .config-section {
    padding: 1rem;
  }
  
  .section-header h2 {
    font-size: 1.25rem;
  }
}

@media (max-width: 576px) {
  .tabs {
    flex-direction: column;
  }
  
  .tab {
    width: 100%;
    text-align: center;
    border-bottom: 1px solid var(--border-color);
    border-left: none;
  }
  
  .tab.active {
    border-bottom: 1px solid var(--border-color);
    border-left: 3px solid var(--primary-color);
  }
  
  .tab:hover {
    transform: none;
  }
  
  .main-content {
    padding: 0.75rem;
  }
  
  .config-section {
    padding: 0.75rem;
  }
  
  .data-table th,
  .data-table td {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }
  
  .alert {
    padding: 0.5rem 1rem;
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
  
  .loading-overlay {
    padding: 2rem 1rem;
  }
}
`}</style>
      </div>
    </div>
  );
};

export default ConfigRemuneracao;