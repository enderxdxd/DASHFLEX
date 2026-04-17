// src/pages/ModuleSelector.jsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Users, ChevronRight, Info } from "lucide-react";
import { useUserRole } from "../hooks/useUserRole";

export default function ModuleSelector() {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  const allModules = [
    {
      id: "vendas",
      name: "Dashboard de Vendas",
      color: "#6366F1",
      icon: TrendingUp,
      description: "Gerencie vendas, metas e analytics",
      features: ["Importação de planilhas", "Análises em tempo real", "Gestão de metas", "Relatórios avançados"]
    },
    {
      id: "personal",
      name: "Gerenciador de Personal",
      color: "#10B981",
      icon: Users,
      description: "Controle de personals e alunos",
      features: ["Cadastro de personals", "Gestão de alunos", "Controle de produtos", "Relatórios personalizados"]
    }
  ];

  const modules = allModules.filter(module => {
    if (module.id === "personal") {
      return role === "admin" || role === "tesouraria";
    }
    if (module.id === "vendas") {
      return role !== "tesouraria";
    }
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
      transition: { duration: 0.4, staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  if (loading) {
    return (
      <div className="ms-container">
        <div className="ms-wrapper" style={{ textAlign: 'center', padding: '80px 48px' }}>
          <div className="ms-spinner" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, margin: '20px 0 0' }}>
            Carregando módulos...
          </p>
        </div>
        <style>{`
          .ms-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--background);
            padding: 24px;
          }
          .ms-wrapper {
            background: var(--card);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
            width: 100%;
            max-width: 560px;
          }
          .ms-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: ms-spin 0.8s linear infinite;
            margin: 0 auto;
          }
          @keyframes ms-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="ms-container">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="ms-wrapper"
      >
        <motion.div variants={cardVariants} className="ms-header">
          <div className="ms-logo-section">
            <div className="ms-logo">
              <span className="ms-logo-text">FLEXAPP</span>
            </div>
          </div>
          <h1 className="ms-title">Selecione o Módulo</h1>
          <p className="ms-subtitle">Escolha o módulo do sistema que deseja acessar</p>
        </motion.div>

        <motion.div variants={containerVariants} className="ms-grid">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <motion.button
                key={module.id}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className="ms-card"
                style={{ '--ms-accent': module.color }}
                onClick={() => handleModuleSelect(module.id)}
              >
                <div className="ms-card-top">
                  <div className="ms-card-icon">
                    <Icon size={24} />
                  </div>
                  <div className="ms-card-info">
                    <span className="ms-card-name">{module.name}</span>
                    <span className="ms-card-desc">{module.description}</span>
                  </div>
                  <ChevronRight size={18} className="ms-card-arrow" />
                </div>

                <div className="ms-features">
                  <span className="ms-features-label">Funcionalidades:</span>
                  <div className="ms-features-list">
                    {module.features.map((feature, i) => (
                      <span key={i} className="ms-feature-tag">
                        <span className="ms-feature-dot" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div variants={cardVariants} className="ms-footer">
          <Info size={14} className="ms-footer-icon" />
          <span>Cada módulo possui suas próprias funcionalidades e configurações</span>
        </motion.div>
      </motion.div>

      <style>{`
        .ms-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background);
          padding: 24px;
        }

        .ms-wrapper {
          background: var(--card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          padding: 40px;
          width: 100%;
          max-width: 560px;
        }

        /* ---- Logo ---- */
        .ms-logo-section {
          text-align: center;
          margin-bottom: 24px;
        }

        .ms-logo {
          display: inline-block;
          padding: 8px 18px;
          background: var(--primary);
          border-radius: var(--radius-sm);
        }

        .ms-logo-text {
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.8px;
          font-family: var(--font-sans);
        }

        /* ---- Header ---- */
        .ms-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .ms-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px;
          letter-spacing: -0.3px;
          line-height: 1.3;
          font-family: var(--font-sans);
        }

        .ms-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          font-weight: 400;
        }

        /* ---- Grid ---- */
        .ms-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ---- Card ---- */
        .ms-card {
          display: flex;
          flex-direction: column;
          width: 100%;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition:
            border-color var(--transition-fast),
            box-shadow var(--transition-fast),
            background-color var(--transition-fast);
          font-family: var(--font-sans);
          text-align: left;
          padding: 0;
          overflow: hidden;
        }

        .ms-card:hover {
          border-color: var(--ms-accent);
          box-shadow: var(--card-hover-shadow);
          background: var(--card);
        }

        .ms-card:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .ms-card-top {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 18px 14px;
        }

        /* ---- Icon ---- */
        .ms-card-icon {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          background: var(--ms-accent);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: transform var(--transition-fast);
        }

        .ms-card:hover .ms-card-icon {
          transform: scale(1.06);
        }

        /* ---- Info ---- */
        .ms-card-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ms-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          transition: color var(--transition-fast);
        }

        .ms-card:hover .ms-card-name {
          color: var(--ms-accent);
        }

        .ms-card-desc {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 400;
        }

        /* ---- Arrow ---- */
        .ms-card-arrow {
          flex-shrink: 0;
          color: var(--text-secondary);
          opacity: 0.4;
          transition:
            opacity var(--transition-fast),
            transform var(--transition-fast),
            color var(--transition-fast);
        }

        .ms-card:hover .ms-card-arrow {
          opacity: 1;
          color: var(--ms-accent);
          transform: translateX(3px);
        }

        /* ---- Features ---- */
        .ms-features {
          padding: 12px 18px 16px;
          border-top: 1px solid var(--border);
        }

        .ms-features-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          display: block;
          margin-bottom: 8px;
        }

        .ms-features-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .ms-feature-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text-secondary);
          background: var(--card);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .ms-feature-dot {
          width: 4px;
          height: 4px;
          background: var(--ms-accent);
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ---- Footer ---- */
        .ms-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          padding: 12px 16px;
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--background);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .ms-footer-icon {
          flex-shrink: 0;
          opacity: 0.6;
        }

        /* ---- Responsive ---- */
        @media (max-width: 640px) {
          .ms-container {
            padding: 20px 16px;
            align-items: flex-start;
            padding-top: 48px;
          }

          .ms-wrapper {
            padding: 32px 24px;
          }

          .ms-title {
            font-size: 20px;
          }
        }

        @media (max-width: 400px) {
          .ms-wrapper {
            padding: 24px 18px;
          }

          .ms-card-top {
            padding: 14px 14px 12px;
          }

          .ms-features {
            padding: 10px 14px 14px;
          }

          .ms-card-icon {
            width: 40px;
            height: 40px;
          }

          .ms-card-name {
            font-size: 14px;
          }
        }

        /* ---- Reduced Motion ---- */
        @media (prefers-reduced-motion: reduce) {
          .ms-card,
          .ms-card-icon,
          .ms-card-arrow {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
