import { useState } from "react";
import { signInWithEmailAndPassword,getAuth,getIdTokenResult } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
      <div className="design-element left-element"></div>
      <div className="design-element right-element"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.7, 
          ease: [0.22, 1, 0.36, 1] 
        }}
        className="login-card"
      >
        <div className="card-content">
          <div className="login-header">
            <div className="logo-container">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="url(#paint0_linear)"/>
                <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="url(#paint1_linear)"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="7" y1="2" x2="17" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1"/>
                    <stop offset="1" stopColor="#8B5CF6"/>
                  </linearGradient>
                  <linearGradient id="paint1_linear" x1="4" y1="14" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1"/>
                    <stop offset="1" stopColor="#8B5CF6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="logo-shine"></div>
            </div>
            <h1>Bem-vindo de volta</h1>
            <p className="subtitle">Acesse sua conta para continuar</p>
          </div>

          <div className="form-container">
            <div className="input-group">
              <label htmlFor="email">E-mail</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="currentColor"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="input-field"
                />
              </div>
            </div>

            <div className="input-group">
              <div className="label-row">
                <label htmlFor="senha">Senha</label>
                
              </div>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15 8H9V6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8Z" fill="currentColor"/>
                </svg>
                <input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="input-field"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="error-message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12C20 7.582 16.418 4 12 4C7.582 4 4 7.582 4 12C4 16.418 7.582 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z" fill="currentColor"/>
                </svg>
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(99, 102, 241, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={login}
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <span>Entrar</span>
                  <svg className="button-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 5L21 12L14 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </motion.button>

            
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 20px;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .design-element {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.6;
        }

        .left-element {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
          bottom: -100px;
          left: -100px;
        }

        .right-element {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%);
          top: -150px;
          right: -150px;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.05),
            0 10px 10px -5px rgba(0, 0, 0, 0.02),
            0 0 0 1px rgba(255, 255, 255, 0.7) inset;
        }

        .card-content {
          position: relative;
          padding: 40px;
        }

        .login-header {
          margin-bottom: 36px;
          text-align: center;
          position: relative;
        }

        .logo-container {
          position: relative;
          width: 60px;
          height: 60px;
          margin: 0 auto 16px;
        }

        .logo-shine {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          filter: blur(2px);
          opacity: 0.8;
        }

        .login-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px;
          background: linear-gradient(to right, #4f46e5, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #64748b;
          font-size: 16px;
          margin: 0;
        }

        .form-container {
          margin-top: 40px;
        }

        .input-group {
          margin-bottom: 24px;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .input-group label {
          display: block;
          margin-bottom: 10px;
          font-size: 14px;
          color: #475569;
          font-weight: 600;
        }

        .forgot-link {
          font-size: 13px;
          color: #6366f1;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .forgot-link:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #94a3b8;
          transition: color 0.2s;
        }

        .input-field {
          width: 100%;
          padding: 16px 16px 16px 46px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.25s;
          box-sizing: border-box;
        }

        .input-field::placeholder {
          color: #cbd5e1;
        }

        .input-field:focus {
          outline: none;
          border-color: #818cf8;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .input-field:focus + .input-icon,
        .input-wrapper:hover .input-icon {
          color: #6366f1;
        }

        .login-button {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(to right, #4f46e5, #6366f1);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
          transform: translateX(-100%);
          transition: transform 0.6s;
        }

        .login-button:hover::before {
          transform: translateX(100%);
        }

        .login-button:hover {
          background: linear-gradient(to right, #4338ca, #4f46e5);
        }

        .login-button:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }

        .button-icon {
          margin-left: 8px;
          opacity: 0.8;
          transition: transform 0.3s;
        }

        .login-button:hover .button-icon {
          transform: translateX(3px);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #e11d48;
          background-color: #ffe4e6;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin: 0 0 24px;
        }

        .no-account {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 32px;
          font-size: 14px;
          color: #64748b;
        }

        .signup-link {
          color: #6366f1;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }

        .signup-link:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 500px) {
          .card-content {
            padding: 30px 20px;
          }
          
          .login-header h1 {
            font-size: 24px;
          }
          
          .input-field {
            padding: 14px 14px 14px 46px;
          }
        }
      `}</style>
    </div>
  );
}