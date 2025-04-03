import { useState, useEffect } from 'react';

const ManageTargets = () => {
  const [responsaveis, setResponsaveis] = useState([]);
  const [novoResponsavel, setNovoResponsavel] = useState('');
  const [meta, setMeta] = useState('');

  // Carregar do LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('salesTargets');
    if (saved) setResponsaveis(JSON.parse(saved));
  }, []);

  // Salvar no LocalStorage
  useEffect(() => {
    localStorage.setItem('salesTargets', JSON.stringify(responsaveis));
  }, [responsaveis]);

  const adicionarResponsavel = () => {
    if (novoResponsavel && meta) {
      setResponsaveis([...responsaveis, {
        nome: novoResponsavel,
        meta: parseFloat(meta),
        id: Date.now()
      }]);
      setNovoResponsavel('');
      setMeta('');
    }
  };

  return (
    <div className="manage-targets-container">
      <h2>Gerenciar Metas dos Responsáveis</h2>
      
      <div className="add-target-form">
        <input
          type="text"
          placeholder="Nome do Responsável"
          value={novoResponsavel}
          onChange={(e) => setNovoResponsavel(e.target.value)}
        />
        <input
          type="number"
          placeholder="Meta Mensal (R$)"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
        />
        <button onClick={adicionarResponsavel}>Adicionar</button>
      </div>

      <div className="targets-list">
        {responsaveis.map((responsavel) => (
          <div key={responsavel.id} className="target-item">
            <span>{responsavel.nome}</span>
            <span>Meta: {responsavel.meta.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}</span>
          </div>
        ))}
      </div>
    </div>
  );
};