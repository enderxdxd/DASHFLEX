import React, { useEffect, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  LineChart, 
  Moon, 
  Sun, 
  Home,
  Target,
  Plus,
  MapPin,
  Settings,
  BarChart3,
  Menu,
  X,
  ChevronRight,
  User,
  LogOut,
  Bell
} from "lucide-react";
import useDarkMode from "../hooks/useDarkMode";

export default function NavBar() {
  const { unidade } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();
  const [role, setRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, toggleTheme] = useDarkMode();
  const [userInfo, setUserInfo] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Busca o documento em /users/{uid}
    const ref = doc(db, "users", user.uid);
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        const userData = snap.data();
        setRole(userData.role);
        setUserInfo({
          name: userData.name || user.displayName || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          avatar: user.photoURL
        });
      } else {
        // Fallback caso não tenha documento no Firestore
        setUserInfo({
          name: user.displayName || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          avatar: user.photoURL
        });
      }
    }).catch(() => {
      // Fallback em caso de erro
      setUserInfo({
        name: user.displayName || user.email?.split('@')[0] || 'Usuário',
        email: user.email,
        avatar: user.photoURL
      });
    });
  }, [auth]);

  const isActive = (path) => location.pathname.includes(path);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const navItems = [
    {
      path: `/dashboard/${unidade}`,
      icon: Home,
      label: "Dashboard",
      description: "Visão geral das vendas",
      matchPath: "/dashboard"
    },
    ...(role === 'admin' ? [{
      path: `/metas/${unidade}`,
      icon: Target,
      label: "Metas",
      description: "Acompanhe suas metas",
      matchPath: "/metas"
    }] : []),
    {
      path: `/analytics/${unidade}`,
      icon: BarChart3,
      label: "Analytics",
      description: "Análises detalhadas",
      matchPath: "/analytics"
    },
    {
      path: `/add-sale/${unidade}`,
      icon: Plus,
      label: "Nova Venda",
      description: "Registrar venda",
      highlight: true,
      matchPath: "/add-sale"
    },
    {
      path: `/unidade`,
      icon: MapPin,
      label: "Unidade",
      description: "Configurações da unidade",
      matchPath: "/unidade"
    }
  ];

  if (role === "admin") {
    navItems.push({
      path: `/config-remuneracao/${unidade}`,
      icon: Settings,
      label: "Remuneração",
      description: "Configurar comissões",
      admin: true,
      matchPath: "/config-remuneracao"
    });
  }

  // Não renderizar se não tiver unidade (exceto na página de seleção de unidade)
  if (!unidade && !location.pathname.includes('/unidade')) {
    return null;
  }

  return (
    <>
      {/* Mobile menu button */}
      <button 
        className="mobile-menu-button" 
        onClick={toggleMenu}
        aria-label="Menu de navegação"
      >
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para mobile */}
      {menuOpen && <div className="mobile-overlay" onClick={toggleMenu} />}

      <nav className={`navbar ${menuOpen ? 'menu-open' : ''} ${isCollapsed ? 'collapsed' : ''} ${theme}`}>
        {/* Header da navbar */}
        <div className="navbar-header">
          <div className="navbar-brand">
            <div className="brand-icon">
              <BarChart3 size={24} />
            </div>
            {!isCollapsed && (
              <div className="brand-text">
                <span className="company-name">FlexApp</span>
                <span className="company-subtitle">Sales Dashboard</span>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button 
              className="collapse-btn desktop-only"
              onClick={() => setIsCollapsed(true)}
              title="Recolher menu"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* User info section */}
        {userInfo && (
          <div className="user-section">
            <div className="user-avatar">
              {userInfo.avatar ? (
                <img src={userInfo.avatar} alt="Avatar" />
              ) : (
                <User size={20} />
              )}
            </div>
            {!isCollapsed && (
              <div className="user-info">
                <span className="user-name">{userInfo.name}</span>
                <span className="user-role">{role === 'admin' ? 'Administrator' : 'Vendedor'}</span>
                <span className="user-email">{userInfo.email}</span>
              </div>
            )}
            <div className="user-status"></div>
          </div>
        )}
        
        {/* Navigation Links */}
        <div className="nav-section">
          <div className="nav-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.matchPath);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${active ? "active" : ""} ${item.highlight ? "highlight" : ""} ${item.admin ? "admin" : ""}`}
                  onClick={() => setMenuOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="nav-link-icon">
                    <Icon size={20} />
                    {item.highlight && <div className="highlight-dot"></div>}
                  </div>
                  {!isCollapsed && (
                    <div className="nav-link-content">
                      <span className="nav-link-label">{item.label}</span>
                      <span className="nav-link-description">{item.description}</span>
                    </div>
                  )}
                  {active && <div className="active-indicator"></div>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer da navbar */}
        <div className="navbar-footer">
          
          {/* Dark mode toggle */}
          <button
            className="footer-btn darkmode-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!isCollapsed && (
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            )}
          </button>

          {/* Logout */}
          <button 
            className="footer-btn logout-btn"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Sair</span>}
          </button>

          {/* Expand button for collapsed state */}
          {isCollapsed && (
            <button 
              className="expand-btn"
              onClick={() => setIsCollapsed(false)}
              title="Expandir menu"
            >
              <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>
      </nav>

      <style jsx>{`
        .navbar {
          display: flex;
          flex-direction: column;
          width: 280px;
          height: 100vh;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border-right: 1px solid #e2e8f0;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }
        
        .navbar.collapsed {
          width: 72px;
        }
        
        .navbar.dark {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border-right-color: #334155;
        }
        
        .navbar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          min-height: 80px;
        }
        
        .navbar.dark .navbar-header {
          border-bottom-color: #334155;
        }
        
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }
        
        .brand-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 0.75rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        
        .brand-text {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        
        .company-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.2;
        }
        
        .navbar.dark .company-name {
          color: #f1f5f9;
        }
        
        .company-subtitle {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }
        
        .navbar.dark .company-subtitle {
          color: #94a3b8;
        }
        
        .collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem;
          height: 1.75rem;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .collapse-btn:hover {
          background-color: #f1f5f9;
          color: #374151;
          transform: scale(1.05);
        }
        
        .navbar.dark .collapse-btn {
          background-color: #334155;
          border-color: #475569;
          color: #94a3b8;
        }
        
        .navbar.dark .collapse-btn:hover {
          background-color: #475569;
          color: #e2e8f0;
        }
        
        .user-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          margin: 0 0.75rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 0.75rem;
          position: relative;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
        }
        
        .navbar.dark .user-section {
          background: linear-gradient(135deg, #1e3a8a20 0%, #1e40af20 100%);
          border-color: #3b82f6;
        }
        
        .user-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          background-color: #0ea5e9;
          border-radius: 0.625rem;
          color: white;
          flex-shrink: 0;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
        }
        
        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          flex: 1;
          min-width: 0;
        }
        
        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0c4a6e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .navbar.dark .user-name {
          color: #93c5fd;
        }
        
        .user-role {
          font-size: 0.75rem;
          color: #0369a1;
          font-weight: 500;
        }
        
        .navbar.dark .user-role {
          color: #60a5fa;
        }
        
        .user-email {
          font-size: 0.625rem;
          color: #0369a1;
          opacity: 0.8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .navbar.dark .user-email {
          color: #60a5fa;
        }
        
        .user-status {
          width: 0.5rem;
          height: 0.5rem;
          background-color: #22c55e;
          border-radius: 50%;
          border: 2px solid white;
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .nav-section {
          flex: 1;
          padding: 1rem 0;
          overflow-y: auto;
        }
        
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0 0.75rem;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #64748b;
          text-decoration: none;
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          position: relative;
          overflow: hidden;
        }
        
        .navbar.dark .nav-link {
          color: #94a3b8;
        }
        
        .nav-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 100%);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .nav-link:hover::before {
          opacity: 1;
        }
        
        .nav-link:hover {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          color: #0369a1;
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
        }
        
        .navbar.dark .nav-link:hover {
          background: linear-gradient(135deg, #1e40af20 0%, #3b82f620 100%);
          color: #60a5fa;
        }
        
        .nav-link.active {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1d4ed8;
          font-weight: 600;
          border: 1px solid #93c5fd;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);
        }
        
        .navbar.dark .nav-link.active {
          background: linear-gradient(135deg, #1e40af40 0%, #3b82f640 100%);
          color: #93c5fd;
          border-color: #3b82f6;
        }
        
        .nav-link.highlight {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          border: 1px solid #f59e0b;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
        }
        
        .nav-link.highlight:hover {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #78350f;
          transform: translateX(4px) scale(1.02);
        }
        
        .nav-link.admin {
          background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
          color: #7c3aed;
          border: 1px solid #c4b5fd;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
        }
        
        .nav-link.admin:hover {
          background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%);
          color: #6d28d9;
        }
        
        .nav-link-icon {
          position: relative;
          flex-shrink: 0;
        }
        
        .highlight-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 0.5rem;
          height: 0.5rem;
          background-color: #f59e0b;
          border-radius: 50%;
          border: 2px solid white;
          animation: bounce 1s infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        
        .nav-link-content {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          flex: 1;
          min-width: 0;
        }
        
        .nav-link-label {
          font-size: 0.875rem;
          font-weight: inherit;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .nav-link-description {
          font-size: 0.75rem;
          opacity: 0.7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .active-indicator {
          position: absolute;
          top: 50%;
          right: 0.5rem;
          transform: translateY(-50%);
          width: 0.375rem;
          height: 0.375rem;
          background-color: #1d4ed8;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        .navbar.dark .active-indicator {
          background-color: #93c5fd;
        }
        
        .navbar-footer {
          padding: 1rem 0.75rem;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .navbar.dark .navbar-footer {
          border-top-color: #334155;
        }
        
        .footer-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          color: #64748b;
          text-decoration: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          font-weight: 500;
          position: relative;
          width: 100%;
          text-align: left;
        }
        
        .navbar.dark .footer-btn {
          color: #94a3b8;
        }
        
        .footer-btn:hover {
          background-color: #f8fafc;
          color: #374151;
          transform: translateX(2px);
        }
        
        .navbar.dark .footer-btn:hover {
          background-color: #374151;
          color: #e2e8f0;
        }
        
        .darkmode-toggle:hover {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
        }
        
        .logout-btn:hover {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
        }
        
        .notification-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.75rem;
          width: 1.25rem;
          height: 1.25rem;
          background-color: #ef4444;
          color: white;
          border-radius: 50%;
          font-size: 0.625rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          animation: pulse 2s infinite;
        }
        
        .expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0.75rem;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 0.5rem;
        }
        
        .expand-btn:hover {
          background-color: #f1f5f9;
          color: #374151;
          transform: scale(1.02);
        }
        
        .navbar.dark .expand-btn {
          background-color: #334155;
          border-color: #475569;
          color: #94a3b8;
        }
        
        .navbar.dark .expand-btn:hover {
          background-color: #475569;
          color: #e2e8f0;
        }
        
        .mobile-menu-button {
          display: none;
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 101;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 0.75rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .mobile-menu-button:hover {
          background-color: #f8fafc;
          color: #374151;
          transform: scale(1.05);
        }
        
        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 99;
          backdrop-filter: blur(4px);
        }
        
        .desktop-only {
          display: block;
        }
        
        /* Scrollbar customization */
        .nav-section::-webkit-scrollbar {
          width: 4px;
        }
        
        .nav-section::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .nav-section::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        
        .nav-section::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .navbar.dark .nav-section::-webkit-scrollbar-thumb {
          background: #475569;
        }
        
        .navbar.dark .nav-section::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        
        @media (max-width: 768px) {
          .navbar {
            transform: translateX(-100%);
            width: 280px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          }
          
          .navbar.menu-open {
            transform: translateX(0);
          }
          
          .navbar.collapsed {
            width: 280px;
          }
          
          .mobile-menu-button {
            display: flex;
          }
          
          .mobile-overlay {
            display: block;
          }
          
          .desktop-only {
            display: none;
          }
          
          .collapse-btn {
            display: none;
          }
        }
        
        @media (max-width: 480px) {
          .navbar {
            width: 100%;
          }
          
          .user-section {
            margin: 0 0.5rem;
          }
          
          .nav-links {
            padding: 0 0.5rem;
          }
          
          .navbar-footer {
            padding: 1rem 0.5rem;
          }
        }
      `}</style>
    </>
  );
}