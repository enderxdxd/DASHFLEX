export default function LoadingSpinner({ 
  size = 40, 
  color = '#3b82f6',
  className = '',
  text = ''
}) {
  return (
    <div className={`loading-spinner-container ${className}`}>
      <div 
        className="spinner"
        style={{ 
          width: size, 
          height: size,
          borderColor: `${color}20`,
          borderTopColor: color
        }}
      />
      {text && <p className="loading-text">{text}</p>}
      
      <style jsx>{`
        .loading-spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        
        .spinner {
          border: 3px solid;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        .loading-text {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
