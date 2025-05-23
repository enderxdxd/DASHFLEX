// src/components/ui/ExpandableChart.jsx
import React from 'react';
import { Maximize2, X } from 'lucide-react';

// Componente do botão de expandir
export function ExpandButton({ onClick }) {
  return (
    <button 
      className="expand-button" 
      onClick={onClick}
      aria-label="Expandir gráfico"
    >
      <Maximize2 size={18} />
      
      <style jsx>{`
        .expand-button {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          padding: 0.375rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-right: 0.5rem;
        }
        
        .expand-button:hover {
          background-color: #f1f5f9;
          color: #4f46e5;
        }
      `}</style>
    </button>
  );
}

// Componente do modal
export function ChartModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  
  return (
    <div className="chart-modal-overlay">
      <div className="chart-modal">
        <div className="chart-modal-header">
          <h3 className="chart-modal-title">{title}</h3>
          <button className="chart-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="chart-modal-content">
          {children}
        </div>
      </div>
      
      <style jsx>{`
        .chart-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .chart-modal {
          background-color: white;
          border-radius: 0.75rem;
          width: 90%;
          max-width: 1200px;
          max-height: 90vh;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: scaleIn 0.2s ease-out;
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        
        .chart-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .chart-modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        
        .chart-modal-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }
        
        .chart-modal-close:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }
        
        .chart-modal-content {
          flex: 1;
          padding: 1.5rem;
          overflow: auto;
          height: 70vh;
        }
      `}</style>
    </div>
  );
}