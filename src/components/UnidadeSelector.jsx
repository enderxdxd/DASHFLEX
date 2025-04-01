import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiChevronRight } from "react-icons/fi";

export default function UnidadeSelector() {
  const navigate = useNavigate();

  const unidades = [
    { id: "alphaville", name: "Alphaville", color: "#6366F1" },
    { id: "buenavista", name: "Buenavista", color: "#10B981" },
    { id: "marista", name: "Marista", color: "#F59E0B" }
  ];

  const handleUnidade = (unidade) => {
    navigate(`/dashboard/${unidade}`);
  };

  return (
    <div className="selector-container">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="selector-card"
      >
        <div className="selector-header">
          <h1>Selecione sua unidade</h1>
          <p className="subtitle">Escolha abaixo a unidade que deseja acessar</p>
        </div>

        <div className="units-grid">
          {unidades.map((unidade) => (
            <motion.div
              key={unidade.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleUnidade(unidade.id)}
              className="unit-card"
              style={{ '--accent-color': unidade.color }}
            >
              <div className="unit-content">
                <div className="unit-icon" style={{ backgroundColor: unidade.color }}>
                  {unidade.name.charAt(0)}
                </div>
                <span className="unit-name">{unidade.name}</span>
              </div>
              <FiChevronRight className="unit-arrow" />
            </motion.div>
          ))}
        </div>

        <div className="footer-note">
          <p>Você pode mudar de unidade a qualquer momento</p>
        </div>
      </motion.div>

      <style jsx>{`
        .selector-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 20px;
        }

        .selector-card {
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          padding: 40px;
          width: 100%;
          max-width: 500px;
        }

        .selector-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .selector-header h1 {
          font-size: 28px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px;
        }

        .subtitle {
          color: #64748b;
          font-size: 16px;
          margin: 0;
        }

        .units-grid {
          display: grid;
          gap: 16px;
          margin: 32px 0;
        }

        .unit-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-radius: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.3s;
        }

        .unit-card:hover {
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
        }

        .unit-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .unit-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
        }

        .unit-name {
          font-size: 16px;
          font-weight: 500;
          color: #1e293b;
        }

        .unit-arrow {
          color: #94a3b8;
          font-size: 20px;
          transition: all 0.2s;
        }

        .unit-card:hover .unit-arrow {
          color: var(--accent-color);
          transform: translateX(3px);
        }

        .footer-note {
          text-align: center;
          margin-top: 24px;
          font-size: 14px;
          color: #64748b;
        }

        @media (max-width: 480px) {
          .selector-card {
            padding: 30px 20px;
          }
          
          .selector-header h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}