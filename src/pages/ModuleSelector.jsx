// src/pages/ModuleSelector.jsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FiTrendingUp, 
  FiUsers, 
  FiChevronRight,
  FiBarChart3,
  FiTarget,
  FiUserCheck
} from "react-icons/fi";
import { useUserRole } from "../hooks/useUserRole";

export default function ModuleSelector() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  const allModules = [
    { 
      id: "vendas", 
      name: "Dashboard de Vendas", 
      color: "#6366F1",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      icon: FiTrendingUp,
      description: "Gerencie vendas, metas e analytics",
      features: ["Importação de planilhas", "Análises em tempo real", "Gestão de metas", "Relatórios avançados"]
    },
    { 
      id: "personal", 
      name: "Gerenciador de Personal", 
      color: "#10B981",
      gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      icon: FiUsers,
      description: "Controle de personals e alunos",
      features: ["Cadastro de personals", "Gestão de alunos", "Controle de produtos", "Relatórios personalizados"]
    }
  ];

  // Filtrar módulos baseado na role do usuário
  const modules = allModules.filter(module => {
    if (module.id === "personal") {
      // Módulo de Personal só é visível para admin ou tesouraria
      return role === "admin" || role === "tesouraria";
    }
    if (module.id === "vendas") {
      // Módulo de Vendas não é visível para tesouraria (apenas personal)
      return role !== "tesouraria";
    }
    // Outros módulos são visíveis para todos os usuários autenticados (exceto tesouraria)
    return role !== "tesouraria";
  });

  const handleModuleSelect = (moduleId) => {
    if (moduleId === "vendas") {
      navigate("/unidade");
    } else if (moduleId === "personal") {
      navigate("/personal/dashboard");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.15
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  // Mostrar loading enquanto verifica a role do usuário
  if (loading) {
    return (
      <div className="module-selector-container">
        <div className="selector-wrapper" style={{ textAlign: 'center', padding: '80px 48px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #f3f4f6', 
            borderTop: '4px solid #6366f1', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }}></div>
          <h2 style={{ color: '#64748b', fontSize: '18px', fontWeight: '500', margin: 0 }}>
            Carregando módulos...
          </h2>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="module-selector-container">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="selector-wrapper"
      >
        <motion.div 
          variants={cardVariants}
          className="selector-header"
        >
          <div className="logo-section">
            <div className="logo">
              <span className="logo-text">FLEXAPP</span>
            </div>
          </div>
          <h1>Selecione o Módulo</h1>
          <p className="subtitle">Escolha o módulo do sistema que deseja acessar</p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          className="modules-grid"
        >
          {modules.map((module) => (
            <motion.div
              key={module.id}
              variants={cardVariants}
              whileHover={{ 
                scale: 1.02,
                y: -8,
                transition: { duration: 0.3 }
              }}
              whileTap={{ scale: 0.98 }}
              className="module-card"
              style={{ '--accent-color': module.color }}
              onClick={() => handleModuleSelect(module.id)}
            >
              <div className="module-background">
                <div 
                  className="module-gradient"
                  style={{ background: module.gradient }}
                ></div>
              </div>
              
              <div className="module-content">
                <div className="module-header">
                  <div className="module-icon-wrapper">
                    <module.icon className="module-icon" size={32} />
                  </div>
                  <div className="module-info">
                    <h3 className="module-name">{module.name}</h3>
                    <p className="module-description">{module.description}</p>
                  </div>
                  <div className="module-arrow-wrapper">
                    <FiChevronRight className="module-arrow" />
                  </div>
                </div>
                
                <div className="module-features">
                  <h4 className="features-title">Funcionalidades:</h4>
                  <ul className="features-list">
                    {module.features.map((feature, index) => (
                      <li key={index} className="feature-item">
                        <div className="feature-dot"></div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          variants={cardVariants}
          className="footer-section"
        >
          <p className="footer-note">
            💡 Cada módulo possui suas próprias funcionalidades e configurações específicas
          </p>
        </motion.div>
      </motion.div>

      <style jsx>{`
        .module-selector-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 1.5rem;
        }

        .selector-wrapper {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 2rem;
          width: 100%;
          max-width: 720px;
        }

        .logo-section {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .logo {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          border-radius: 6px;
        }

        .logo-text {
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0.5px;
        }

        .selector-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .selector-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 0.5rem;
        }

        .subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
        }

        .modules-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .module-card {
          background: #f9fafb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #e5e7eb;
        }

        .module-card:hover {
          border-color: var(--accent-color);
          background: white;
        }

        .module-background {
          display: none;
        }

        .module-content {
          padding: 1.25rem;
        }

        .module-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .module-icon-wrapper {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          background: var(--accent-color);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .module-icon {
          color: white;
        }

        .module-info {
          flex: 1;
        }

        .module-name {
          font-size: 1rem;
          font-weight: 500;
          color: #111827;
          margin: 0 0 0.25rem;
        }

        .module-description {
          font-size: 0.8rem;
          color: #6b7280;
          margin: 0;
        }

        .module-arrow-wrapper {
          display: flex;
          align-items: center;
        }

        .module-arrow {
          color: #9ca3af;
          transition: transform 0.15s ease;
        }

        .module-card:hover .module-arrow {
          color: var(--accent-color);
          transform: translateX(2px);
        }

        .module-features {
          border-top: 1px solid #e5e7eb;
          padding-top: 0.75rem;
        }

        .features-title {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          margin: 0 0 0.5rem;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          color: #6b7280;
          background: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }

        .feature-dot {
          width: 4px;
          height: 4px;
          background: var(--accent-color);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .footer-section {
          text-align: center;
        }

        .footer-note {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 0;
        }

        @media (max-width: 480px) {
          .selector-wrapper {
            padding: 1.5rem;
          }
          
          .selector-header h1 {
            font-size: 1.25rem;
          }

          .module-header {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}