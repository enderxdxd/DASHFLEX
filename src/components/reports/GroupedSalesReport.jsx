import React, { useState, useMemo } from 'react';
import { FileText, Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const CompactGroupedReport = ({ vendas = [], selectedMonth }) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  // Formatação monetária
  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Formatação de data
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dayjs(dateStr, 'YYYY-MM-DD').format('DD/MM/YYYY');
  };

  // Agrupar vendas por responsável, agrupando produtos similares (sem separar por data)
  const groupedData = useMemo(() => {
    const groups = {};
    
    vendas.forEach(venda => {
      const responsavel = (venda.responsavel || 'Sem responsável').trim();
      const produto = (venda.produto || 'Item').trim();
      const valor = Number(venda.valor) || 0;
      
      if (!groups[responsavel]) {
        groups[responsavel] = {
          produtos: {},
          totalGeral: 0
        };
      }
      
      // Agrupar produtos iguais
      if (!groups[responsavel].produtos[produto]) {
        groups[responsavel].produtos[produto] = {
          produto: produto,
          quantidade: 0,
          valorTotal: 0
        };
      }
      
      groups[responsavel].produtos[produto].quantidade += 1;
      groups[responsavel].produtos[produto].valorTotal += valor;
      groups[responsavel].totalGeral += valor;
    });
    
    // Converter para array e ordenar
    return Object.entries(groups).map(([responsavel, data]) => ({
      responsavel,
      itens: Object.values(data.produtos).sort((a, b) => b.valorTotal - a.valorTotal),
      totalGeral: data.totalGeral
    })).sort((a, b) => b.totalGeral - a.totalGeral);
  }, [vendas]);

  // Toggle para expandir/contrair grupo
  const toggleGroup = (responsavel) => {
    setExpandedGroups(prev => ({
      ...prev,
      [responsavel]: !prev[responsavel]
    }));
  };

  // Imprimir relatório
  const printReport = () => {
    const printContent = document.getElementById('compact-report-content');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Vendas por Responsável</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 14px;
              color: #333;
            }
            h1 { 
              text-align: center; 
              margin-bottom: 30px; 
              color: #2d3748;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
            }
            .responsavel-title { 
              font-size: 18px; 
              font-weight: bold; 
              margin: 25px 0 15px 0; 
              color: #2d3748;
              border-bottom: 1px solid #cbd5e0;
              padding-bottom: 5px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 25px;
              background: white;
            }
            th { 
              background: #f7fafc; 
              padding: 12px 8px; 
              text-align: left; 
              border: 1px solid #e2e8f0;
              font-weight: 600;
              color: #4a5568;
            }
            td { 
              padding: 8px; 
              border: 1px solid #e2e8f0;
            }
            .total-row { 
              background: #edf2f7; 
              font-weight: bold;
              color: #2d3748;
            }
            .total-row td {
              background: #edf2f7;
              border-top: 2px solid #cbd5e0;
            }
            .qtd-cell { 
              text-align: center; 
              font-weight: 500;
              color: #4a5568;
            }
            .valor-cell { 
              text-align: right; 
              font-weight: 500;
              color: #065f46;
            }
            @media print {
              .no-print { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  if (!vendas.length) {
    return (
      <div className="compact-report-container">
        <div className="empty-state">
          <FileText size={32} />
          <p>Nenhuma venda encontrada para gerar o relatório</p>
        </div>
      </div>
    );
  }

  return (
    <div className="compact-report-container">
      {/* Controles */}
      <div className="report-header no-print">
        <div className="header-info">
          <h3>Relatório por Responsável</h3>
          <span className="period-info">
            {dayjs(selectedMonth + '-01').format('MMMM [de] YYYY')}
          </span>
        </div>
        <div className="header-actions">
          <button onClick={printReport} className="action-btn">
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Conteúdo do relatório */}
      <div id="compact-report-content" className="report-content">
        <h1>Relatório de Vendas por Responsável</h1>
        
        {groupedData.map((grupo) => (
          <div key={grupo.responsavel} className="responsavel-group">
            <div 
              className="responsavel-header no-print"
              onClick={() => toggleGroup(grupo.responsavel)}
            >
              <h2 className="responsavel-name">{grupo.responsavel}</h2>
              <div className="header-controls">
                <span className="total-info">{formatMoney(grupo.totalGeral)}</span>
                {expandedGroups[grupo.responsavel] ? 
                  <ChevronUp size={20} /> : 
                  <ChevronDown size={20} />
                }
              </div>
            </div>

            {/* Para impressão, sempre mostrar. Para tela, depende do estado */}
            <div className={`responsavel-content ${!expandedGroups[grupo.responsavel] ? 'collapsed' : ''}`}>
              <h2 className="responsavel-title print-only">{grupo.responsavel}</h2>
              
              <table className="vendas-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Qtd</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.itens.map((item, index) => (
                    <tr key={index}>
                      <td>{item.produto}</td>
                      <td className="qtd-cell">{item.quantidade}</td>
                      <td className="valor-cell">{formatMoney(item.valorTotal)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td><strong>TOTAL GERAL</strong></td>
                    <td className="qtd-cell">
                      <strong>{grupo.itens.reduce((sum, item) => sum + item.quantidade, 0)}</strong>
                    </td>
                    <td className="valor-cell">
                      <strong>{formatMoney(grupo.totalGeral)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .compact-report-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .header-info h3 {
          margin: 0 0 4px 0;
          color: #2d3748;
          font-size: 18px;
          font-weight: 600;
        }

        .period-info {
          color: #718096;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .action-btn:hover {
          background: #3182ce;
        }

        .report-content {
          padding: 20px;
        }

        .report-content h1 {
          text-align: center;
          margin-bottom: 30px;
          color: #2d3748;
          font-size: 24px;
          display: none; /* Oculto na tela, visível na impressão */
        }

        .responsavel-group {
          margin-bottom: 25px;
        }

        .responsavel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #edf2f7;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 12px;
        }

        .responsavel-header:hover {
          background: #e2e8f0;
        }

        .responsavel-name {
          margin: 0;
          color: #2d3748;
          font-size: 16px;
          font-weight: 600;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .total-info {
          color: #065f46;
          font-weight: 600;
          font-size: 14px;
        }

        .responsavel-content {
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .responsavel-content.collapsed {
          max-height: 0;
        }

        .responsavel-content:not(.collapsed) {
          max-height: 2000px;
        }

        .responsavel-title {
          font-size: 18px;
          font-weight: bold;
          margin: 25px 0 15px 0;
          color: #2d3748;
          border-bottom: 1px solid #cbd5e0;
          padding-bottom: 5px;
          display: none; /* Oculto na tela, visível na impressão */
        }

        .vendas-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          background: white;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .vendas-table th {
          background: #f7fafc;
          padding: 12px 8px;
          text-align: left;
          border: 1px solid #e2e8f0;
          font-weight: 600;
          color: #4a5568;
          font-size: 14px;
        }

        .vendas-table td {
          padding: 8px;
          border: 1px solid #e2e8f0;
          font-size: 14px;
        }

        .total-row {
          background: #edf2f7;
          font-weight: bold;
          color: #2d3748;
        }

        .total-row td {
          background: #edf2f7;
          border-top: 2px solid #cbd5e0;
        }

        .qtd-cell {
          text-align: center;
          font-weight: 500;
          color: #4a5568;
        }

        .valor-cell {
          text-align: right;
          font-weight: 500;
          color: #065f46;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #718096;
        }

        .empty-state svg {
          margin-bottom: 12px;
        }

        /* Print styles */
        @media print {
          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .compact-report-container {
            box-shadow: none;
            border-radius: 0;
          }

          .report-content {
            padding: 0;
          }

          .report-content h1 {
            display: block !important;
          }

          .responsavel-title {
            display: block !important;
          }

          .responsavel-content {
            max-height: none !important;
          }

          .responsavel-content.collapsed {
            max-height: none !important;
          }

          .responsavel-header {
            display: none;
          }

          .responsavel-group {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .report-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .header-actions {
            justify-content: center;
          }

          .vendas-table {
            font-size: 12px;
          }

          .vendas-table th,
          .vendas-table td {
            padding: 6px 4px;
          }

          .responsavel-header {
            padding: 10px 12px;
          }

          .responsavel-name {
            font-size: 14px;
          }

          .total-info {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default CompactGroupedReport;