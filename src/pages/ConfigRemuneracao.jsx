import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";

const NavBar = () => {
  const { unidade } = useParams();
  return (
    <nav className="nav-bar">
      <Link to={`/dashboard/${unidade}`} className="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Dashboard</span>
      </Link>
      <Link to="/unidade" className="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span>Unidade</span>
      </Link>
      <Link to={`/metas/${unidade}`} className="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="m19 9-5 5-4-4-3 3"></path>
        </svg>
        <span>Metas</span>
      </Link>
    </nav>
  );
};

export default function ConfigRemuneracao() {
  const { unidade } = useParams();
  const navigate = useNavigate();

  const [faixas, setFaixas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Carrega configuração existente
  useEffect(() => {
    if (!unidade) {
      navigate("/login");
      return;
    }
    async function loadConfig() {
      try {
        setLoading(true);
        const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", "premiacao");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setFaixas(Array.isArray(data.premiacao) ? data.premiacao : []);
        } else {
          setFaixas([]);
        }
      } catch (err) {
        console.error("Erro ao carregar configuração:", err);
        setError("Falha ao carregar configuração.");
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [unidade, navigate]);

  // Gerar faixas padrão conforme unidade
  const gerarFaixasPadrao = () => {
    const start = 35;
    const step = 5;
    const cutoff = 100;
    const initial = unidade.toLowerCase() === "alphaville" ? 200 : 180;
    const incBefore = initial;
    const incAfter = unidade.toLowerCase() === "alphaville" ? 220 : 200;
    let arr = [];
    // até 100%
    for (let p = start, prize = initial; p <= cutoff; p += step) {
      arr.push({ percentual: p, premio: prize });
      prize += incBefore;
    }
    // acima de 100%
    for (let p = cutoff + step, prize = arr[arr.length - 1].premio + incAfter; p <= 200; p += step) {
      arr.push({ percentual: p, premio: prize });
      prize += incAfter;
    }
    setFaixas(arr);
  };

  // Manipulação manual
  const addFaixa = () =>
    setFaixas([...faixas, { percentual: "", premio: "" }]);
  
  const updateFaixa = (i, field, v) => {
    const updated = [...faixas];
    updated[i] = { ...updated[i], [field]: v }; // mantém string
    setFaixas(updated);
  };
  
  const removeFaixa = (i) => setFaixas(faixas.filter((_, idx) => idx !== i));

  // Salvar
  const handleSave = async () => {
    try {
      setError("");
      const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", "premiacao");
      await setDoc(ref, {
        premiacao: faixas.map(f => ({
          percentual: Number(f.percentual),
          premio: Number(f.premio)
        })),
        updatedAt: dayjs().toISOString(),
      });
      
      setSuccessMessage("Configuração salva com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar configuração:", err);
      setError("Falha ao salvar configuração.");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="logo">
          <h2>Gestão</h2>
        </div>
        <NavBar />
      </div>
      
      <div className="content-area">
        <header className="page-header">
          <div>
            <h1>Configurar Premiação</h1>
            <div className="unit-badge">{unidade.toUpperCase()}</div>
          </div>
          <Link to={`/metas/${unidade}`} className="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Voltar às Metas
          </Link>
        </header>

        {error && (
          <div className="alert error">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="alert success">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {successMessage}
          </div>
        )}

        <div className="card">
          <div className="card-actions">
            <div className="action-buttons">
              <button onClick={gerarFaixasPadrao} className="secondary-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.798 0 3.5-.593 4.95-1.43m-4.95 1.43a9 9 0 01-9-9m9 9v-2.5m0-9a9 9 0 00-9 9m9-9v2.5m0 0c1.798 0 3.5.593 4.95 1.43"/>
                </svg>
                Gerar Faixas Padrão
              </button>
              <button onClick={addFaixa} className="secondary-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Adicionar Faixa
              </button>
            </div>
            <button onClick={handleSave} className="primary-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Salvar Configuração
            </button>
          </div>

          <div className="table-container">
            <table className="faixas-table">
              <thead>
                <tr>
                  <th>% Meta</th>
                  <th>Prêmio (R$)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {faixas.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="empty-state">
                      <div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                        <p>Nenhuma faixa configurada</p>
                        <button onClick={gerarFaixasPadrao} className="text-button">
                          Gerar faixas padrão
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  faixas.map((f, i) => (
                    <tr key={i}>
                      <td>
                        <div className="input-with-label">
                        <input
                          type="number"
                          value={f.percentual !== "" ? f.percentual : ""}
                          onChange={(e) => updateFaixa(i, "percentual", e.target.value)}
                          className="modern-input"
                        />
                          <span className="input-suffix">%</span>
                        </div>
                      </td>
                      <td>
                        <div className="input-with-label">
                          <span className="input-prefix">R$</span>
                          <input
                            type="number"
                            value={f.premio !== "" ? f.premio : ""}
                            onChange={(e) => updateFaixa(i, "premio", e.target.value)}
                            className="modern-input"
                          />
                        </div>
                      </td>
                      <td>
                        <button onClick={() => removeFaixa(i)} className="delete-button" title="Remover faixa">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Reset e variáveis */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        :root {
          --primary: #4f46e5;
          --primary-hover: #4338ca;
          --primary-light: #eef2ff;
          --secondary: #f3f4f6;
          --secondary-hover: #e5e7eb;
          --danger: #ef4444;
          --danger-hover: #dc2626;
          --success: #10b981;
          --success-light: #d1fae5;
          --error-light: #fee2e2;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border: #e2e8f0;
          --card-bg: #ffffff;
          --body-bg: #f8fafc;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --radius: 8px;
          --radius-sm: 4px;
          --sidebar-width: 220px;
        }
        
        /* Layout principal */
        .app-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--body-bg);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        .sidebar {
          width: var(--sidebar-width);
          background-color: var(--card-bg);
          border-right: 1px solid var(--border);
          position: fixed;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .logo {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        
        .logo h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--primary);
        }
        
        .content-area {
          flex: 1;
          padding: 2rem;
          margin-left: var(--sidebar-width);
          max-width: 1200px;
        }
        
        /* Navegação */
        .nav-bar {
          display: flex;
          flex-direction: column;
          padding: 1rem 0.75rem;
          gap: 0.25rem;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
          font-weight: 500;
        }
        
        .nav-link:hover, .nav-link.active {
          background: var(--primary-light);
          color: var(--primary);
        }
        
        /* Cabeçalho e ações */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .page-header h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          display: inline;
          margin-right: 0.75rem;
        }
        
        .unit-badge {
          display: inline-flex;
          padding: 0.25rem 0.75rem;
          background-color: var(--primary-light);
          color: var(--primary);
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        
        .back-link:hover {
          color: var(--primary-hover);
        }
        
        /* Card e tabela */
        .card {
          background-color: var(--card-bg);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        
        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border);
        }
        
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .faixas-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .faixas-table th {
          text-align: left;
          padding: 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          background-color: var(--secondary);
        }
        
        .faixas-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border);
        }
        
        .faixas-table tr:last-child td {
          border-bottom: none;
        }
        
        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }
        
        .empty-state div {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .empty-state svg {
          color: var(--text-secondary);
          stroke-width: 1.5;
          margin-bottom: 0.5rem;
        }
        
        .empty-state p {
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        
        /* Formulários e inputs */
        .input-with-label {
          display: flex;
          align-items: center;
          position: relative;
        }
        
        .input-prefix {
          position: absolute;
          left: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        
        .input-suffix {
          position: absolute;
          right: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        
        .modern-input {
          width: 100%;
          padding: 0.65rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-size: 0.95rem;
        }
        
        .input-with-label .input-prefix ~ .modern-input {
          padding-left: 2rem;
        }
        
        .input-with-label .input-suffix ~ .modern-input {
          padding-right: 2rem;
        }
        
        .modern-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
        }
        
        /* Botões */
        .primary-button, .secondary-button, .text-button, .delete-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border-radius: var(--radius-sm);
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
        }
        
        .primary-button {
          background-color: var(--primary);
          color: white;
        }
        
        .primary-button:hover {
          background-color: var(--primary-hover);
        }
        
        .secondary-button {
          background-color: var(--secondary);
          color: var(--text-primary);
        }
        
        .secondary-button:hover {
          background-color: var(--secondary-hover);
        }
        
        .text-button {
          background: none;
          color: var(--primary);
          padding: 0.5rem;
        }
        
        .text-button:hover {
          background-color: var(--primary-light);
        }
        
        .delete-button {
          background: none;
          color: var(--danger);
          padding: 0.5rem;
          border-radius: 50%;
        }
        
        .delete-button:hover {
          background-color: var(--error-light);
        }
        
        /* Alertas */
        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: var(--radius);
          margin-bottom: 1rem;
          animation: fadeIn 0.3s ease;
        }
        
        .alert.error {
          background-color: var(--error-light);
          color: var(--danger);
        }
        
        .alert.success {
          background-color: var(--success-light);
          color: var(--success);
        }
        
        /* Loading state */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 1rem;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--secondary);
          border-radius: 50%;
          border-top-color: var(--primary);
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}