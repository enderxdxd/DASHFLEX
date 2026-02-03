// src/components/CacheIndicator.jsx
// Indicador visual de status do cache e botão de refresh
import React, { useState, useCallback } from 'react';
import { RefreshCw, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const CacheIndicator = ({ 
  cacheInfo, 
  onRefresh, 
  loading = false,
  compact = false,
  showDetails = true 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || loading) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [onRefresh, isRefreshing, loading]);

  const formatTime = (date) => {
    if (!date) return 'Nunca';
    const d = new Date(date);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = () => {
    if (loading || isRefreshing) return '#f59e0b'; // amarelo
    if (cacheInfo?.isStale) return '#ef4444'; // vermelho
    if (cacheInfo?.fromCache) return '#10b981'; // verde
    return '#6b7280'; // cinza
  };

  const getStatusText = () => {
    if (loading || isRefreshing) return 'Atualizando...';
    if (cacheInfo?.isStale) return 'Dados desatualizados';
    if (cacheInfo?.fromCache) return 'Cache ativo';
    return 'Dados do servidor';
  };

  if (compact) {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing || loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: getStatusColor(),
          cursor: isRefreshing || loading ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          transition: 'all 0.2s ease'
        }}
        title={`${getStatusText()} - Última atualização: ${formatTime(cacheInfo?.lastFetch)}`}
      >
        <RefreshCw 
          size={14} 
          style={{ 
            animation: isRefreshing || loading ? 'spin 1s linear infinite' : 'none' 
          }} 
        />
        {cacheInfo?.fromCache && <Database size={12} />}
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Status Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: `${getStatusColor()}20`
      }}>
        {loading || isRefreshing ? (
          <RefreshCw size={16} color={getStatusColor()} style={{ animation: 'spin 1s linear infinite' }} />
        ) : cacheInfo?.fromCache ? (
          <Database size={16} color={getStatusColor()} />
        ) : cacheInfo?.isStale ? (
          <AlertCircle size={16} color={getStatusColor()} />
        ) : (
          <CheckCircle size={16} color={getStatusColor()} />
        )}
      </div>

      {/* Info */}
      {showDetails && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: 500, 
            color: getStatusColor(),
            marginBottom: '2px'
          }}>
            {getStatusText()}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={10} />
            {formatTime(cacheInfo?.lastFetch)}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing || loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          color: '#fff',
          cursor: isRefreshing || loading ? 'not-allowed' : 'pointer',
          opacity: isRefreshing || loading ? 0.5 : 1,
          transition: 'all 0.2s ease'
        }}
        title="Atualizar dados"
      >
        <RefreshCw 
          size={14} 
          style={{ 
            animation: isRefreshing || loading ? 'spin 1s linear infinite' : 'none' 
          }} 
        />
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CacheIndicator;
