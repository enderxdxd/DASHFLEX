import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, MapPin, TrendingUp, Users, Building2, Info } from "lucide-react";

export default function UnidadeSelector() {
  const navigate = useNavigate();

  const unidades = [
    {
      id: "alphaville",
      name: "Alphaville",
      color: "#6366F1",
      icon: TrendingUp,
    },
    {
      id: "buenavista",
      name: "Buena Vista",
      color: "#10B981",
      icon: MapPin,
    },
    {
      id: "marista",
      name: "Marista",
      color: "#F59E0B",
      icon: Users,
    },
    {
      id: "palmas",
      name: "Palmas",
      color: "#EC4899",
      icon: Building2,
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
        duration: 0.4,
        staggerChildren: 0.08
      }
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

  return (
    <div className="us-container">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="us-wrapper"
      >
        <motion.div variants={cardVariants} className="us-header">
          <div className="us-logo-section">
            <div className="us-logo">
              <span className="us-logo-text">FLEXAPP</span>
            </div>
          </div>
          <h1 className="us-title">Selecione sua Unidade</h1>
          <p className="us-subtitle">Escolha a unidade para acessar o dashboard</p>
        </motion.div>

        <motion.div variants={containerVariants} className="us-grid">
          {unidades.map((unidade) => {
            const Icon = unidade.icon;
            return (
              <motion.button
                key={unidade.id}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleUnidade(unidade.id)}
                className="us-card"
                style={{ '--us-accent': unidade.color }}
              >
                <div className="us-card-icon">
                  <Icon size={22} />
                </div>
                <div className="us-card-info">
                  <span className="us-card-name">{unidade.name}</span>
                </div>
                <ChevronRight size={18} className="us-card-arrow" />
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div variants={cardVariants} className="us-footer">
          <Info size={14} className="us-footer-icon" />
          <span>Você pode alternar entre unidades a qualquer momento</span>
        </motion.div>
      </motion.div>

      <style>{`
        .us-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background);
          padding: 24px;
        }

        .us-wrapper {
          background: var(--card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          padding: 40px;
          width: 100%;
          max-width: 460px;
        }

        /* ---- Logo ---- */
        .us-logo-section {
          text-align: center;
          margin-bottom: 24px;
        }

        .us-logo {
          display: inline-block;
          padding: 8px 18px;
          background: var(--primary);
          border-radius: var(--radius-sm);
        }

        .us-logo-text {
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.8px;
          font-family: var(--font-sans);
        }

        /* ---- Header ---- */
        .us-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .us-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px;
          letter-spacing: -0.3px;
          line-height: 1.3;
          font-family: var(--font-sans);
        }

        .us-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          font-weight: 400;
        }

        /* ---- Grid ---- */
        .us-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ---- Card ---- */
        .us-card {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 16px 18px;
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
          position: relative;
        }

        .us-card:hover {
          border-color: var(--us-accent);
          box-shadow: var(--card-hover-shadow);
          background: var(--card);
        }

        .us-card:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* ---- Icon ---- */
        .us-card-icon {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          background: var(--us-accent);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: transform var(--transition-fast);
        }

        .us-card:hover .us-card-icon {
          transform: scale(1.06);
        }

        /* ---- Info ---- */
        .us-card-info {
          flex: 1;
          min-width: 0;
        }

        .us-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          transition: color var(--transition-fast);
        }

        .us-card:hover .us-card-name {
          color: var(--us-accent);
        }

        /* ---- Arrow ---- */
        .us-card-arrow {
          flex-shrink: 0;
          color: var(--text-secondary);
          opacity: 0.4;
          transition:
            opacity var(--transition-fast),
            transform var(--transition-fast),
            color var(--transition-fast);
        }

        .us-card:hover .us-card-arrow {
          opacity: 1;
          color: var(--us-accent);
          transform: translateX(3px);
        }

        /* ---- Footer ---- */
        .us-footer {
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

        .us-footer-icon {
          flex-shrink: 0;
          opacity: 0.6;
        }

        /* ---- Responsive ---- */
        @media (max-width: 640px) {
          .us-container {
            padding: 20px 16px;
            align-items: flex-start;
            padding-top: 48px;
          }

          .us-wrapper {
            padding: 32px 24px;
          }

          .us-title {
            font-size: 20px;
          }
        }

        @media (max-width: 400px) {
          .us-wrapper {
            padding: 24px 18px;
          }

          .us-card {
            padding: 14px 14px;
          }

          .us-card-icon {
            width: 40px;
            height: 40px;
          }

          .us-card-name {
            font-size: 14px;
          }
        }

        /* ---- Reduced Motion ---- */
        @media (prefers-reduced-motion: reduce) {
          .us-card,
          .us-card-icon,
          .us-card-arrow {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
