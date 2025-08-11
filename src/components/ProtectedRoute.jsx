import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>Verificando autenticação...</p>
        
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
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
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          p {
            font-size: 16px;
            font-weight: 500;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Se não está autenticado, não renderiza nada (será redirecionado)
  if (!isAuthenticated) {
    return null;
  }

  // Se está autenticado, renderiza o conteúdo
  return children;
};

export default ProtectedRoute;
