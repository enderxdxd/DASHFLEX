import { useState, useEffect } from "react";
import { collection, addDoc,getDocs } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import { Link, useParams, useNavigate } from "react-router-dom";

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
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>
        Metas
      </Link>
      
    </nav>
  );
};

export default function AddSale() {
  const { unidade } = useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [valor, setValor] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responsaveis, setResponsaveis] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!unidade) return;

        // Buscar responsáveis das metas
        const metasSnapshot = await getDocs(
          collection(db, "faturamento", unidade.toLowerCase(), "metas")
        );
        const responsaveisList = [...new Set(
          metasSnapshot.docs.map(doc => doc.data().responsavel)
        )];

        // Buscar produtos das vendas existentes
        const vendasSnapshot = await getDocs(
          collection(db, "faturamento", unidade.toLowerCase(), "vendas")
        );
        const produtosList = [...new Set(
          vendasSnapshot.docs.map(doc => doc.data().produto)
        )];

        setResponsaveis(responsaveisList);
        setProdutos(produtosList);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [unidade]);

  if (!unidade) {
    return (
      <div className="error-container">
        <h2>Unidade não especificada</h2>
        <Link to="/" className="error-link">
          Voltar para a página inicial
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const parsedDate = dayjs(dataLancamento, "DD/MM/YYYY");
      if (!parsedDate.isValid()) {
        throw new Error("Data inválida (use DD/MM/YYYY)");
      }

      const sale = {
        produto: produto.trim(),
        responsavel: responsavel.trim(),
        valor: Number(valor),
        dataLancamento,
        dataFormatada: parsedDate.format("YYYY-MM-DD"),
        unidade: unidade.toLowerCase(),
      };

      await addDoc(collection(db, "faturamento", unidade.toLowerCase(), "vendas"), sale);
      navigate(`/dashboard/${unidade}`);
    } catch (err) {
      setError(err.message);
      console.error("Erro ao adicionar venda:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <NavBar />
      
      <form onSubmit={handleSubmit} className="sales-form">
        <div className="form-header">
          <h2>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nova Venda Manual
          </h2>
          <p className="unidade-info">Unidade: {unidade?.toUpperCase()}</p>
        </div>

        {error && (
          <div className="alert error">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            {error}
          </div>
        )}

        <div className="form-group">
          <label>
            Produto
            {loadingData ? (
              <div className="loading-input">
                <div className="spinner small"></div>
                Carregando produtos...
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  list="produtos-list"
                  placeholder="Selecione ou digite um produto"
                  required
                  disabled={loading}
                />
                <datalist id="produtos-list">
                  {produtos.map((produto, index) => (
                    <option key={index} value={produto} />
                  ))}
                </datalist>
              </>
            )}
          </label>
        </div>

        <div className="form-group">
          <label>
            Responsável
            {loadingData ? (
              <div className="loading-input">
                <div className="spinner small"></div>
                Carregando responsáveis...
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  list="responsaveis-list"
                  placeholder="Selecione ou digite um responsável"
                  required
                  disabled={loading}
                />
                <datalist id="responsaveis-list">
                  {responsaveis.map((responsavel, index) => (
                    <option key={index} value={responsavel} />
                  ))}
                </datalist>
              </>
            )}
          </label>
        </div>

        <div className="form-group">
          <label>
            Valor (R$)
            <div className="input-currency">
              <input
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                step="0.01"
                required
                disabled={loading}
              />
            </div>
          </label>
        </div>

        <div className="form-group">
          <label>
            Data de Lançamento
            <div className="date-input">
              <input
                type="text"
                value={dataLancamento}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value
                    .slice(0, 8)
                    .replace(/(\d{2})(\d{0,2})(\d{0,4})/, (_, d, m, y) =>
                      [d, m, y].filter(Boolean).join('/')
                    );
                  setDataLancamento(formatted);
                }}
                placeholder="DD/MM/AAAA"
                required
                disabled={loading}
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
              </svg>
            </div>
          </label>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (
            <>
              <div className="spinner"></div>
              Salvando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Cadastrar Venda
            </>
          )}
        </button>
      </form>

      <style jsx>{`
        .nav-bar {
          display: flex;
          gap: 1.5rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 2rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #64748b;
          text-decoration: none;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .nav-link:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .nav-link.active {
          background: #6366f1;
          color: white;
          box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
        }

        .form-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }

        .sales-form {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .form-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .form-header h2 {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: center;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .unidade-info {
          color: #64748b;
          font-size: 0.9em;
          margin: 0;
        }

        .form-group {
          margin-bottom: 1.75rem;
        }

        label {
          display: block;
          color: #475569;
          font-weight: 500;
          margin-bottom: 0.75rem;
          font-size: 0.95rem;
        }

        input {
          width: 100%;
          padding: 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: #f8fafc;
        }

        input:focus {
          outline: none;
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          background: white;
        }

        input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .input-currency,
        .date-input {
          position: relative;
        }

        .date-input svg {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.95rem;
        }

        .alert.error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .submit-btn {
          width: 100%;
          padding: 1.125rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          transition: all 0.2s ease;
          font-size: 1rem;
        }

        .submit-btn:hover {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          background: #c7d2fe;
          transform: none;
          cursor: not-allowed;
        }
        
        .loading-input {
          padding: 0.875rem;
          background: #f8fafc;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #64748b;
        }

        .spinner.small {
          width: 18px;
          height: 18px;
          border-width: 2px;
        }

        datalist {
          position: absolute;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-top: 4px;
          max-height: 200px;
          overflow-y: auto;
        }

        datalist option {
          padding: 0.5rem 1rem;
          cursor: pointer;
        }

        datalist option:hover {
          background: #f1f5f9;
        }

        .spinner {
          width: 22px;
          height: 22px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }

        .error-container {
          text-align: center;
          padding: 3rem 2rem;
          max-width: 600px;
          margin: 2rem auto;
          background: #fef2f2;
          border-radius: 12px;
          border: 1px solid #fecaca;
        }   

        .error-container h2 {
          color: #dc2626;
          margin-bottom: 1.5rem;
        }

        .error-link {
          color: #6366f1;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .error-link:hover {
          opacity: 0.8;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .form-container {
            padding: 1.5rem;
          }

          .nav-bar {
            flex-direction: column;
            gap: 0.5rem;
            padding: 1rem;
          }

          .sales-form {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}