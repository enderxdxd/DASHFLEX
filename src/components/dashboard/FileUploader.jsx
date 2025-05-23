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
          background-color: var(--bg-primary, white);
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
          margin-bottom: 2rem;
          border: 1px solid var(--border-color, #e2e8f0);
          transition: all 0.3s ease;
        }
        
        .uploader-header {
          margin-bottom: 1.5rem;
        }
        
        .uploader-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          margin: 0 0 0.5rem;
        }
        
        .uploader-description {
          font-size: 0.875rem;
          color: var(--text-secondary, #64748b);
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
          border: 2px dashed var(--border-dashed, #e2e8f0);
          border-radius: 0.5rem;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background-color: var(--bg-secondary, #f8fafc);
          position: relative;
          overflow: hidden;
        }
        
        .dropzone::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, var(--primary-alpha, rgba(79, 70, 229, 0.05)) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .dropzone:hover {
          border-color: var(--primary, #4f46e5);
          background-color: var(--primary-light, #eef2ff);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
        }
        
        .dropzone:hover::before {
          opacity: 1;
        }
        
        .dropzone svg {
          color: var(--text-muted, #94a3b8);
          margin-bottom: 1rem;
          transition: all 0.3s ease;
          z-index: 1;
        }
        
        .dropzone:hover svg {
          color: var(--primary, #4f46e5);
          transform: scale(1.1);
        }
        
        .dropzone-text {
          font-size: 0.875rem;
          color: var(--text-primary, #334155);
          margin: 0 0 0.5rem;
          text-align: center;
          z-index: 1;
        }
        
        .browse-text {
          color: var(--primary, #4f46e5);
          font-weight: 500;
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: transparent;
          transition: text-decoration-color 0.2s ease;
        }
        
        .browse-text:hover {
          text-decoration-color: var(--primary, #4f46e5);
        }
        
        .dropzone-hint {
          font-size: 0.75rem;
          color: var(--text-secondary, #64748b);
          margin: 0;
          z-index: 1;
        }
        
        .selected-file {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
          padding: 1rem;
          border-radius: 0.75rem;
          background: linear-gradient(135deg, var(--primary-light, #eef2ff) 0%, var(--primary-lighter, #f0f4ff) 100%);
          color: var(--primary, #4f46e5);
          border: 1px solid var(--primary-border, #c7d2fe);
          box-shadow: var(--shadow-sm, 0 2px 4px rgba(79, 70, 229, 0.1));
          transition: all 0.3s ease;
        }
        
        .selected-file:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md, 0 4px 12px rgba(79, 70, 229, 0.15));
        }
        
        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .file-name {
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          word-break: break-all;
          color: var(--primary-dark, #3730a3);
        }
        
        .file-size {
          font-size: 0.75rem;
          color: var(--text-secondary, #64748b);
          opacity: 0.8;
        }
        
        .remove-button, .close-message {
          background: none;
          border: none;
          color: var(--text-secondary, #64748b);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
        }
        
        .remove-button:hover {
          color: var(--danger, #ef4444);
          background-color: var(--danger-light, #fee2e2);
          transform: scale(1.1);
        }
        
        .close-message:hover {
          color: var(--primary, #4f46e5);
          background-color: var(--primary-light, #eef2ff);
          transform: scale(1.1);
        }
        
        .message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          position: relative;
          font-weight: 500;
          border: 1px solid;
          backdrop-filter: blur(10px);
        }
        
        .success-message {
          background: linear-gradient(135deg, var(--success-light, #ecfdf5) 0%, var(--success-lighter, #f0fdf4) 100%);
          color: var(--success, #10b981);
          border-color: var(--success-border, #a7f3d0);
          box-shadow: var(--shadow-sm, 0 2px 4px rgba(16, 185, 129, 0.1));
        }
        
        .success-message svg {
          flex-shrink: 0;
          animation: checkmark 0.5s ease-in-out;
        }
        
        @keyframes checkmark {
          0% { transform: scale(0) rotate(0deg); }
          50% { transform: scale(1.2) rotate(180deg); }
          100% { transform: scale(1) rotate(360deg); }
        }
        
        .success-message span {
          flex: 1;
        }
        
        .upload-actions {
          display: flex;
          justify-content: center;
          margin-top: 1rem;
        }
        
        .upload-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.75rem;
          background: linear-gradient(135deg, var(--primary, #4f46e5) 0%, var(--primary-dark, #4338ca) 100%);
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-md, 0 4px 12px rgba(79, 70, 229, 0.3));
          position: relative;
          overflow: hidden;
        }
        
        .upload-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        
        .upload-button:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--primary-dark, #4338ca) 0%, var(--primary-darker, #3730a3) 100%);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg, 0 8px 25px rgba(79, 70, 229, 0.4));
        }
        
        .upload-button:hover:not(:disabled)::before {
          transform: translateX(100%);
        }
        
        .upload-button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .upload-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
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
        
        /* Light Mode Fallback */
        :root {
          --bg-primary: white;
          --bg-secondary: #f8fafc;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --border-dashed: #e2e8f0;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.15);
          --primary: #4f46e5;
          --primary-light: #eef2ff;
          --primary-lighter: #f0f4ff;
          --primary-dark: #4338ca;
          --primary-darker: #3730a3;
          --primary-alpha: rgba(79, 70, 229, 0.05);
          --primary-border: #c7d2fe;
          --success: #10b981;
          --success-light: #ecfdf5;
          --success-lighter: #f0fdf4;
          --success-border: #a7f3d0;
          --danger: #ef4444;
          --danger-light: #fee2e2;
        }
        
        /* Dark Mode Styles */
        .dark .uploader-section {
          --bg-primary: #1e293b;
          --bg-secondary: #0f172a;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --border-color: #334155;
          --border-dashed: #475569;
          --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.5);
          --primary: #6366f1;
          --primary-light: #1e3a8a20;
          --primary-lighter: #1e40af20;
          --primary-dark: #4f46e5;
          --primary-darker: #4338ca;
          --primary-alpha: rgba(99, 102, 241, 0.1);
          --primary-border: #3730a3;
          --success: #22c55e;
          --success-light: #06402520;
          --success-lighter: #16532920;
          --success-border: #166534;
          --danger: #ef4444;
          --danger-light: #99182020;
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
          
          .upload-button {
            padding: 0.75rem 1.5rem;
            font-size: 0.8125rem;
          }
          
          .message {
            padding: 0.875rem 1rem;
            font-size: 0.8125rem;
          }
        }
        
        /* Enhanced hover states for better UX */
        .dropzone:focus-within {
          outline: 2px solid var(--primary, #4f46e5);
          outline-offset: 2px;
        }
        
        .upload-button:focus {
          outline: 2px solid var(--primary, #4f46e5);
          outline-offset: 2px;
        }
        
        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .dropzone,
          .upload-button,
          .selected-file,
          .message {
            transition: none;
          }
          
          .upload-spinner {
            animation: none;
          }
          
          @keyframes spin {
            to { transform: none; }
          }
          
          @keyframes checkmark {
            0%, 100% { transform: scale(1) rotate(0deg); }
          }
        }
      `}</style>
    </div>
  );
};

export default FileUploader;