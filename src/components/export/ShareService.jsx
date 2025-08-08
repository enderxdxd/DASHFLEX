import React, { useState } from 'react';
import { Mail, MessageCircle, Share2, Download, X } from 'lucide-react';
import dayjs from 'dayjs';

const ShareService = ({ 
  data, 
  type = 'analytics', // 'analytics' ou 'planos'
  unidade = '',
  selectedMonth = '',
  onClose 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [whatsappData, setWhatsappData] = useState({
    phone: '',
    message: ''
  });

  // Formatar dados para texto
  const formatDataToText = () => {
    const header = `📊 RELATÓRIO ${type.toUpperCase()} - ${unidade.toUpperCase()}\n`;
    const date = `📅 Período: ${dayjs(selectedMonth).format('MMMM/YYYY')}\n`;
    const timestamp = `🕒 Gerado em: ${dayjs().format('DD/MM/YYYY HH:mm')}\n`;
    const separator = '─'.repeat(50) + '\n';

    let content = '';

    if (type === 'analytics') {
      content = formatAnalyticsData(data);
    } else if (type === 'planos') {
      content = formatPlanosData(data);
    }

    return header + date + timestamp + separator + content;
  };

  const formatAnalyticsData = (analyticsData) => {
    let text = '';
    
    // Resumo geral
    if (analyticsData.summary) {
      text += '📈 RESUMO GERAL\n';
      text += `• Total de Vendas: R$ ${formatMoney(analyticsData.summary.totalVendas || 0)}\n`;
      text += `• Meta da Unidade: R$ ${formatMoney(analyticsData.summary.metaUnidade || 0)}\n`;
      text += `• Atingimento: ${((analyticsData.summary.totalVendas / analyticsData.summary.metaUnidade) * 100).toFixed(1)}%\n`;
      text += `• Número de Vendas: ${analyticsData.summary.numeroVendas || 0}\n`;
      text += `• Ticket Médio: R$ ${formatMoney(analyticsData.summary.ticketMedio || 0)}\n\n`;
    }

    // Top performers
    if (analyticsData.topPerformers && analyticsData.topPerformers.length > 0) {
      text += '🏆 TOP PERFORMERS\n';
      analyticsData.topPerformers.forEach((performer, index) => {
        text += `${index + 1}. ${performer.name}: R$ ${formatMoney(performer.total)}\n`;
      });
      text += '\n';
    }

    // Breakdown por produto
    if (analyticsData.productBreakdown && analyticsData.productBreakdown.length > 0) {
      text += '📦 VENDAS POR PRODUTO\n';
      analyticsData.productBreakdown.forEach(product => {
        text += `• ${product.name}: R$ ${formatMoney(product.value)} (${product.count} vendas)\n`;
      });
      text += '\n';
    }

    return text;
  };

  const formatPlanosData = (planosData) => {
    let text = '';
    
    // Resumo dos planos
    if (planosData.resumo) {
      text += '📋 RESUMO DOS PLANOS\n';
      text += `• Total de Planos Analisados: ${planosData.resumo.totalPlanos || 0}\n`;
      text += `• Comissão Total: R$ ${formatMoney(planosData.resumo.comissaoTotal || 0)}\n`;
      text += `• Vendas Totais: R$ ${formatMoney(planosData.resumo.vendasTotais || 0)}\n\n`;
    }

    // Detalhes por plano
    if (planosData.planos && planosData.planos.length > 0) {
      text += '📊 DETALHES POR PLANO\n';
      planosData.planos.forEach(plano => {
        text += `\n• ${plano.nome}:\n`;
        text += `  - Vendas: R$ ${formatMoney(plano.vendas || 0)}\n`;
        text += `  - Comissão: R$ ${formatMoney(plano.comissao || 0)}\n`;
        text += `  - Quantidade: ${plano.quantidade || 0} vendas\n`;
      });
      text += '\n';
    }

    // Análise financeira
    if (planosData.analiseFinanceira) {
      text += '💰 ANÁLISE FINANCEIRA\n';
      text += `• Receita Total: R$ ${formatMoney(planosData.analiseFinanceira.receitaTotal || 0)}\n`;
      text += `• Comissões Pagas: R$ ${formatMoney(planosData.analiseFinanceira.comissoesPagas || 0)}\n`;
      text += `• Margem Líquida: ${planosData.analiseFinanceira.margemLiquida || 0}%\n\n`;
    }

    return text;
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const handleEmailSend = () => {
    const formattedData = formatDataToText();
    const subject = `Relatório ${type.toUpperCase()} - ${unidade} - ${dayjs(selectedMonth).format('MM/YYYY')}`;
    const body = encodeURIComponent(formattedData);
    
    const mailtoLink = `mailto:${emailData.to}?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.open(mailtoLink, '_blank');
  };

  const handleWhatsAppSend = () => {
    const formattedData = formatDataToText();
    const message = encodeURIComponent(formattedData);
    
    let whatsappUrl;
    if (whatsappData.phone) {
      // Remover caracteres não numéricos do telefone
      const cleanPhone = whatsappData.phone.replace(/\D/g, '');
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    } else {
      whatsappUrl = `https://wa.me/?text=${message}`;
    }
    
    window.open(whatsappUrl, '_blank');
  };

  const handleDownloadTxt = () => {
    const formattedData = formatDataToText();
    const blob = new Blob([formattedData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${type}-${unidade}-${dayjs(selectedMonth).format('YYYY-MM')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="share-trigger-button"
        title="Compartilhar relatório"
      >
        <Share2 size={20} />
        <span>Compartilhar</span>
      </button>
    );
  }

  return (
    <div className="share-modal-overlay">
      <div className="share-modal-content">
        <div className="share-modal-header">
          <h3>
            <Share2 size={24} />
            Compartilhar Relatório
          </h3>
          <button
            onClick={() => {
              setIsOpen(false);
              onClose && onClose();
            }}
            className="close-button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="share-options">
          {/* Opção Email */}
          <div className="share-option">
            <div className="share-option-header">
              <Mail size={20} />
              <h4>Enviar por Email</h4>
            </div>
            <div className="share-form">
              <input
                type="email"
                placeholder="Digite o email do destinatário"
                value={emailData.to}
                onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                className="share-input"
              />
              <button
                onClick={handleEmailSend}
                disabled={!emailData.to}
                className="share-send-button"
              >
                <Mail size={16} />
                Enviar Email
              </button>
            </div>
          </div>

          {/* Opção WhatsApp */}
          <div className="share-option">
            <div className="share-option-header">
              <MessageCircle size={20} />
              <h4>Enviar por WhatsApp</h4>
            </div>
            <div className="share-form">
              <input
                type="tel"
                placeholder="Número do WhatsApp (opcional)"
                value={whatsappData.phone}
                onChange={(e) => setWhatsappData(prev => ({ ...prev, phone: e.target.value }))}
                className="share-input"
              />
              <button
                onClick={handleWhatsAppSend}
                className="share-send-button whatsapp"
              >
                <MessageCircle size={16} />
                Enviar WhatsApp
              </button>
            </div>
          </div>

          {/* Opção Download */}
          <div className="share-option">
            <div className="share-option-header">
              <Download size={20} />
              <h4>Download do Relatório</h4>
            </div>
            <div className="share-form">
              <button
                onClick={handleDownloadTxt}
                className="share-send-button download"
              >
                <Download size={16} />
                Baixar como TXT
              </button>
            </div>
          </div>
        </div>

        <div className="share-preview">
          <h4>Prévia do Relatório:</h4>
          <div className="preview-content">
            {formatDataToText().split('\n').slice(0, 10).map((line, index) => (
              <div key={index} className="preview-line">{line}</div>
            ))}
            <div className="preview-more">... e mais conteúdo</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .share-trigger-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .share-trigger-button:hover {
          background: #5855eb;
          transform: translateY(-1px);
        }

        .share-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .share-modal-content {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .share-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .share-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          color: #1f2937;
          font-size: 1.25rem;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .share-options {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .share-option {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
        }

        .share-option-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .share-option-header h4 {
          margin: 0;
          color: #374151;
          font-size: 1rem;
        }

        .share-form {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .share-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .share-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .share-send-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .share-send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .share-send-button:not(:disabled):hover {
          transform: translateY(-1px);
        }

        .share-send-button {
          background: #6366f1;
          color: white;
        }

        .share-send-button:not(:disabled):hover {
          background: #5855eb;
        }

        .share-send-button.whatsapp {
          background: #25d366;
          color: white;
        }

        .share-send-button.whatsapp:not(:disabled):hover {
          background: #22c55e;
        }

        .share-send-button.download {
          background: #059669;
          color: white;
        }

        .share-send-button.download:not(:disabled):hover {
          background: #047857;
        }

        .share-preview {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }

        .share-preview h4 {
          margin: 0 0 0.75rem 0;
          color: #374151;
          font-size: 0.875rem;
        }

        .preview-content {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 0.75rem;
          font-family: monospace;
          font-size: 0.75rem;
          max-height: 150px;
          overflow-y: auto;
        }

        .preview-line {
          margin-bottom: 0.25rem;
          color: #374151;
        }

        .preview-more {
          color: #6b7280;
          font-style: italic;
          margin-top: 0.5rem;
        }

        @media (max-width: 640px) {
          .share-modal-content {
            margin: 0.5rem;
            padding: 1rem;
          }

          .share-form {
            flex-direction: column;
            align-items: stretch;
          }

          .share-send-button {
            justify-content: center;
          }
        }

        /* Dark mode */
        .dark .share-modal-content {
          background: #1e293b;
          color: #f1f5f9;
        }

        .dark .share-modal-header {
          border-bottom-color: #334155;
        }

        .dark .share-modal-header h3 {
          color: #f1f5f9;
        }

        .dark .close-button {
          color: #94a3b8;
        }

        .dark .close-button:hover {
          background: #334155;
          color: #f1f5f9;
        }

        .dark .share-option {
          border-color: #334155;
          background: #0f172a;
        }

        .dark .share-option-header h4 {
          color: #f1f5f9;
        }

        .dark .share-input {
          background: #334155;
          border-color: #475569;
          color: #f1f5f9;
        }

        .dark .share-input:focus {
          border-color: #6366f1;
        }

        .dark .share-preview {
          border-top-color: #334155;
        }

        .dark .share-preview h4 {
          color: #f1f5f9;
        }

        .dark .preview-content {
          background: #0f172a;
          border-color: #334155;
        }

        .dark .preview-line {
          color: #e2e8f0;
        }

        .dark .preview-more {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default ShareService;
