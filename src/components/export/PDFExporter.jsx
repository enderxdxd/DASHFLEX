import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { FileText, Download, Image, Table, Settings, X, Check } from 'lucide-react';
import autoTable from 'jspdf-autotable';

dayjs.locale('pt-br');

const PDFExporter = ({ 
  data, 
  unidade, 
  selMonth, 
  activeFilters,
  filteredData,
  metaUnidade,
  totalVendasMes,
  metaAtingidaPercent,
  trend,
  breakdown,
  top5
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeSummary: true,
    includeCharts: true,
    includeTable: true,
    includeFilters: true,
    chartQuality: 'high', // 'standard', 'high', 'ultra'
    tableLimit: 100
  });
  const [showOptions, setShowOptions] = useState(false);

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const showToast = (type, message) => {
    const toast = document.createElement('div');
    toast.className = `export-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        ${type === 'success' ? '✓' : type === 'error' ? '✕' : '⊙'}
      </div>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, type === 'loading' ? 0 : 3000);
    
    return toast;
  };

  const createHeader = (pdf) => {
    // Header principal
    pdf.setFillColor(79, 70, 229); // Indigo-600
    pdf.rect(0, 0, 210, 25, 'F');
    
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.text('RELATÓRIO DE VENDAS', 20, 15);
    
    // Informações da unidade
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${unidade} • ${dayjs(selMonth).format('MMMM [de] YYYY')}`, 20, 20);
    
    // Data de geração
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184); // Slate-400
    pdf.text(`Gerado em ${dayjs().format('DD/MM/YYYY [às] HH:mm')}`, 20, 35);
    
    // Linha separadora
    pdf.setDrawColor(226, 232, 240); // Slate-200
    pdf.setLineWidth(0.5);
    pdf.line(20, 40, 190, 40);
  };

  const createSummary = (pdf) => {
    if (!exportOptions.includeSummary) return 50;

    let yPos = 50;
    
    pdf.setFontSize(16);
    pdf.setTextColor(55, 65, 81); // Gray-700
    pdf.text('Resumo Executivo', 20, yPos);
    yPos += 15;

    // Cards de métricas
    const metrics = [
      { 
        label: 'Total de Vendas', 
        value: formatMoney(totalVendasMes),
        trend: trend >= 0 ? '+ ' : '- ',
        color: trend >= 0 ? [34, 197, 94] : [239, 68, 68] // Green-500 ou Red-500
      },
      { 
        label: 'Meta da Unidade', 
        value: formatMoney(metaUnidade),
        icon: ''
      },
      { 
        label: 'Atingimento', 
        value: formatPercent(metaAtingidaPercent),
        color: metaAtingidaPercent >= 100 ? [34, 197, 94] : metaAtingidaPercent >= 75 ? [251, 191, 36] : [239, 68, 68]
      },
      { 
        label: 'Registros Analisados', 
        value: `${filteredData?.length || 0} vendas`,
        icon: ''
      }
    ];

    // Desenhar cards em grid 2x2
    metrics.forEach((metric, index) => {
      const x = 20 + (index % 2) * 85;
      const y = yPos + Math.floor(index / 2) * 25;
      
      // Card background
      pdf.setFillColor(248, 250, 252); // Slate-50
      pdf.roundedRect(x, y, 80, 20, 3, 3, 'F');
      
      // Valor principal
      pdf.setFontSize(14);
      if (metric.color) {
        pdf.setTextColor(...metric.color);
      } else {
        pdf.setTextColor(55, 65, 81);
      }
      pdf.text(metric.value, x + 5, y + 8);
      
      // Label
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128); // Gray-500
      pdf.text(metric.label, x + 5, y + 15);
      
      // Ícone ou trend
      if (metric.trend) {
        pdf.setFontSize(12);
        pdf.text(metric.trend, x + 65, y + 8);
      }
    });

    return yPos + 60;
  };

  const createFiltersSection = (pdf, startY) => {
    if (!exportOptions.includeFilters || !activeFilters || Object.keys(activeFilters).length === 0) {
      return startY;
    }

    let yPos = startY;
    
    pdf.setFontSize(14);
    pdf.setTextColor(55, 65, 81);
    pdf.text('Filtros Aplicados', 20, yPos);
    yPos += 10;

    const filterLabels = {
      responsavel: 'Responsável',
      produto: 'Produto', 
      valorMin: 'Valor Mínimo',
      valorMax: 'Valor Máximo',
      dataInicio: 'Data Início',
      dataFim: 'Data Fim',
      status: 'Status'
    };

    pdf.setFontSize(9);
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (!value || (key === 'ordenacao' && value === 'data_desc')) return;
      
      const label = filterLabels[key] || key;
      
      // Background do filtro
      pdf.setFillColor(239, 246, 255); // Blue-50
      pdf.roundedRect(20, yPos - 3, 170, 8, 2, 2, 'F');
      
      pdf.setTextColor(37, 99, 235); // Blue-600
      pdf.text(`${label}: `, 22, yPos + 2);
      
      pdf.setTextColor(55, 65, 81);
      pdf.text(String(value), 22 + pdf.getTextWidth(`${label}: `), yPos + 2);
      
      yPos += 10;
    });

    return yPos + 10;
  };

  const captureChart = async (selector, scale = 2) => {
    const element = document.querySelector(selector);
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: exportOptions.chartQuality === 'ultra' ? 3 : exportOptions.chartQuality === 'high' ? 2 : 1,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        removeContainer: true,
        foreignObjectRendering: false
      });
      
      return canvas.toDataURL('image/png', 0.95);
    } catch (error) {
      console.warn('Erro ao capturar gráfico:', selector, error);
      return null;
    }
  };

  const createCharts = async (pdf, startY) => {
    if (!exportOptions.includeCharts) return startY;

    let yPos = startY;

    const charts = [
      { selector: '.trend-chart .chart-body', title: 'Tendência Mensal' },
      { selector: '.pie-chart .chart-body', title: 'Distribuição por Produto' },
      { selector: '.performers-chart .chart-body', title: 'Top Consultores' },
      { selector: '.calendar-chart .chart-body', title: 'Produtividade Diária' }
    ];

    for (const chart of charts) {
      const imageData = await captureChart(chart.selector);
      if (!imageData) continue;

      // Verificar se precisa de nova página
      if (yPos > 200) {
        pdf.addPage();
        createHeader(pdf);
        yPos = 50;
      }

      pdf.setFontSize(12);
      pdf.setTextColor(55, 65, 81);
      pdf.text(chart.title, 20, yPos);
      yPos += 10;

      // Adicionar gráfico
      const imgWidth = 170;
      const imgHeight = 80; // Altura fixa para consistência
      
      pdf.addImage(imageData, 'PNG', 20, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 15;
    }

    return yPos;
  };

  const createTable = (pdf, startY) => {
    if (!exportOptions.includeTable || !filteredData?.length) return startY;

    pdf.addPage();
    createHeader(pdf);
    let yPos = 50;

    pdf.setFontSize(14);
    pdf.setTextColor(55, 65, 81);
    pdf.text(`Detalhamento de Vendas (${Math.min(filteredData.length, exportOptions.tableLimit)} registros)`, 20, yPos);
    yPos += 10;

    // Cabeçalhos e dados
    const headers = [['Data', 'Responsável', 'Produto', 'Valor']];
    const rows = filteredData.slice(0, exportOptions.tableLimit).map(venda => [
      dayjs(venda.dataFormatada).format('DD/MM/YYYY') || '',
      (venda.responsavel || '').substring(0, 20),
      (venda.produto || '').substring(0, 25),
      formatMoney(venda.valor || 0)
    ]);

    autoTable(pdf, {
      startY: yPos,
      head: headers,
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [55, 48, 163], textColor: 255 },
      bodyStyles: { textColor: [71, 85, 105] },
      margin: { left: 20, right: 20 },
      theme: 'striped',
      didDrawPage: (data) => {
        if (data.pageNumber > 1) createHeader(pdf);
      }
    });

    return pdf.lastAutoTable.finalY + 10;
  };

  const createFooter = (pdf) => {
    const pageCount = pdf.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Linha superior
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(20, 285, 190, 285);
      
      // Texto do rodapé
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Página ${i} de ${pageCount}`, 20, 290);
      pdf.text('Gerado automaticamente pelo Sistema de Vendas', 190, 290, { align: 'right' });
    }
  };

  const exportToPDF = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    const loadingToast = showToast('loading', 'Gerando PDF...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true
      });

      // Criar conteúdo
      createHeader(pdf);
      let currentY = createSummary(pdf);
      currentY = createFiltersSection(pdf, currentY + 10);
      await createCharts(pdf, currentY + 10);
      createTable(pdf, currentY);
      createFooter(pdf);

      // Nome do arquivo
      const fileName = `relatorio_${unidade.replace(/\s+/g, '_')}_${dayjs().format('YYYY-MM-DD_HH-mm')}.pdf`;

      // Salvar
      pdf.save(fileName);

      document.body.removeChild(loadingToast);
      showToast('success', 'PDF gerado com sucesso!');

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      document.body.removeChild(loadingToast);
      showToast('error', 'Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const ExportOptionsModal = () => {
    if (!showOptions) return null;

    return (
      <div className="export-options-overlay">
        <div className="export-options-modal">
          <div className="modal-header">
            <h3>⚙️ Opções de Exportação</h3>
            <button onClick={() => setShowOptions(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-content">
            <div className="option-group">
              <h4>Conteúdo</h4>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={exportOptions.includeSummary}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeSummary: e.target.checked }))}
                />
                <span>Incluir resumo executivo</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCharts}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
                />
                <span>Incluir gráficos</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={exportOptions.includeTable}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeTable: e.target.checked }))}
                />
                <span>Incluir tabela detalhada</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={exportOptions.includeFilters}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeFilters: e.target.checked }))}
                />
                <span>Incluir filtros aplicados</span>
              </label>
            </div>

            <div className="option-group">
              <h4>Qualidade dos Gráficos</h4>
              <div className="radio-group">
                {[
                  { value: 'standard', label: 'Padrão (mais rápido)' },
                  { value: 'high', label: 'Alta (recomendado)' },
                  { value: 'ultra', label: 'Ultra (mais lento)' }
                ].map(option => (
                  <label key={option.value} className="radio-item">
                    <input
                      type="radio"
                      value={option.value}
                      checked={exportOptions.chartQuality === option.value}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, chartQuality: e.target.value }))}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="option-group">
              <h4>Limite da Tabela</h4>
              <select
                value={exportOptions.tableLimit}
                onChange={(e) => setExportOptions(prev => ({ ...prev, tableLimit: Number(e.target.value) }))}
                className="select-input"
              >
                <option value={50}>50 registros</option>
                <option value={100}>100 registros</option>
                <option value={200}>200 registros</option>
                <option value={500}>500 registros</option>
                <option value={1000}>1000 registros</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button className="cancel-btn" onClick={() => setShowOptions(false)}>
              Cancelar
            </button>
            <button className="export-btn" onClick={() => { setShowOptions(false); exportToPDF(); }}>
              <FileText size={16} />
              Gerar PDF
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="export-container">
        <button 
          className={`export-button ${isExporting ? 'exporting' : ''}`}
          onClick={exportToPDF}
          disabled={isExporting}
        >
          <FileText className="export-icon" />
          {isExporting ? 'Gerando...' : 'Exportar PDF'}
        </button>
        
        <button 
          className="options-button"
          onClick={() => setShowOptions(true)}
          title="Opções de exportação"
        >
          <Settings size={16} />
        </button>
      </div>

      <ExportOptionsModal />

      <style jsx>{`
        .export-container {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .export-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .export-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
        }

        .export-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .export-button.exporting {
          background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
        }

        .options-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
        }

        .options-button:hover {
          background-color: #f1f5f9;
          color: #475569;
          border-color: #cbd5e1;
        }

        .export-icon {
          width: 1rem;
          height: 1rem;
        }

        .export-options-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .export-options-modal {
          background-color: white;
          border-radius: 1rem;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: scaleIn 0.2s ease;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .modal-header button {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .modal-header button:hover {
          background-color: #f3f4f6;
          color: #374151;
        }

        .modal-content {
          padding: 1.5rem;
          max-height: 60vh;
          overflow-y: auto;
        }

        .option-group {
          margin-bottom: 1.5rem;
        }

        .option-group h4 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .option-item,
        .radio-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: background-color 0.2s;
        }

        .option-item:hover,
        .radio-item:hover {
          background-color: #f9fafb;
        }

        .option-item input,
        .radio-item input {
          margin: 0;
        }

        .option-item span,
        .radio-item span {
          font-size: 0.875rem;
          color: #374151;
        }

        .radio-group {
          display: flex;
          flex-direction: column;
        }

        .select-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background-color: white;
        }

        .select-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }

        .cancel-btn {
          padding: 0.75rem 1.5rem;
          background-color: white;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background-color: #f9fafb;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background-color: #4f46e5;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .export-btn:hover {
          background-color: #4338ca;
        }

        .export-toast {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          z-index: 1001;
          animation: slideIn 0.3s ease;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .export-toast.loading {
          background-color: #f3f4f6;
          color: #374151;
        }

        .export-toast.success {
          background-color: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .export-toast.error {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .export-toast.fade-out {
          animation: fadeOut 0.3s ease forwards;
        }

        .toast-icon {
          width: 1.25rem;
          height: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .export-toast.success .toast-icon {
          background-color: #166534;
          color: white;
        }

        .export-toast.error .toast-icon {
          background-color: #991b1b;
          color: white;
        }

        .export-toast.loading .toast-icon {
          border: 2px solid #374151;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes scaleIn {
          from { 
            transform: scale(0.9);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .export-container {
            flex-direction: column;
            width: 100%;
          }

          .export-button {
            width: 100%;
            justify-content: center;
          }

          .export-options-modal {
            width: 95%;
            margin: 1rem;
          }

          .modal-footer {
            flex-direction: column;
          }

          .export-toast {
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
          }
        }
      `}</style>
    </>
  );
};

export default PDFExporter;