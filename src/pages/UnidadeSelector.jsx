import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiChevronRight, FiMapPin, FiTrendingUp, FiUsers } from "react-icons/fi";

export default function UnidadeSelector() {
  const navigate = useNavigate();

  const unidades = [
    { 
      id: "alphaville", 
      name: "Alphaville", 
      color: "#6366F1",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      icon: FiTrendingUp,
      description: ""
    },
    { 
      id: "buenavista", 
      name: "Buena Vista", 
      color: "#10B981",
      gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      icon: FiMapPin,
      description: ""
    },
    { 
      id: "marista", 
      name: "Marista", 
      color: "#F59E0B",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      icon: FiUsers,
      description: ""
    }
  ];

  const handleUnidade = (unidade) => {
    navigate(`/dashboard/${unidade}`);
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
    <div className="selector-container">
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
              <span className="logo-text">DASHFLEX</span>
            </div>
          </div>
          <h1>Selecione sua Unidade</h1>
          <p className="subtitle">Escolha a unidade para acessar o dashboard</p>
        </motion.div>

        <motion.div 
          variants={cardVariants}
          className="units-grid"
        >
          {unidades.map((unidade, index) => {
            const IconComponent = unidade.icon;
            return (
              <motion.div
                key={unidade.id}
                variants={cardVariants}
                whileHover={{ 
                  scale: 1.02,
                  y: -5,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleUnidade(unidade.id)}
                className="unit-card"
                style={{ '--accent-color': unidade.color, '--gradient': unidade.gradient }}
              >
                <div className="unit-background"></div>
                <div className="unit-content">
                  <div className="unit-icon-wrapper">
                    <div className="unit-icon">
                      <IconComponent size={24} />
                    </div>
                  </div>
                  <div className="unit-info">
                    <h3 className="unit-name">{unidade.name}</h3>
                    <p className="unit-description">{unidade.description}</p>
                  </div>
                </div>
                <div className="unit-arrow-wrapper">
                  <FiChevronRight className="unit-arrow" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div 
          variants={cardVariants}
          className="footer-section"
        >
          <p className="footer-note">
            💡 Você pode alternar entre unidades a qualquer momento
          </p>
        </motion.div>
      </motion.div>

      <style jsx>{`
        .selector-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .selector-container::before {
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
          color: #64748b;
          font-size: 16px;
          margin: 0;
          font-weight: 400;
        }

        .units-grid {
          display: grid;
          gap: 20px;
          margin: 40px 0;
        }

        .unit-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-radius: 16px;
          background: white;
          border: 1px solid rgba(226, 232, 240, 0.8);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .unit-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--gradient);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .unit-card:hover .unit-background {
          opacity: 0.05;
        }

        .unit-card:hover {
          border-color: var(--accent-color);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .unit-content {
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
          z-index: 2;
        }

        .unit-icon-wrapper {
          position: relative;
        }

        .unit-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: var(--gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .unit-card:hover .unit-icon {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
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

        .unit-description {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          font-weight: 400;
        }

        .unit-card:hover .unit-name {
          color: var(--accent-color);
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

          .unit-icon {
            width: 48px;
            height: 48px;
          }

          .unit-name {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .selector-container {
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