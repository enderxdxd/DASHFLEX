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
        navigate("/modules");
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
      navigate("/modules");
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }

          .auth-check-content {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }

          .loading-spinner {
            width: 60px;
            height: 60px;
            position: relative;
          }

          .spinner {
            width: 100%;
            height: 100%;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
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
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .branding-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .branding-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }

        .branding-content {
          position: relative;
          z-index: 1;
          max-width: 500px;
        }

        .logo-section {
          margin-bottom: 3rem;
        }

        .main-logo {
          text-align: center;
        }

        .logo-text {
          display: block;
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 0.5rem;
          background: linear-gradient(45deg, #ffffff, #e2e8f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-subtitle {
          font-size: 1.2rem;
          font-weight: 300;
          opacity: 0.9;
          letter-spacing: 1px;
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          line-height: 1.2;
        }

        .hero-description {
          font-size: 1.2rem;
          opacity: 0.9;
          margin-bottom: 2.5rem;
          line-height: 1.6;
        }

        .features-list {
          display: grid;
          gap: 1rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .feature-icon {
          font-size: 1.5rem;
        }

        .login-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 2.5rem;
          background: white;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .card-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .card-header h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .card-header p {
          color: #64748b;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #9ca3af;
          z-index: 1;
        }

        .form-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .password-toggle:hover {
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #dc2626;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .login-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
        }

        .login-button:hover:not(:disabled) {
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
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
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .login-footer p {
          color: #6b7280;
          font-size: 0.9rem;
          margin: 0;
        }

        @media (max-width: 768px) {
          .login-container {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .branding-section {
            padding: 2rem 1rem;
            min-height: auto;
          }

          .hero-title {
            font-size: 2rem;
          }

          .logo-text {
            font-size: 2.5rem;
          }

          .login-section {
            padding: 1rem;
          }

          .login-card {
            padding: 2rem;
          }
        }

        @media (max-width: 480px) {
          .branding-section {
            padding: 1.5rem 1rem;
          }

          .hero-title {
            font-size: 1.75rem;
          }

          .hero-description {
            font-size: 1rem;
          }

          .login-card {
            padding: 1.5rem;
          }

          .card-header h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}