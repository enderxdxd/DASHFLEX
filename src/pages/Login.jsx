// src/pages/Login.jsx - Versão Atualizada
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, getAuth, getIdTokenResult, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const fbAuth = getAuth();

  // Verifica se o usuário já está autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, (user) => {
      if (user) {
        // Se já está logado, redireciona para seleção de módulos
        // Força o redirecionamento para /modules independente do histórico
        navigate("/modules", { replace: true });
      } else {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [fbAuth, navigate]);

  const login = async () => {
    if (!email || !senha) {
      setError("Preencha todos os campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, senha);
      // força o refresh do token para que os custom claims apareçam
      const idTokenResult = await getIdTokenResult(user, /*forceRefresh=*/ true);
      
      // Redireciona para seleção de módulos
      // Força o redirecionamento para /modules independente do histórico
      navigate("/modules", { replace: true });
    } catch (e) {
      setError("Credenciais inválidas. Tente novamente.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      login();
    }
  };

  // Mostra loading enquanto verifica se já está autenticado
  if (checkingAuth) {
    return (
      <div className="auth-check-container">
        <div className="auth-check-content">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p>Verificando autenticação...</p>
        </div>
        
        <style jsx>{`
          .auth-check-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            color: #6b7280;
          }

          .auth-check-content {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            position: relative;
          }

          .spinner {
            width: 100%;
            height: 100%;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-container">
      {/* Left Side - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="branding-section"
      >
        <div className="branding-content">
          <div className="logo-section">
            <div className="main-logo">
              <span className="logo-text">FLEXAPP</span>
              <span className="logo-subtitle">Business Suite</span>
            </div>
          </div>
          
          <div className="hero-content">
            <h1 className="hero-title">
              Gestão Completa do Seu Negócio
            </h1>
            <p className="hero-description">
              Módulos integrados para vendas, personal trainers e muito mais. 
              Controle total na palma da sua mão.
            </p>
            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <span>Dashboard de Vendas</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💪</div>
                <span>Gerenciamento de Personal</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎯</div>
                <span>Gestão de metas</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📈</div>
                <span>Relatórios avançados</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="login-section"
      >
        <div className="login-card">
          <div className="card-header">
            <h2>Bem-vindo de volta</h2>
            <p>Entre na sua conta para acessar os módulos</p>
          </div>

          <form className="login-form" onSubmit={(e) => { e.preventDefault(); login(); }}>
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <div className="input-container">
                <Mail className="input-icon" size={20} />
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <div className="input-container">
                <Lock className="input-icon" size={20} />
                <input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="form-input"
                  required
                  onKeyPress={handleKeyPress}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="error-message"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="login-button"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <div className="button-loading">
                  <div className="loading-spinner"></div>
                  <span>Entrando...</span>
                </div>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
          </form>

          <div className="login-footer">
            <p>🔒 Acesso seguro e criptografado</p>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .branding-section {
          display: none;
        }

        .login-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          width: 100%;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .card-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .card-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .card-header p {
          color: #6b7280;
          margin: 0;
          font-size: 0.875rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .form-group label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.875rem;
          color: #9ca3af;
          z-index: 1;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 0.875rem 0.75rem 2.75rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: border-color 0.15s ease;
          background: white;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .password-toggle {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.25rem;
        }

        .password-toggle:hover {
          color: #6b7280;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .login-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .login-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f3f4f6;
        }

        .login-footer p {
          color: #9ca3af;
          font-size: 0.75rem;
          margin: 0;
        }

        @media (max-width: 480px) {
          .login-section {
            padding: 1rem;
          }

          .login-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}