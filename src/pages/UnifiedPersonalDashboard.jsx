// src/pages/UnifiedPersonalDashboard.jsx
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Upload, 
  Download,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Activity,
  User,
  Star,
  DollarSign,
  Eye,
  ChevronRight,
  Trash2
} from 'lucide-react';
import NavBar from '../components/NavBar.jsx';
import UnifiedPersonalUploader from '../components/personal/UnifiedPersonalUploader';
import PersonalStudentTable from '../components/personal/PersonalStudentTable';
import TaxValidationReport from '../components/personal/TaxValidationReport';
import { usePersonals } from '../hooks/usePersonals';

export default function UnifiedPersonalDashboard() {
  const [selectedView, setSelectedView] = useState('dashboard'); // 'dashboard' | 'upload'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnidade, setSelectedUnidade] = useState('all'); // 'all' | 'alphaville' | 'buenavista' | 'marista'
  const [selectedPersonal, setSelectedPersonal] = useState('');
  const [selectedSituacao, setSelectedSituacao] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Hooks para cada unidade
  const alphaville = usePersonals('alphaville');
  const buenavista = usePersonals('buenavista'); 
  const marista = usePersonals('marista');

  // Dados unificados
  const allPersonalsData = useMemo(() => {
    const data = [
      ...alphaville.personals.map(p => ({ ...p, unidade: 'alphaville' })),
      ...buenavista.personals.map(p => ({ ...p, unidade: 'buenavista' })),
      ...marista.personals.map(p => ({ ...p, unidade: 'marista' }))
    ];
    
    console.log('📊 Dashboard - Dados unificados:', {
      alphaville: alphaville.personals.length,
      buenavista: buenavista.personals.length,
      marista: marista.personals.length,
      total: data.length
    });
    
    return data;
  }, [alphaville.personals, buenavista.personals, marista.personals]);

  // Loading state
  const isLoading = alphaville.loading || buenavista.loading || marista.loading;

  // Error handling
  const errors = [alphaville.error, buenavista.error, marista.error].filter(Boolean);
  const successMessages = [alphaville.successMessage, buenavista.successMessage, marista.successMessage].filter(Boolean);

  // Função para filtrar alunos reais (excluindo administrativos)
  const isRealStudent = (aluno) => {
    if (!aluno) return false;
    const alunoLower = aluno.toLowerCase().trim();
    
    const adminKeywords = [
      'assinar contrato',
      'atualizar telefone',
      'atualizar cpf',
      'observar se tem alunos',
      'caso nao solicitar isencao',
      'caso não solicitar isenção',
      'solicitar isenção',
      'solicitar isencao',
      // NOVOS: Excluir registros administrativos de personal
      'alunos de personal do alphaville',
      'alunos de personal no marista',
      'alunos de personal da buenavista', // Caso exista também
      'alunos de personal buena vista' // Variações possíveis
    ];
    
    return !adminKeywords.some(keyword => alunoLower.includes(keyword));
  };

  // Dados filtrados (apenas alunos reais)
  const realStudentsData = useMemo(() => {
    return allPersonalsData.filter(item => isRealStudent(item.aluno));
  }, [allPersonalsData]);

  // Função para validar se o produto/taxa aplicado está correto para a quantidade de alunos
  const validateTaxProduct = (studentCount, taxProduct) => {
    console.log(`🔍 VALIDANDO TAXA:`, {
      studentCount,
      taxProduct
    });
    
    if (!taxProduct) return { isValid: false, expectedProduct: 'Produto não informado' };
    
    const productLower = taxProduct.toLowerCase();
    
    // Padrões de produtos de taxa baseados na quantidade de alunos
    const taxPatterns = [
      {
        pattern: /até\s*(\d+)\s*alunos?/i,
        validate: (count, match) => count <= parseInt(match[1]),
        getDescription: (match) => `Até ${match[1]} alunos`
      },
      {
        pattern: /acima\s*(\d+)\s*alunos?/i,
        validate: (count, match) => count > parseInt(match[1]),
        getDescription: (match) => `Acima de ${match[1]} alunos`
      },
      {
        pattern: /(\d+)\s*a\s*(\d+)\s*alunos?/i,
        validate: (count, match) => count >= parseInt(match[1]) && count <= parseInt(match[2]),
        getDescription: (match) => `${match[1]} a ${match[2]} alunos`
      },
      {
        pattern: /(\d+)\s*\+\s*alunos?/i,
        validate: (count, match) => count >= parseInt(match[1]),
        getDescription: (match) => `${match[1]}+ alunos`
      }
    ];

    // Verifica cada padrão
    for (const patternObj of taxPatterns) {
      const match = productLower.match(patternObj.pattern);
      if (match) {
        const isValid = patternObj.validate(studentCount, match);
        
        console.log(`🎯 PADRÃO ENCONTRADO:`, {
          pattern: patternObj.pattern,
          match: match[0],
          matchGroups: match,
          studentCount,
          isValid,
          calculation: `${studentCount} está entre ${match[1]} e ${match[2] || 'N/A'}?`
        });
        
        return {
          isValid,
          expectedProduct: taxProduct,
          description: patternObj.getDescription(match),
          studentCount,
          requirement: match[0]
        };
      }
    }

    console.log(`⚠️ NENHUM PADRÃO ENCONTRADO - assumindo correto`);
    
    // Se não encontrou padrão específico, assume que está correto
    return {
      isValid: true,
      expectedProduct: taxProduct,
      description: 'Produto personalizado',
      studentCount,
      requirement: 'Verificação manual necessária'
    };
  };

  // Função para classificar alunos conforme as regras do usuário
  const classifyStudent = (item) => {
    const valor = item.valorFinal || 0;
    const situacao = item.situacao;
    
    // "Aberto" quando deve ser considerado como aberto: valor = Zero situação = Livre
    if (valor === 0 && situacao === 'Livre') {
      return 'Aberto';
    }
    // "Isento" quando deve ser considerado como isento: valor = Zero situação = Pago  
    if (valor === 0 && situacao === 'Pago') {
      return 'Isento';
    }
    // "Quitado" quando deve ser considerado como quitado: valor > Zero situação = Pago
    if (valor > 0 && situacao === 'Pago') {
      return 'Quitado';
    }
    
    // Casos não classificados (para debug)
    return 'Indefinido';
  };

  // Estatísticas focadas em alunos reais por personal (AGRUPADO POR PESSOA)
  const personalStats = useMemo(() => {
    const filteredData = selectedUnidade === 'all' 
      ? realStudentsData 
      : realStudentsData.filter(item => item.unidade === selectedUnidade);

    // Agrupa por personal (mesma pessoa, independente da unidade)
    const personalGroups = filteredData.reduce((acc, item) => {
      const personal = item.personal || 'Sem Personal';
      
      if (!acc[personal]) {
        acc[personal] = {
          personal,
          unidades: new Set(), // Track which units this personal works in
          alunos: new Set(),
          alunosAbertos: new Set(),    // valor = 0, situacao = Livre
          alunosIsentos: new Set(),    // valor = 0, situacao = Pago
          alunosQuitados: new Set(),   // valor > 0, situacao = Pago
          totalFaturamento: 0
        };
      }
      
      const classification = classifyStudent(item);
      
      // Add unit to the set of units this personal works in
      acc[personal].unidades.add(item.unidade);
      acc[personal].alunos.add(item.aluno);
      acc[personal].totalFaturamento += (item.valorFinal || 0);
      
      // Classifica alunos únicos por tipo
      switch (classification) {
        case 'Aberto':
          acc[personal].alunosAbertos.add(item.aluno);
          break;
        case 'Isento':
          acc[personal].alunosIsentos.add(item.aluno);
          break;
        case 'Quitado':
          acc[personal].alunosQuitados.add(item.aluno);
          break;
        default:
          console.warn('Aluno não classificado:', item);
      }
      
      return acc;
    }, {});

    // Converte para array e ordena por número de alunos
    const personalArray = Object.values(personalGroups).map(group => {
      const alunosAbertos = group.alunosAbertos.size;
      const alunosIsentos = group.alunosIsentos.size;
      const alunosQuitados = group.alunosQuitados.size;
      const unidadesArray = Array.from(group.unidades);
      
      return {
        ...group,
        totalAlunos: group.alunos.size, // Total de alunos = Abertos + Isentos + Quitados
        alunosAbertos,
        alunosIsentos, 
        alunosQuitados,
        unidades: unidadesArray,
        unidade: unidadesArray.length === 1 ? unidadesArray[0] : 'Múltiplas', // For compatibility
        // Para compatibilidade com código existente
        alunosPagos: alunosIsentos, // Renomeia para manter compatibilidade
        alunosLivres: alunosAbertos, // Renomeia para manter compatibilidade
        alunos: Array.from(group.alunos),
        // Total de alunos considerados para divergência de valor = Quitados + Isentos
        alunosParaDivergencia: alunosQuitados + alunosIsentos
      };
    }).sort((a, b) => b.totalAlunos - a.totalAlunos);

    console.log('📊 Personal Stats (agrupado por pessoa):', {
      selectedUnidade,
      totalPersonals: personalArray.length,
      personalsData: personalArray.map(p => ({
        personal: p.personal,
        unidades: p.unidades,
        totalAlunos: p.totalAlunos,
        abertos: p.alunosAbertos,
        isentos: p.alunosIsentos,
        quitados: p.alunosQuitados,
        paraDivergencia: p.alunosParaDivergencia
      }))
    });

    return {
      personalsData: personalArray,
      totalPersonals: personalArray.length,
      totalAlunosReais: filteredData.length,
      totalAlunosUnicos: [...new Set(filteredData.map(item => item.aluno))].length,
      valorTotalFaturamento: filteredData.reduce((sum, item) => sum + (item.valorFinal || 0), 0),
      mediaAlunosPorPersonal: personalArray.length > 0 ? (personalArray.reduce((sum, p) => sum + p.totalAlunos, 0) / personalArray.length).toFixed(1) : 0
    };
  }, [realStudentsData, selectedUnidade]);

  // Dados com validação de taxa para o TaxValidationReport
  const dataWithTaxValidation = useMemo(() => {
    return personalStats.personalsData?.map(personal => {
      // Buscar o produto/taxa aplicado ao personal nos dados originais (qualquer unidade)
      const personalData = realStudentsData.find(item => 
        item.personal === personal.personal
      );
      
      // Debug: verificar todos os produtos/planos para este personal
      const allProductsForPersonal = realStudentsData
        .filter(item => item.personal === personal.personal)
        .map(item => ({
          produto: item.produto,
          plano: item.plano,
          unidade: item.unidade,
          aluno: item.aluno
        }));
      
      console.log(`🔍 PRODUTOS ENCONTRADOS para ${personal.personal}:`, allProductsForPersonal);
      console.log(`📈 ALUNOS REAIS para ${personal.personal}:`, {
        totalAlunos: personal.totalAlunos,
        alunosAbertos: personal.alunosAbertos,
        alunosIsentos: personal.alunosIsentos,
        alunosQuitados: personal.alunosQuitados,
        listaAlunos: personal.alunos
      });
      
      const taxProduct = personalData?.produto || personalData?.plano || 'Produto não informado';
      
      console.log(`📋 PRODUTO SELECIONADO para validação:`, {
        personal: personal.personal,
        taxProduct,
        personalData: personalData
      });
      
      // CORREÇÃO: Usar o TOTAL de alunos para validação de taxa (não apenas Quitados + Isentos)
      const alunosParaValidacao = personal.totalAlunos; // Total = Abertos + Isentos + Quitados
      
      // TESTE ESPECÍFICO: Forçar validação com taxa do Marista se for João Carlos
      let finalTaxProduct = taxProduct;
      if (personal.personal.includes('João Carlos')) {
        // Forçar usar a taxa do Marista para teste
        const maristaTax = allProductsForPersonal.find(p => 
          p.unidade === 'marista' && (p.produto || p.plano)
        );
        if (maristaTax) {
          finalTaxProduct = maristaTax.produto || maristaTax.plano;
          console.log(`🔴 FORÇANDO TAXA DO MARISTA para ${personal.personal}:`, finalTaxProduct);
        }
      }
      
      const validation = validateTaxProduct(alunosParaValidacao, finalTaxProduct);
      
      // TESTE MANUAL: Validar especificamente "1 A 7 Alunos" com 18 alunos
      if (personal.personal.includes('João Carlos')) {
        const testValidation = validateTaxProduct(18, 'Marista Taxa Personal 1 A 7 Alunos 1 Dia Util');
        console.log(`🧪 TESTE MANUAL - 18 alunos com '1 A 7 Alunos':`, testValidation);
      }

      console.log(`🔍 Validação Taxa - ${personal.personal} (${personal.unidades.join(', ')}):`, {
        totalAlunos: personal.totalAlunos,
        abertos: personal.alunosAbertos,
        isentos: personal.alunosIsentos,
        quitados: personal.alunosQuitados,
        alunosParaValidacao: `USANDO TOTAL: ${alunosParaValidacao}`,
        alunosParaDivergencia: personal.alunosParaDivergencia,
        unidades: personal.unidades,
        taxProduct,
        isValid: validation.isValid
      });

      return {
        ...personal,
        aluno: `${personal.totalAlunos} alunos (validando com ${alunosParaValidacao})`, // Para compatibilidade com o componente
        taxaValidation: {
          isValid: validation.isValid,
          totalAlunos: personal.totalAlunos,
          alunosParaValidacao,
          alunosAbertos: personal.alunosAbertos,
          alunosIsentos: personal.alunosIsentos,
          alunosQuitados: personal.alunosQuitados,
          unidades: personal.unidades,
          currentTaxa: taxProduct,
          expectedTaxa: validation.expectedProduct,
          expectedRange: {
            min: 0, // Não usado mais, mas mantido para compatibilidade
            max: 999, // Não usado mais, mas mantido para compatibilidade
            description: validation.description,
            requirement: validation.requirement
          }
        }
      };
    }) || [];
  }, [personalStats.personalsData, realStudentsData]);

  // Estatísticas unificadas
  const unifiedStats = useMemo(() => {
    const filteredData = selectedUnidade === 'all' 
      ? allPersonalsData 
      : allPersonalsData.filter(p => p.unidade === selectedUnidade);

    const personalsUnicos = [...new Set(filteredData.map(item => item.personal))].filter(p => p && p !== '-');
    const alunosUnicos = [...new Set(filteredData.map(item => item.aluno))].filter(a => a && a !== '-' && !a.includes('Assinar Contrato'));
    const totalFaturamento = filteredData.reduce((sum, item) => sum + (item.valorFinal || 0), 0);
    
    // Contar alunos únicos por situação, não registros
    const alunosPagosUnicos = [...new Set(filteredData.filter(item => item.situacao === 'Pago').map(item => item.aluno))].filter(a => a && a !== '-' && !a.includes('Assinar Contrato'));
    const alunosLivresUnicos = [...new Set(filteredData.filter(item => item.situacao === 'Livre').map(item => item.aluno))].filter(a => a && a !== '-' && !a.includes('Assinar Contrato'));

    // Estatísticas por unidade
    const statsByUnidade = {
      alphaville: {
        personals: [...new Set(allPersonalsData.filter(p => p.unidade === 'alphaville').map(p => p.personal))].length,
        alunos: [...new Set(allPersonalsData.filter(p => p.unidade === 'alphaville' && !p.aluno?.includes('Assinar Contrato')).map(p => p.aluno))].length,
        faturamento: allPersonalsData.filter(p => p.unidade === 'alphaville').reduce((sum, item) => sum + (item.valorFinal || 0), 0)
      },
      buenavista: {
        personals: [...new Set(allPersonalsData.filter(p => p.unidade === 'buenavista').map(p => p.personal))].length,
        alunos: [...new Set(allPersonalsData.filter(p => p.unidade === 'buenavista' && !p.aluno?.includes('Assinar Contrato')).map(p => p.aluno))].length,
        faturamento: allPersonalsData.filter(p => p.unidade === 'buenavista').reduce((sum, item) => sum + (item.valorFinal || 0), 0)
      },
      marista: {
        personals: [...new Set(allPersonalsData.filter(p => p.unidade === 'marista').map(p => p.personal))].length,
        alunos: [...new Set(allPersonalsData.filter(p => p.unidade === 'marista' && !p.aluno?.includes('Assinar Contrato')).map(p => p.aluno))].length,
        faturamento: allPersonalsData.filter(p => p.unidade === 'marista').reduce((sum, item) => sum + (item.valorFinal || 0), 0)
      }
    };

    return {
      totalPersonals: personalsUnicos.length,
      totalAlunos: alunosUnicos.length,
      totalFaturamento,
      alunosPagos: alunosPagosUnicos.length,
      alunosLivres: alunosLivresUnicos.length,
      personalsUnicos,
      statsByUnidade
    };
  }, [allPersonalsData, selectedUnidade]);

  // Dados filtrados por busca e filtros - focado em personals
  const filteredPersonalStats = useMemo(() => {
    let filtered = personalStats.personalsData || [];

    // Filtro por unidade
    if (selectedUnidade !== 'all') {
      filtered = filtered.filter(personal => personal.unidade === selectedUnidade);
    }

    // Filtro por busca (nome do personal)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(personal => 
        personal.personal.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [personalStats, searchTerm, selectedUnidade]);

  // Estatísticas do personal pesquisado ou gerais
  const stats = useMemo(() => {
    // Se há um personal específico sendo pesquisado, mostra dados dele
    if (searchTerm) {
      const personalEncontrado = filteredPersonalStats.find(p => 
        p.personal.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (personalEncontrado) {
        return {
          totalAlunos: personalEncontrado.totalAlunos,
          totalPersonals: 1,
          totalFaturamento: personalEncontrado.totalFaturamento,
          alunosPagos: personalEncontrado.alunosIsentos, // Isentos
          alunosLivres: personalEncontrado.alunosAbertos, // Abertos
          alunosQuitados: personalEncontrado.alunosQuitados, // Quitados
          personalName: personalEncontrado.personal,
          unidade: personalEncontrado.unidade
        };
      }
    }
    
    // Caso contrário, mostra estatísticas gerais (soma de todas as unidades filtradas)
    const statsGerais = personalStats.personalsData?.reduce((acc, personal) => {
      acc.totalAlunos += personal.totalAlunos;
      acc.alunosAbertos += personal.alunosAbertos;
      acc.alunosIsentos += personal.alunosIsentos;
      acc.alunosQuitados += personal.alunosQuitados;
      acc.totalFaturamento += personal.totalFaturamento;
      return acc;
    }, {
      totalAlunos: 0,
      alunosAbertos: 0,
      alunosIsentos: 0,
      alunosQuitados: 0,
      totalFaturamento: 0
    }) || {
      totalAlunos: 0,
      alunosAbertos: 0,
      alunosIsentos: 0,
      alunosQuitados: 0,
      totalFaturamento: 0
    };
    
    return {
      totalAlunos: statsGerais.totalAlunos,
      totalPersonals: personalStats.totalPersonals,
      totalFaturamento: statsGerais.totalFaturamento,
      alunosPagos: statsGerais.alunosIsentos, // Isentos
      alunosLivres: statsGerais.alunosAbertos, // Abertos
      alunosQuitados: statsGerais.alunosQuitados, // Quitados
      personalName: null,
      unidade: null
    };
  }, [personalStats, searchTerm, filteredPersonalStats]);

  // Dados filtrados para tabela de alunos (mantém funcionalidade original)
  const filteredStudentData = useMemo(() => {
    let filtered = selectedUnidade === 'all' 
      ? realStudentsData 
      : realStudentsData.filter(item => item.unidade === selectedUnidade);

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.aluno && item.aluno.toLowerCase().includes(searchLower)) ||
        (item.personal && item.personal.toLowerCase().includes(searchLower))
      );
    }

    if (selectedPersonal) {
      filtered = filtered.filter(item => item.personal === selectedPersonal);
    }

    if (selectedSituacao) {
      filtered = filtered.filter(item => item.situacao === selectedSituacao);
    }

    return filtered;
  }, [realStudentsData, searchTerm, selectedUnidade, selectedPersonal, selectedSituacao]);

  const unidades = [
    { id: 'all', name: 'Todas as Unidades', color: '#6366f1' },
    { id: 'alphaville', name: 'Alphaville', color: '#3b82f6' },
    { id: 'buenavista', name: 'Buena Vista', color: '#10b981' },
    { id: 'marista', name: 'Marista', color: '#f59e0b' }
  ];

  // Função para abrir modal de exclusão
  const handleDeleteAllData = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText('');
  };

  // Função para confirmar exclusão
  const confirmDeleteAllData = async () => {
    if (deleteConfirmText !== "CONFIRMAR EXCLUSÃO") {
      return;
    }

    try {
      // Excluir dados de todas as unidades
      await Promise.all([
        alphaville.clearPersonals(),
        buenavista.clearPersonals(),
        marista.clearPersonals()
      ]);
      
      // Limpar estados locais
      setSearchTerm('');
      setSelectedPersonal('');
      setSelectedSituacao('');
      setSelectedUnidade('all');
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      
    } catch (error) {
      console.error('Erro ao excluir dados:', error);
    }
  };

  // Função para cancelar exclusão
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  };

  return (
    
    <div className="unified-personal-dashboard">
      <NavBar 
        showBackToModules={true}
        currentModule="Personal"
        moduleColor="#8b5cf6"
      />
      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          
          <div className="header-content">
            <div className="header-left">
              <h1 className="dashboard-title">
                <Users size={32} />
                Central de Personal Trainers
              </h1>
              <p className="dashboard-subtitle">
                Gestão unificada de personal trainers de todas as unidades
              </p>
            </div>
            
            <div className="header-actions">
              <button 
                className={`view-btn ${selectedView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setSelectedView('dashboard')}
              >
                <BarChart3 size={18} />
                Dashboard
              </button>
              <button 
                className={`view-btn ${selectedView === 'upload' ? 'active' : ''}`}
                onClick={() => setSelectedView('upload')}
              >
                <Upload size={18} />
                Upload
              </button>
            </div>
          </div>

          {/* Messages */}
          {successMessages.length > 0 && (
            <div className="message success-message">
              <CheckCircle size={20} />
              <span>{successMessages[0]}</span>
            </div>
          )}
          
          {errors.length > 0 && (
            <div className="message error-message">
              <AlertCircle size={20} />
              <span>{errors[0]}</span>
            </div>
          )}
        </div>

        {/* View: Upload */}
        {selectedView === 'upload' && (
          <div className="upload-view">
            <div className="upload-header">
              <h2>
                <FileSpreadsheet size={24} />
                Importar Planilhas por Unidade
              </h2>
              <p>Selecione a unidade e faça o upload da planilha correspondente</p>
            </div>
            
            <UnifiedPersonalUploader />
          </div>
        )}

        {/* View: Dashboard */}
        {selectedView === 'dashboard' && (
          <>
            {/* Barra de Pesquisa Principal com Estatísticas */}
            <div className="search-section">
              <div className="search-container">
                <div className="search-header">
                  <h2><Search size={24} />Buscar Personal Trainer</h2>
                  <p>Digite o nome do personal para encontrar seus alunos</p>
                </div>
                
                <div className="search-with-stats">
                  <div className="main-search">
                    <div className="search-input-wrapper">
                      <Search size={20} />
                      <input
                        type="text"
                        className="search-input main"
                        placeholder="Digite o nome do personal trainer..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setSelectedPersonal('');
                        }}
                        list="personals-list"
                      />
                      {searchTerm && (
                        <button 
                          className="clear-search"
                          onClick={() => setSearchTerm('')}
                        >
                          ×
                        </button>
                      )}
                      
                      {/* Datalist para autocompletar */}
                      <datalist id="personals-list">
                        {personalStats.personalsData?.map((personal, index) => (
                          <option key={index} value={personal.personal} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  
                  {/* Card de Estatísticas */}
                  <div className="stats-card">
                    {/* Cabeçalho do card mostrando o personal ou geral */}
                    {stats.personalName ? (
                      <div className="stats-header">
                        <h3 className="personal-name">{stats.personalName}</h3>
                        <span className={`unit-badge unit-${stats.unidade}`}>
                          {stats.unidade === 'alphaville' ? 'Alphaville' : 
                           stats.unidade === 'buenavista' ? 'Buena Vista' : 
                           stats.unidade === 'marista' ? 'Marista' : stats.unidade}
                        </span>
                      </div>
                    ) : (
                      <div className="stats-header">
                        <h3 className="personal-name">Estatísticas Gerais</h3>
                      </div>
                    )}
                    
                    <div className="stat-item">
                      <div className="stat-icon">
                        <Users size={24} />
                      </div>
                      <div className="stat-content">
                        <span className="stat-number">{stats.totalAlunos}</span>
                        <span className="stat-label">
                          {stats.personalName ? 'Alunos do Personal' : 'Total de Alunos'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-icon">
                        <Activity size={24} />
                      </div>
                      <div className="stat-content">
                        <span className="stat-number">{stats.alunosLivres}</span>
                        <span className="stat-label">Abertos</span>
                      </div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-icon">
                        <CheckCircle size={24} />
                      </div>
                      <div className="stat-content">
                        <span className="stat-number">{stats.alunosPagos}</span>
                        <span className="stat-label">Isentos</span>
                      </div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-icon">
                        <DollarSign size={24} />
                      </div>
                      <div className="stat-content">
                        <span className="stat-number">{stats.alunosQuitados || 0}</span>
                        <span className="stat-label">Quitados</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Painel Detalhado do Personal Pesquisado */}
            {searchTerm && filteredPersonalStats.length > 0 && (
              <div className="personal-detail-panel">
                {filteredPersonalStats.slice(0, 1).map((personal) => {
                  // Buscar dados de validação para este personal
                  const personalValidation = dataWithTaxValidation.find(p => 
                    p.personal === personal.personal && p.unidade === personal.unidade
                  );
                  
                  return (
                    <div key={personal.personal} className="detail-panel-content">
                      <div className="panel-header">
                        <div className="personal-info-detailed">
                          <div className="personal-avatar-large">
                            <User size={32} />
                          </div>
                          <div className="personal-details-main">
                            <h2 className="personal-name-large">{personal.personal}</h2>
                            <div className="personal-meta">
                              <span className={`unit-badge-large unit-${personal.unidade}`}>
                                <MapPin size={14} />
                                {personal.unidade === 'alphaville' ? 'Alphaville' : 
                                 personal.unidade === 'buenavista' ? 'Buena Vista' : 
                                 personal.unidade === 'marista' ? 'Marista' : personal.unidade}
                              </span>
                              <span className="students-count-large">
                                <Users size={14} />
                                {personal.totalAlunos} alunos
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Status de Validação */}
                        {personalValidation?.taxaValidation && (
                          <div className={`validation-status ${personalValidation.taxaValidation.isValid ? 'valid' : 'invalid'}`}>
                            <div className="status-icon">
                              {personalValidation.taxaValidation.isValid ? 
                                <CheckCircle size={24} /> : 
                                <AlertTriangle size={24} />
                              }
                            </div>
                            <div className="status-text">
                              <span className="status-label">
                                {personalValidation.taxaValidation.isValid ? 'Taxa Correta' : 'Taxa Incorreta'}
                              </span>
                              <span className="status-description">
                                {personalValidation.taxaValidation.isValid ? 
                                  'Dentro da faixa esperada' : 
                                  'Fora da faixa esperada'
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Detalhes da Taxa */}
                      {personalValidation?.taxaValidation && (
                        <div className="tax-details-section">
                          <div className="tax-detail-card">
                            <div className="tax-card-header">
                              <DollarSign size={20} />
                              <h3>Detalhes da Taxa</h3>
                            </div>
                            
                            <div className="tax-info-grid">
                              <div className="tax-info-item">
                                <label>Produto Atual:</label>
                                <span className="current-product">{personalValidation.taxaValidation.currentTaxa}</span>
                              </div>
                              
                              <div className="tax-info-item">
                                <label>Requisito:</label>
                                <span className="requirement">{personalValidation.taxaValidation.expectedRange?.description || 'N/A'}</span>
                              </div>
                              
                              <div className="tax-info-item">
                                <label>Alunos Atuais:</label>
                                <span className="current-students">{personalValidation.taxaValidation.totalAlunos} alunos</span>
                              </div>
                              
                              <div className="tax-info-item">
                                <label>Status:</label>
                                <span className={`status-badge ${personalValidation.taxaValidation.isValid ? 'valid' : 'invalid'}`}>
                                  {personalValidation.taxaValidation.isValid ? '✓ Correto' : '✗ Incorreto'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Explicação detalhada */}
                            <div className={`explanation-box ${personalValidation.taxaValidation.isValid ? 'valid' : 'invalid'}`}>
                              <div className="explanation-icon">
                                {personalValidation.taxaValidation.isValid ? 
                                  <CheckCircle size={16} /> : 
                                  <AlertTriangle size={16} />
                                }
                              </div>
                              <div className="explanation-text">
                                {personalValidation.taxaValidation.isValid ? (
                                  <span>
                                    O personal tem <strong>{personalValidation.taxaValidation.totalAlunos} alunos</strong>, 
                                    que está de acordo com o produto aplicado: "{personalValidation.taxaValidation.currentTaxa}".
                                  </span>
                                ) : (
                                  <span>
                                    O personal tem <strong>{personalValidation.taxaValidation.totalAlunos} alunos</strong>, 
                                    que não está de acordo com o produto aplicado: "{personalValidation.taxaValidation.currentTaxa}".
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Seletor de Unidade */}
            <div className="unit-selector-section">
              <h3>Filtrar por Unidade</h3>
              <div className="unit-buttons">
                {unidades.map(unidade => (
                  <button
                    key={unidade.id}
                    className={`unit-btn ${selectedUnidade === unidade.id ? 'active' : ''}`}
                    style={{ '--unit-color': unidade.color }}
                    onClick={() => setSelectedUnidade(unidade.id)}
                  >
                    <MapPin size={16} />
                    {unidade.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Busca Inteligente com Sugestões */}
            <div className="smart-search-section">
              <div className="search-results">
                {searchTerm && filteredPersonalStats.length > 0 && (
                  <div className="search-suggestions">
                    <h3>
                      <Search size={18} />
                      Personals encontrados ({filteredPersonalStats.length})
                    </h3>
                    <div className="suggestions-list">
                      {filteredPersonalStats.slice(0, 5).map((personal) => (
                        <button
                          key={personal.personal}
                          className="suggestion-item"
                          onClick={() => setSelectedPersonal(personal.personal)}
                        >
                          <div className="suggestion-info">
                            <div className="suggestion-header">
                              <User size={16} />
                              <span className="personal-name">{personal.personal}</span>
                              <span className={`unit-badge unit-${personal.unidade}`}>
                                {personal.unidade}
                              </span>
                            </div>
                            <div className="suggestion-stats">
                              <span className="stat"><Users size={14} />{personal.totalAlunos} alunos</span>
                              <span className="stat"><Activity size={14} />{personal.alunosAbertos} abertos</span>
                              <span className="stat"><CheckCircle size={14} />{personal.alunosIsentos} isentos</span>
                              <span className="stat"><DollarSign size={14} />{personal.alunosQuitados} quitados</span>
                            </div>
                          </div>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                      {filteredPersonalStats.length > 5 && (
                        <div className="more-results">
                          +{filteredPersonalStats.length - 5} mais personals encontrados
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {searchTerm && filteredPersonalStats.length === 0 && (
                  <div className="no-results">
                    <Search size={48} />
                    <h3>Nenhum personal encontrado</h3>
                    <p>Tente buscar por outro nome ou verifique a ortografia</p>
                  </div>
                )}
              </div>
            </div>

            {/* Relatório de Validação de Taxas */}
            <TaxValidationReport data={dataWithTaxValidation} />

            {/* Detalhes do Personal Selecionado */}
            {selectedPersonal && (
              <div className="selected-personal-section">
                <div className="section-header">
                  <h2>
                    <User size={20} />
                    Alunos de {selectedPersonal}
                  </h2>
                  <p>Visualize todos os alunos deste personal trainer</p>
                  <button 
                    className="close-details"
                    onClick={() => setSelectedPersonal('')}
                  >
                    ×
                  </button>
                </div>
                
                {(() => {
                  const personalStudents = filteredStudentData.filter(item => 
                    item.personal && item.personal.toLowerCase() === selectedPersonal.toLowerCase()
                  );
                  
                  console.log('Selected Personal:', selectedPersonal);
                  console.log('Filtered Student Data:', filteredStudentData);
                  console.log('Personal Students:', personalStudents);
                  
                  return personalStudents.length === 0 ? (
                    <div className="empty-state">
                      <User size={48} />
                      <h3>Selecione um personal trainer</h3>
                      <p>Use o campo de busca acima para encontrar e selecionar um personal trainer e visualizar seus alunos</p>
                    </div>
                  ) : (
                    <PersonalStudentTable data={personalStudents} />
                  );
                })()}
              </div>
            )}

            {/* Filtros Avançados */}
            <div className="advanced-filters">
              <div className="section-header">
                <h2>
                  <Filter size={20} />
                  Filtros Avançados
                </h2>
                <p>Filtre os dados conforme necessário</p>
              </div>
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Personal Específico</label>
                  <select 
                    className="filter-select"
                    value={selectedPersonal}
                    onChange={(e) => setSelectedPersonal(e.target.value)}
                  >
                    <option value="">Todos os personals</option>
                    {personalStats.personalsData?.map(personal => (
                      <option key={personal.personal} value={personal.personal}>
                        {personal.personal} ({personal.totalAlunos} alunos)
                      </option>
                    )) || []}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Personal</label>
                  <select
                    value={selectedPersonal}
                    onChange={(e) => setSelectedPersonal(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Todos os personals</option>
                    {unifiedStats.personalsUnicos.map(personal => (
                      <option key={personal} value={personal}>{personal}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Situação</label>
                  <select
                    value={selectedSituacao}
                    onChange={(e) => setSelectedSituacao(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Todas as situações</option>
                    <option value="Pago">Pago</option>
                    <option value="Livre">Livre</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Gerenciar Dados</label>
                  <button 
                    className="delete-data-btn"
                    onClick={handleDeleteAllData}
                    title="Excluir todos os dados de personal trainers"
                  >
                    <Trash2 size={16} />
                    Excluir Todos os Dados
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela Focada em Alunos por Personal */}
            <PersonalStudentTable 
              personalStats={personalStats}
              selectedUnidade={selectedUnidade}
            />
          </>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="warning-icon">
                <AlertCircle size={48} />
              </div>
              <h2>⚠️ Excluir Todos os Dados</h2>
              <p>Esta ação é <strong>IRREVERSÍVEL</strong> e não pode ser desfeita.</p>
            </div>
            
            <div className="modal-body">
              <div className="data-summary">
                <h3>Dados que serão excluídos:</h3>
                <ul>
                  <li>• <strong>{personalStats.totalPersonals}</strong> personal trainers</li>
                  <li>• <strong>{personalStats.totalAlunos}</strong> alunos cadastrados</li>
                  <li>• Todos os dados de faturamento</li>
                  <li>• Dados de todas as unidades (Alphaville, Buena Vista, Marista)</li>
                </ul>
              </div>
              
              <div className="confirmation-input">
                <label>
                  Para confirmar, digite <strong>"CONFIRMAR EXCLUSÃO"</strong> no campo abaixo:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Digite: CONFIRMAR EXCLUSÃO"
                  className="confirm-input"
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={cancelDelete}
              >
                Cancelar
              </button>
              <button 
                className="confirm-btn"
                onClick={confirmDeleteAllData}
                disabled={deleteConfirmText !== "CONFIRMAR EXCLUSÃO"}
              >
                <Trash2 size={16} />
                Excluir Todos os Dados
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .unified-personal-dashboard {
          min-height: 100vh;
          background: #f8fafc;
        }

        .dashboard-content {
          margin-left: 0;
          padding: 32px;
          max-width: 100vw;
          padding-top: 100px; /* Espaço para a navbar */
        }

        .dashboard-header {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .header-left {
          flex: 1;
        }

        .dashboard-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 32px;
          font-weight: 700;
        }

        .dashboard-subtitle {
          color: #64748b;
          margin: 0;
          font-size: 16px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid #e2e8f0;
          background: transparent;
          color: #64748b;
          font-size: 14px;
        }

        .view-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .view-btn.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          font-weight: 500;
          margin-top: 16px;
        }

        .success-message {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        /* Variáveis de cores para unidades */
        .unit-alphaville { --unit-color: #10b981; }
        .unit-buenavista { --unit-color: #3b82f6; }
        .unit-marista { --unit-color: #f59e0b; }

        /* Seção de Pesquisa Principal - LIMPA */
        .search-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }

        .search-section:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .search-container {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .search-header h2 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 4px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 700;
        }

        .search-header p {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .search-with-stats {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
          align-items: start;
          margin-bottom: 16px;
        }

        .main-search {
          position: relative;
          width: 100%;
        }

        /* Card de Estatísticas - LIMPO */
        .stats-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          height: fit-content;
          min-height: 180px;
          transition: all 0.3s ease;
        }

        .stats-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .stats-card .stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border: none;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
          border-radius: 10px;
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid rgba(100, 116, 139, 0.1);
        }

        .stats-card .stat-item:hover {
          transform: translateX(4px);
          background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 250, 252, 0.95) 100%);
          box-shadow: 0 8px 16px rgba(51, 65, 85, 0.1);
        }

        .stats-card .stat-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
          transition: all 0.3s ease;
        }

        .stats-card .stat-item:hover .stat-icon {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }

        .stats-card .stat-content {
          flex: 1;
          text-align: left;
        }

        .stats-card .stat-number {
          display: block;
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
          line-height: 1;
          background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stats-card .stat-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
          letter-spacing: 0.3px;
        }

        /* Cabeçalho do card de estatísticas */
        .stats-header {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(100, 116, 139, 0.2);
          text-align: center;
        }

        .personal-name {
          font-size: 18px;
          font-weight: 800;
          background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 12px 0;
          line-height: 1.2;
        }

        .unit-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 25px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .unit-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .unit-badge.unit-alphaville {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
        }

        .unit-badge.unit-buenavista {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
        }

        .unit-badge.unit-marista {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input-wrapper svg {
          position: absolute;
          left: 12px;
          color: #64748b;
          z-index: 2;
          pointer-events: none;
        }

        .search-input.main {
          width: 100%;
          padding: 12px 40px 12px 44px;
          font-size: 14px;
          border: 1px solid rgba(100, 116, 139, 0.2);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.9);
          color: #1e293b;
          transition: all 0.3s ease;
          box-shadow: 0 4px 8px rgba(51, 65, 85, 0.04);
          min-height: 44px;
          font-weight: 500;
        }

        .search-input.main:focus {
          outline: none;
          border-color: #10b981;
          background: white;
        }

        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
          z-index: 10;
        }

        .clear-search:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-50%) scale(1.15);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }

        /* Painel Detalhado do Personal */
        .personal-detail-panel {
          background: white;
          border-radius: 16px;
          padding: 0;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          animation: slideInUp 0.4s ease-out;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .detail-panel-content {
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
        }

        .personal-info-detailed {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .personal-avatar-large {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }

        .personal-details-main {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .personal-name-large {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.2;
        }

        .personal-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .unit-badge-large {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .unit-badge-large.unit-alphaville {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .unit-badge-large.unit-buenavista {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
        }

        .unit-badge-large.unit-marista {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .students-count-large {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(100, 116, 139, 0.1);
          border-radius: 8px;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
        }

        .validation-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          border: 2px solid;
          min-width: 200px;
        }

        .validation-status.valid {
          background: rgba(16, 185, 129, 0.05);
          border-color: #10b981;
          color: #059669;
        }

        .validation-status.invalid {
          background: rgba(239, 68, 68, 0.05);
          border-color: #ef4444;
          color: #dc2626;
        }

        .status-icon {
          flex-shrink: 0;
        }

        .status-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .status-label {
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
        }

        .status-description {
          font-size: 12px;
          opacity: 0.8;
        }

        .tax-details-section {
          padding: 24px 32px;
        }

        .tax-detail-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }

        .tax-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          color: #475569;
        }

        .tax-card-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .tax-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .tax-info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tax-info-item label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .current-product {
          color: #1e293b;
          font-size: 14px;
          font-weight: 500;
          background: white;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .requirement {
          color: #6366f1;
          font-size: 14px;
          font-weight: 600;
        }

        .current-students {
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.valid {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-badge.invalid {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .explanation-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 14px;
          line-height: 1.5;
        }

        .explanation-box.valid {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
          color: #059669;
        }

        .explanation-box.invalid {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.2);
          color: #dc2626;
        }

        .explanation-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .explanation-text {
          flex: 1;
        }

        .explanation-text strong {
          font-weight: 700;
        }

        /* Seção de Personals */
        .personals-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .section-title h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 20px;
          font-weight: 600;
        }

        .section-title p {
          color: #64748b;
          margin: 0;
          font-size: 14px;
        }

        .view-controls {
          display: flex;
          gap: 8px;
        }

        .view-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: 2px solid #e5e7eb;
          background: white;
          color: #64748b;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-toggle:hover {
          border-color: #10b981;
          color: #10b981;
        }

        .view-toggle.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
        }

        /* Grid de Personals */
        .personals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .personal-card {
          background: white;
          border: 2px solid #f1f5f9;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .personal-card:hover {
          border-color: #10b981;
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
        }

        .personal-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .personal-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .personal-info h3 {
          margin: 0 0 4px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .unit-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: var(--unit-color, #64748b);
          color: white;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .personal-stats {
          margin-bottom: 20px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .stat-item:last-child {
          border-bottom: none;
        }

        .stat-item.primary {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1px solid #bbf7d0;
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          background: #10b981;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-item.primary .stat-icon {
          background: #059669;
        }

        .stat-details {
          flex: 1;
        }

        .stat-number {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-item.primary .stat-number {
          font-size: 24px;
          color: #059669;
        }

        .stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .payment-breakdown {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .payment-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
        }

        .payment-item.paid {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .payment-item.free {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .view-details-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dashboard-content {
          margin-left: 280px;
          padding: 20px;
          min-height: 100vh;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          position: relative;
          z-index: 1;
        }

        /* Forçar navbar sempre visível */
        .unified-personal-dashboard {
          display: flex;
        }
        
        .unified-personal-dashboard > .navbar,
        .unified-personal-dashboard .navbar {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 9999 !important;
          width: 280px !important;
          height: 100vh !important;
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          transform: translateX(0) !important;
          background: white !important;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1) !important;
        }

        .view-details-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        /* Tabela de Personals */
        .personals-table {
          overflow-x: auto;
        }

        .personals-table table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .personals-table th {
          background: #f8fafc;
          padding: 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .personals-table td {
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .personals-table tr:hover {
          background: #f8fafc;
        }

        .table-personal {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }

        .paid-count {
          color: #059669;
          font-weight: 600;
        }

        .free-count {
          color: #d97706;
          font-weight: 600;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        /* Estado vazio */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .empty-state svg {
          margin: 0 auto 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 8px;
          color: #374151;
        }

        .empty-state p {
          margin: 0;
        }

        /* Seção de Personal Selecionado */
        .selected-personal-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          position: relative;
        }

        .close-details {
          position: absolute;
          top: 20px;
          right: 20px;
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
          font-size: 18px;
          font-weight: bold;
          transition: all 0.2s ease;
        }

        .close-details:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        /* Busca Inteligente */
        .smart-search-section {
          margin-bottom: 24px;
        }

        .search-suggestions {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .search-suggestions h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px;
          color: #1e293b;
          font-size: 16px;
          font-weight: 600;
        }

        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: #f8fafc;
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
        }

        .suggestion-item:hover {
          background: #f0fdf4;
          border-color: #10b981;
          transform: translateX(4px);
        }

        .suggestion-info {
          flex: 1;
        }

        .suggestion-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .suggestion-header .personal-name {
          font-weight: 600;
          color: #1e293b;
        }

        .suggestion-stats {
          display: flex;
          gap: 16px;
        }

        .suggestion-stats .stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #64748b;
        }

        .more-results {
          text-align: center;
          padding: 12px;
          color: #64748b;
          font-size: 14px;
          font-style: italic;
        }

        .no-results {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .no-results svg {
          margin: 0 auto 16px;
          opacity: 0.5;
        }

        .no-results h3 {
          margin: 0 0 8px;
          color: #374151;
        }

        .no-results p {
          margin: 0;
        }

        /* Filtros Avançados */
        .advanced-filters {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .upload-view {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .upload-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .upload-header h2 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 24px;
          font-weight: 600;
        }

        .upload-header p {
          color: #64748b;
          margin: 0;
          font-size: 16px;
        }

        .unit-selector-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .unit-selector-section h3 {
          margin: 0 0 16px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .unit-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .unit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid var(--unit-color);
          background: rgba(255, 255, 255, 0.9);
          color: var(--unit-color);
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .unit-btn:hover {
          background: var(--unit-color);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        }

        .unit-btn.active {
          background: var(--unit-color);
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .filters-section,
        .table-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .section-header {
          margin-bottom: 24px;
        }

        .section-header h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 20px;
          font-weight: 600;
        }

        .section-header p {
          color: #64748b;
          margin: 0;
          font-size: 14px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 20px;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .search-input-wrapper {
          position: relative;
        }

        .search-input-wrapper svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }

        .search-input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .filter-select {
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        @media (max-width: 1200px) {
          .dashboard-content {
            margin-left: 0 !important;
            max-width: 100vw;
            padding: 100px 20px 20px 20px;
          }
          
          .navbar {
            transform: translateX(-100%) !important;
          }
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 16px;
          }

          .header-actions {
            width: 100%;
            justify-content: stretch;
          }

          .view-btn {
            flex: 1;
            justify-content: center;
          }

          .filters-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .dashboard-content {
            padding: 16px;
          }

          .unit-buttons {
            flex-direction: column;
          }

          .unit-btn {
            justify-content: center;
          }

          /* Responsividade para busca com stats */
          .search-with-stats {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .stats-card {
            order: -1; /* Mostra stats primeiro no mobile */
          }

          .stats-card .stat-item {
            flex-direction: row;
            text-align: center;
          }

          .search-container {
            max-width: 100%;
            padding: 0 16px;
          }
        }

        /* Botão de Exclusão de Dados */
        .delete-data-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
          min-width: 180px;
        }

        .delete-data-btn:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }

        .delete-data-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        .delete-data-btn svg {
          flex-shrink: 0;
        }

        /* Responsividade do botão de exclusão */
        @media (max-width: 768px) {
          .delete-data-btn {
            width: 100%;
            min-width: auto;
            padding: 14px 20px;
            font-size: 16px;
          }
        }

        /* Modal de Confirmação */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          text-align: center;
          padding: 32px 32px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .warning-icon {
          color: #ef4444;
          margin-bottom: 16px;
        }

        .modal-header h2 {
          margin: 0 0 12px;
          color: #1f2937;
          font-size: 24px;
          font-weight: 700;
        }

        .modal-header p {
          margin: 0;
          color: #6b7280;
          font-size: 16px;
        }

        .modal-body {
          padding: 24px 32px;
        }

        .data-summary {
          margin-bottom: 24px;
          padding: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
        }

        .data-summary h3 {
          margin: 0 0 12px;
          color: #991b1b;
          font-size: 16px;
          font-weight: 600;
        }

        .data-summary ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .data-summary li {
          margin: 8px 0;
          color: #7f1d1d;
          font-size: 14px;
        }

        .confirmation-input {
          margin-top: 24px;
        }

        .confirmation-input label {
          display: block;
          margin-bottom: 12px;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
        }

        .confirm-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .confirm-input:focus {
          outline: none;
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          padding: 24px 32px 32px;
          border-top: 1px solid #e5e7eb;
        }

        .cancel-btn {
          flex: 1;
          padding: 12px 24px;
          background: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
        }

        .confirm-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .confirm-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Responsividade do modal */
        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
            margin: 20px;
          }

          .modal-header,
          .modal-body,
          .modal-actions {
            padding-left: 20px;
            padding-right: 20px;
          }

          .modal-actions {
            flex-direction: column;
          }

          .cancel-btn,
          .confirm-btn {
            padding: 14px 20px;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}