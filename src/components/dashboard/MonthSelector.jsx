// Arquivo: src/components/dashboard/MonthSelector.jsx
import { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const MonthSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Mês atual para referência
  const currentMonth = dayjs().format('YYYY-MM');
  
  // Gerar opções de meses (este ano e o anterior)
  const currentYear = dayjs().year();
  const months = [];
  
  // Ano atual
  for (let i = 1; i <= 12; i++) {
    const monthStr = i < 10 ? `0${i}` : `${i}`;
    months.push({
      value: `${currentYear}-${monthStr}`,
      label: dayjs(`${currentYear}-${monthStr}-01`).format('MMMM [de] YYYY')
    });
  }
  
  // Ano anterior
  for (let i = 1; i <= 12; i++) {
    const monthStr = i < 10 ? `0${i}` : `${i}`;
    months.push({
      value: `${currentYear - 1}-${monthStr}`,
      label: dayjs(`${currentYear - 1}-${monthStr}-01`).format('MMMM [de] YYYY')
    });
  }
  
  return (
    <div className="month-selector">
      <button 
        className="month-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {value ? dayjs(`${value}-01`).format('MMMM [de] YYYY') : 'Selecione um mês'}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {isOpen && (
        <div className="month-dropdown">
          <div className="dropdown-header">
            <span>Selecione um mês</span>
            <button className="close-button" onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="months-list">
            <div className="month-section">
              <div className="year-header">Mês atual</div>
              <button 
                className="month-item current"
                onClick={() => {
                  onChange(currentMonth);
                  setIsOpen(false);
                }}
              >
                {dayjs().format('MMMM [de] YYYY')}
                <span className="current-tag">Atual</span>
              </button>
            </div>
            
            <div className="month-section">
              <div className="year-header">{currentYear}</div>
              {months.filter(m => m.value.startsWith(currentYear)).map(month => (
                <button 
                  key={month.value}
                  className={`month-item ${month.value === value ? 'active' : ''}`}
                  onClick={() => {
                    onChange(month.value);
                    setIsOpen(false);
                  }}
                >
                  {month.label}
                </button>
              ))}
            </div>
            
            <div className="month-section">
              <div className="year-header">{currentYear - 1}</div>
              {months.filter(m => m.value.startsWith(currentYear - 1)).map(month => (
                <button 
                  key={month.value}
                  className={`month-item ${month.value === value ? 'active' : ''}`}
                  onClick={() => {
                    onChange(month.value);
                    setIsOpen(false);
                  }}
                >
                  {month.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .month-selector {
          position: relative;
          display: inline-block;
          z-index: 1000;
        }
        
        .month-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: linear-gradient(135deg, var(--bg-button, white) 0%, var(--bg-button-light, #f8fafc) 100%);
          border: 1px solid var(--border-button, #e2e8f0);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          color: var(--text-primary, #1e293b);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-button, 0 2px 4px rgba(0, 0, 0, 0.05));
          position: relative;
          overflow: hidden;
        }
        
        .month-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, var(--primary-alpha, rgba(99, 102, 241, 0.05)) 0%, var(--primary-alpha-light, rgba(99, 102, 241, 0.02)) 100%);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .month-button:hover::before {
          opacity: 1;
        }
        
        .month-button:hover {
          border-color: var(--primary, #6366f1);
          transform: translateY(-1px);
          box-shadow: var(--shadow-button-hover, 0 4px 12px rgba(99, 102, 241, 0.15));
        }
        
        .month-button:active {
          transform: translateY(0);
        }
        
        .month-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 220px;
          background: linear-gradient(135deg, var(--bg-dropdown, white) 0%, var(--bg-dropdown-light, #f8fafc) 100%);
          border-radius: 12px;
          box-shadow: var(--shadow-dropdown, 0 20px 40px rgba(0, 0, 0, 0.15));
          border: 1px solid var(--border-dropdown, #e2e8f0);
          z-index: 9999;
          overflow: hidden;
          backdrop-filter: blur(20px);
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-divider, #f1f5f9);
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary, #1e293b);
          background: linear-gradient(135deg, var(--bg-header, #f8fafc) 0%, var(--bg-header-light, #f1f5f9) 100%);
        }
        
        .close-button {
          background: none;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          color: var(--text-secondary, #64748b);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        .close-button:hover {
          background: linear-gradient(135deg, var(--bg-close-hover, #fee2e2) 0%, var(--bg-close-hover-light, #fecaca) 100%);
          color: var(--danger, #ef4444);
          transform: scale(1.1);
        }
        
        .months-list {
          max-height: 320px;
          overflow-y: auto;
          padding: 8px 0;
        }
        
        /* Scrollbar customization */
        .months-list::-webkit-scrollbar {
          width: 6px;
        }
        
        .months-list::-webkit-scrollbar-track {
          background: var(--scrollbar-track, #f1f5f9);
          border-radius: 3px;
        }
        
        .months-list::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb, #cbd5e1);
          border-radius: 3px;
        }
        
        .months-list::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover, #94a3b8);
        }
        
        .month-section {
          padding: 4px 0;
        }
        
        .year-header {
          padding: 8px 16px 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-year, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, var(--text-year, #64748b) 0%, var(--primary-light, #818cf8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: sticky;
          top: 0;
          background-color: var(--bg-year-sticky, rgba(248, 250, 252, 0.9));
          backdrop-filter: blur(10px);
          z-index: 1;
        }
        
        .month-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          text-align: left;
          padding: 10px 16px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          color: var(--text-primary, #1e293b);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .month-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--primary, #6366f1);
          transform: scaleY(0);
          transition: transform 0.2s ease;
        }
        
        .month-item:hover::before {
          transform: scaleY(1);
        }
        
        .month-item:hover {
          background: linear-gradient(135deg, var(--bg-month-hover, #f8fafc) 0%, var(--bg-month-hover-light, #f1f5f9) 100%);
          transform: translateX(4px);
          box-shadow: var(--shadow-month-hover, 0 2px 8px rgba(0, 0, 0, 0.05));
        }
        
        .month-item.active {
          background: linear-gradient(135deg, var(--bg-month-active, #eef2ff) 0%, var(--bg-month-active-light, #e0e7ff) 100%);
          color: var(--primary-dark, #4f46e5);
          font-weight: 600;
          border-left: 3px solid var(--primary, #6366f1);
          transform: translateX(0);
          box-shadow: var(--shadow-month-active, 0 4px 12px rgba(99, 102, 241, 0.2));
        }
        
        .month-item.active::before {
          transform: scaleY(1);
          width: 3px;
        }
        
        .month-item.current {
          background: linear-gradient(135deg, var(--bg-month-current, #f8fafc) 0%, var(--bg-month-current-light, #f1f5f9) 100%);
          font-weight: 600;
          border: 1px solid var(--border-current, #e2e8f0);
          border-radius: 6px;
          margin: 2px 8px;
          box-shadow: var(--shadow-month-current, 0 2px 4px rgba(0, 0, 0, 0.05));
        }
        
        .current-tag {
          font-size: 10px;
          font-weight: 600;
          background: linear-gradient(135deg, var(--primary, #4f46e5) 0%, var(--primary-dark, #4338ca) 100%);
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          box-shadow: var(--shadow-tag, 0 2px 4px rgba(79, 70, 229, 0.3));
          animation: pulse 2s ease-in-out infinite alternate;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.05); opacity: 1; }
        }
        
        /* Manual Dark Mode Classes */
        .dark .month-selector,
        [data-theme="dark"] .month-selector {
          --bg-button: #334155;
          --bg-button-light: #475569;
          --border-button: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-year: #cbd5e1;
          --bg-dropdown: #1e293b;
          --bg-dropdown-light: #334155;
          --border-dropdown: #475569;
          --border-divider: #334155;
          --bg-header: #0f172a;
          --bg-header-light: #1e293b;
          --bg-year-sticky: rgba(15, 23, 42, 0.9);
          --bg-close-hover: #99182040;
          --bg-close-hover-light: #dc262640;
          --bg-month-hover: #334155;
          --bg-month-hover-light: #475569;
          --bg-month-active: #1e40af40;
          --bg-month-active-light: #3b82f640;
          --bg-month-current: #334155;
          --bg-month-current-light: #475569;
          --border-current: #475569;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-dark: #4f46e5;
          --primary-alpha: rgba(99, 102, 241, 0.1);
          --primary-alpha-light: rgba(99, 102, 241, 0.05);
          --danger: #f87171;
          --scrollbar-track: #334155;
          --scrollbar-thumb: #475569;
          --scrollbar-thumb-hover: #64748b;
          --shadow-button: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-button-hover: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-dropdown: 0 20px 40px rgba(0, 0, 0, 0.6);
          --shadow-month-hover: 0 2px 8px rgba(0, 0, 0, 0.2);
          --shadow-month-active: 0 4px 12px rgba(99, 102, 241, 0.3);
          --shadow-month-current: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-tag: 0 2px 4px rgba(99, 102, 241, 0.4);
        }
        
        /* Light Mode Default Values */
        :root {
          --bg-button: white;
          --bg-button-light: #f8fafc;
          --border-button: #e2e8f0;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-year: #64748b;
          --bg-dropdown: white;
          --bg-dropdown-light: #f8fafc;
          --border-dropdown: #e2e8f0;
          --border-divider: #f1f5f9;
          --bg-header: #f8fafc;
          --bg-header-light: #f1f5f9;
          --bg-year-sticky: rgba(248, 250, 252, 0.9);
          --bg-close-hover: #fee2e2;
          --bg-close-hover-light: #fecaca;
          --bg-month-hover: #f8fafc;
          --bg-month-hover-light: #f1f5f9;
          --bg-month-active: #eef2ff;
          --bg-month-active-light: #e0e7ff;
          --bg-month-current: #f8fafc;
          --bg-month-current-light: #f1f5f9;
          --border-current: #e2e8f0;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --primary-dark: #4f46e5;
          --primary-alpha: rgba(99, 102, 241, 0.05);
          --primary-alpha-light: rgba(99, 102, 241, 0.02);
          --danger: #ef4444;
          --scrollbar-track: #f1f5f9;
          --scrollbar-thumb: #cbd5e1;
          --scrollbar-thumb-hover: #94a3b8;
          --shadow-button: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-button-hover: 0 4px 12px rgba(99, 102, 241, 0.15);
          --shadow-dropdown: 0 20px 40px rgba(0, 0, 0, 0.15);
          --shadow-month-hover: 0 2px 8px rgba(0, 0, 0, 0.05);
          --shadow-month-active: 0 4px 12px rgba(99, 102, 241, 0.2);
          --shadow-month-current: 0 2px 4px rgba(0, 0, 0, 0.05);
          --shadow-tag: 0 2px 4px rgba(79, 70, 229, 0.3);
        }
        
        /* Enhanced interactions */
        .month-button:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: 2px;
        }
        
        .month-item:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: -2px;
        }
        
        .close-button:focus {
          outline: 2px solid var(--primary, #6366f1);
          outline-offset: 2px;
        }
        
        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .month-button,
          .month-dropdown,
          .close-button,
          .month-item,
          .current-tag {
            transition: none;
            animation: none;
            transform: none;
          }
          
          @keyframes slideDown,
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: none; }
          }
        }
        
        /* Print styles */
        @media print {
          .month-dropdown {
            display: none;
          }
          
          .month-button {
            background: white;
            border: 1px solid #ccc;
            box-shadow: none;
          }
        }
        
        /* Responsive improvements */
        @media (max-width: 768px) {
          .month-dropdown {
            width: 240px;
            right: -10px;
          }
          
          .dropdown-header {
            padding: 12px 14px;
          }
          
          .month-item {
            padding: 12px 14px;
          }
          
          .year-header {
            padding: 8px 14px 6px;
          }
        }
        
        @media (max-width: 576px) {
          .month-dropdown {
            width: 200px;
          }
          
          .month-button {
            padding: 8px 12px;
            font-size: 13px;
          }
          
          .dropdown-header {
            padding: 10px 12px;
            font-size: 13px;
          }
          
          .month-item {
            padding: 10px 12px;
            font-size: 13px;
          }
          
          .year-header {
            padding: 6px 12px 4px;
            font-size: 11px;
          }
          
          .current-tag {
            font-size: 9px;
            padding: 2px 6px;
          }
        }
        
        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .month-item {
            padding: 14px 16px;
          }
          
          .close-button {
            width: 32px;
            height: 32px;
          }
          
          .month-button {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default MonthSelector;