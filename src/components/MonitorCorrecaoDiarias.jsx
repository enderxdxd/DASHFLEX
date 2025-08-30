import React from 'react';
import { useCorrecaoDiarias } from '../utils/correcaoDiarias';

const MonitorCorrecaoDiarias = ({ vendas }) => {
  const { estatisticas } = useCorrecaoDiarias(vendas);
  
  if (estatisticas.corrigidas === 0) return null;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <span className="text-yellow-600 mr-2 text-lg">🔧</span>
        <h3 className="text-sm font-medium text-yellow-800">
          Diárias Reclassificadas Automaticamente
        </h3>
      </div>
      <div className="mt-2 text-sm text-yellow-700">
        <p className="mb-2">
          <strong>{estatisticas.corrigidas}</strong> registros foram corrigidos automaticamente:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Diárias movidas de "plano" → "produto"</li>
          <li>Agora serão calculadas com taxa percentual</li>
          <li>Correção aplicada em <strong>{estatisticas.percentualCorrigido}%</strong> dos registros</li>
        </ul>
        <div className="mt-3 text-xs text-yellow-600">
          <p>
            💡 Esta correção garante que diárias sejam calculadas corretamente 
            como produtos (taxa %) ao invés de planos (valor fixo).
          </p>
        </div>
      </div>
    </div>
  );
};

export default MonitorCorrecaoDiarias;
