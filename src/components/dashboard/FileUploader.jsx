import { useRef } from "react";

const FileUploader = ({ file, setFile, handleUpload, uploading }) => {
  const fileInputRef = useRef(null);
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current.click();
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
        
        <div className="upload-actions">
          <button
            onClick={handleUpload}
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
          background-color: var(--card);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .uploader-header {
          margin-bottom: 24px;
        }
        
        .uploader-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px;
        }
        
        .uploader-description {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
        }
        
        .uploader-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .file-input {
          display: none;
        }
        
        .dropzone {
          border: 2px dashed var(--border);
          border-radius: 12px;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          background-color: var(--background);
        }
        
        .dropzone:hover {
          border-color: var(--primary);
          background-color: var(--primary-light);
        }
        
        .dropzone svg {
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        
        .dropzone-text {
          font-size: 1rem;
          color: var(--text-primary);
          margin: 0 0 8px;
          text-align: center;
        }
        
        .browse-text {
          color: var(--primary);
          font-weight: 500;
        }
        
        .dropzone-hint {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
        }
        
        .selected-file {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          max-width: 400px;
          padding: 16px;
          border-radius: 8px;
          background-color: var(--primary-light);
          color: var(--primary);
        }
        
        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .file-name {
          font-weight: 500;
          font-size: 0.875rem;
          margin-bottom: 4px;
          word-break: break-all;
        }
        
        .file-size {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        .remove-button {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .remove-button:hover {
          color: var(--danger);
          background-color: var(--error-light);
        }
        
        .upload-actions {
          display: flex;
          justify-content: center;
          margin-top: 8px;
        }
        
        .upload-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background-color: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .upload-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }
        
        .upload-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .upload-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FileUploader;