import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
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
  Users,
  FileText,
  ArrowLeft,
  Percent,
  Zap
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
  const [isCollapsed, setIsCollapsed] = useState(false); // Sempre inicia expandida
  const [isLoading, setIsLoading] = useState(true);

  // Memoized values for better performance
  const currentModule = useMemo(() => {
    return location.pathname.includes('/personal/') ? 'personal' : 'vendas';
  }, [location.pathname]);
  
  const isValidUnidade = useMemo(() => {
    return ['alphaville', 'buenavista', 'marista', 'palmas'].includes(unidade?.toLowerCase());
  }, [unidade]);
  
  const currentUnidade = isValidUnidade ? unidade : null;

  // Load user data with better error handling
  useEffect(() => {
    const loadUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        const fallbackUserInfo = {
          name: user.displayName || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          avatar: user.photoURL
        };

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setRole(userData.role || 'user');
          setUserInfo({
            ...fallbackUserInfo,
            name: userData.name || fallbackUserInfo.name
          });
        } else {
          setRole('user');
          setUserInfo(fallbackUserInfo);
        }
      } catch (error) {
        console.warn('Error loading user data:', error);
        setRole('user');
        setUserInfo({
          name: user.displayName || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          avatar: user.photoURL
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [auth]);

  // Limpar estado colapsado antigo do localStorage na primeira carga
  useEffect(() => {
    localStorage.removeItem('navbar-collapsed');
  }, []);

  // Memoized callbacks for better performance
  const isActive = useCallback((path) => {
    return location.pathname.includes(path);
  }, [location.pathname]);

  const toggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }, [auth, navigate]);

  const handleBackToModules = useCallback(() => {
    navigate("/modules");
  }, [navigate]);

  const handleBackToUnits = useCallback(() => {
    if (currentModule === 'personal') {
      navigate("/personal/unidade");
    } else {
      navigate("/unidade");
    }
  }, [currentModule, navigate]);

  // Memoized navigation items for better performance
  const navItems = useMemo(() => {
    if (currentModule === 'personal') {
      const personalItems = [
        {
          path: `/personal/dashboard/${unidade}`,
          icon: Users,
          label: "Dashboard",
          description: "Visão geral dos personais",
          matchPath: "/personal/dashboard"
        },
        {
          path: `/personal/relatorios/${unidade}`,
          icon: FileText,
          label: "Relatórios",
          description: "Relatórios de performance",
          matchPath: "/personal/relatorios",
          disabled: true
        },
        {
          path: `/personal/configuracoes/${unidade}`,
          icon: Settings,
          label: "Configurações",
          description: "Configurações do módulo",
          matchPath: "/personal/configuracoes",
          admin: true,
          disabled: true
        }
      ];

      return personalItems.filter(item => !item.admin || role === 'admin');
    } else {
      const vendasItems = [
        {
          path: `/dashboard/${unidade}`,
          icon: Home,
          label: "Dashboard",
          description: "Visão geral das vendas",
          matchPath: "/dashboard"
        },
        {
          path: `/metas/${unidade}`,
          icon: Target,
          label: "Metas",
          description: "Acompanhe suas metas",
          matchPath: "/metas"
        },
        {
          path: `/analytics/${unidade}`,
          icon: BarChart3,
          label: "Analytics",
          description: "Análises detalhadas",
          matchPath: "/analytics"
        },
        {
          path: `/descontos/${unidade}`,
          icon: Percent,
          label: "Descontos",
          description: "Análise de descontos",
          matchPath: "/descontos"
        },
        {
          path: `/comissao/${unidade}`,
          icon: Zap,
          label: "Comissões",
          description: "Análises de comissão",
          matchPath: "/comissao"
        }
      ];

      if (role === "admin") {
        vendasItems.push(
          {
            path: `/config-remuneracao/${unidade}`,
            icon: Settings,
            label: "Remuneração",
            description: "Configurar comissões",
            admin: true,
            matchPath: "/config-remuneracao"
          },
          {
            path: `/admin/produtos`,
            icon: Settings,
            label: "Produtos",
            description: "Configurar filtros globais",
            admin: true,
            matchPath: "/admin/produtos"
          }
        );
      }

      return vendasItems;
    }
  }, [currentModule, unidade, role]);

  // Memoized module info
  const moduleInfo = useMemo(() => {
    return currentModule === 'personal' 
      ? { title: 'Personal Manager', icon: Users }
      : { title: 'Sales Dashboard', icon: BarChart3 };
  }, [currentModule]);

  // Don't render if invalid route
  if (!currentUnidade && !location.pathname.includes('/unidade') && !location.pathname.includes('/modules') && !location.pathname.includes('/personal/dashboard')) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <nav className={`navbar loading ${theme} ${currentModule}`}>
        <div className="loading-content">
          <div className="loading-spinner"></div>
        </div>
      </nav>
    );
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

      <nav className={`navbar ${menuOpen ? 'menu-open' : ''} ${isCollapsed ? 'collapsed' : ''} ${theme} ${currentModule}`}>
        {/* Header da navbar */}
        <div className="navbar-header">
          <div className="navbar-brand">
            <div className="brand-icon">
              {React.createElement(moduleInfo.icon, { size: 24 })}
            </div>
            {!isCollapsed && (
              <div className="brand-text">
                <span className="company-name">FlexApp</span>
                <span className="company-subtitle">{moduleInfo.title}</span>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button 
              className="collapse-btn desktop-only"
              onClick={toggleCollapse}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <ChevronRight size={16} className={isCollapsed ? "rotate-180" : ""} />
            </button>
          )}
        </div>

        {/* Module navigation buttons */}
        <div className="module-navigation">
          <button 
            className="nav-button module-btn"
            onClick={handleBackToModules}
            title="Voltar aos módulos"
          >
            <ArrowLeft size={16} />
            {!isCollapsed && <span>Módulos</span>}
          </button>
          
          {currentUnidade && (
            <button 
              className="nav-button unit-btn"
              onClick={handleBackToUnits}
              title="Trocar unidade"
            >
              <MapPin size={16} />
              {!isCollapsed && <span>{currentUnidade.toUpperCase()}</span>}
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
              const isDisabled = item.disabled;
              
              return (
                <Link
                  key={item.path}
                  to={isDisabled ? '#' : item.path}
                  className={`nav-link ${active ? "active" : ""} ${item.highlight ? "highlight" : ""} ${item.admin ? "admin" : ""} ${isDisabled ? "disabled" : ""}`}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.preventDefault();
                      return;
                    }
                    setMenuOpen(false);
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="nav-link-icon">
                    <Icon size={20} />
                    {item.highlight && !isDisabled && <div className="highlight-dot"></div>}
                  </div>
                  {!isCollapsed && (
                    <div className="nav-link-content">
                      <span className="nav-link-label">{item.label}</span>
                      <span className="nav-link-description">{item.description}</span>
                      {isDisabled && <span className="coming-soon">Em breve</span>}
                    </div>
                  )}
                  {active && !isDisabled && <div className="active-indicator"></div>}
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
              onClick={toggleCollapse}
              title="Expandir menu"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
          )}
        </div>
      </nav>

      <style jsx>{`
        .navbar {
          display: flex;
          flex-direction: column;
          width: 260px;
          height: 100vh;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
          transition: width 0.2s ease;
        }
        
        .navbar.loading {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .loading-content {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .rotate-180 {
          transform: rotate(180deg);
        }
        
        .navbar.personal {
          border-right-color: #d1fae5;
        }
        
        .navbar.collapsed {
          width: 72px;
        }
        
        .navbar.dark {
          background: #111827;
          border-right-color: #374151;
        }
        
        .navbar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1rem;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .navbar.dark .navbar-header {
          border-bottom-color: #374151;
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
          width: 36px;
          height: 36px;
          background: #3b82f6;
          border-radius: 8px;
          color: white;
          flex-shrink: 0;
        }

        .navbar.personal .brand-icon {
          background: #10b981;
        }
        
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        
        .company-name {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          line-height: 1.2;
        }
        
        .navbar.dark .company-name {
          color: #f9fafb;
        }
        
        .company-subtitle {
          font-size: 0.7rem;
          color: #6b7280;
          font-weight: 400;
        }
        
        .navbar.dark .company-subtitle {
          color: #9ca3af;
        }

        .module-navigation {
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.15s ease;
          font-size: 0.8rem;
          font-weight: 500;
          width: 100%;
          text-align: left;
        }

        .nav-button:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .navbar.dark .nav-button {
          color: #9ca3af;
        }

        .navbar.dark .nav-button:hover {
          background: #1f2937;
          color: #f3f4f6;
        }
        
        .collapse-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .collapse-btn:hover {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        .navbar.dark .collapse-btn {
          border-color: #374151;
          color: #6b7280;
        }
        
        .navbar.dark .collapse-btn:hover {
          background: #1f2937;
          color: #9ca3af;
        }
        
        .user-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          margin: 0 0.75rem;
          background: #f9fafb;
          border-radius: 8px;
        }
        
        .navbar.dark .user-section {
          background: #1f2937;
        }
        
        .user-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #3b82f6;
          border-radius: 6px;
          color: white;
          flex-shrink: 0;
          overflow: hidden;
        }

        .navbar.personal .user-avatar {
          background: #10b981;
        }
        
        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        
        .user-name {
          font-size: 0.8rem;
          font-weight: 500;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .navbar.dark .user-name {
          color: #f3f4f6;
        }
        
        .user-role {
          font-size: 0.7rem;
          color: #6b7280;
        }
        
        .navbar.dark .user-role {
          color: #9ca3af;
        }
        
        .user-email {
          display: none;
        }
        
        .user-status {
          display: none;
        }
        
        .nav-section {
          flex: 1;
          padding: 0.5rem 0;
          overflow-y: auto;
        }
        
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 0.75rem;
        }
        
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #4b5563;
          text-decoration: none;
          padding: 0.625rem 0.75rem;
          border-radius: 6px;
          transition: all 0.15s ease;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .nav-link.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }
        
        .navbar.dark .nav-link {
          color: #9ca3af;
        }
        
        .nav-link:hover:not(.disabled) {
          background: #f3f4f6;
          color: #111827;
        }
        
        .navbar.dark .nav-link:hover:not(.disabled) {
          background: #1f2937;
          color: #f3f4f6;
        }
        
        .nav-link.active {
          background: #eff6ff;
          color: #2563eb;
        }

        .navbar.personal .nav-link.active {
          background: #ecfdf5;
          color: #059669;
        }
        
        .navbar.dark .nav-link.active {
          background: #1e3a8a;
          color: #93c5fd;
        }

        .navbar.dark.personal .nav-link.active {
          background: #064e3b;
          color: #6ee7b7;
        }
        
        .nav-link.admin {
          color: #7c3aed;
        }
        
        .nav-link.admin:hover:not(.disabled) {
          background: #f5f3ff;
        }

        .navbar.dark .nav-link.admin:hover:not(.disabled) {
          background: #2e1065;
        }
        
        .nav-link-icon {
          flex-shrink: 0;
          opacity: 0.7;
        }

        .nav-link.active .nav-link-icon {
          opacity: 1;
        }
        
        .highlight-dot {
          display: none;
        }
        
        .nav-link-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        
        .nav-link-label {
          font-size: 0.875rem;
        }
        
        .nav-link-description {
          display: none;
        }

        .coming-soon {
          font-size: 0.6rem;
          background: #fbbf24;
          color: #78350f;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          margin-left: auto;
        }
        
        .active-indicator {
          display: none;
        }
        
        .navbar-footer {
          padding: 0.75rem;
          border-top: 1px solid #f3f4f6;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .navbar.dark .navbar-footer {
          border-top-color: #374151;
        }
        
        .footer-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: none;
          border: none;
          color: #6b7280;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: 0.8rem;
          font-weight: 500;
          width: 100%;
          text-align: left;
        }
        
        .navbar.dark .footer-btn {
          color: #9ca3af;
        }
        
        .footer-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }
        
        .navbar.dark .footer-btn:hover {
          background: #1f2937;
          color: #f3f4f6;
        }
        
        .logout-btn:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .navbar.dark .logout-btn:hover {
          background: #450a0a;
          color: #fca5a5;
        }
        
        .expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-top: 0.5rem;
        }
        
        .expand-btn:hover {
          background: #f3f4f6;
          color: #6b7280;
        }
        
        .navbar.dark .expand-btn {
          border-color: #374151;
        }
        
        .navbar.dark .expand-btn:hover {
          background: #1f2937;
          color: #9ca3af;
        }
        
        .mobile-menu-button {
          display: none;
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 101;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          padding: 0.625rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          color: #6b7280;
          cursor: pointer;
        }
        
        .mobile-menu-button:hover {
          background: #f9fafb;
        }
        
        .mobile-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 99;
        }
        
        .desktop-only {
          display: block;
        }
        
        .nav-section::-webkit-scrollbar {
          width: 4px;
        }
        
        .nav-section::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .nav-section::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }
        
        .navbar.dark .nav-section::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        
        @media (max-width: 768px) {
          .navbar {
            transform: translateX(-100%);
            width: 280px;
            box-shadow: 2px 0 8px rgba(0,0,0,0.1);
          }
          
          .navbar.menu-open {
            transform: translateX(0);
          }
          
          .navbar.collapsed {
            width: 280px;
          }
          
          .mobile-menu-button {
            display: flex;
            align-items: center;
            justify-content: center;
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
            width: 100vw;
          }
        }
        
        .nav-section {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }

        .navbar.dark .nav-section {
          scrollbar-color: #4b5563 transparent;
        }

        .nav-link.highlight {
          background: transparent;
          color: #4b5563;
          border: none;
          box-shadow: none;
          animation: none;
        }

        .nav-link.highlight:hover:not(.disabled) {
          background: #f3f4f6;
          color: #111827;
        }

        .notification-badge {
          display: none;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
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
        }
      `}</style>
    </>
  );
}