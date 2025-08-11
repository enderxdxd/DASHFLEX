// src/pages/PersonalUnidadeSelector.jsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiChevronRight, FiMapPin, FiUsers, FiActivity, FiArrowLeft } from "react-icons/fi";

export default function PersonalUnidadeSelector() {
  const navigate = useNavigate();

  const unidades = [
    { 
      id: "alphaville", 
      name: "Alphaville", 
      color: "#6366F1",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      icon: FiActivity,
      description: "Gestão de personals e alunos"
    },
    { 
      id: "buenavista", 
      name: "Buena Vista", 
      color: "#10B981",
      gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      icon: FiMapPin,
      description: "Controle de personal trainers"
    },
    { 
      id: "marista", 
      name: "Marista", 
      color: "#F59E0B",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      icon: FiUsers,
      description: "Administração de alunos"
    }
  ];

  const handleUnidade = (unidade) => {
    navigate(`/personal/dashboard/${unidade}`);
  };

  const handleBack = () => {
    navigate('/modules');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="personal-selector-container">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="selector-wrapper"
      >
        {/* Botão Voltar */}
        <motion.button
          variants={cardVariants}
          className="back-button"
          onClick={handleBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiArrowLeft size={16} />
          <span>Voltar aos Módulos</span>
        </motion.button>

        <motion.div 
          variants={cardVariants}
          className="selector-header"
        >
          <div className="logo-section">
            <div className="logo personal-logo">
              <FiUsers size={24} />
              <span className="logo-text">PERSONAL</span>
            </div>
          </div>
          <h1>Selecione a Unidade</h1>
          <p className="subtitle">Escolha a unidade para gerenciar personals e alunos</p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          className="units-grid"
        >
          {unidades.map((unidade) => (
            <motion.div
              key={unidade.id}
              variants={cardVariants}
              whileHover={{ 
                scale: 1.02,
                y: -5,
                transition: { duration: 0.3 }
              }}
              whileTap={{ scale: 0.98 }}
              className="unit-card"
              style={{ '--accent-color': unidade.color }}
              onClick={() => handleUnidade(unidade.id)}
            >
              <div className="unit-background">
                <div 
                  className="unit-gradient"
                  style={{ background: unidade.gradient }}
                ></div>
              </div>
              
              <div className="unit-content">
                <div className="unit-icon-wrapper">
                  <unidade.icon className="unit-icon" size={28} />
                </div>
                <div className="unit-info">
                  <h3 className="unit-name">{unidade.name}</h3>
                  <p className="unit-description">{unidade.description}</p>
                </div>
                <div className="unit-arrow-wrapper">
                  <FiChevronRight className="unit-arrow" />
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
            💪 Gerencie seus personal trainers e acompanhe o progresso dos alunos
          </p>
        </motion.div>
      </motion.div>

      <style jsx>{`
        .personal-selector-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #11998e 0%,
            #38ef7d 25%,
            #667eea 50%,
            #764ba2 75%,
            #11998e 100%
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

        .personal-selector-container::before {
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
          max-width: 520px;
          position: relative;
          z-index: 1;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(100, 116, 139, 0.1);
          border: 1px solid rgba(100, 116, 139, 0.2);
          color: #64748b;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 24px;
          align-self: flex-start;
        }

        .back-button:hover {
          background: rgba(100, 116, 139, 0.15);
          border-color: rgba(100, 116, 139, 0.3);
          color: #475569;
        }

        .logo-section {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          border-radius: 50px;
          margin-bottom: 16px;
        }

        .personal-logo {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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

        .units-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }

        .unit-card {
          position: relative;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid rgba(17, 153, 142, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .unit-card:hover {
          border-color: var(--accent-color);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .unit-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          overflow: hidden;
        }

        .unit-gradient {
          height: 100%;
          width: 100%;
        }

        .unit-content {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
          position: relative;
          z-index: 1;
        }

        .unit-icon-wrapper {
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          background: rgba(17, 153, 142, 0.1);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .unit-card:hover .unit-icon-wrapper {
          background: var(--accent-color);
          transform: scale(1.05);
        }

        .unit-icon {
          color: #11998e;
          transition: color 0.3s ease;
        }

        .unit-card:hover .unit-icon {
          color: white;
        }

        .unit-info {
          flex: 1;
        }

        .unit-name {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px;
          transition: color 0.3s ease;
        }

        .unit-card:hover .unit-name {
          color: var(--accent-color);
        }

        .unit-description {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          font-weight: 400;
        }

        .unit-arrow-wrapper {
          position: relative;
          z-index: 2;
        }

        .unit-arrow {
          color: #94a3b8;
          font-size: 24px;
          transition: all 0.3s ease;
        }

        .unit-card:hover .unit-arrow {
          color: var(--accent-color);
          transform: translateX(4px);
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

        @media (max-width: 640px) {
          .selector-wrapper {
            padding: 32px 24px;
            margin: 16px;
          }
          
          .selector-header h1 {
            font-size: 28px;
          }

          .unit-card {
            padding: 20px;
          }

          .unit-content {
            gap: 16px;
          }

          .unit-icon-wrapper {
            width: 48px;
            height: 48px;
          }

          .unit-name {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .personal-selector-container {
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