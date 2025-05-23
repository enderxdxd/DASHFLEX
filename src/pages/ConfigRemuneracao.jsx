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

  const loadConfig = async () => {
    try {
      setLoading(true);
      const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", `premiacao-${selectedMonth}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setMetaUnidade(data.metaUnidade || 0);
        setFaixas(Array.isArray(data.premiacao) ? data.premiacao : []);
        setComissaoPlanos(Array.isArray(data.comissaoPlanos) ? data.comissaoPlanos : []);
      } else {
        // Se não existir configuração para este mês, tentamos carregar o mês anterior
        // ou uma configuração padrão
        await loadPreviousConfig();
      }
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar configuração.");
    } finally {
      setLoading(false);
    }
  };
  
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

  const handleSaveFaixas = async () => {
    try {
      setIsLoading(true);
      setError("");
      const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", "premiacao");
      
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

  const handleSavePlanos = async () => {
    try {
      setIsLoading(true);
      setError("");
      const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", "premiacao");
      
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

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError("");
      const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", "premiacao");
      
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
          /* Estilos Globais */
:root {
  --primary-color: #0066cc;
  --primary-dark:rgb(6, 83, 170);
  --secondary-color: #f8f9fa;
  --tertiary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --light-gray: #e9ecef;
  --medium-gray: #adb5bd;
  --dark-gray: #495057;
  --border-radius: 4px;
  --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  --transition: all 0.2s ease-in-out;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f7f9;
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
  border-bottom: 1px solid var(--light-gray);
  padding-bottom: 1rem;
}

.config-header h1 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--dark-gray);
  margin-bottom: 0.5rem;
}

.last-update {
  font-size: 0.85rem;
  color: var(--tertiary-color);
  font-style: italic;
}

/* Alertas */
.alert {
  padding: 0.75rem 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: var(--border-radius);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.alert.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.alert button {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.alert button:hover {
  opacity: 1;
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
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--primary-color);
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
  border-bottom: 1px solid var(--light-gray);
}

.tab {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--tertiary-color);
  cursor: pointer;
  transition: var(--transition);
}

.tab:hover {
  color: var(--primary-color);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-content {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  margin-bottom: 2rem;
}

/* Seções de Configuração */
.config-section {
  padding: 1.5rem;
  border-bottom: 1px solid var(--light-gray);
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
  color: var(--dark-gray);
  margin-bottom: 0.35rem;
}

.section-header p {
  color: var(--tertiary-color);
  font-size: 0.9rem;
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
  color: var(--dark-gray);
}

input, select, textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  border: 1px solid var(--light-gray);
  border-radius: var(--border-radius);
  transition: var(--transition);
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
}

input:disabled {
  background-color: var(--secondary-color);
  cursor: not-allowed;
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
  color: var(--dark-gray);
  font-weight: 500;
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
  color: var(--dark-gray);
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
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, 
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--light-gray);
}

.data-table th {
  background-color: var(--secondary-color);
  font-weight: 600;
  color: var(--dark-gray);
  white-space: nowrap;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover td {
  background-color: rgba(0, 102, 204, 0.05);
}

.comissao-table th, 
.comissao-table td {
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  color: var(--tertiary-color);
  padding: 2rem !important;
  font-style: italic;
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

.btn.primary {
  background-color: var(--primary-color);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  background-color: var(--primary-dark);
}

.btn.secondary {
  background-color: var(--secondary-color);
  color: var(--dark-gray);
  border: 1px solid var(--light-gray);
}

.btn.secondary:hover:not(:disabled) {
  background-color: var(--light-gray);
}

.btn.tertiary {
  background-color: transparent;
  color: var(--tertiary-color);
}

.btn.tertiary:hover:not(:disabled) {
  color: var(--dark-gray);
  background-color: var(--secondary-color);
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
  background-color: #ffebee;
}

/* Page Actions */
.page-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--light-gray);
}

.navbar-header {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  text-decoration: none;
}

.navbar-menu {
  padding: 1rem 0;
}

.nav-item {
  display: block;
  padding: 0.75rem 1.5rem;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.nav-item:hover, .nav-item.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  border-left-color: var(--primary-color);
}

.nav-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-section-title {
  padding: 0.5rem 1.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
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
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--box-shadow);
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
}

@media (max-width: 576px) {
  .tabs {
    flex-direction: column;
  }
  
  .tab {
    width: 100%;
    text-align: center;
    border-bottom: 1px solid var(--light-gray);
  }
  
  .tab.active {
    border-bottom: 1px solid var(--light-gray);
    border-left: 3px solid var(--primary-color);
  }
}

.month-year-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.month-year-selector select {
  flex: 1;
  min-width: 120px;
}

@media (max-width: 768px) {
  .meta-config {
    flex-direction: column;
    align-items: stretch;
  }

  .month-year-selector {
    flex-direction: column;
  }

  .month-year-selector select {
    width: 100%;
  }
}
        `}</style>
      </div>
    </div>
  );
};

export default ConfigRemuneracao;