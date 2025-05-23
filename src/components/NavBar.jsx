// src/components/NavBar.jsx
import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LineChart } from "lucide-react";

export default function NavBar() {
  const { unidade } = useParams();
  const location = useLocation();
  const auth = getAuth();
  const [role, setRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Busca o documento em /users/{uid}
    const ref = doc(db, "users", user.uid);
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        setRole(snap.data().role);
      }
    });
  }, [auth]);

  const isActive = (path) => location.pathname.includes(path);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <>
      {/* Mobile menu button - só aparece em telas pequenas */}
      <button 
        className="mobile-menu-button" 
        onClick={toggleMenu}
        aria-label="Menu de navegação"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <nav className={`navbar ${menuOpen ? 'menu-open' : ''}`}>
        <div className="navbar-brand">
          <span className="company-name">FlexApp</span>
        </div>
        
        <div className="nav-links">
          <Link 
            to={`/dashboard/${unidade}`} 
            className={`nav-link ${isActive("/dashboard/") ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Vendas</span>
          </Link>

          <Link 
            to={`/metas/${unidade}`} 
            className={`nav-link ${isActive("/metas/") ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10"></line>
              <line x1="18" y1="20" x2="18" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="16"></line>
            </svg>
            <span>Metas</span>
          </Link>

          <Link 
            to={`/analytics/${unidade}`} 
            className={`nav-link ${isActive("/analytics/") ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <LineChart className="w-5 h-5" />
            <span>Analytics</span>
          </Link>
          <Link 
            to={`/add-sale/${unidade}`} 
            className={`nav-link ${isActive("/add-sale/") ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <span>Adicionar Venda</span>
          </Link>

          <Link 
            to="/unidade" 
            className={`nav-link ${isActive("/unidade") ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Unidade</span>
          </Link>

          {role === "admin" && (
            <Link 
              to={`/config-remuneracao/${unidade}`} 
              className={`nav-link ${isActive("/config-remuneracao/") ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Config. Remuneração</span>
            </Link>
          )}
        </div>
      </nav>

      <style jsx>{`
        /* Reset da barra de navegação */
        .navbar {
          display: flex;
          flex-direction: column;
          width: 280px;
          height: 100vh;
          background-color: white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
          padding: 1.5rem 0;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
          transition: transform 0.3s ease;
        }
        
        /* Marca/Logo da aplicação */
        .navbar-brand {
          padding: 0 1.5rem 1.5rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        
        .company-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--primary, #4f46e5);
        }
        
        /* Container dos links */
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0 0.75rem;
        }
        
        /* Estilo dos links */
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-secondary, #64748b);
          text-decoration: none;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-sm, 6px);
          transition: all 0.2s ease;
          font-weight: 500;
        }
        
        .nav-link:hover {
          background: var(--primary-light, #e0e7ff);
          color: var(--primary, #4f46e5);
        }
        
        .nav-link.active {
          background: var(--primary-light, #e0e7ff);
          color: var(--primary, #4f46e5);
          font-weight: 600;
        }
        
        .nav-link svg {
          flex-shrink: 0;
        }
        
        /* Botão do menu mobile */
        .mobile-menu-button {
          display: none;
          background: white;
          border: none;
          padding: 0.75rem;
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 101;
          border-radius: var(--radius-sm, 6px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          color: var(--text-secondary, #64748b);
          cursor: pointer;
        }
        
        /* Responsividade */
        @media (max-width: 768px) {
          .navbar {
            transform: translateX(-100%);
            width: 280px;
          }
          
          .navbar.menu-open {
            transform: translateX(0);
          }
          
          .mobile-menu-button {
            display: flex;
          }
          
          /* Overlay quando o menu está aberto */
          .menu-open::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: -1;
          }
        }
      `}</style>
    </>
  );
}