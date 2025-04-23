import { useRef, useState, useEffect } from "react";

const FileUploader = ({ file, setFile, handleUpload, uploading }) => {
  const fileInputRef = useRef(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [hasUploaded, setHasUploaded] = useState(false);
  
  // Limpa a mensagem quando um novo arquivo é selecionado
  useEffect(() => {
    if (file) {
      setSuccessMessage("");
      setHasUploaded(false);
    }
  }, [file]);
  
  // Gerencia o status de upload
  useEffect(() => {
    // Se estava carregando e parou de carregar
    if (uploading === false && hasUploaded) {
      // Se não há arquivo após o término do upload, provavelmente foi bem-sucedido
      if (!file) {
        setSuccessMessage("Arquivo processado com sucesso!");
      }
      // Reset do flag após exibir a mensagem
      setHasUploaded(false);
    }
  }, [uploading, file, hasUploaded]);
  
  const handleUploadWithFeedback = async () => {
    if (!file) return;
    
    // Define que iniciou um upload
    setHasUploaded(true);
    setSuccessMessage("");
    
    try {
      await handleUpload();
      // A mensagem de sucesso será definida pelo efeito quando o upload terminar
    } catch (error) {
      console.error("Erro no upload:", error);
      setSuccessMessage("");
      setHasUploaded(false);
    }
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setSuccessMessage("");
      setHasUploaded(false);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };
  
  // Função para limpar a mensagem de sucesso
  const clearSuccessMessage = () => {
    setSuccessMessage("");
  };
  
  return (
    <div className="uploader-section">
      <div className="uploader-header">
        <h2>Importar Novo Relatório</h2>
        <p className="uploader-description">
          Adicione um novo arquivo Excel para atualizar os dados do dashboard
        </p>
      </div>
      
      <div className="uploader-container">
        <input
          type="file"
          onChange={handleFileChange}
          ref={fileInputRef}
          accept=".xls,.xlsx"
          className="file-input"
        />
        
        <div className="dropzone" onClick={triggerFileInput}>
          {file ? (
            <div className="selected-file">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M8 13h2"></path>
                <path d="M8 17h2"></path>
                <path d="M14 13h2"></path>
                <path d="M14 17h2"></path>
              </svg>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button 
                className="remove-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setSuccessMessage("");
                  setHasUploaded(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p className="dropzone-text">
                Arraste e solte seu arquivo aqui ou <span className="browse-text">clique para selecionar</span>
              </p>
              <p className="dropzone-hint">Suporta arquivos .xls, .xlsx</p>
            </>
          )}
        </div>
        
        {successMessage && (
          <div className="message success-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{successMessage}</span>
            <button 
              className="close-message"
              onClick={clearSuccessMessage}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}
        
        <div className="upload-actions">
          <button
            onClick={handleUploadWithFeedback}
            disabled={!file || uploading}
            className="upload-button"
          >
            {uploading ? (
              <>
                <div className="upload-spinner"></div>
                <span>Processando...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span>Importar Arquivo</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .uploader-section {
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          margin-bottom: 2rem;
        }
        
        .uploader-header {
          margin-bottom: 1.5rem;
        }
        
        .uploader-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.5rem;
        }
        
        .uploader-description {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }
        
        .uploader-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .file-input {
          display: none;
        }
        
        .dropzone {
          border: 2px dashed #e2e8f0;
          border-radius: 0.5rem;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          background-color: #f8fafc;
        }
        
        .dropzone:hover {
          border-color: #4f46e5;
          background-color: #eef2ff;
        }
        
        .dropzone svg {
          color: #94a3b8;
          margin-bottom: 1rem;
        }
        
        .dropzone-text {
          font-size: 0.875rem;
          color: #334155;
          margin: 0 0 0.5rem;
          text-align: center;
        }
        
        .browse-text {
          color: #4f46e5;
          font-weight: 500;
        }
        
        .dropzone-hint {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
        }
        
        .selected-file {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
          padding: 1rem;
          border-radius: 0.5rem;
          background-color: #eef2ff;
          color: #4f46e5;
        }
        
        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .file-name {
          font-weight: 500;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          word-break: break-all;
        }
        
        .file-size {
          font-size: 0.75rem;
          color: #64748b;
        }
        
        .remove-button, .close-message {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .remove-button:hover {
          color: #ef4444;
          background-color: #fee2e2;
        }
        
        .close-message:hover {
          color: #4f46e5;
          background-color: #eef2ff;
        }
        
        .message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          position: relative;
        }
        
        .success-message {
          background-color: #ecfdf5;
          color: #10b981;
        }
        
        .success-message svg {
          flex-shrink: 0;
        }
        
        .success-message span {
          flex: 1;
        }
        
        .upload-actions {
          display: flex;
          justify-content: center;
          margin-top: 0.5rem;
        }
        
        .upload-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background-color: #4f46e5;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .upload-button:hover:not(:disabled) {
          background-color: #4338ca;
        }
        
        .upload-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .upload-spinner {
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 640px) {
          .dropzone {
            padding: 1.5rem 1rem;
          }
          
          .selected-file {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .remove-button {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default FileUploader;