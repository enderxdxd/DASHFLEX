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

export default function ModuleSelector() {
  const navigate = useNavigate();

  const modules = [
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
          background: linear-gradient(
            135deg,
            #667eea 0%,
            #764ba2 25%,
            #11998e 50%,
            #38ef7d 75%,
            #667eea 100%
          );
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .module-selector-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }

        .selector-wrapper {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          padding: 48px;
          width: 100%;
          max-width: 900px;
          position: relative;
          z-index: 1;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .logo-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50px;
          margin-bottom: 16px;
        }

        .logo-text {
          color: white;
          font-weight: 700;
          font-size: 18px;
          letter-spacing: 1px;
        }

        .selector-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .selector-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px;
          background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 16px;
          color: #64748b;
          margin: 0;
          font-weight: 400;
        }

        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .module-card {
          position: relative;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid rgba(99, 102, 241, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .module-card:hover {
          border-color: var(--accent-color);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .module-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          overflow: hidden;
        }

        .module-gradient {
          height: 100%;
          width: 100%;
        }

        .module-content {
          padding: 32px;
        }

        .module-header {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .module-icon-wrapper {
          flex-shrink: 0;
          width: 64px;
          height: 64px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .module-card:hover .module-icon-wrapper {
          background: var(--accent-color);
          transform: scale(1.05);
        }

        .module-icon {
          color: #6366f1;
          transition: color 0.3s ease;
        }

        .module-card:hover .module-icon {
          color: white;
        }

        .module-info {
          flex: 1;
        }

        .module-name {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px;
          transition: color 0.3s ease;
        }

        .module-card:hover .module-name {
          color: var(--accent-color);
        }

        .module-description {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          font-weight: 400;
        }

        .module-arrow-wrapper {
          position: relative;
          z-index: 2;
        }

        .module-arrow {
          color: #94a3b8;
          font-size: 24px;
          transition: all 0.3s ease;
        }

        .module-card:hover .module-arrow {
          color: var(--accent-color);
          transform: translateX(4px);
        }

        .module-features {
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }

        .features-title {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          margin: 0 0 12px;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 8px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: #64748b;
        }

        .feature-dot {
          width: 6px;
          height: 6px;
          background: #94a3b8;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background 0.3s ease;
        }

        .module-card:hover .feature-dot {
          background: var(--accent-color);
        }

        .footer-section {
          text-align: center;
          margin-top: 32px;
        }

        .footer-note {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          padding: 16px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          border: 1px solid rgba(226, 232, 240, 0.5);
        }

        @media (max-width: 768px) {
          .modules-grid {
            grid-template-columns: 1fr;
          }
          
          .selector-wrapper {
            padding: 32px 24px;
            margin: 16px;
          }
          
          .selector-header h1 {
            font-size: 28px;
          }

          .module-header {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .module-content {
            padding: 24px;
          }

          .module-icon-wrapper {
            width: 56px;
            height: 56px;
            align-self: center;
          }
        }

        @media (max-width: 480px) {
          .module-selector-container {
            padding: 16px;
          }

          .selector-wrapper {
            padding: 24px 20px;
          }
          
          .selector-header h1 {
            font-size: 24px;
          }

          .logo-text {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}