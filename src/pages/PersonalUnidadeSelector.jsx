import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, MapPin, Users, Activity, ArrowLeft, Building2, Info } from "lucide-react";

export default function PersonalUnidadeSelector() {
  const navigate = useNavigate();

  const unidades = [
    {
      id: "alphaville",
      name: "Alphaville",
      color: "#6366F1",
      icon: Activity,
      description: "Gestão de personals e alunos"
    },
    {
      id: "buenavista",
      name: "Buena Vista",
      color: "#10B981",
      icon: MapPin,
      description: "Controle de personal trainers"
    },
    {
      id: "marista",
      name: "Marista",
      color: "#F59E0B",
      icon: Users,
      description: "Administração de alunos"
    },
    {
      id: "palmas",
      name: "Palmas",
      color: "#EC4899",
      icon: Building2,
      description: "Gestão de personals e alunos"
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
    <div className="pus-container">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="pus-wrapper"
      >
        <motion.button
          variants={cardVariants}
          className="pus-back"
          onClick={handleBack}
          whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft size={16} />
          <span>Voltar aos Módulos</span>
        </motion.button>

        <motion.div variants={cardVariants} className="pus-header">
          <div className="pus-logo-section">
            <div className="pus-logo">
              <Users size={16} />
              <span className="pus-logo-text">PERSONAL</span>
            </div>
          </div>
          <h1 className="pus-title">Selecione a Unidade</h1>
          <p className="pus-subtitle">Escolha a unidade para gerenciar personals e alunos</p>
        </motion.div>

        <motion.div variants={containerVariants} className="pus-grid">
          {unidades.map((unidade) => {
            const Icon = unidade.icon;
            return (
              <motion.button
                key={unidade.id}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleUnidade(unidade.id)}
                className="pus-card"
                style={{ '--pus-accent': unidade.color }}
              >
                <div className="pus-card-icon">
                  <Icon size={22} />
                </div>
                <div className="pus-card-info">
                  <span className="pus-card-name">{unidade.name}</span>
                  <span className="pus-card-desc">{unidade.description}</span>
                </div>
                <ChevronRight size={18} className="pus-card-arrow" />
              </motion.button>
            );
          })}
        </motion.div>

        <motion.div variants={cardVariants} className="pus-footer">
          <Info size={14} className="pus-footer-icon" />
          <span>Gerencie seus personal trainers e acompanhe o progresso dos alunos</span>
        </motion.div>
      </motion.div>

      <style>{`
        .pus-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background);
          padding: 24px;
        }

        .pus-wrapper {
          background: var(--card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          padding: 40px;
          width: 100%;
          max-width: 480px;
        }

        /* ---- Back button ---- */
        .pus-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--background);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition:
            border-color var(--transition-fast),
            color var(--transition-fast);
          font-family: var(--font-sans);
          margin-bottom: 24px;
        }

        .pus-back:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .pus-back:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* ---- Logo ---- */
        .pus-logo-section {
          text-align: center;
          margin-bottom: 24px;
        }

        .pus-logo {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          background: #10B981;
          border-radius: var(--radius-sm);
          color: #fff;
        }

        .pus-logo-text {
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.8px;
          font-family: var(--font-sans);
        }

        /* ---- Header ---- */
        .pus-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .pus-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px;
          letter-spacing: -0.3px;
          line-height: 1.3;
          font-family: var(--font-sans);
        }

        .pus-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
          font-weight: 400;
        }

        /* ---- Grid ---- */
        .pus-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* ---- Card ---- */
        .pus-card {
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
        }

        .pus-card:hover {
          border-color: var(--pus-accent);
          box-shadow: var(--card-hover-shadow);
          background: var(--card);
        }

        .pus-card:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* ---- Icon ---- */
        .pus-card-icon {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          background: var(--pus-accent);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: transform var(--transition-fast);
        }

        .pus-card:hover .pus-card-icon {
          transform: scale(1.06);
        }

        /* ---- Info ---- */
        .pus-card-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pus-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          transition: color var(--transition-fast);
        }

        .pus-card:hover .pus-card-name {
          color: var(--pus-accent);
        }

        .pus-card-desc {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 400;
        }

        /* ---- Arrow ---- */
        .pus-card-arrow {
          flex-shrink: 0;
          color: var(--text-secondary);
          opacity: 0.4;
          transition:
            opacity var(--transition-fast),
            transform var(--transition-fast),
            color var(--transition-fast);
        }

        .pus-card:hover .pus-card-arrow {
          opacity: 1;
          color: var(--pus-accent);
          transform: translateX(3px);
        }

        /* ---- Footer ---- */
        .pus-footer {
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

        .pus-footer-icon {
          flex-shrink: 0;
          opacity: 0.6;
        }

        /* ---- Responsive ---- */
        @media (max-width: 640px) {
          .pus-container {
            padding: 20px 16px;
            align-items: flex-start;
            padding-top: 48px;
          }

          .pus-wrapper {
            padding: 32px 24px;
          }

          .pus-title {
            font-size: 20px;
          }
        }

        @media (max-width: 400px) {
          .pus-wrapper {
            padding: 24px 18px;
          }

          .pus-card {
            padding: 14px 14px;
          }

          .pus-card-icon {
            width: 40px;
            height: 40px;
          }

          .pus-card-name {
            font-size: 14px;
          }
        }

        /* ---- Reduced Motion ---- */
        @media (prefers-reduced-motion: reduce) {
          .pus-card,
          .pus-card-icon,
          .pus-card-arrow,
          .pus-back {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
