import { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/pt-br';
import { Link, useParams, useNavigate } from "react-router-dom";
import Loading3D from '../components/ui/Loading3D';
import NavBar from "../components/NavBar";
import DatePicker, { registerLocale } from "react-datepicker";
import ptBR from "date-fns/locale/pt-BR";
import "react-datepicker/dist/react-datepicker.css";
import { 
  Plus, 
  Package, 
  User, 
  DollarSign, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  ArrowLeft
} from "lucide-react";
import useDarkMode from "../hooks/useDarkMode";

// Configure o dayjs
dayjs.extend(customParseFormat);
dayjs.locale('pt-br');

registerLocale("pt-BR", ptBR);

export default function AddSale() {
  const { unidade } = useParams();
  const navigate = useNavigate();
  const [produto, setProduto] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [valor, setValor] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");
  const [dateObj, setDateObj] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responsaveis, setResponsaveis] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [theme] = useDarkMode();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!unidade) return;

        const metasSnapshot = await getDocs(
          collection(db, "faturamento", unidade.toLowerCase(), "metas")
        );
        const responsaveisList = [...new Set(
          metasSnapshot.docs.map(doc => doc.data().responsavel)
        )];

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
      <div className={`error-container ${theme}`}>
        <div className="error-content">
          <AlertCircle size={48} />
          <h2>Unidade não especificada</h2>
          <p>Por favor, selecione uma unidade para continuar</p>
          <Link to="/" className="error-link">
            <ArrowLeft size={16} />
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  const handleDateChange = (date) => {
    setDateObj(date);
    if (date) {
      setDataLancamento(dayjs(date).format("DD/MM/YYYY"));
    } else {
      setDataLancamento("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
         
    try {
      let parsedDate;
      
      if (dateObj) {
        parsedDate = dayjs(dateObj);
      } else if (dataLancamento) {
        parsedDate = dayjs(dataLancamento, "DD/MM/YYYY", true);
      } else {
        throw new Error("Por favor, selecione ou digite uma data");
      }
      
      if (!parsedDate.isValid()) {
        throw new Error("Data inválida. Use o formato DD/MM/YYYY");
      }
  
      const sale = {
        produto: produto.trim(),
        responsavel: responsavel.trim(),
        valor: Number(valor) / 100,
        dataLancamento: parsedDate.format("DD/MM/YYYY"),
        dataFormatada: parsedDate.format("YYYY-MM-DD"),
        unidade: unidade.toLowerCase(),
      };
  
      await addDoc(collection(db, "faturamento", unidade.toLowerCase(), "vendas"), sale);
      
      setSuccess(true);
      
      // Delay para mostrar a animação de sucesso
      setTimeout(() => {
        navigate(`/dashboard/${unidade}`);
      }, 1500);
      
    } catch (err) {
      setError(err.message);
      console.error("Erro ao adicionar venda:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = (Number(numericValue) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formattedValue;
  };

  return (
    <>
      <NavBar />
      
      <div className={`page-container ${theme}`}>
        <div className="content-wrapper">
          {/* Header Section */}
          <div className="page-header">
            <div className="header-content">
              <div className="header-icon">
                <Plus size={28} />
                <div className="icon-glow"></div>
              </div>
              <div className="header-text">
                <h1>Nova Venda Manual</h1>
                <p>Registre uma nova venda para a unidade <span className="unit-badge">{unidade?.toUpperCase()}</span></p>
              </div>
            </div>
            <div className="header-decoration">
              <Sparkles size={20} />
              <TrendingUp size={24} />
            </div>
          </div>

          {/* Main Form */}
          <div className="form-container">
            <form onSubmit={handleSubmit} className="sales-form">
              
              {/* Success Message */}
              {success && (
                <div className="alert success">
                  <CheckCircle size={20} />
                  <span>Venda registrada com sucesso!</span>
                  <div className="success-animation"></div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="alert error">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="form-grid">
                
                {/* Produto Field */}
                <div className="form-group">
                  <label className="form-label">
                    <Package size={18} />
                    <span>Produto</span>
                    <span className="required">*</span>
                  </label>
                  {loadingData ? (
                    <div className="loading-input">
                      <Loading3D size={24} />
                      <span>Carregando produtos...</span>
                    </div>
                  ) : (
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={produto}
                        onChange={(e) => setProduto(e.target.value)}
                        list="produtos-list"
                        placeholder="Selecione ou digite um produto"
                        className="form-input"
                        required
                        disabled={loading}
                      />
                      <datalist id="produtos-list">
                        {produtos.map((produto, index) => (
                          <option key={index} value={produto} />
                        ))}
                      </datalist>
                      <div className="input-focus-border"></div>
                    </div>
                  )}
                </div>

                {/* Responsável Field */}
                <div className="form-group">
                  <label className="form-label">
                    <User size={18} />
                    <span>Responsável</span>
                    <span className="required">*</span>
                  </label>
                  {loadingData ? (
                    <div className="loading-input">
                      <Loading3D size={24} />
                      <span>Carregando responsáveis...</span>
                    </div>
                  ) : (
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={responsavel}
                        onChange={(e) => setResponsavel(e.target.value)}
                        list="responsaveis-list"
                        placeholder="Selecione ou digite um responsável"
                        className="form-input"
                        required
                        disabled={loading}
                      />
                      <datalist id="responsaveis-list">
                        {responsaveis.map((responsavel, index) => (
                          <option key={index} value={responsavel} />
                        ))}
                      </datalist>
                      <div className="input-focus-border"></div>
                    </div>
                  )}
                </div>

                {/* Valor Field */}
                <div className="form-group">
                  <label className="form-label">
                    <DollarSign size={18} />
                    <span>Valor</span>
                    <span className="required">*</span>
                  </label>
                  <div className="input-wrapper currency-wrapper">
                    <span className="currency-symbol">R$</span>
                    <input
                      type="text"
                      value={valor ? formatCurrency(valor) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setValor(rawValue);
                      }}
                      placeholder="0,00"
                      className="form-input currency-input"
                      required
                      disabled={loading}
                    />
                    <div className="input-focus-border"></div>
                  </div>
                </div>

                {/* Data Field */}
                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={18} />
                    <span>Data de Lançamento</span>
                    <span className="required">*</span>
                  </label>
                  <div className="input-wrapper date-wrapper">
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
                        
                        if (formatted.length === 10) {
                          const parsed = dayjs(formatted, "DD/MM/YYYY", true);
                          if (parsed.isValid()) {
                            setDateObj(parsed.toDate());
                          } else {
                            setDateObj(null);
                          }
                        } else {
                          setDateObj(null);
                        }
                      }}
                      placeholder="DD/MM/AAAA"
                      className="form-input date-input"
                      required
                      disabled={loading}
                    />
                    <DatePicker
                      selected={dateObj}
                      onChange={handleDateChange}
                      dateFormat="dd/MM/yyyy"
                      locale="pt-BR"
                      customInput={
                        <button type="button" className="calendar-button">
                          <Calendar size={16} />
                        </button>
                      }
                      disabled={loading}
                      placeholderText="DD/MM/AAAA"
                      showPopperArrow={false}
                      calendarStartDay={0}
                      popperClassName="custom-datepicker-popper"
                      calendarClassName="custom-datepicker-calendar"
                      wrapperClassName="datepicker-wrapper"
                      portalId="datepicker-portal"
                    />
                    <div className="input-focus-border"></div>
                  </div>
                </div>

              </div>

              {/* Submit Button */}
              <div className="form-actions">
                <Link to={`/dashboard/${unidade}`} className="cancel-button">
                  <ArrowLeft size={16} />
                  Cancelar
                </Link>
                
                <button 
                  type="submit" 
                  className={`submit-button ${loading ? 'loading' : ''} ${success ? 'success' : ''}`}
                  disabled={loading || success}
                >
                  {success ? (
                    <>
                      <CheckCircle size={18} />
                      <span>Sucesso!</span>
                    </>
                  ) : loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      <span>Cadastrar Venda</span>
                    </>
                  )}
                  <div className="button-glow"></div>
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* Portal para o DatePicker */}
      <div id="datepicker-portal"></div>

      <style jsx>{`
        .page-container {
          margin-left: 280px;
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 2rem;
          transition: all 0.3s ease;
        }
        
        .page-container.dark {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
        
        .content-wrapper {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
        }
        
        .page-container.dark .page-header {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .page-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(99, 102, 241, 0.03) 100%);
          pointer-events: none;
        }
        
        .page-container.dark .page-header::before {
          background: linear-gradient(135deg, transparent 0%, rgba(99, 102, 241, 0.1) 100%);
        }
        
        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          z-index: 1;
        }
        
        .header-icon {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3.5rem;
          height: 3.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 1rem;
          color: white;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        }
        
        .icon-glow {
          position: absolute;
          inset: -4px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 1.25rem;
          opacity: 0.3;
          filter: blur(8px);
          z-index: -1;
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        
        .header-text h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
          background: linear-gradient(135deg, #1e293b 0%, #6366f1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .page-container.dark .header-text h1 {
          background: linear-gradient(135deg, #f1f5f9 0%, #93c5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .header-text p {
          color: #64748b;
          margin: 0;
          font-size: 0.875rem;
        }
        
        .page-container.dark .header-text p {
          color: #94a3b8;
        }
        
        .unit-badge {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1d4ed8;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-weight: 600;
          font-size: 0.75rem;
        }
        
        .page-container.dark .unit-badge {
          background: linear-gradient(135deg, #1e40af20 0%, #3b82f620 100%);
          color: #93c5fd;
        }
        
        .header-decoration {
          display: flex;
          gap: 0.5rem;
          color: #94a3b8;
          z-index: 1;
        }
        
        .page-container.dark .header-decoration {
          color: #64748b;
        }
        
        .form-container {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 1.25rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          position: relative;
        }
        
        .page-container.dark .form-container {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .form-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
        }
        
        .sales-form {
          padding: 2rem;
        }
        
        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          font-weight: 500;
          position: relative;
          overflow: hidden;
        }
        
        .alert.success {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          color: #166534;
          border: 1px solid #86efac;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
        }
        
        .page-container.dark .alert.success {
          background: linear-gradient(135deg, #16532920 0%, #22c55e20 100%);
          color: #86efac;
          border-color: #22c55e;
        }
        
        .alert.error {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          border: 1px solid #fca5a5;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        
        .page-container.dark .alert.error {
          background: linear-gradient(135deg, #991b1b20 0%, #ef444420 100%);
          color: #fca5a5;
          border-color: #ef4444;
        }
        
        .success-animation {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
          animation: shimmer 1.5s ease-in-out;
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .form-group:nth-child(3),
        .form-group:nth-child(4) {
          grid-column: span 1;
        }
        
        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }
        
        .page-container.dark .form-label {
          color: #d1d5db;
        }
        
        .required {
          color: #ef4444;
          font-weight: 700;
        }
        
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background-color: #ffffff;
          color: #374151;
          outline: none;
        }
        
        .page-container.dark .form-input {
          background-color: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .form-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          transform: translateY(-1px);
        }
        
        .page-container.dark .form-input:focus {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
        
        .form-input:disabled {
          background-color: #f9fafb;
          color: #9ca3af;
          cursor: not-allowed;
        }
        
        .page-container.dark .form-input:disabled {
          background-color: #1f2937;
          color: #6b7280;
        }
        
        .input-focus-border {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          width: 0;
          background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
          transition: width 0.3s ease;
          border-radius: 1px;
        }
        
        .form-input:focus + .input-focus-border,
        .form-input:focus ~ .input-focus-border {
          width: 100%;
        }
        
        .currency-wrapper {
          position: relative;
        }
        
        .currency-symbol {
          position: absolute;
          left: 1rem;
          color: #6b7280;
          font-weight: 600;
          z-index: 1;
          pointer-events: none;
        }
        
        .page-container.dark .currency-symbol {
          color: #9ca3af;
        }
        
        .currency-input {
          padding-left: 2.5rem;
        }
        
        .date-wrapper {
          gap: 0.5rem;
        }
        
        .date-input {
          flex: 1;
        }
        
        .calendar-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.875rem;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .page-container.dark .calendar-button {
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border-color: #4b5563;
          color: #9ca3af;
        }
        
        .calendar-button:hover {
          background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
          border-color: #6366f1;
          color: #6366f1;
          transform: translateY(-1px);
        }
        
        .page-container.dark .calendar-button:hover {
          background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%);
          border-color: #6366f1;
          color: #93c5fd;
        }
        
        .loading-input {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 2px dashed #cbd5e1;
          border-radius: 0.75rem;
          color: #64748b;
          font-size: 0.875rem;
        }
        
        .page-container.dark .loading-input {
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          border-color: #4b5563;
          color: #9ca3af;
        }
        
        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }
        
        .page-container.dark .form-actions {
          border-top-color: #374151;
        }
        
        .cancel-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          color: #6b7280;
          text-decoration: none;
          border-radius: 0.75rem;
          font-weight: 500;
          transition: all 0.2s ease;
          border: 2px solid #e5e7eb;
          background: white;
        }
        
        .page-container.dark .cancel-button {
          color: #9ca3af;
          border-color: #4b5563;
          background: #374151;
        }
        
        .cancel-button:hover {
          color: #374151;
          background: #f9fafb;
          border-color: #d1d5db;
          transform: translateY(-1px);
        }
        
        .page-container.dark .cancel-button:hover {
          color: #f3f4f6;
          background: #4b5563;
          border-color: #6b7280;
        }
        
        .submit-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        
        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }
        
        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        .submit-button.success {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
        }
        
        .button-glow {
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 0.875rem;
          opacity: 0;
          filter: blur(6px);
          z-index: -1;
          transition: opacity 0.3s ease;
        }
        
        .submit-button:hover .button-glow {
          opacity: 0.6;
        }
        
        .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-container {
          margin-left: 280px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 2rem;
          transition: margin-left 0.3s ease;
        }
        
        .error-container.dark {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
        
        .error-content {
          text-align: center;
          background: white;
          padding: 3rem;
          border-radius: 1rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          max-width: 400px;
        }
        
        .error-container.dark .error-content {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .error-content svg {
          color: #ef4444;
          margin-bottom: 1rem;
        }
        
        .error-content h2 {
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        
        .error-container.dark .error-content h2 {
          color: #f1f5f9;
        }
        
        .error-content p {
          color: #64748b;
          margin-bottom: 2rem;
        }
        
        .error-container.dark .error-content p {
          color: #94a3b8;
        }
        
        .error-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #6366f1;
          text-decoration: none;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          border: 2px solid #6366f1;
          border-radius: 0.5rem;
          transition: all 0.2s ease;
        }
        
        .error-link:hover {
          background: #6366f1;
          color: white;
          transform: translateY(-1px);
        }
        
        /* Custom DatePicker Styles */
        :global(.custom-datepicker-popper) {
          z-index: 9999 !important;
          border-radius: 0.75rem !important;
          border: none !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          overflow: hidden !important;
        }
        
        :global(.page-container.dark .custom-datepicker-popper) {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
        }
        
        :global(.custom-datepicker-calendar) {
          border: none !important;
          border-radius: 0.75rem !important;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
          font-family: inherit !important;
          box-shadow: none !important;
        }
        
        :global(.page-container.dark .custom-datepicker-calendar) {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
        }
        
        :global(.react-datepicker__header) {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
          border-bottom: none !important;
          border-radius: 0.75rem 0.75rem 0 0 !important;
          padding: 1rem !important;
          color: white !important;
        }
        
        :global(.react-datepicker__current-month) {
          color: white !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          margin-bottom: 0.5rem !important;
        }
        
        :global(.react-datepicker__day-names) {
          display: flex !important;
          justify-content: space-around !important;
          margin: 0 !important;
        }
        
        :global(.react-datepicker__day-name) {
          color: white !important;
          width: 2rem !important;
          height: 2rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 500 !important;
          font-size: 0.75rem !important;
          opacity: 0.8 !important;
        }
        
        :global(.react-datepicker__month) {
          padding: 0.5rem !important;
          margin: 0 !important;
        }
        
        :global(.react-datepicker__week) {
          display: flex !important;
          justify-content: space-around !important;
          margin: 0.125rem 0 !important;
        }
        
        :global(.react-datepicker__day) {
          width: 2.25rem !important;
          height: 2.25rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 0.5rem !important;
          margin: 0.125rem !important;
          color: #374151 !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
          cursor: pointer !important;
          border: none !important;
          outline: none !important;
        }
        
        :global(.page-container.dark .react-datepicker__day) {
          color: #d1d5db !important;
        }
        
        :global(.react-datepicker__day:hover) {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
          color: #1d4ed8 !important;
          transform: scale(1.05) !important;
        }
        
        :global(.page-container.dark .react-datepicker__day:hover) {
          background: linear-gradient(135deg, #1e40af40 0%, #3b82f640 100%) !important;
          color: #93c5fd !important;
        }
        
        :global(.react-datepicker__day--selected) {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          transform: scale(1.1) !important;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
        }
        
        :global(.react-datepicker__day--today) {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
          color: #78350f !important;
          font-weight: 600 !important;
        }
        
        :global(.react-datepicker__day--outside-month) {
          color: #d1d5db !important;
          opacity: 0.5 !important;
        }
        
        :global(.page-container.dark .react-datepicker__day--outside-month) {
          color: #6b7280 !important;
        }
        
        :global(.react-datepicker__navigation) {
          width: 2rem !important;
          height: 2rem !important;
          border-radius: 0.5rem !important;
          background: rgba(255, 255, 255, 0.2) !important;
          border: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
        }
        
        :global(.react-datepicker__navigation:hover) {
          background: rgba(255, 255, 255, 0.3) !important;
          transform: scale(1.05) !important;
        }
        
        :global(.react-datepicker__navigation-icon::before) {
          border-color: white !important;
          border-width: 2px 2px 0 0 !important;
          width: 0.5rem !important;
          height: 0.5rem !important;
        }
        
        :global(.react-datepicker__triangle) {
          display: none !important;
        }
        
        .datepicker-wrapper {
          display: inline-block;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .page-container {
            margin-left: 0;
            padding: 1rem;
          }
          
          .error-container {
            margin-left: 0;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .form-actions {
            flex-direction: column;
          }
          
          .cancel-button,
          .submit-button {
            width: 100%;
            justify-content: center;
          }
          
          .date-wrapper {
            flex-direction: column;
            align-items: stretch;
          }
          
          .calendar-button {
            width: 100%;
            justify-content: center;
          }
          
          :global(.custom-datepicker-popper) {
            transform: none !important;
            left: 50% !important;
            margin-left: -150px !important;
          }
        }
        
        @media (max-width: 480px) {
          .page-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .header-decoration {
            order: -1;
          }
          
          .sales-form {
            padding: 1.5rem;
          }
          
          .error-content {
            padding: 2rem;
          }
        }
      `}
    </style>
  </>
);
}