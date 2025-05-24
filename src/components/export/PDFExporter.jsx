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
/* Light Mode Default Values */
:root {
  --export-primary: #4f46e5;
  --export-primary-dark: #4338ca;
  --export-primary-light: rgba(79, 70, 229, 0.1);
  --export-primary-shadow: rgba(79, 70, 229, 0.3);
  --export-primary-shadow-hover: rgba(79, 70, 229, 0.4);
  --export-secondary: #7c3aed;
  --export-secondary-dark: #6d28d9;
  --export-gradient-primary: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --export-gradient-primary-hover: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
  --export-gradient-disabled: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
  --export-bg: #ffffff;
  --export-bg-secondary: #f8fafc;
  --export-bg-hover: #f1f5f9;
  --export-bg-modal: #ffffff;
  --export-bg-modal-header: #ffffff;
  --export-bg-modal-footer: #f9fafb;
  --export-bg-overlay: rgba(0, 0, 0, 0.6);
  --export-bg-option-hover: #f9fafb;
  --export-text-primary: #1f2937;
  --export-text-secondary: #374151;
  --export-text-muted: #64748b;
  --export-text-light: #6b7280;
  --export-text-white: #ffffff;
  --export-border: #e2e8f0;
  --export-border-light: #e5e7eb;
  --export-border-hover: #cbd5e1;
  --export-border-focus: #4f46e5;
  --export-border-modal: #e5e7eb;
  --export-input-bg: #ffffff;
  --export-input-border: #d1d5db;
  --export-input-focus-border: #4f46e5;
  --export-input-focus-shadow: rgba(79, 70, 229, 0.1);
  --export-toast-loading-bg: #f3f4f6;
  --export-toast-loading-text: #374151;
  --export-toast-loading-icon: #374151;
  --export-toast-success-bg: #dcfce7;
  --export-toast-success-text: #166534;
  --export-toast-success-border: #bbf7d0;
  --export-toast-success-icon-bg: #166534;
  --export-toast-error-bg: #fee2e2;
  --export-toast-error-text: #991b1b;
  --export-toast-error-border: #fecaca;
  --export-toast-error-icon-bg: #991b1b;
  --export-shadow-sm: 0 4px 12px rgba(79, 70, 229, 0.3);
  --export-shadow-md: 0 6px 16px rgba(79, 70, 229, 0.4);
  --export-shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --export-shadow-toast: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --export-radius-sm: 0.5rem;
  --export-radius-md: 0.75rem;
  --export-radius-lg: 1rem;
}

/* Manual Dark Mode Classes */
.dark,
[data-theme="dark"] {
  --export-primary: #6366f1;
  --export-primary-dark: #4f46e5;
  --export-primary-light: rgba(99, 102, 241, 0.15);
  --export-primary-shadow: rgba(99, 102, 241, 0.4);
  --export-primary-shadow-hover: rgba(99, 102, 241, 0.5);
  --export-secondary: #8b5cf6;
  --export-secondary-dark: #7c3aed;
  --export-gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  --export-gradient-primary-hover: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  --export-gradient-disabled: linear-gradient(135deg, #4b5563 0%, #6b7280 100%);
  --export-bg: #1e293b;
  --export-bg-secondary: #334155;
  --export-bg-hover: #475569;
  --export-bg-modal: #1e293b;
  --export-bg-modal-header: #1e293b;
  --export-bg-modal-footer: #334155;
  --export-bg-overlay: rgba(0, 0, 0, 0.8);
  --export-bg-option-hover: rgba(255, 255, 255, 0.05);
  --export-text-primary: #f1f5f9;
  --export-text-secondary: #e2e8f0;
  --export-text-muted: #94a3b8;
  --export-text-light: #64748b;
  --export-text-white: #0f172a;
  --export-border: #475569;
  --export-border-light: #64748b;
  --export-border-hover: #6b7280;
  --export-border-focus: #6366f1;
  --export-border-modal: #475569;
  --export-input-bg: #334155;
  --export-input-border: #475569;
  --export-input-focus-border: #6366f1;
  --export-input-focus-shadow: rgba(99, 102, 241, 0.2);
  --export-toast-loading-bg: #374151;
  --export-toast-loading-text: #f1f5f9;
  --export-toast-loading-icon: #f1f5f9;
  --export-toast-success-bg: rgba(34, 197, 94, 0.1);
  --export-toast-success-text: #4ade80;
  --export-toast-success-border: rgba(34, 197, 94, 0.3);
  --export-toast-success-icon-bg: #22c55e;
  --export-toast-error-bg: rgba(239, 68, 68, 0.1);
  --export-toast-error-text: #f87171;
  --export-toast-error-border: rgba(239, 68, 68, 0.3);
  --export-toast-error-icon-bg: #ef4444;
  --export-shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.4);
  --export-shadow-md: 0 6px 16px rgba(0, 0, 0, 0.5);
  --export-shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  --export-shadow-toast: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
}

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
  background: var(--export-gradient-primary);
  color: var(--export-text-white);
  border: none;
  border-radius: var(--export-radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--export-shadow-sm);
}

.export-button:hover:not(:disabled) {
  background: var(--export-gradient-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--export-shadow-md);
}

.export-button:active:not(:disabled) {
  transform: translateY(0);
}

.export-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.export-button.exporting {
  background: var(--export-gradient-disabled);
}

.export-button:focus {
  outline: 2px solid var(--export-primary);
  outline-offset: 2px;
}

.options-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  background-color: var(--export-bg-secondary);
  border: 1px solid var(--export-border);
  border-radius: var(--export-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--export-text-muted);
}

.options-button:hover {
  background-color: var(--export-bg-hover);
  color: var(--export-text-secondary);
  border-color: var(--export-border-hover);
  transform: translateY(-1px);
}

.options-button:active {
  transform: translateY(0);
}

.options-button:focus {
  outline: 2px solid var(--export-primary);
  outline-offset: 2px;
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
  background-color: var(--export-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(4px);
}

.export-options-modal {
  background-color: var(--export-bg-modal);
  border-radius: var(--export-radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: var(--export-shadow-lg);
  animation: scaleIn 0.2s ease;
  border: 1px solid var(--export-border-modal);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--export-border-light);
  background-color: var(--export-bg-modal-header);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--export-text-primary);
}

.modal-header button {
  background: none;
  border: none;
  color: var(--export-text-light);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--export-radius-sm);
  transition: all 0.2s;
}

.modal-header button:hover {
  background-color: var(--export-bg-option-hover);
  color: var(--export-text-secondary);
  transform: scale(1.1);
}

.modal-header button:focus {
  outline: 2px solid var(--export-primary);
  outline-offset: 2px;
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
  color: var(--export-text-secondary);
}

.option-item,
.radio-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--export-radius-sm);
  transition: all 0.2s ease;
}

.option-item:hover,
.radio-item:hover {
  background-color: var(--export-bg-option-hover);
  transform: translateX(4px);
}

.option-item input,
.radio-item input {
  margin: 0;
  accent-color: var(--export-primary);
}

.option-item span,
.radio-item span {
  font-size: 0.875rem;
  color: var(--export-text-secondary);
  transition: color 0.2s ease;
}

.radio-group {
  display: flex;
  flex-direction: column;
}

.select-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--export-input-border);
  border-radius: var(--export-radius-sm);
  font-size: 0.875rem;
  background-color: var(--export-input-bg);
  color: var(--export-text-primary);
  transition: all 0.2s ease;
}

.select-input:focus {
  outline: none;
  border-color: var(--export-input-focus-border);
  box-shadow: 0 0 0 3px var(--export-input-focus-shadow);
  transform: translateY(-1px);
}

.select-input:hover {
  border-color: var(--export-border-hover);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--export-border-light);
  background-color: var(--export-bg-modal-footer);
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background-color: var(--export-bg);
  color: var(--export-text-secondary);
  border: 1px solid var(--export-border);
  border-radius: var(--export-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background-color: var(--export-bg-option-hover);
  border-color: var(--export-border-hover);
  transform: translateY(-1px);
}

.cancel-btn:active {
  transform: translateY(0);
}

.cancel-btn:focus {
  outline: 2px solid var(--export-primary);
  outline-offset: 2px;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--export-primary);
  color: var(--export-text-white);
  border: none;
  border-radius: var(--export-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.export-btn:hover {
  background-color: var(--export-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--export-shadow-sm);
}

.export-btn:active {
  transform: translateY(0);
}

.export-btn:focus {
  outline: 2px solid var(--export-primary);
  outline-offset: 2px;
}

.export-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: var(--export-radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 1001;
  animation: slideIn 0.3s ease;
  box-shadow: var(--export-shadow-toast);
  backdrop-filter: blur(8px);
}

.export-toast.loading {
  background-color: var(--export-toast-loading-bg);
  color: var(--export-toast-loading-text);
  border: 1px solid var(--export-border);
}

.export-toast.success {
  background-color: var(--export-toast-success-bg);
  color: var(--export-toast-success-text);
  border: 1px solid var(--export-toast-success-border);
}

.export-toast.error {
  background-color: var(--export-toast-error-bg);
  color: var(--export-toast-error-text);
  border: 1px solid var(--export-toast-error-border);
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
  flex-shrink: 0;
}

.export-toast.success .toast-icon {
  background-color: var(--export-toast-success-icon-bg);
  color: var(--export-text-white);
}

.export-toast.error .toast-icon {
  background-color: var(--export-toast-error-icon-bg);
  color: var(--export-text-white);
}

.export-toast.loading .toast-icon {
  border: 2px solid var(--export-toast-loading-icon);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Animations */
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

/* Scrollbar customization for dark mode */
.dark .modal-content::-webkit-scrollbar,
[data-theme="dark"] .modal-content::-webkit-scrollbar {
  width: 6px;
}

.dark .modal-content::-webkit-scrollbar-track,
[data-theme="dark"] .modal-content::-webkit-scrollbar-track {
  background: var(--export-bg-secondary);
  border-radius: 3px;
}

.dark .modal-content::-webkit-scrollbar-thumb,
[data-theme="dark"] .modal-content::-webkit-scrollbar-thumb {
  background: var(--export-border);
  border-radius: 3px;
}

.dark .modal-content::-webkit-scrollbar-thumb:hover,
[data-theme="dark"] .modal-content::-webkit-scrollbar-thumb:hover {
  background: var(--export-border-hover);
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
  
  .export-options-overlay,
  .export-options-modal,
  .export-toast {
    animation: none;
  }
  
  .export-button:hover:not(:disabled),
  .options-button:hover,
  .export-btn:hover,
  .cancel-btn:hover {
    transform: none;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .export-button,
  .export-btn {
    border: 2px solid currentColor;
  }
  
  .options-button,
  .cancel-btn {
    border: 2px solid var(--export-border);
  }
  
  .export-options-modal {
    border: 2px solid var(--export-border);
  }
}

/* Print styles */
@media print {
  .export-container,
  .export-options-overlay,
  .export-toast {
    display: none;
  }
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .export-container {
    flex-direction: column;
    width: 100%;
  }

  .export-button,
  .options-button {
    width: 100%;
    justify-content: center;
  }

  .export-options-modal {
    width: 95%;
    margin: 1rem;
    max-height: 85vh;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-content {
    padding: 1rem;
    max-height: 50vh;
  }

  .modal-footer {
    flex-direction: column;
    padding: 1rem;
  }

  .cancel-btn,
  .export-btn {
    width: 100%;
    justify-content: center;
  }

  .export-toast {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
    padding: 0.75rem 1rem;
  }

  .option-item,
  .radio-item {
    padding: 0.75rem 0.5rem;
  }

  .option-item:hover,
  .radio-item:hover {
    transform: none;
  }
}

@media (max-width: 480px) {
  .modal-header h3 {
    font-size: 1.125rem;
  }

  .option-group h4 {
    font-size: 0.9375rem;
  }

  .export-button,
  .export-btn,
  .cancel-btn {
    padding: 0.875rem 1rem;
    font-size: 0.8125rem;
  }

  .options-button {
    padding: 0.875rem;
  }

  .export-toast {
    font-size: 0.8125rem;
    padding: 0.75rem;
  }

  .toast-icon {
    width: 1rem;
    height: 1rem;
  }
}

/* Focus trap for modal accessibility */
.export-options-modal {
  isolation: isolate;
}

.export-options-overlay:focus {
  outline: none;
}

/* Loading state improvements */
.export-button.exporting,
.export-btn:disabled {
  position: relative;
  overflow: hidden;
}

.export-button.exporting::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* Tooltip styles for export options */
.option-item[title],
.radio-item[title] {
  position: relative;
}

.option-item[title]:hover::after,
.radio-item[title]:hover::after {
  content: attr(title);
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  background: var(--export-text-primary);
  color: var(--export-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 1002;
  margin-left: 0.5rem;
  box-shadow: var(--export-shadow-sm);
}
`}</style>
    </>
  );
};

export default PDFExporter;