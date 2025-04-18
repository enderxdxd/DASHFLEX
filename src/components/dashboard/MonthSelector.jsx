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
        }
        
        .month-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }
        
        .month-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          width: 200px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 10;
          overflow: hidden;
        }
        
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-weight: 500;
          font-size: 14px;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          color: #64748b;
        }
        
        .months-list {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .month-section {
          padding: 8px 0;
        }
        
        .year-header {
          padding: 4px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }
        
        .month-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          text-align: left;
          padding: 8px 16px;
          background: none;
          border: none;
          font-size: 14px;
          cursor: pointer;
        }
        
        .month-item:hover {
          background-color: #f8fafc;
        }
        
        .month-item.active {
          background-color: #eef2ff;
          color: #4f46e5;
          font-weight: 500;
        }
        
        .month-item.current {
          background-color: #f8fafc;
          font-weight: 500;
        }
        
        .current-tag {
          font-size: 11px;
          background-color: #4f46e5;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default MonthSelector;