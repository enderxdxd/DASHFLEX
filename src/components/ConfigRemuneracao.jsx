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
        Dashboard
      </Link>
      <Link to="/unidade" className="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        Unidade
      </Link>
      <Link to={`/metas/${unidade}`} className="nav-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="m19 9-5 5-4-4-3 3"></path>
        </svg>
        Metas
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
    for (let p = cutoff + step, prize = arr[arr.length - 1].premio + incAfter; p <= 170; p += step) {
      arr.push({ percentual: p, premio: prize });
      prize += incAfter;
    }
    setFaixas(arr);
  };

  // Manipulação manual
  const addFaixa = () => setFaixas([...faixas, { percentual: 0, premio: 0 }]);
  const updateFaixa = (i, field, v) => {
    const updated = [...faixas];
    updated[i] = { ...updated[i], [field]: Number(v) };
    setFaixas(updated);
  };
  const removeFaixa = (i) => setFaixas(faixas.filter((_, idx) => idx !== i));

  // Salvar
  const handleSave = async () => {
    try {
      setError("");
      const ref = doc(db, "faturamento", unidade.toLowerCase(), "configRemuneracao", "premiacao");
      await setDoc(ref, { premiacao: faixas, updatedAt: dayjs().toISOString() });
      setSuccessMessage("Configuração salva com sucesso!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar configuração:", err);
      setError("Falha ao salvar configuração.");
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="config-container">
      <NavBar />
      <header className="config-header">
        <h1>Configurar Premiação - {unidade.toUpperCase()}</h1>
        <Link to={`/metas/${unidade}`} className="back-link">← Voltar às Metas</Link>
      </header>

      {error && <div className="alert error">{error}</div>}
      {successMessage && <div className="alert success">{successMessage}</div>}

      <div className="actions">
        <button onClick={gerarFaixasPadrao} className="secondary-button">
          Gerar Faixas Padrão
        </button>
        <button onClick={addFaixa} className="secondary-button">
          + Adicionar Faixa
        </button>
        <button onClick={handleSave} className="primary-button">
          Salvar
        </button>
      </div>

      <table className="faixas-table">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>% Meta</th>
            <th style={{ width: '50%' }}>Prêmio (R$)</th>
            <th style={{ width: '20%' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {faixas.map((f, i) => (
            <tr key={i}>
              <td>
                <input
                  type="number"
                  value={f.percentual}
                  onChange={(e) => updateFaixa(i, 'percentual', e.target.value)}
                  className="modern-input"
                />
              </td>
              <td>
                <input
                  type="number"
                  value={f.premio}
                  onChange={(e) => updateFaixa(i, 'premio', e.target.value)}
                  className="modern-input"
                />
              </td>
              <td>
                <button onClick={() => removeFaixa(i)} className="delete-button">
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .nav-bar { display: flex; gap: 1.5rem; padding: 1rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .nav-link { display: flex; align-items: center; gap: 0.5rem; color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; }
        .nav-link:hover { background: #e2e8f0; color: #334155; }
        .config-container { max-width: 800px; margin: 0 auto; padding: 2rem; }
        .config-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .back-link { text-decoration: none; color: #4F46E5; }
        .actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .faixas-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
        th, td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; }
        .modern-input { width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; }
        .primary-button { padding: 0.5rem 1rem; background: #4f46e5; color: white; border: none; border-radius: 4px; }
        .secondary-button { padding: 0.5rem 1rem; background: #e5e7eb; color: #334155; border: none; border-radius: 4px; }
        .delete-button { background: none; border: none; color: #ef4444; cursor: pointer; }
        .alert { padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; }
        .alert.error { background: #fee2e2; color: #991b1b; }
        .alert.success { background: #d1fae5; color: #065f46; }
      `}</style>
    </div>
  );
}
