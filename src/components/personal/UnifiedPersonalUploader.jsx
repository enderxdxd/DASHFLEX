// src/components/personal/UnifiedPersonalUploader.jsx
import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Download,
  RefreshCw,
  MapPin
} from 'lucide-react';
import PersonalFileUploader from './PersonalFileUploader';
import { usePersonals } from '../../hooks/usePersonals';

export default function UnifiedPersonalUploader() {
  const [selectedUnidade, setSelectedUnidade] = useState('alphaville');
  
  // Hooks para cada unidade
  const alphaville = usePersonals('alphaville');
  const buenavista = usePersonals('buenavista'); 
  const marista = usePersonals('marista');

  const unidades = [
    { 
      id: 'alphaville', 
      name: 'Alphaville', 
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      hook: alphaville
    },
    { 
      id: 'buenavista', 
      name: 'Buena Vista', 
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      hook: buenavista
    },
    { 
      id: 'marista', 
      name: 'Marista', 
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      hook: marista
    }
  ];

  const currentUnidade = unidades.find(u => u.id === selectedUnidade);
  const currentHook = currentUnidade?.hook;

  // Definir as regras de taxa por intervalo de alunos e unidade
  const getTaxRules = (unidade) => {
    const unidadePrefix = {
      'alphaville': 'Alpha',
      'buenavista': 'Buena',
      'marista': 'Marista'
    };

    const prefix = unidadePrefix[unidade] || 'Alpha';

    return [
      {
        name: `${prefix} Taxa Personal 1 A 7 Alunos`,
        minAlunos: 1,
        maxAlunos: 7,
        expectedTaxa: `${prefix} Taxa Personal 1 A 7 Alunos 1 Dia Util`,
        patterns: [`${prefix} Taxa Personal 1 A 7 Alunos`, '1 A 7 Alunos', '1-7']
      },
      {
        name: `${prefix} Taxa Personal 8 A 12 Alunos`,
        minAlunos: 8,
        maxAlunos: 12,
        expectedTaxa: `${prefix} Taxa Personal 8 A 12 Alunos 1 Dia Util`,
        patterns: [`${prefix} Taxa Personal 8 A 12 Alunos`, '8 A 12 Alunos', '8-12']
      },
      {
        name: `${prefix} Taxa Personal 13 A 16 Alunos`,
        minAlunos: 13,
        maxAlunos: 16,
        expectedTaxa: `${prefix} Taxa Personal 13 A 16 Alunos 1 Dia Util`,
        patterns: [`${prefix} Taxa Personal 13 A 16 Alunos`, '13 A 16 Alunos', '13-16']
      },
      {
        name: `${prefix} Taxa Personal 17 Alunos Ou Mais`,
        minAlunos: 17,
        maxAlunos: 999,
        expectedTaxa: `${prefix} Taxa Personal 17 Alunos Ou Mais 1 Dia Util`,
        patterns: [`${prefix} Taxa Personal 17 Alunos Ou Mais`, '17 Alunos Ou Mais', '17+', '17 Ou Mais']
      }
    ];
  };

  // Função para validar taxas baseada na quantidade de alunos
  const validatePersonalTaxes = (data) => {
    const taxRules = getTaxRules(selectedUnidade);
    
    const validatedData = data.map(personal => {
      const totalAlunos = personal.totalAlunos || 0;
      
      // Encontrar a regra de taxa correta baseada na quantidade de alunos
      const correctRule = taxRules.find(rule => 
        totalAlunos >= rule.minAlunos && totalAlunos <= rule.maxAlunos
      );
      
      if (correctRule) {
        const currentTaxa = personal.produto || personal.taxa || '';
        
        // Verificar se a taxa atual corresponde a algum dos padrões esperados
        const isCorrectTaxa = correctRule.patterns.some(pattern => 
          currentTaxa.toLowerCase().includes(pattern.toLowerCase())
        );
        
        return {
          ...personal,
          taxaValidation: {
            isValid: isCorrectTaxa,
            currentTaxa: currentTaxa,
            expectedTaxa: correctRule.expectedTaxa,
            totalAlunos: totalAlunos,
            rule: correctRule,
            unidade: selectedUnidade
          }
        };
      }
      
      return {
        ...personal,
        taxaValidation: {
          isValid: false,
          currentTaxa: personal.produto || personal.taxa || '',
          expectedTaxa: 'Não definida para esta quantidade de alunos',
          totalAlunos: totalAlunos,
          rule: null,
          unidade: selectedUnidade
        }
      };
    });

    // Log das validações
    const invalidTaxas = validatedData.filter(p => !p.taxaValidation.isValid);
    if (invalidTaxas.length > 0) {
      console.warn(`⚠️ ${selectedUnidade.toUpperCase()} - Personals com taxa incorreta:`, invalidTaxas.map(p => ({
        personal: p.personal,
        alunos: p.taxaValidation.totalAlunos,
        taxaAtual: p.taxaValidation.currentTaxa,
        taxaEsperada: p.taxaValidation.expectedTaxa
      })));
    }

    console.log(`✅ ${selectedUnidade.toUpperCase()} - Validação de taxas concluída: ${validatedData.length - invalidTaxas.length}/${validatedData.length} corretas`);
    
    return validatedData;
  };

  const handleDataProcessed = async (data) => {
    if (currentHook) {
      try {
        // Primeiro, excluir todos os dados antigos da unidade
        console.log(`🗑️ Excluindo dados antigos da unidade: ${selectedUnidade}`);
        await currentHook.clearPersonals();
        
        // Extrai o array de dados processados do objeto retornado
        const processedData = data.processedData || data;
        console.log('📊 Dados processados para adicionar:', processedData);
        
        // Verifica se é um array antes de passar para o hook
        if (Array.isArray(processedData)) {
          // Validar taxas antes de adicionar os dados
          const validatedData = validatePersonalTaxes(processedData);
          currentHook.addPersonals(validatedData);
        } else {
          console.error('❌ Dados não são um array:', processedData);
          currentHook.setError('Formato de dados inválido recebido do upload');
        }
      } catch (error) {
        console.error('❌ Erro ao processar dados:', error);
        currentHook.setError('Erro ao processar dados: ' + error.message);
      }
    }
  };

  const handleError = (error) => {
    if (currentHook) {
      currentHook.setError(error);
    }
  };

  const clearResult = () => {
    if (currentHook) {
      currentHook.setError(null);
      currentHook.setSuccessMessage(null);
    }
  };

  return (
    <div className="unified-uploader">
      {/* Seletor de Unidade */}
      <div className="unit-selector">
        <h3>Selecione a Unidade</h3>
        <div className="unit-tabs">
          {unidades.map(unidade => (
            <button
              key={unidade.id}
              className={`unit-tab ${selectedUnidade === unidade.id ? 'active' : ''}`}
              style={{ 
                '--unit-color': unidade.color,
                '--unit-gradient': unidade.gradient 
              }}
              onClick={() => setSelectedUnidade(unidade.id)}
            >
              <MapPin size={18} />
              {unidade.name}
              {(unidade.hook.successMessage || unidade.hook.error) && (
                <div className={`result-indicator ${unidade.hook.successMessage ? 'success' : 'error'}`}>
                  {unidade.hook.successMessage ? (
                    <CheckCircle size={14} />
                  ) : (
                    <AlertTriangle size={14} />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div className="upload-container">
        <div className="upload-header">
          <div className="unit-info">
            <div 
              className="unit-icon"
              style={{ background: currentUnidade?.gradient }}
            >
              <MapPin size={24} />
            </div>
            <div className="unit-details">
              <h4>{currentUnidade?.name}</h4>
              <p>Faça upload da planilha de personal trainers desta unidade</p>
            </div>
          </div>

          {(currentHook?.successMessage || currentHook?.error) && (
            <button
              className="clear-btn"
              onClick={clearResult}
              title="Limpar resultado"
            >
              <RefreshCw size={16} />
              Novo Upload
            </button>
          )}
        </div>

        {/* Resultado do Upload */}
        {(currentHook?.successMessage || currentHook?.error) && (
          <div className={`upload-result ${currentHook.successMessage ? 'success' : 'error'}`}>
            {currentHook.successMessage ? (
              <div className="success-content">
                <CheckCircle size={24} />
                <div className="result-info">
                  <h5>Upload realizado com sucesso!</h5>
                  <p>{currentHook.successMessage}</p>
                  
                  <div className="quick-stats">
                    <div className="stat">
                      <strong>{currentHook.personals.length}</strong>
                      <span>Registros</span>
                    </div>
                    <div className="stat">
                      <strong>{[...new Set(currentHook.personals.map(p => p.personal))].length}</strong>
                      <span>Personals</span>
                    </div>
                    <div className="stat">
                      <strong>R$ {currentHook.personals.reduce((sum, p) => sum + (p.valorFinal || 0), 0).toLocaleString('pt-BR')}</strong>
                      <span>Faturamento</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="error-content">
                <AlertTriangle size={24} />
                <div className="result-info">
                  <h5>Erro no upload</h5>
                  <p>{currentHook.error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Component */}
        {!currentHook?.successMessage && !currentHook?.error && (
          <PersonalFileUploader
            unidade={selectedUnidade}
            onDataProcessed={handleDataProcessed}
            onError={handleError}
          />
        )}
      </div>

      <style jsx>{`
        .unified-uploader {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .unit-selector {
          background: #f8fafc;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e2e8f0;
        }

        .unit-selector h3 {
          margin: 0 0 16px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .unit-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .unit-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid var(--unit-color);
          background: white;
          color: var(--unit-color);
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          position: relative;
        }

        .unit-tab:hover {
          background: var(--unit-color);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .unit-tab.active {
          background: var(--unit-gradient);
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .result-indicator {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        .result-indicator.success {
          background: #10b981;
          color: white;
        }

        .result-indicator.error {
          background: #ef4444;
          color: white;
        }

        .upload-container {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .upload-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .unit-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .unit-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .unit-details h4 {
          margin: 0 0 4px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .unit-details p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          font-weight: 500;
        }

        .clear-btn:hover {
          background: #e2e8f0;
          color: #334155;
        }

        .upload-result {
          margin: 24px;
          padding: 24px;
          border-radius: 12px;
          border: 2px solid;
        }

        .upload-result.success {
          background: rgba(16, 185, 129, 0.05);
          border-color: #10b981;
        }

        .upload-result.error {
          background: rgba(239, 68, 68, 0.05);
          border-color: #ef4444;
        }

        .success-content,
        .error-content {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .success-content svg {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .error-content svg {
          color: #ef4444;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .result-info h5 {
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 16px;
          font-weight: 600;
        }

        .result-info p {
          margin: 0 0 16px;
          color: #64748b;
          font-size: 14px;
        }

        .quick-stats {
          display: flex;
          gap: 24px;
        }

        .stat {
          text-align: center;
        }

        .stat strong {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .stat span {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
          .unit-tabs {
            flex-direction: column;
          }

          .unit-tab {
            justify-content: center;
          }

          .upload-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }

          .unit-info {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }

          .quick-stats {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}
