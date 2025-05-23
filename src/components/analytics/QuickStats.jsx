import React from 'react';
import { DollarSign, BarChart3, TrendingUp } from 'lucide-react';

const formatMoney = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

export default function QuickStats({ filteredData }) {
  const total = filteredData?.reduce((sum, v) => sum + (Number(v.valor) || 0), 0) || 0;
  const count = filteredData?.length || 0;
  const avg = count ? total / count : 0;

  return (
    <div className="quick-stats">
      <div className="stat-card total">
        <div className="stat-icon"><DollarSign size={20} /></div>
        <div className="stat-content">
          <span className="stat-label">Valor Total</span>
          <span className="stat-value">{formatMoney(total)}</span>
        </div>
      </div>
      <div className="stat-card count">
        <div className="stat-icon"><BarChart3 size={20} /></div>
        <div className="stat-content">
          <span className="stat-label">Total de Vendas</span>
          <span className="stat-value">{count}</span>
        </div>
      </div>
      <div className="stat-card average">
        <div className="stat-icon"><TrendingUp size={20} /></div>
        <div className="stat-content">
          <span className="stat-label">Ticket Médio</span>
          <span className="stat-value">{formatMoney(avg)}</span>
        </div>
      </div>
      <style jsx>{`
        .quick-stats {
          display: flex;
          gap: 1.5rem;
          margin: 1.5rem 0 2rem 0;
        }
        .stat-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.25rem 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 180px;
        }
        .stat-icon {
          background: #eef2ff;
          color: #4f46e5;
          border-radius: 8px;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 13px;
          color: #64748b;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }
      `}</style>
    </div>
  );
} 