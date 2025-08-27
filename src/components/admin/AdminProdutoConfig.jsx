// src/components/admin/AdminProdutoConfig.jsx
import React, { useState, useEffect } from 'react';
import { useGlobalProdutos } from '../../hooks/useGlobalProdutos';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Package,
  Shield,
  Users
} from 'lucide-react';

export default function AdminProdutoConfig() {
  const { 
    produtosSelecionados, 
    setProdutosSelecionados, 
    loaded, 
    isAdmin, 
    userEmail 
  } = useGlobalProdutos();
  
  const [todosProdutos, setTodosProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [tempSelection, setTempSelection] = useState([]);

  // Carrega todos os produtos únicos do sistema
  useEffect(() => {
    const carregarProdutos = async () => {
      try {
        setLoading(true);
        const produtosSet = new Set();
        
        // Busca produtos de todas as unidades
        const unidades = ['alphaville', 'buenavista', 'marista'];
        
        for (const unidade of unidades) {
          try {
            const vendasRef = collection(db, 'faturamento', unidade, 'vendas');
            const snapshot = await getDocs(vendasRef);
            
            console.log(`📦 Carregando produtos da unidade ${unidade}: ${snapshot.docs.length} documentos`);
            
            snapshot.docs.forEach(doc => {
              const produto = doc.data().produto;
              if (produto && produto.trim()) {
                produtosSet.add(produto.trim());
              }
            });
          } catch (error) {
            console.error(`Erro ao carregar produtos da unidade ${unidade}:`, error);
          }
        }
        
        const produtosArray = Array.from(produtosSet).sort();
        setTodosProdutos(produtosArray);
        
        console.log('📦 Produtos únicos carregados:', produtosArray.length);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        setMessage({ type: 'error', text: 'Erro ao carregar produtos do sistema' });
      } finally {
        setLoading(false);
      }
    };

    carregarProdutos();
  }, []);

  // Sincroniza seleção temporária com a global
  useEffect(() => {
    if (loaded) {
      setTempSelection([...produtosSelecionados]);
    }
  }, [produtosSelecionados, loaded]);

  const handleToggleProduto = (produto) => {
    setTempSelection(prev => {
      if (prev.includes(produto)) {
        return prev.filter(p => p !== produto);
      } else {
        return [...prev, produto];
      }
    });
  };

  const handleSelectAll = () => {
    setTempSelection([...todosProdutos]);
  };

  const handleDeselectAll = () => {
    setTempSelection([]);
  };

  const handleSave = async () => {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Apenas administradores podem salvar configurações' });
      return;
    }

    try {
      setSaving(true);
      await setProdutosSelecionados(tempSelection);
      setMessage({ 
        type: 'success', 
        text: `Configuração salva! ${tempSelection.length} produtos selecionados.` 
      });
      
      // Limpa mensagem após 3 segundos
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar configuração' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(tempSelection.sort()) !== JSON.stringify(produtosSelecionados.sort());

  if (!isAdmin) {
    return (
      <div className="admin-config-container">
        <div className="access-denied">
          <Shield className="w-12 h-12 text-red-500 mb-4" />
          <h3>Acesso Restrito</h3>
          <p>Apenas administradores podem acessar esta configuração.</p>
          <div className="user-info">
            <span>Usuário atual: {userEmail}</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !loaded) {
    return (
      <div className="admin-config-container">
        <div className="loading-state">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p>Carregando configuração de produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-config-container">
      <div className="admin-config-header">
        <div className="header-content">
          <div className="header-icon">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2>Configuração Global de Produtos</h2>
            <p>Defina quais produtos serão exibidos para todos os usuários do sistema</p>
          </div>
        </div>
        
        <div className="admin-badge">
          <Shield className="w-4 h-4" />
          <span>Admin: {userEmail}</span>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="config-stats">
        <div className="stat-card">
          <Package className="w-5 h-5 text-blue-600" />
          <div>
            <div className="stat-value">{todosProdutos.length}</div>
            <div className="stat-label">Produtos Disponíveis</div>
          </div>
        </div>
        
        <div className="stat-card">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <div className="stat-value">{tempSelection.length}</div>
            <div className="stat-label">Produtos Selecionados</div>
          </div>
        </div>
        
        <div className="stat-card">
          <Users className="w-5 h-5 text-purple-600" />
          <div>
            <div className="stat-value">Todos</div>
            <div className="stat-label">Usuários Afetados</div>
          </div>
        </div>
      </div>

      <div className="config-actions">
        <div className="bulk-actions">
          <button 
            onClick={handleSelectAll}
            className="bulk-btn select-all"
            type="button"
          >
            Selecionar Todos
          </button>
          <button 
            onClick={handleDeselectAll}
            className="bulk-btn deselect-all"
            type="button"
          >
            Desmarcar Todos
          </button>
        </div>
        
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`save-btn ${hasChanges ? 'has-changes' : ''}`}
          type="button"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>

      <div className="produtos-grid">
        {todosProdutos.map((produto, index) => (
          <label key={index} className="produto-card">
            <input
              type="checkbox"
              checked={tempSelection.includes(produto)}
              onChange={() => handleToggleProduto(produto)}
              className="produto-checkbox"
            />
            <div className="produto-content">
              <div className="produto-icon">
                <Package className="w-4 h-4" />
              </div>
              <span className="produto-name">{produto}</span>
              {tempSelection.includes(produto) && (
                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
              )}
            </div>
          </label>
        ))}
      </div>

      <style jsx>{`
        .admin-config-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          min-height: 100vh;
        }

        .admin-config-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding: 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .admin-config-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .admin-config-header p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .admin-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid #fbbf24;
        }

        .access-denied {
          text-align: center;
          padding: 48px 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .access-denied h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .access-denied p {
          color: #64748b;
          margin: 0 0 16px 0;
        }

        .user-info {
          background: #f1f5f9;
          padding: 12px 16px;
          border-radius: 8px;
          color: #475569;
          font-size: 14px;
        }

        .loading-state {
          text-align: center;
          padding: 48px 24px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-weight: 600;
        }

        .message.success {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border: 1px solid #34d399;
        }

        .message.error {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          border: 1px solid #f87171;
        }

        .config-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-label {
          font-size: 14px;
          color: #64748b;
        }

        .config-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        .bulk-actions {
          display: flex;
          gap: 12px;
        }

        .bulk-btn {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid;
        }

        .select-all {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #1d4ed8;
          border-color: #3b82f6;
        }

        .select-all:hover {
          background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
          transform: translateY(-1px);
        }

        .deselect-all {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #dc2626;
          border-color: #ef4444;
        }

        .deselect-all:hover {
          background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
          transform: translateY(-1px);
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #e2e8f0;
          color: #64748b;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: not-allowed;
          transition: all 0.3s ease;
        }

        .save-btn.has-changes {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border-color: #2563eb;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .save-btn.has-changes:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }

        .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
        }

        .produtos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .produto-card {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .produto-card:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.15);
        }

        .produto-checkbox {
          display: none;
        }

        .produto-checkbox:checked + .produto-content {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        }

        .produto-checkbox:checked + .produto-content .produto-name {
          color: #1d4ed8;
          font-weight: 600;
        }

        .produto-content {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .produto-icon {
          color: #64748b;
          transition: color 0.2s ease;
        }

        .produto-checkbox:checked + .produto-content .produto-icon {
          color: #1d4ed8;
        }

        .produto-name {
          flex: 1;
          font-size: 14px;
          color: #374151;
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}
