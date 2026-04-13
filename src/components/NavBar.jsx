import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
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
  Zap,
  Bell,
  Sparkles,
  Repeat
} from "lucide-react";
import useDarkMode from "../hooks/useDarkMode";
import { useUserData, clearUserDataCache } from "../hooks/useUserData";
import "../styles/NavBar.css";

export default function NavBar() {
  const { unidade } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();
  
  // ✅ Dados do usuário via cache singleton — elimina getDoc a cada montagem
  const { role, userInfo, loading: isLoading } = useUserData();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, toggleTheme] = useDarkMode();
  const [isCollapsed, setIsCollapsed] = useState(false); // Sempre inicia expandida
  const [showNotifications, setShowNotifications] = useState(false);

  // Memoized values for better performance
  const currentModule = useMemo(() => {
    return location.pathname.includes('/personal/') ? 'personal' : 'vendas';
  }, [location.pathname]);
  
  const isValidUnidade = useMemo(() => {
    return ['alphaville', 'buenavista', 'marista', 'palmas'].includes(unidade?.toLowerCase());
  }, [unidade]);
  
  const currentUnidade = isValidUnidade ? unidade : null;

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

  const toggleNotifications = useCallback(() => {
    setShowNotifications(prev => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      clearUserDataCache();
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

  // Prefetch de rotas lazy — pré-carrega o módulo quando o mouse entra no link
  const prefetchMap = useMemo(() => ({
    '/dashboard': () => import('../pages/Dashboard'),
    '/metas': () => import('../pages/Metas'),
    '/analytics': () => import('../pages/AnalyticsPage'),
    '/descontos': () => import('../pages/DescontosPage'),
    '/comissao': () => import('../pages/ComissaoDetalhes'),
    '/config-remuneracao': () => import('../pages/ConfigRemuneracao'),
    '/admin/produtos': () => import('../components/admin/AdminProdutoConfig'),
    '/personal/dashboard': () => import('../pages/UnifiedPersonalDashboard'),
    '/ciclo-aluno': () => import('../pages/CicloAluno'),
  }), []);

  const handlePrefetch = useCallback((matchPath) => {
    const loader = prefetchMap[matchPath];
    if (loader) loader();
  }, [prefetchMap]);

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
        },
        {
          path: `/ciclo-aluno/${unidade}`,
          icon: Repeat,
          label: "Ciclo do Aluno",
          description: "Matrículas e renovações",
          matchPath: "/ciclo-aluno"
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
                  onMouseEnter={() => handlePrefetch(item.matchPath)}
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
          
          {/* Notifications */}
          <button
            className="footer-btn notifications-btn"
            onClick={toggleNotifications}
            title="Melhorias recentes"
          >
            <div className="notification-icon-wrapper">
              <Bell size={18} />
              <span className="notification-badge">5</span>
            </div>
            {!isCollapsed && <span>Novidades</span>}
          </button>
          
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

      {/* Notifications Panel */}
      {showNotifications && (
        <>
          <div className="notifications-overlay" onClick={toggleNotifications} />
          <div className="notifications-panel">
            <div className="notifications-header">
              <div className="notifications-title">
                <Sparkles size={20} />
                <h3>Melhorias Recentes</h3>
              </div>
              <button className="close-notifications" onClick={toggleNotifications}>
                <X size={20} />
              </button>
            </div>
            
            <div className="notifications-content">
              <div className="notification-item performance">
                <div className="notification-icon">
                  <Zap size={16} />
                </div>
                <div className="notification-body">
                  <h4>Performance Otimizada</h4>
                  <p>Sistema de cache implementado para reduzir chamadas ao Firebase em até 80%</p>
                  <span className="notification-tag">Performance</span>
                </div>
              </div>

              <div className="notification-item ui">
                <div className="notification-icon">
                  <Sparkles size={16} />
                </div>
                <div className="notification-body">
                  <h4>UI Minimalista</h4>
                  <p>Design completamente redesenhado com visual limpo e moderno</p>
                  <span className="notification-tag">UI/UX</span>
                </div>
              </div>

              <div className="notification-item performance">
                <div className="notification-icon">
                  <BarChart3 size={16} />
                </div>
                <div className="notification-body">
                  <h4>Carregamento Mais Rápido</h4>
                  <p>Tempo de carregamento inicial reduzido com lazy loading e code splitting</p>
                  <span className="notification-tag">Performance</span>
                </div>
              </div>

              <div className="notification-item ui">
                <div className="notification-icon">
                  <Target size={16} />
                </div>
                <div className="notification-body">
                  <h4>Cards Simplificados</h4>
                  <p>Métricas e estatísticas com design mais limpo e legível</p>
                  <span className="notification-tag">UI/UX</span>
                </div>
              </div>

              <div className="notification-item performance">
                <div className="notification-icon">
                  <Settings size={16} />
                </div>
                <div className="notification-body">
                  <h4>Hooks Otimizados</h4>
                  <p>useMemo e useCallback implementados para melhor performance</p>
                  <span className="notification-tag">Performance</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </>
  );
}