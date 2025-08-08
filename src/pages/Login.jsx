import { useState } from "react";
import { signInWithEmailAndPassword,getAuth,getIdTokenResult } from "firebase/auth";
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
  const navigate = useNavigate();
  const fbAuth = getAuth();

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
      navigate("/unidade");
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

  return (
    <div className="login-container">
      {/* Background Elements */}
      <div className="bg-gradient"></div>
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      {/* Main Content */}
      <div className="content-wrapper">
        {/* Left Side - Branding */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="branding-section"
        >
          <div className="brand-content">
            <div className="logo-section">
              <div className="logo-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#brandGradient1)"/>
                  <path d="M2 17L12 22L22 17" stroke="url(#brandGradient2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="url(#brandGradient2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="brandGradient1" x1="2" y1="2" x2="22" y2="12">
                      <stop stopColor="#6366f1"/>
                      <stop offset="1" stopColor="#8b5cf6"/>
                    </linearGradient>
                    <linearGradient id="brandGradient2" x1="2" y1="12" x2="22" y2="22">
                      <stop stopColor="#3b82f6"/>
                      <stop offset="1" stopColor="#6366f1"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="brand-title">DASHFLEX</h1>
            </div>
            <p className="brand-subtitle">
              Transforme dados em decisões inteligentes com nossa plataforma de analytics avançada.
            </p>
            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <span>Analytics em tempo real</span>
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
              <p>Entre na sua conta para continuar</p>
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
                  className="error-alert"
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                className="submit-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="card-footer">
              <p>Esqueceu sua senha? <a href="#">Recuperar acesso</a></p>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .login-container {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .bg-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, 
            #667eea 0%, 
            #764ba2 25%, 
            #f093fb 50%, 
            #f5576c 75%, 
            #4facfe 100%
          );
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .floating-shapes {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          animation: float 20s infinite linear;
        }

        .shape-1 {
          width: 100px;
          height: 100px;
          top: 20%;
          left: 10%;
          animation-delay: 0s;
        }

        .shape-2 {
          width: 150px;
          height: 150px;
          top: 60%;
          right: 10%;
          animation-delay: -7s;
        }

        .shape-3 {
          width: 80px;
          height: 80px;
          bottom: 20%;
          left: 20%;
          animation-delay: -14s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-30px) rotate(120deg); }
          66% { transform: translateY(30px) rotate(240deg); }
        }

        .content-wrapper {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1400px;
          margin: 0 auto;
        }

        .branding-section {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: white;
        }

        .brand-content {
          max-width: 500px;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .logo-icon {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .brand-title {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .brand-subtitle {
          font-size: 1.125rem;
          line-height: 1.7;
          opacity: 0.9;
          margin-bottom: 2.5rem;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateX(5px);
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
          max-width: 420px;
          background: white;
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.8) inset;
        }

        .card-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .card-header h2 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .card-header p {
          color: #6b7280;
          font-size: 1rem;
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
          font-size: 0.875rem;
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
          z-index: 2;
          transition: color 0.2s;
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.2s;
          background: #fafafa;
        }

        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          background: white;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-input:focus + .input-icon,
        .input-container:hover .input-icon {
          color: #6366f1;
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
          transition: all 0.2s;
          z-index: 2;
        }

        .password-toggle:hover {
          color: #6366f1;
          background: #f3f4f6;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .submit-button {
          width: 100%;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .submit-button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .submit-button:hover::before {
          opacity: 1;
        }

        .submit-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .submit-button span,
        .submit-button svg {
          position: relative;
          z-index: 1;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .card-footer {
          text-align: center;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .card-footer p {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .card-footer a {
          color: #6366f1;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }

        .card-footer a:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        @media (max-width: 1024px) {
          .content-wrapper {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .branding-section {
            padding: 1.5rem;
          }

          .brand-title {
            font-size: 2rem;
          }

          .features-list {
            flex-direction: row;
            gap: 0.75rem;
          }

          .feature-item {
            flex: 1;
            flex-direction: column;
            text-align: center;
            padding: 0.75rem;
          }

          .feature-item span {
            font-size: 0.875rem;
          }
        }

        @media (max-width: 768px) {
          .login-section {
            padding: 1rem;
          }

          .login-card {
            padding: 2rem 1.5rem;
          }

          .card-header h2 {
            font-size: 1.5rem;
          }

          .brand-content {
            text-align: center;
          }

          .logo-section {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}