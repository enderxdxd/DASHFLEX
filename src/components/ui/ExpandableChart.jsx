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
          background: linear-gradient(135deg, var(--bg-overlay, rgba(0, 0, 0, 0.5)) 0%, var(--bg-overlay-light, rgba(15, 23, 42, 0.7)) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to { 
            opacity: 1;
            backdrop-filter: blur(20px);
          }
        }
        
        .chart-modal {
          background: linear-gradient(135deg, var(--bg-modal, white) 0%, var(--bg-modal-light, #f8fafc) 100%);
          border-radius: 1rem;
          width: 90%;
          max-width: 1200px;
          max-height: 90vh;
          box-shadow: var(--shadow-modal, 0 25px 50px rgba(0, 0, 0, 0.3));
          border: 1px solid var(--border-modal, #e2e8f0);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .chart-modal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--primary, #6366f1) 0%, var(--primary-light, #818cf8) 50%, var(--primary, #6366f1) 100%);
          opacity: 0.8;
        }
        
        @keyframes scaleIn {
          from { 
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          to { 
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        
        .chart-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-header, #e2e8f0);
          background: linear-gradient(135deg, var(--bg-header, rgba(248, 250, 252, 0.8)) 0%, var(--bg-header-light, rgba(241, 245, 249, 0.6)) 100%);
          backdrop-filter: blur(10px);
        }
        
        .chart-modal-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0;
          background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #6366f1) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .chart-modal-title::before {
          content: '📊';
          font-size: 1.25rem;
          background: linear-gradient(135deg, var(--bg-title-icon, #e0e7ff) 0%, var(--bg-title-icon-light, #c7d2fe) 100%);
          padding: 0.375rem;
          border-radius: 0.5rem;
          box-shadow: var(--shadow-title-icon, 0 2px 8px rgba(99, 102, 241, 0.2));
        }
        
        .chart-modal-close {
          background: linear-gradient(135deg, var(--bg-close, transparent) 0%, var(--bg-close-light, rgba(0, 0, 0, 0.02)) 100%);
          border: 1px solid var(--border-close, transparent);
          color: var(--text-close, #64748b);
          cursor: pointer;
          padding: 0.625rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          width: 2.5rem;
          height: 2.5rem;
          position: relative;
          overflow: hidden;
        }
        
        .chart-modal-close::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: currentColor;
          opacity: 0;
          transition: opacity 0.2s ease;
          border-radius: inherit;
        }
        
        .chart-modal-close:hover::before {
          opacity: 0.1;
        }
        
        .chart-modal-close:hover {
          background: linear-gradient(135deg, var(--bg-close-hover, #fee2e2) 0%, var(--bg-close-hover-light, #fecaca) 100%);
          color: var(--text-close-hover, #ef4444);
          border-color: var(--border-close-hover, #fca5a5);
          transform: scale(1.05);
          box-shadow: var(--shadow-close-hover, 0 4px 12px rgba(239, 68, 68, 0.2));
        }
        
        .chart-modal-close:active {
          transform: scale(0.95);
        }
        
        .chart-modal-close svg {
          width: 1.25rem;
          height: 1.25rem;
          transition: transform 0.2s ease;
          z-index: 1;
          position: relative;
        }
        
        .chart-modal-close:hover svg {
          transform: rotate(90deg);
        }
        
        .chart-modal-content {
          flex: 1;
          padding: 2rem;
          overflow: auto;
          height: 70vh;
          background: linear-gradient(135deg, var(--bg-content, white) 0%, var(--bg-content-light, #f8fafc) 100%);
          position: relative;
        }
        
        .chart-modal-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, var(--border-content-accent, #e2e8f0) 50%, transparent 100%);
          opacity: 0.5;
        }
        
        /* Custom scrollbar for modal content */
        .chart-modal-content::-webkit-scrollbar {
          width: 8px;
        }
        
        .chart-modal-content::-webkit-scrollbar-track {
          background: var(--scrollbar-track, #f1f5f9);
          border-radius: 4px;
        }
        
        .chart-modal-content::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, var(--scrollbar-thumb, #cbd5e1) 0%, var(--scrollbar-thumb-light, #94a3b8) 100%);
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        
        .chart-modal-content::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, var(--scrollbar-thumb-hover, #94a3b8) 0%, var(--scrollbar-thumb-hover-light, #64748b) 100%);
        }
        
        /* Loading state for modal content */
        .chart-modal-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 1rem;
          color: var(--text-loading, #64748b);
        }
        
        .modal-spinner {
          width: 2.5rem;
          height: 2.5rem;
          border: 3px solid var(--spinner-track, #e2e8f0);
          border-top: 3px solid var(--primary, #6366f1);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: var(--shadow-spinner, 0 4px 12px rgba(99, 102, 241, 0.2));
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-text {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-loading, #64748b);
        }
        
        /* Modal controls section */
        .chart-modal-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-controls, #e2e8f0);
          background: linear-gradient(135deg, var(--bg-controls, #f8fafc) 0%, var(--bg-controls-light, #f1f5f9) 100%);
        }
        
        .modal-control-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          background: linear-gradient(135deg, var(--bg-control-button, white) 0%, var(--bg-control-button-light, #f8fafc) 100%);
          border: 1px solid var(--border-control-button, #e2e8f0);
          border-radius: 0.5rem;
          color: var(--text-control-button, #64748b);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-control-button, 0 2px 4px rgba(0, 0, 0, 0.05));
        }
        
        .modal-control-button:hover {
          background: linear-gradient(135deg, var(--bg-control-button-hover, #e2e8f0) 0%, var(--bg-control-button-hover-light, #d1d5db) 100%);
          color: var(--text-control-button-hover, #374151);
          transform: translateY(-1px);
          box-shadow: var(--shadow-control-button-hover, 0 4px 8px rgba(0, 0, 0, 0.1));
        }
        
        .modal-control-button.active {
          background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dark, #4f46e5) 100%);
          color: white;
          border-color: var(--primary-dark, #4f46e5);
          box-shadow: var(--shadow-control-button-active, 0 4px 12px rgba(99, 102, 241, 0.3));
        }
        
        .modal-control-button.active:hover {
          background: linear-gradient(135deg, var(--primary-dark, #4f46e5) 0%, var(--primary-darker, #3730a3) 100%);
          transform: translateY(-1px);
        }
        
        /* Manual Dark Mode Classes */
        .dark .chart-modal-overlay,
        [data-theme="dark"] .chart-modal-overlay {
          --bg-overlay: rgba(15, 23, 42, 0.8);
          --bg-overlay-light: rgba(0, 0, 0, 0.9);
          --bg-modal: #1e293b;
          --bg-modal-light: #334155;
          --border-modal: #334155;
          --bg-header: rgba(15, 23, 42, 0.8);
          --bg-header-light: rgba(30, 41, 59, 0.6);
          --border-header: #334155;
          --text-primary: #f1f5f9;
          --bg-title-icon: #1e40af40;
          --bg-title-icon-light: #3b82f640;
          --bg-close: transparent;
          --bg-close-light: rgba(0, 0, 0, 0.05);
          --bg-close-hover: #99182040;
          --bg-close-hover-light: #dc262640;
          --text-close: #94a3b8;
          --text-close-hover: #f87171;
          --border-close: transparent;
          --border-close-hover: #ef4444;
          --bg-content: #1e293b;
          --bg-content-light: #334155;
          --border-content-accent: #475569;
          --text-loading: #94a3b8;
          --bg-controls: #334155;
          --bg-controls-light: #475569;
          --border-controls: #475569;
          --bg-control-button: #1e293b;
          --bg-control-button-light: #334155;
          --bg-control-button-hover: #475569;
          --bg-control-button-hover-light: #64748b;
          --text-control-button: #94a3b8;
          --text-control-button-hover: #f1f5f9;
          --border-control-button: #475569;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-dark: #4f46e5;
          --primary-darker: #3730a3;
          --scrollbar-track: #334155;
          --scrollbar-thumb: #475569;
          --scrollbar-thumb-light: #64748b;
          --scrollbar-thumb-hover: #64748b;
          --scrollbar-thumb-hover-light: #94a3b8;
          --spinner-track: #334155;
          --shadow-modal: 0 25px 50px rgba(0, 0, 0, 0.6);
          --shadow-title-icon: 0 2px 8px rgba(99, 102, 241, 0.3);
          --shadow-close-hover: 0 4px 12px rgba(248, 113, 113, 0.3);
          --shadow-spinner: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-control-button: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-control-button-hover: 0 4px 8px rgba(0, 0, 0, 0.3);
          --shadow-control-button-active: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
        
        /* Light Mode Default Values */
        :root {
          --bg-overlay: rgba(0, 0, 0, 0.5);
          --bg-overlay-light: rgba(15, 23, 42, 0.7);
          --bg-modal: white;
          --bg-modal-light: #f8fafc;
          --border-modal: #e2e8f0;
          --bg-header: rgba(248, 250, 252, 0.8);
          --bg-header-light: rgba(241, 245, 249, 0.6);
          --border-header: #e2e8f0;
          --text-primary: #1e293b;
          --bg-title-icon: #e0e7ff;
          --bg-title-icon-light: #c7d2fe;
          --bg-close: transparent;
          --bg-close-light: rgba(0, 0, 0, 0.02);
          --bg-close-hover: #fee2e2;
          --bg-close-hover-light: #fecaca;
          --text-close: #64748b;
          --text-close-hover: #ef4444;
          --border-close: transparent;
          --border-close-hover: #fca5a5;
          --bg-content: white;
          --bg-content-light: #f8fafc;
          --border-content-accent: #e2e8f0;
          --text-loading: #64748b;
          --bg-controls: #f8fafc;
          --bg-controls-light: #f1f5f9;
          --border-controls: #e2e8f0;
          --bg-control-button: white;
          --bg-control-button-light: #f8fafc;
          --bg-control-button-hover: #e2e8f0;
          --bg-control-button-hover-light: #d1d5db;
          --text-control-button: #64748b;
          --text-control-button-hover: #374151;
          --border-control-button: #e2e8f0;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-dark: #4f46e5;
          --primary-darker: #3730a3;
          --scrollbar-track: #f1f5f9;
          --scrollbar-thumb: #cbd5e1;
          --scrollbar-thumb-light: #94a3b8;
          --scrollbar-thumb-hover: #94a3b8;
          --scrollbar-thumb-hover-light: #64748b;
          --spinner-track: #e2e8f0;
          --shadow-modal: 0 25px 50px rgba(0, 0, 0, 0.3);
          --shadow-title-icon: 0 2px 8px rgba(99, 102, 241, 0.2);
          --shadow-close-hover: 0 4px 12px rgba(239, 68, 68, 0.2);
          --shadow-spinner: 0 4px 12px rgba(99, 102, 241, 0.2);
          --shadow-control-button: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-control-button-hover: 0 4px 8px rgba(0, 0, 0, 0.1);
          --shadow-control-button-active: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        
        /* Enhanced interactions */
        .chart-modal-close:focus,
        .modal-control-button:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: 2px;
        }
        
        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .chart-modal-overlay,
          .chart-modal,
          .chart-modal-close,
          .modal-control-button,
          .modal-spinner {
            transition: none;
            animation: none;
            transform: none;
          }
          
          @keyframes fadeIn,
          @keyframes scaleIn,
          @keyframes spin {
            0%, 100% { opacity: 1; transform: none; }
          }
        }
        
        /* Print styles */
        @media print {
          .chart-modal-overlay {
            display: none;
          }
        }
        
        /* Responsive improvements */
        @media (max-width: 768px) {
          .chart-modal {
            width: 95%;
            max-height: 95vh;
            margin: 0.5rem;
          }
          
          .chart-modal-header {
            padding: 1rem;
          }
          
          .chart-modal-title {
            font-size: 1.125rem;
          }
          
          .chart-modal-content {
            padding: 1.5rem;
            height: 60vh;
          }
          
          .chart-modal-controls {
            padding: 0.75rem 1rem;
            flex-wrap: wrap;
          }
          
          .modal-control-button {
            flex: 1;
            min-width: 120px;
            justify-content: center;
          }
        }
        
        @media (max-width: 480px) {
          .chart-modal {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
            margin: 0;
          }
          
          .chart-modal-header {
            padding: 0.75rem 1rem;
          }
          
          .chart-modal-title {
            font-size: 1rem;
          }
          
          .chart-modal-title::before {
            font-size: 1rem;
            padding: 0.25rem;
          }
          
          .chart-modal-close {
            width: 2rem;
            height: 2rem;
            padding: 0.5rem;
          }
          
          .chart-modal-close svg {
            width: 1rem;
            height: 1rem;
          }
          
          .chart-modal-content {
            padding: 1rem;
            height: calc(100vh - 140px);
          }
          
          .chart-modal-controls {
            padding: 0.5rem;
            gap: 0.5rem;
          }
          
          .modal-control-button {
            padding: 0.375rem 0.625rem;
            font-size: 0.8125rem;
          }
        }
        
        /* Keyboard navigation */
        .chart-modal-overlay {
          outline: none;
        }
        
        .chart-modal {
          outline: none;
        }
        
        /* Animation for modal exit */
        .chart-modal-overlay.exiting {
          animation: fadeOut 0.2s ease-in forwards;
        }
        
        .chart-modal-overlay.exiting .chart-modal {
          animation: scaleOut 0.2s ease-in forwards;
        }
        
        @keyframes fadeOut {
          from { 
            opacity: 1;
            backdrop-filter: blur(20px);
          }
          to { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
        }
        
        @keyframes scaleOut {
          from { 
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          to { 
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}