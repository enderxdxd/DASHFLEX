// src/components/personal/PersonalFileUploader.jsx
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PersonalFileUploader({ onDataProcessed, onError, unidade }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Estrutura esperada da planilha
  const expectedColumns = [
    'Personal',
    'Aluno', 
    'Produto',
    'Valor',
    'Desconto',
    'Valor Final',
    'Situação'
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    // Validação do tipo de arquivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '.xlsx',
      '.xls'
    ];

    const isValidType = allowedTypes.some(type => 
      selectedFile.type === type || selectedFile.name.toLowerCase().endsWith(type)
    );

    if (!isValidType) {
      onError('Formato de arquivo não suportado. Use apenas arquivos .xlsx ou .xls');
      return;
    }

    setFile(selectedFile);
    setUploading(true);

    try {
      const data = await readExcelFile(selectedFile);
      setPreviewData(data);
    } catch (error) {
      onError('Erro ao ler o arquivo: ' + error.message);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            reject(new Error('A planilha está vazia'));
            return;
          }

          // Validação simplificada - verifica se tem pelo menos 7 colunas
          const columns = Object.keys(jsonData[0]);
          
          if (columns.length < 7) {
            reject(new Error(`Planilha deve ter pelo menos 7 colunas. Encontradas: ${columns.length}`));
            return;
          }

          // Log das colunas para debug
          console.log('Colunas encontradas na planilha:', columns);
          console.log('Primeira linha de dados:', jsonData[0]);

          // Processamento dos dados - usa as colunas na ordem que aparecem
          const processedData = jsonData.map((row, index) => {
            const columnValues = Object.values(row);
            
            // Garante que temos pelo menos 7 valores
            while (columnValues.length < 7) {
              columnValues.push('');
            }
            
            const processedRow = {
              id: Date.now() + index,
              personal: cleanString(columnValues[0] || ''),
              aluno: cleanString(columnValues[1] || ''),
              produto: cleanString(columnValues[2] || ''),
              valor: parseFloat(columnValues[3]) || 0,
              desconto: parseFloat(columnValues[4]) || 0,
              valorFinal: parseFloat(columnValues[5]) || 0,
              situacao: cleanString(columnValues[6] || 'Ativo'),
              dataImportacao: new Date().toISOString(),
              unidade: unidade
            };

            // Calcula valor final se não informado
            if (!processedRow.valorFinal && processedRow.valor) {
              processedRow.valorFinal = processedRow.valor - processedRow.desconto;
            }

            return processedRow;
          });

          // Filtra registros válidos
          const validData = processedData.filter(row => 
            row.personal && row.aluno && row.produto
          );

          if (validData.length === 0) {
            reject(new Error('Nenhum registro válido encontrado na planilha'));
            return;
          }

          resolve(validData);
        } catch (error) {
          reject(new Error('Erro ao processar a planilha: ' + error.message));
        }
      };

      reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const cleanString = (str) => {
    return typeof str === 'string' ? str.trim() : String(str || '').trim();
  };

  const confirmUpload = async () => {
    if (!previewData) return;

    setUploading(true);
    
    try {
      // Integração com Firebase Functions
      const functionsUrl = process.env.REACT_APP_FUNCTIONS_URL || 
                          'https://southamerica-east1-chatpos-aff1a.cloudfunctions.net/uploadPersonal';
      
      console.log('🔍 DEBUG - Variáveis de ambiente:');
      console.log('REACT_APP_FUNCTIONS_URL:', process.env.REACT_APP_FUNCTIONS_URL);
      console.log('URL final utilizada:', functionsUrl);
      console.log('Todas as variáveis REACT_APP:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));
      
      console.log('🔗 Enviando dados para:', functionsUrl);

      // Cria FormData para enviar arquivo + dados
      const formData = new FormData();
      formData.append('file', file);
      formData.append('unidade', unidade);

      console.log('📦 Enviando arquivo:', file.name);
      console.log('📦 Unidade:', unidade);

      const response = await fetch(functionsUrl, {
        method: 'POST',
        body: formData // Remove Content-Type header - deixa o browser definir automaticamente
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      // Pega o texto da resposta primeiro para debug
      const responseText = await response.text();
      console.log('📡 Response text (primeiros 500 chars):', responseText.substring(0, 500));

      if (!response.ok) {
        console.error('❌ Erro na resposta:', responseText);
        throw new Error(`Erro HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }

      // Tenta fazer parse do JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse do JSON:', parseError);
        console.error('❌ Resposta recebida:', responseText);
        throw new Error(`Resposta inválida do servidor. Esperado JSON, recebido: ${responseText.substring(0, 100)}`);
      }
      
      // Calcula estatísticas dos dados processados
      const statistics = {
        totalRegistros: previewData.length,
        personalsUnicos: [...new Set(previewData.map(item => item.personal))].length,
        alunosUnicos: [...new Set(previewData.map(item => item.aluno))].length,
        valorTotalFaturamento: previewData.reduce((sum, item) => sum + (item.valorFinal || 0), 0),
        registrosPagos: previewData.filter(item => item.situacao === 'Pago').length,
        registrosLivres: previewData.filter(item => item.situacao === 'Livre').length
      };

      onDataProcessed({
        processedData: previewData,
        statistics,
        firebaseResult: result
      });
      
      resetState();
    } catch (error) {
      console.error('Erro no upload:', error);
      onError('Erro ao enviar dados: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreviewData(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Personal': 'João Silva',
        'Aluno': 'Maria Santos',
        'Produto': 'Plano Semestral',
        'Valor': 2500,
        'Desconto': 250,
        'Valor Final': 2250,
        'Situação': 'Pago'
      },
      {
        'Personal': 'Ana Paula',
        'Aluno': 'Carlos Lima',
        'Produto': 'Plano Mensal',
        'Valor': 500,
        'Desconto': 0,
        'Valor Final': 500,
        'Situação': 'Livre'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `template_personal_${unidade}.xlsx`);
  };

  return (
    <div className="file-uploader">
      {/* Template Download */}
      <div className="template-section">
        <div className="template-info">
          <h4>📋 Modelo da Planilha</h4>
          <p>Baixe o modelo para garantir a formatação correta dos dados</p>
        </div>
        <button 
          className="btn btn-outline"
          onClick={downloadTemplate}
        >
          <Download size={18} />
          Baixar Modelo
        </button>
      </div>

      {/* Upload Area */}
      <div 
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-loading">
            <RefreshCw size={32} className="spinning" />
            <p>Processando arquivo...</p>
          </div>
        ) : file ? (
          <div className="file-info">
            <FileSpreadsheet size={32} />
            <div className="file-details">
              <h4>{file.name}</h4>
              <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              className="remove-file-btn"
              onClick={(e) => {
                e.stopPropagation();
                resetState();
              }}
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <Upload size={48} />
            <h3>Clique ou arraste o arquivo aqui</h3>
            <p>Formatos suportados: .xlsx, .xls</p>
            <p className="upload-hint">Máximo 10MB</p>
          </div>
        )}
      </div>

      {/* Expected Columns Info */}
      <div className="columns-info">
        <h4>📄 Colunas Obrigatórias</h4>
        <div className="columns-grid">
          {expectedColumns.map(column => (
            <div key={column} className="column-item">
              <CheckCircle size={16} />
              <span>{column}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Data */}
      {previewData && (
        <div className="preview-section">
          <div className="preview-header">
            <h4>
              <Eye size={18} />
              Prévia dos Dados ({previewData.length} registros)
            </h4>
            <div className="preview-actions">
              <button 
                className="btn btn-outline"
                onClick={resetState}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-success"
                onClick={confirmUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={18} className="spinning" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Confirmar Upload
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="preview-table">
            <div className="table-header">
              <div className="table-cell">Personal</div>
              <div className="table-cell">Aluno</div>
              <div className="table-cell">Produto</div>
              <div className="table-cell">Valor</div>
              <div className="table-cell">Situação</div>
            </div>
            
            {previewData.slice(0, 5).map((row, index) => (
              <div key={index} className="table-row">
                <div className="table-cell">{row.personal}</div>
                <div className="table-cell">{row.aluno}</div>
                <div className="table-cell">{row.produto}</div>
                <div className="table-cell">R$ {row.valorFinal?.toLocaleString('pt-BR')}</div>
                <div className="table-cell">
                  <span className={`status-badge ${row.situacao.toLowerCase()}`}>
                    {row.situacao}
                  </span>
                </div>
              </div>
            ))}
            
            {previewData.length > 5 && (
              <div className="table-more">
                ... e mais {previewData.length - 5} registros
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .file-uploader {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
        }

        .template-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 12px;
        }

        .template-info h4 {
          margin: 0 0 4px;
          color: #1e40af;
          font-size: 16px;
        }

        .template-info p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          font-size: 14px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-outline {
          background: transparent;
          border: 2px solid #e2e8f0;
          color: #64748b;
        }

        .btn-outline:hover:not(:disabled) {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-success:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fafafa;
        }

        .upload-area:hover {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.02);
        }

        .upload-area.drag-active {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
          transform: scale(1.02);
        }

        .upload-area.has-file {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }

        .upload-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: #10b981;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #10b981;
        }

        .file-details h4 {
          margin: 0 0 4px;
          color: #1e293b;
        }

        .file-details p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .remove-file-btn {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .remove-file-btn:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        .upload-placeholder {
          color: #6b7280;
        }

        .upload-placeholder h3 {
          margin: 16px 0 8px;
          color: #374151;
        }

        .upload-placeholder p {
          margin: 4px 0;
        }

        .upload-hint {
          font-size: 12px;
          color: #9ca3af;
        }

        .columns-info {
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.1);
          border-radius: 12px;
          padding: 20px;
        }

        .columns-info h4 {
          margin: 0 0 16px;
          color: #059669;
        }

        .columns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .column-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #374151;
        }

        .column-item svg {
          color: #10b981;
        }

        .preview-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }

        .preview-header h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #1e293b;
        }

        .preview-actions {
          display: flex;
          gap: 12px;
        }

        .preview-table {
          max-height: 300px;
          overflow-y: auto;
        }

        .table-header {
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr 100px 100px;
          gap: 16px;
          padding: 16px 20px;
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
          font-size: 14px;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr 100px 100px;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          background: white;
        }

        .table-row:nth-child(even) {
          background: #fafafa;
        }

        .table-cell {
          font-size: 14px;
          color: #374151;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.pago {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .status-badge.livre {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .status-badge.ativo {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .status-badge.pendente {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .status-badge.cancelado {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .table-more {
          padding: 16px 20px;
          text-align: center;
          color: #6b7280;
          font-style: italic;
          background: #f8fafc;
        }

        @media (max-width: 768px) {
          .template-section {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .upload-area {
            padding: 24px 16px;
          }

          .file-info {
            flex-direction: column;
            text-align: center;
          }

          .preview-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .preview-actions {
            width: 100%;
          }

          .btn {
            flex: 1;
            justify-content: center;
          }

          .table-header,
          .table-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .table-cell {
            padding: 4px 0;
          }

          .columns-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
