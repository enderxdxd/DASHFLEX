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
    },
    { 
      id: "palmas", 
      name: "Palmas", 
      color: "#EC4899",
      gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
      icon: FiMapPin,
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
      {/* Elementos decorativos de fundo */}
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>
      <div className="bg-orb bg-orb-3"></div>
      <div className="bg-grid"></div>

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
              <div className="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
                </svg>
              </div>
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
                style={{ '--accent-color': unidade.color, '--gradient': unidade.gradient, '--index': index }}
              >
                <div className="unit-glow"></div>
                <div className="unit-border"></div>
                <div className="unit-content">
                  <div className="unit-icon-wrapper">
                    <div className="unit-icon">
                      <IconComponent size={24} />
                    </div>
                    <div className="unit-icon-ring"></div>
                  </div>
                  <div className="unit-info">
                    <h3 className="unit-name">{unidade.name}</h3>
                    <p className="unit-description">{unidade.description}</p>
                  </div>
                </div>
                <div className="unit-arrow-wrapper">
                  <div className="arrow-bg"></div>
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
          <div className="footer-note">
            <span className="footer-icon">💡</span>
            <span>Você pode alternar entre unidades a qualquer momento</span>
          </div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        /* ========== VARIÁVEIS E RESET ========== */
        .selector-container {
          --primary: #667eea;
          --primary-dark: #764ba2;
          --surface: rgba(255, 255, 255, 0.95);
          --surface-hover: rgba(255, 255, 255, 1);
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #94a3b8;
          --border: rgba(226, 232, 240, 0.8);
          --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 20px 50px -12px rgba(0, 0, 0, 0.25);
          --shadow-xl: 0 25px 60px -15px rgba(0, 0, 0, 0.3);
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 20px;
          --radius-xl: 28px;
          --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
          --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
          --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ========== CONTAINER PRINCIPAL ========== */
        .selector-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #1e1b4b 0%, #312e81 30%, #4c1d95 70%, #581c87 100%);
          padding: 24px;
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        /* ========== ELEMENTOS DECORATIVOS DE FUNDO ========== */
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 20s ease-in-out infinite;
          pointer-events: none;
        }

        .bg-orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          top: -200px;
          right: -100px;
          animation-delay: 0s;
        }

        .bg-orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #a855f7 0%, transparent 70%);
          bottom: -150px;
          left: -100px;
          animation-delay: -7s;
        }

        .bg-orb-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #ec4899 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -14s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -30px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(20px, 30px) scale(1.02); }
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%);
        }

        /* ========== WRAPPER PRINCIPAL ========== */
        .selector-wrapper {
          background: var(--surface);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: var(--radius-xl);
          box-shadow: 
            var(--shadow-xl),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          padding: 48px;
          width: 100%;
          max-width: 480px;
          position: relative;
          z-index: 1;
        }

        /* ========== LOGO ========== */
        .logo-section {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px 10px 14px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          border-radius: 100px;
          box-shadow: 
            0 4px 16px rgba(102, 126, 234, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: var(--transition-base);
        }

        .logo:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 8px 24px rgba(102, 126, 234, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .logo-icon {
          width: 22px;
          height: 22px;
          color: rgba(255, 255, 255, 0.95);
        }

        .logo-icon svg {
          width: 100%;
          height: 100%;
        }

        .logo-text {
          color: white;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 1.5px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        /* ========== HEADER ========== */
        .selector-header {
          text-align: center;
          margin-bottom: 36px;
        }

        .selector-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 8px;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: 15px;
          margin: 0;
          font-weight: 450;
        }

        /* ========== GRID DE UNIDADES ========== */
        .units-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ========== CARD DE UNIDADE ========== */
        .unit-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-radius: var(--radius-lg);
          background: white;
          cursor: pointer;
          transition: var(--transition-base);
          overflow: hidden;
        }

        .unit-glow {
          position: absolute;
          inset: 0;
          background: var(--gradient);
          opacity: 0;
          transition: opacity var(--transition-slow);
        }

        .unit-card:hover .unit-glow {
          opacity: 0.06;
        }

        .unit-border {
          position: absolute;
          inset: 0;
          border-radius: var(--radius-lg);
          padding: 1.5px;
          background: linear-gradient(135deg, var(--border), transparent 50%, var(--border));
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          transition: var(--transition-base);
        }

        .unit-card:hover .unit-border {
          background: linear-gradient(135deg, var(--accent-color), transparent 60%, var(--accent-color));
        }

        .unit-card:hover {
          transform: translateY(-3px);
          box-shadow: 
            0 12px 32px -8px rgba(0, 0, 0, 0.12),
            0 4px 8px -2px rgba(0, 0, 0, 0.06);
        }

        .unit-card:active {
          transform: translateY(-1px);
        }

        /* ========== CONTEÚDO DO CARD ========== */
        .unit-content {
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .unit-icon-wrapper {
          position: relative;
        }

        .unit-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-md);
          background: var(--gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: var(--transition-base);
          box-shadow: 
            0 4px 12px -2px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
          z-index: 1;
        }

        .unit-icon-ring {
          position: absolute;
          inset: -4px;
          border-radius: calc(var(--radius-md) + 4px);
          background: var(--gradient);
          opacity: 0;
          transform: scale(0.8);
          transition: var(--transition-base);
          z-index: 0;
        }

        .unit-card:hover .unit-icon-ring {
          opacity: 0.15;
          transform: scale(1);
        }

        .unit-card:hover .unit-icon {
          transform: scale(1.08) rotate(-3deg);
          box-shadow: 
            0 8px 20px -4px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .unit-info {
          flex: 1;
          min-width: 0;
        }

        .unit-name {
          font-size: 17px;
          font-weight: 650;
          color: var(--text-primary);
          margin: 0 0 2px;
          transition: color var(--transition-fast);
        }

        .unit-description {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
          font-weight: 450;
        }

        .unit-card:hover .unit-name {
          color: var(--accent-color);
        }

        /* ========== SETA DO CARD ========== */
        .unit-arrow-wrapper {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .arrow-bg {
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--accent-color);
          opacity: 0;
          transform: scale(0.6);
          transition: var(--transition-base);
        }

        .unit-card:hover .arrow-bg {
          opacity: 0.1;
          transform: scale(1);
        }

        .unit-arrow {
          color: var(--text-muted);
          font-size: 22px;
          transition: var(--transition-base);
          position: relative;
          z-index: 1;
        }

        .unit-card:hover .unit-arrow {
          color: var(--accent-color);
          transform: translateX(4px);
        }

        /* ========== FOOTER ========== */
        .footer-section {
          margin-top: 28px;
        }

        .footer-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          padding: 14px 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }

        .footer-icon {
          font-size: 16px;
          line-height: 1;
        }

        /* ========== RESPONSIVIDADE ========== */
        @media (max-width: 640px) {
          .selector-container {
            padding: 20px 16px;
            align-items: flex-start;
            padding-top: 60px;
          }

          .selector-wrapper {
            padding: 36px 24px;
            border-radius: var(--radius-lg);
          }
          
          .selector-header h1 {
            font-size: 24px;
          }

          .subtitle {
            font-size: 14px;
          }

          .unit-card {
            padding: 16px;
          }

          .unit-content {
            gap: 14px;
          }

          .unit-icon {
            width: 46px;
            height: 46px;
          }

          .unit-name {
            font-size: 15px;
          }

          .unit-description {
            font-size: 12px;
          }

          .footer-note {
            font-size: 12px;
            padding: 12px 16px;
          }
        }

        @media (max-width: 400px) {
          .selector-wrapper {
            padding: 28px 18px;
          }

          .logo {
            padding: 8px 16px 8px 12px;
          }

          .logo-text {
            font-size: 13px;
          }

          .logo-icon {
            width: 18px;
            height: 18px;
          }
          
          .selector-header h1 {
            font-size: 22px;
          }

          .unit-icon {
            width: 42px;
            height: 42px;
          }

          .unit-icon svg {
            width: 20px;
            height: 20px;
          }
        }

        /* ========== PREFERÊNCIAS DE MOVIMENTO REDUZIDO ========== */
        @media (prefers-reduced-motion: reduce) {
          .bg-orb {
            animation: none;
          }

          .unit-card,
          .unit-icon,
          .unit-arrow,
          .logo {
            transition: none;
          }
        }

        /* ========== MODO ESCURO (OPCIONAL) ========== */
        @media (prefers-color-scheme: dark) {
          .selector-container {
            --surface: rgba(30, 27, 75, 0.95);
            --surface-hover: rgba(30, 27, 75, 1);
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            --border: rgba(71, 85, 105, 0.5);
          }

          .selector-wrapper {
            box-shadow: 
              var(--shadow-xl),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
          }

          .unit-card {
            background: rgba(51, 65, 85, 0.5);
          }

          .unit-card:hover {
            box-shadow: 
              0 12px 32px -8px rgba(0, 0, 0, 0.4),
              0 4px 8px -2px rgba(0, 0, 0, 0.2);
          }

          .footer-note {
            background: linear-gradient(135deg, rgba(51, 65, 85, 0.5) 0%, rgba(71, 85, 105, 0.3) 100%);
          }
        }
      `}</style>
    </div>
  );
}