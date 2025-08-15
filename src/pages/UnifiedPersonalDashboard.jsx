// src/pages/UnifiedPersonalDashboard.jsx - VERSÃO REDESENHADA
import React, { useState, useMemo } from 'react';
// Precisa importar X também
import { 
  Users, Upload, Download, Search, Filter, BarChart3, TrendingUp,
  FileSpreadsheet, AlertCircle, AlertTriangle, CheckCircle, MapPin,
  Activity, User, Star, DollarSign, Eye, ChevronRight, Trash2,
  Calendar, Clock, UserX, X
} from 'lucide-react';
import NavBar from '../components/NavBar.jsx';
import UnifiedPersonalUploader from '../components/personal/UnifiedPersonalUploader';
import PersonalStudentTable from '../components/personal/PersonalStudentTable';
import { usePersonals } from '../hooks/usePersonals';

export default function UnifiedPersonalDashboard() {
  const [selectedView, setSelectedView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnidade, setSelectedUnidade] = useState('all');
  const [selectedPersonal, setSelectedPersonal] = useState('');
  const [selectedSituacao, setSelectedSituacao] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tax-validation' | 'pending-students'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [successMessages, setSuccessMessages] = useState([]);
  const [errors, setErrors] = useState([]);
  const [showStudents, setShowStudents] = useState(false);
  const [selectedPersonalForStudents, setSelectedPersonalForStudents] = useState('');
  
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
    return data;
  }, [alphaville.personals, buenavista.personals, marista.personals]);

  // Função para filtrar alunos reais
  const isRealStudent = (aluno) => {
    if (!aluno) return false;
    const alunoLower = aluno.toLowerCase().trim();
    const adminKeywords = [
      'assinar contrato', 'atualizar telefone', 'atualizar cpf', 'observar se tem alunos',
      'caso nao solicitar isencao', 'caso não solicitar isenção', 'solicitar isenção',
      'alunos de personal do alphaville', 'alunos de personal no marista', 
      'alunos de personal da buenavista', 'alunos de personal buena vista'
    ];
    return !adminKeywords.some(keyword => alunoLower.includes(keyword));
  };

  const realStudentsData = useMemo(() => {
    return allPersonalsData.filter(item => isRealStudent(item.aluno));
  }, [allPersonalsData]);

  // Função para classificar alunos
  const classifyStudent = (item) => {
    const valor = item.valorFinal || 0;
    const situacao = item.situacao;
    
    if (valor === 0 && situacao === 'Livre') return 'Aberto';
    if (valor === 0 && situacao === 'Pago') return 'Isento';
    if (valor > 0 && situacao === 'Pago') return 'Quitado';
    return 'Indefinido';
  };

  // 🎯 NOVA LÓGICA: Validação de taxa unificada corrigida
  const validateUnifiedTax = (totalStudents, currentTaxName) => {
    if (!currentTaxName) return { isValid: false, expectedTax: 'Taxa não informada', taxType: 'open' };
    
    const normalizedCurrent = currentTaxName.toLowerCase();
    
    // Verificar se é taxa com "apos" - não precisa validar
    if (normalizedCurrent.includes('apos')) {
      return { isValid: true, expectedTax: 'Taxa com prazo especial', taxType: 'special', skipValidation: true };
    }
    
    // Verificar se é personal isento (Alpha Personal Interno Taxa)
    if (normalizedCurrent.includes('alpha personal interno taxa')) {
      return { isValid: true, expectedTax: 'Personal Isento', taxType: 'exempt', skipValidation: true };
    }
    
    let expectedTax = '';
    let isValid = false;
    
    // Determinar a taxa esperada baseada no total de alunos
    if (totalStudents >= 1 && totalStudents <= 7) {
      expectedTax = 'Taxa Personal 1 A 7 Alunos';
      isValid = normalizedCurrent.includes('1 a 7') || normalizedCurrent.includes('1-7');
    } else if (totalStudents >= 8 && totalStudents <= 12) {
      expectedTax = 'Taxa Personal 8 A 12 Alunos';
      isValid = normalizedCurrent.includes('8 a 12') || normalizedCurrent.includes('8-12');
    } else if (totalStudents >= 13 && totalStudents <= 16) {
      expectedTax = 'Taxa Personal 13 A 16 Alunos';
      isValid = normalizedCurrent.includes('13 a 16') || normalizedCurrent.includes('13-16');
    } else if (totalStudents >= 17) {
      expectedTax = 'Taxa Personal Acima 17 Alunos';
      isValid = normalizedCurrent.includes('acima 17') || 
                normalizedCurrent.includes('17 alunos ou mais') ||
                normalizedCurrent.includes('17+') ||
                normalizedCurrent.includes('mais de 17');
    }
    
    return { isValid, expectedTax, totalStudents, taxType: 'regular' };
  };

  // Estatísticas por personal (agrupado por pessoa)
  const personalStats = useMemo(() => {
    const filteredData = selectedUnidade === 'all' 
      ? realStudentsData 
      : realStudentsData.filter(item => item.unidade === selectedUnidade);

    const personalGroups = filteredData.reduce((acc, item) => {
      const personal = item.personal || 'Sem Personal';
      
      if (!acc[personal]) {
        acc[personal] = {
          personal,
          unidades: new Set(),
          alunos: new Set(),
          alunosAbertos: new Set(),
          alunosIsentos: new Set(),
          alunosQuitados: new Set(),
          totalFaturamento: 0,
          produtos: new Set() // Rastrear produtos aplicados
        };
      }
      
      const classification = classifyStudent(item);
      
      acc[personal].unidades.add(item.unidade);
      acc[personal].alunos.add(item.aluno);
      acc[personal].totalFaturamento += (item.valorFinal || 0);
      
      // Adicionar produtos/taxas aplicados
      if (item.produto) acc[personal].produtos.add(item.produto);
      if (item.plano) acc[personal].produtos.add(item.plano);
      
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

    const personalArray = Object.values(personalGroups).map(group => {
      const alunosAbertos = group.alunosAbertos.size;
      const alunosIsentos = group.alunosIsentos.size;
      const alunosQuitados = group.alunosQuitados.size;
      const unidadesArray = Array.from(group.unidades);
      const produtosArray = Array.from(group.produtos);
      
      return {
        ...group,
        totalAlunos: group.alunos.size,
        alunosAbertos,
        alunosIsentos, 
        alunosQuitados,
        unidades: unidadesArray,
        produtos: produtosArray,
        unidade: unidadesArray.length === 1 ? unidadesArray[0] : 'Múltiplas',
        alunos: Array.from(group.alunos),
        alunosParaDivergencia: alunosQuitados + alunosIsentos
      };
    }).sort((a, b) => b.totalAlunos - a.totalAlunos);

    return {
      personalsData: personalArray,
      totalPersonals: personalArray.length,
      totalAlunosReais: filteredData.length,
      totalAlunosUnicos: [...new Set(filteredData.map(item => item.aluno))].length,
      valorTotalFaturamento: filteredData.reduce((sum, item) => sum + (item.valorFinal || 0), 0)
    };
  }, [realStudentsData, selectedUnidade]);

  // 🎯 VALIDAÇÃO DE TAXAS CORRIGIDA
  const taxValidationData = useMemo(() => {
    return personalStats.personalsData.map(personal => {
      // Pegar o primeiro produto encontrado como referência
      const currentTax = personal.produtos[0] || '';
      const validation = validateUnifiedTax(personal.totalAlunos, currentTax);
      
      return {
        ...personal,
        taxValidation: {
          ...validation,
          currentTax: personal.produtos.join(', ') || 'Taxa não informada',
          hasMultipleTaxes: personal.produtos.length > 1
        }
      };
    });
  }, [personalStats.personalsData]);

  // 🎯 PERSONALS COM ALUNOS EM ABERTO E CATEGORIZAÇÃO
  const personalsWithOpenTax = useMemo(() => {
    return taxValidationData.filter(personal => personal.taxValidation.taxType === 'open');
  }, [taxValidationData]);

  const personalsWithExemptTax = useMemo(() => {
    return taxValidationData.filter(personal => personal.taxValidation.taxType === 'exempt');
  }, [taxValidationData]);

  const personalsWithSpecialTax = useMemo(() => {
    return taxValidationData.filter(personal => personal.taxValidation.taxType === 'special');
  }, [taxValidationData]);

  // Filtrar nomes para autocomplete
  const filteredNames = useMemo(() => {
    if (!searchTerm) return [];
    return personalStats.personalsData.map(personal => personal.personal).filter(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8);
  }, [personalStats.personalsData, searchTerm]);

  // Dados filtrados por busca
  const filteredPersonalStats = useMemo(() => {
    if (!searchTerm) return personalStats.personalsData;
    return personalStats.personalsData.filter(personal =>
      personal.personal.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [personalStats.personalsData, searchTerm]);

  const personalsWithPendingStudents = useMemo(() => {
    return filteredPersonalStats.filter(personal => personal.alunosAbertos > 0);
  }, [filteredPersonalStats]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalPersonals = personalStats.totalPersonals;
    const totalStudents = personalStats.totalAlunosUnicos;
    // Contar apenas taxas regulares inválidas (excluir special e exempt)
    const invalidTaxes = taxValidationData.filter(p => 
      p.taxValidation.taxType === 'regular' && !p.taxValidation.isValid
    ).length;
    const pendingStudents = personalsWithPendingStudents.length;
    const totalPendingCount = personalsWithPendingStudents.reduce((sum, p) => sum + p.alunosAbertos, 0);
    const openTaxPersonals = personalsWithOpenTax.length;
    const exemptPersonals = personalsWithExemptTax.length;
    const specialTaxPersonals = personalsWithSpecialTax.length;
    
    return {
      totalPersonals,
      totalStudents,
      invalidTaxes,
      validTaxes: totalPersonals - invalidTaxes - openTaxPersonals,
      pendingStudents,
      totalPendingCount,
      openTaxPersonals,
      exemptPersonals,
      specialTaxPersonals
    };
  }, [personalStats, taxValidationData, personalsWithPendingStudents, personalsWithOpenTax, personalsWithExemptTax, personalsWithSpecialTax]);

  // Funções para modal de exclusão
  const handleDeleteAllData = () => {
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  };

  const confirmDeleteAllData = async () => {
    if (deleteConfirmText !== "CONFIRMAR EXCLUSÃO") return;
    
    try {
      setSuccessMessages(['Todos os dados foram excluídos com sucesso!']);
      setErrors([]);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      // Aqui você pode adicionar a lógica real de exclusão
    } catch (error) {
      setErrors(['Erro ao excluir dados: ' + error.message]);
      setSuccessMessages([]);
    }
  };

  // Função para obter alunos de um personal específico
  const getStudentsForPersonal = (personalName) => {
    return realStudentsData.filter(item => item.personal === personalName)
      .map(item => ({
        ...item,
        classificacao: classifyStudent(item)
      }))
      .sort((a, b) => {
        const order = { 'Aberto': 0, 'Isento': 1, 'Quitado': 2, 'Indefinido': 3 };
        return order[a.classificacao] - order[b.classificacao];
      });
  };

  // Função para lidar com visualização de alunos
  const handleViewStudents = (personalName) => {
    if (selectedPersonalForStudents === personalName && showStudents) {
      // Se já está mostrando os alunos deste personal, fechar
      setShowStudents(false);
      setSelectedPersonalForStudents('');
    } else {
      // Mostrar alunos do personal selecionado
      setSelectedPersonalForStudents(personalName);
      setShowStudents(true);
    }
  };

  // Componente: Card de Estatísticas
  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue", onClick }) => (
    <div 
      className={`stat-card stat-card-${color} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-icon">
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  // Componente: Relatório de Validação de Taxas
  const TaxValidationReport = () => {
    // Filtrar apenas taxas regulares inválidas
    const invalidTaxes = taxValidationData.filter(p => 
      p.taxValidation.taxType === 'regular' && !p.taxValidation.isValid
    );
    
    if (invalidTaxes.length === 0) {
      return (
        <div className="validation-success">
          <CheckCircle size={48} />
          <h3>Todas as taxas regulares estão corretas!</h3>
          <p>Todos os personals com taxas regulares têm valores adequados para sua quantidade de alunos</p>
          
          {/* Informações adicionais */}
          <div className="additional-info">
            <div className="info-item">
              <span className="info-label">Personals Isentos:</span>
              <span className="info-value">{stats.exemptPersonals}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Taxas Especiais (com prazo):</span>
              <span className="info-value">{stats.specialTaxPersonals}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Personals em Aberto:</span>
              <span className="info-value">{stats.openTaxPersonals}</span>
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
      );
    }

  return (
      <div className="validation-issues">
        <div className="issues-header">
          <h3>
            <AlertTriangle size={20} />
            {invalidTaxes.length} Personal{invalidTaxes.length > 1 ? 's' : ''} com Taxa Incorreta
          </h3>
        </div>
        
        <div className="issues-list">
          {invalidTaxes.map((personal, index) => (
            <div key={index} className="issue-card">
              <div className="issue-header">
                <div className="personal-info">
                  <User size={16} />
                  <span className="personal-name">{personal.personal}</span>
                  <span className="units-badge">
                    {personal.unidades.join(', ')}
                  </span>
                </div>
                <div className="student-count">
                  {personal.totalAlunos} alunos
                </div>
              </div>
              
              <div className="issue-details">
                <div className="tax-comparison">
                  <div className="current-tax">
                    <label>Taxa Atual:</label>
                    <span className="tax-value error">{personal.taxValidation.currentTax}</span>
                  </div>
                  <div className="expected-tax">
                    <label>Taxa Esperada:</label>
                    <span className="tax-value correct">{personal.taxValidation.expectedTax}</span>
                  </div>
                </div>
                
                <div className="students-breakdown">
                  <div className="breakdown-item">
                    <Activity size={14} />
                    <span>{personal.alunosAbertos} Abertos</span>
                  </div>
                  <div className="breakdown-item">
                    <CheckCircle size={14} />
                    <span>{personal.alunosIsentos} Isentos</span>
                  </div>
                  <div className="breakdown-item">
                    <DollarSign size={14} />
                    <span>{personal.alunosQuitados} Quitados</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Componente: Personals com Alunos Pendentes
  const PendingStudentsReport = () => {
    if (personalsWithPendingStudents.length === 0) {
      return (
        <div className="validation-success">
          <CheckCircle size={48} />
          <h3>Nenhum aluno em aberto!</h3>
          <p>Todos os alunos estão com situação regularizada</p>
        </div>
      );
    }

    return (
      <div className="pending-issues">
        <div className="issues-header">
          <h3>
            <Clock size={20} />
            {personalsWithPendingStudents.length} Personal{personalsWithPendingStudents.length > 1 ? 's' : ''} com Alunos em Aberto
          </h3>
          <div className="total-pending">
            Total: {stats.totalPendingCount} alunos pendentes
          </div>
        </div>
        
        <div className="pending-list">
          {personalsWithPendingStudents.map((personal, index) => (
            <div key={index} className="pending-card">
              <div className="pending-header">
                <div className="personal-info">
                  <User size={16} />
                  <span className="personal-name">{personal.personal}</span>
                  <span className="units-badge">
                    {personal.unidades.join(', ')}
                  </span>
                </div>
                <div className="pending-count">
                  <Clock size={16} />
                  {personal.alunosAbertos} em aberto
                </div>
              </div>
              
              <div className="pending-details">
                <div className="students-summary">
                  <div className="summary-item">
                    <span className="label">Total de Alunos:</span>
                    <span className="value">{personal.totalAlunos}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Abertos:</span>
                    <span className="value pending">{personal.alunosAbertos}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Isentos:</span>
                    <span className="value">{personal.alunosIsentos}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Quitados:</span>
                    <span className="value">{personal.alunosQuitados}</span>
                  </div>
                </div>
                
                <button 
                  className="view-details-btn"
                  onClick={() => setSelectedPersonal(personal.personal)}
                >
                  <Eye size={14} />
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Componente: Personals em Aberto
  const OpenPersonalsReport = () => {
    if (personalsWithOpenTax.length === 0) {
      return (
        <div className="validation-success">
          <CheckCircle size={48} />
          <h3>Nenhum personal em aberto!</h3>
          <p>Todos os personals têm taxas definidas</p>
        </div>
      );
    }

    return (
      <div className="open-personals-issues">
        <div className="issues-header">
          <h3>
            <UserX size={20} />
            {personalsWithOpenTax.length} Personal{personalsWithOpenTax.length > 1 ? 's' : ''} em Aberto
          </h3>
          <div className="total-open">
            Sem taxa definida
          </div>
        </div>
        
        <div className="open-personals-list">
          {personalsWithOpenTax.map((personal, index) => (
            <div key={index} className="open-personal-card">
              <div className="open-personal-header">
                <div className="personal-info">
                  <User size={16} />
                  <span className="personal-name">{personal.personal}</span>
                  <span className="units-badge">
                    {personal.unidades.join(', ')}
                  </span>
                </div>
                <div className="open-status">
                  <UserX size={16} />
                  Em Aberto
                </div>
              </div>
              
              <div className="open-personal-details">
                <div className="students-summary">
                  <div className="summary-item">
                    <span className="label">Total de Alunos:</span>
                    <span className="value">{personal.totalAlunos}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Abertos:</span>
                    <span className="value pending">{personal.alunosAbertos}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Isentos:</span>
                    <span className="value">{personal.alunosIsentos}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Quitados:</span>
                    <span className="value">{personal.alunosQuitados}</span>
                  </div>
                </div>
                
                <div className="tax-info-section">
                  <div className="tax-status-info">
                    <span className="tax-label">Status:</span>
                    <span className="tax-value open">Sem taxa definida</span>
                  </div>
                  <div className="action-needed">
                    <AlertCircle size={14} />
                    <span>Ação necessária: Definir taxa adequada</span>
                  </div>
                </div>
                
                <button 
                  className="view-details-btn"
                  onClick={() => handleViewStudents(personal.personal)}
                >
                  <Eye size={14} />
                  {selectedPersonalForStudents === personal.personal && showStudents ? 'Ocultar Alunos' : 'Ver Alunos'}
                </button>
              </div>
              
              {/* Dropdown de Alunos */}
              {selectedPersonalForStudents === personal.personal && showStudents && (
                <div className="students-dropdown">
                  <div className="students-dropdown-header">
                    <h4>Alunos de {personal.personal}</h4>
                    <span className="students-count-badge">
                      {getStudentsForPersonal(personal.personal).length} alunos
                    </span>
                  </div>
                  
                  <div className="students-dropdown-grid">
                    {getStudentsForPersonal(personal.personal).map((student, index) => (
                      <div key={index} className={`student-dropdown-card student-${student.classificacao.toLowerCase()}`}>
                        <div className="student-dropdown-header">
                          <div className="student-dropdown-info">
                            <h5>{student.aluno}</h5>
                            <div className="student-dropdown-meta">
                              <span className="unit-info">
                                <MapPin size={10} />
                                {student.unidade}
                              </span>
                              <span className={`status-badge-small status-${student.classificacao.toLowerCase()}`}>
                                {student.classificacao === 'Aberto' && <Clock size={10} />}
                                {student.classificacao === 'Isento' && <Activity size={10} />}
                                {student.classificacao === 'Quitado' && <CheckCircle size={10} />}
                                {student.classificacao === 'Indefinido' && <AlertCircle size={10} />}
                                {student.classificacao}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="student-dropdown-details">
                          <div className="detail-item-small">
                            <span className="detail-label-small">Produto:</span>
                            <span className="detail-value-small">{student.produto || 'N/A'}</span>
                          </div>
                          <div className="detail-item-small">
                            <span className="detail-label-small">Valor:</span>
                            <span className="detail-value-small">
                              {student.valorFinal > 0 
                                ? `R$ ${student.valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                                : 'Gratuito'
                              }
                            </span>
                          </div>
                          <div className="detail-item-small">
                            <span className="detail-label-small">Situação:</span>
                            <span className="detail-value-small">{student.situacao}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {getStudentsForPersonal(personal.personal).length === 0 && (
                    <div className="no-students-small">
                      <Users size={24} />
                      <span>Nenhum aluno encontrado</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="unified-personal-dashboard">
      <NavBar 
        showBackToModules={true}
        currentModule="Personal"
        moduleColor="#8b5cf6"
      />
      
      <div className="dashboard-content">
        {/* Header Principal */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-text">
              <h1>
                <Users size={32} />
                Personal Trainers
              </h1>
              <p>Gestão unificada e validação de taxas</p>
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
              <button 
                className="delete-btn"
                onClick={handleDeleteAllData}
                title="Excluir todos os dados"
              >
                <Trash2 size={18} />
                Excluir Tudo
              </button>
            </div>
          </div>
        </div>

        {selectedView === 'upload' ? (
          <div className="upload-section">
            <UnifiedPersonalUploader />
          </div>
        ) : (
          <>
            {/* Cards de Estatísticas Principais */}
            <div className="stats-grid">
              <StatCard
                icon={Users}
                title="Total de Personals"
                value={stats.totalPersonals}
                subtitle="Ativos em todas as unidades"
                color="blue"
              />
              <StatCard
                icon={User}
                title="Total de Alunos"
                value={stats.totalStudents}
                subtitle="Alunos únicos cadastrados"
                color="green"
              />
              <StatCard
                icon={AlertTriangle}
                title="Taxas Incorretas"
                value={stats.invalidTaxes}
                subtitle="Personals com taxa divergente"
                color="red"
                onClick={() => setActiveTab('tax-validation')}
              />
              <StatCard
                icon={Clock}
                title="Alunos em Aberto"
                value={stats.totalPendingCount}
                subtitle={`Em ${stats.pendingStudents} personals`}
                color="orange"
                onClick={() => setActiveTab('pending-students')}
              />
              <StatCard
                icon={UserX}
                title="Personals em Aberto"
                value={stats.openTaxPersonals}
                subtitle="Sem taxa definida"
                color="purple"
                onClick={() => setActiveTab('open-personals')}
              />
            </div>

            {/* Busca Principal */}
            <div className="search-section">
              <div className="search-header">
                <h2>Buscar Personal Trainer</h2>
                <p>Digite o nome para encontrar informações detalhadas</p>
              </div>
              
              <div className="search-container">
                <div className="search-input-wrapper">
                  <Search size={20} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Ex: João Carlos Simão..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => setSearchTerm('')}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs de Navegação */}
            <div className="tabs-navigation">
              <button 
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <BarChart3 size={16} />
                Visão Geral
              </button>
              <button 
                className={`tab-btn ${activeTab === 'tax-validation' ? 'active' : ''}`}
                onClick={() => setActiveTab('tax-validation')}
              >
                <AlertTriangle size={16} />
                Validação de Taxas
                {stats.invalidTaxes > 0 && (
                  <span className="badge">{stats.invalidTaxes}</span>
                )}
              </button>
              <button 
                className={`tab-btn ${activeTab === 'pending-students' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending-students')}
              >
                <Clock size={16} />
                Alunos em Aberto
                {stats.totalPendingCount > 0 && (
                  <span className="badge">{stats.totalPendingCount}</span>
                )}
              </button>
              <button 
                className={`tab-btn ${activeTab === 'open-personals' ? 'active' : ''}`}
                onClick={() => setActiveTab('open-personals')}
              >
                <UserX size={16} />
                Personals em Aberto
                {stats.openTaxPersonals > 0 && (
                  <span className="badge">{stats.openTaxPersonals}</span>
                )}
              </button>
            </div>

            {/* Conteúdo das Tabs */}
            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-content">
                  {searchTerm ? (
                    // Mostra resultados da busca
                    <div className="search-results-section">
                      <div className="search-results-header">
                        <h3>
                          <Search size={20} />
                          Resultados para "{searchTerm}"
                        </h3>
                        <button 
                          className="clear-search-btn"
                          onClick={() => setSearchTerm('')}
                        >
                          <X size={16} />
                          Limpar busca
                        </button>
                      </div>
                      
                      {filteredPersonalStats.length > 0 ? (
                        <div className="personal-cards-grid">
                          {filteredPersonalStats.map((personal, index) => (
                            <div key={index} className="personal-result-card">
                              <div className="personal-card-header">
                                <div className="personal-avatar">
                                  <User size={20} />
                                </div>
                                <div className="personal-info">
                                  <h4>{personal.personal}</h4>
                                  <div className="personal-badges">
                                    {personal.unidades.map(unidade => (
                                      <span key={unidade} className={`unit-badge unit-${unidade}`}>
                                        {unidade === 'alphaville' ? 'Alphaville' : 
                                         unidade === 'buenavista' ? 'Buena Vista' : 
                                         unidade === 'marista' ? 'Marista' : unidade}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="personal-stats-grid">
                                <div className="stat-item">
                                  <div className="stat-icon users">
                                    <Users size={16} />
                                  </div>
                                  <div className="stat-info">
                                    <span className="stat-number">{personal.totalAlunos}</span>
                                    <span className="stat-label">Total</span>
                                  </div>
                                </div>
                                
                                <div className="stat-item">
                                  <div className="stat-icon pending">
                                    <Clock size={16} />
                                  </div>
                                  <div className="stat-info">
                                    <span className="stat-number">{personal.alunosAbertos}</span>
                                    <span className="stat-label">Abertos</span>
                                  </div>
                                </div>
                                
                                <div className="stat-item">
                                  <div className="stat-icon exempt">
                                    <CheckCircle size={16} />
                                  </div>
                                  <div className="stat-info">
                                    <span className="stat-number">{personal.alunosIsentos}</span>
                                    <span className="stat-label">Isentos</span>
                                  </div>
                                </div>
                                
                                <div className="stat-item">
                                  <div className="stat-icon paid">
                                    <DollarSign size={16} />
                                  </div>
                                  <div className="stat-info">
                                    <span className="stat-number">{personal.alunosQuitados}</span>
                                    <span className="stat-label">Quitados</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Validação de Taxa */}
                              <div className="tax-validation-card">
                                {(() => {
                                  const taxValidation = taxValidationData.find(p => p.personal === personal.personal);
                                  const validation = taxValidation?.taxValidation;
                                  const isValid = validation?.isValid;
                                  const taxType = validation?.taxType;
                                  
                                  let statusClass = 'tax-valid';
                                  let icon = <CheckCircle size={16} />;
                                  let label = 'Taxa Correta';
                                  
                                  if (taxType === 'open') {
                                    statusClass = 'tax-open';
                                    icon = <UserX size={16} />;
                                    label = 'Em Aberto';
                                  } else if (taxType === 'exempt') {
                                    statusClass = 'tax-exempt';
                                    icon = <Star size={16} />;
                                    label = 'Isento';
                                  } else if (taxType === 'special') {
                                    statusClass = 'tax-special';
                                    icon = <Clock size={16} />;
                                    label = 'Taxa Especial';
                                  } else if (!isValid) {
                                    statusClass = 'tax-invalid';
                                    icon = <AlertTriangle size={16} />;
                                    label = 'Taxa Incorreta';
                                  }
                                  
                                  return (
                                    <div className={`tax-status ${statusClass}`}>
                                      <div className="tax-icon">
                                        {icon}
                                      </div>
                                      <div className="tax-info">
                                        <span className="tax-label">
                                          {label}
                                        </span>
                                        {taxType === 'regular' && !isValid && validation && (
                                          <div className="tax-details">
                                            <small>Atual: {validation.currentTax}</small>
                                            <small>Esperada: {validation.expectedTax}</small>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              
                              <div className="personal-actions">
                                <button 
                                  className="view-students-btn"
                                  onClick={() => handleViewStudents(personal.personal)}
                                >
                                  <Eye size={14} />
                                  Ver Alunos
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-search-results">
                          <Search size={48} />
                          <h3>Nenhum personal encontrado</h3>
                          <p>Não foram encontrados personals com o termo "{searchTerm}"</p>
                          <button 
                            className="btn btn-primary"
                            onClick={() => setSearchTerm('')}
                          >
                            Ver todos os personals
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Mostra tabela geral quando não há busca
                    <PersonalStudentTable 
                      personalStats={personalStats}
                      selectedUnidade={selectedUnidade}
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'tax-validation' && (
                <div className="tax-validation-content">
                  <TaxValidationReport />
                </div>
              )}
              
              {activeTab === 'pending-students' && (
                <div className="pending-students-content">
                  <PendingStudentsReport />
                </div>
              )}
              
              {activeTab === 'open-personals' && (
                <div className="open-personals-content">
                  <OpenPersonalsReport />
                </div>
              )}
            </div>

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
                  <li>• <strong>{stats.totalPersonals}</strong> personal trainers</li>
                  <li>• <strong>{stats.totalStudents}</strong> alunos cadastrados</li>
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

      {/* Styles */}
      <style jsx>{`
        .unified-personal-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .dashboard-content {
          margin-left: 280px;
          padding: 32px;
          padding-top: 100px;
        }

        /* Header */
        .dashboard-header {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-text h1 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 32px;
          font-weight: 700;
        }

        .header-text p {
          color: #64748b;
          margin: 0;
          font-size: 16px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid #e2e8f0;
          background: white;
          color: #64748b;
        }

        .view-btn:hover {
          border-color: #10b981;
          color: #10b981;
        }

        .view-btn.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-color: #10b981;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .delete-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid #ef4444;
          background: white;
          color: #ef4444;
        }

        .delete-btn:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border-color: #ef4444;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
        }

        /* Messages */
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

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .stat-card.clickable {
          cursor: pointer;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .stat-card.clickable:hover {
          border-color: #10b981;
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .stat-card-blue .stat-icon {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .stat-card-green .stat-icon {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .stat-card-red .stat-icon {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .stat-card-orange .stat-icon {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .stat-card-purple .stat-icon {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-title {
          font-size: 16px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 2px;
        }

        .stat-subtitle {
          font-size: 14px;
          color: #64748b;
        }

        /* Search Section */
        .search-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          text-align: center;
        }

        .search-header h2 {
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 24px;
          font-weight: 700;
        }

        .search-header p {
          color: #64748b;
          margin: 0 0 24px;
        }

        .search-container {
          max-width: 500px;
          margin: 0 auto;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input-wrapper svg {
          position: absolute;
          left: 16px;
          color: #64748b;
          z-index: 2;
        }

        .search-input {
          width: 100%;
          padding: 16px 20px 16px 52px;
          font-size: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          background: #f8fafc;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #10b981;
          background: white;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .clear-search:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        /* Tabs Navigation */
        .tabs-navigation {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: white;
          padding: 8px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          background: transparent;
          color: #64748b;
          border-radius: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .tab-btn:hover {
          background: #f8fafc;
          color: #10b981;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .badge {
          background: #ef4444;
          color: white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 4px;
        }

        .tab-btn.active .badge {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Tab Content */
        .tab-content {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          min-height: 400px;
        }

        /* Validation Success/Issues */
        .validation-success {
          text-align: center;
          padding: 60px 20px;
          color: #059669;
        }

        .validation-success svg {
          margin: 0 auto 16px;
          color: #10b981;
        }

        .validation-success h3 {
          margin: 0 0 8px;
          color: #059669;
          font-size: 24px;
        }

        .validation-success p {
          margin: 0;
          color: #64748b;
        }

        .additional-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
          padding: 20px;
          background: rgba(16, 185, 129, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.1);
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .info-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        .info-value {
          font-size: 16px;
          color: #1e293b;
          font-weight: 600;
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          padding: 4px 12px;
          border-radius: 6px;
        }

        .validation-issues,
        .pending-issues {
          width: 100%;
        }

        .issues-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f1f5f9;
        }

        .issues-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #dc2626;
          font-size: 20px;
          font-weight: 600;
        }

        .total-pending {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .issues-list,
        .pending-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .issue-card,
        .pending-card {
          background: #fef2f2;
          border: 2px solid #fecaca;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .pending-card {
          background: #fffbeb;
          border-color: #fed7aa;
        }

        .issue-card:hover,
        .pending-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .issue-header,
        .pending-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .personal-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .personal-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 16px;
        }

        .units-badge {
          background: rgba(100, 116, 139, 0.1);
          color: #475569;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .student-count {
          background: #dc2626;
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .pending-count {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f59e0b;
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .issue-details,
        .pending-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tax-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .current-tax,
        .expected-tax {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .current-tax label,
        .expected-tax label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tax-value {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .tax-value.error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .tax-value.correct {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .students-breakdown {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
          font-size: 14px;
          color: #475569;
        }

        .students-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
        }

        .summary-item .label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .summary-item .value {
          font-size: 14px;
          color: #1e293b;
          font-weight: 600;
        }

        .summary-item .value.pending {
          color: #f59e0b;
        }

        .view-details-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          align-self: flex-start;
        }

        .view-details-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        /* Open Personals Styles */
        .open-personals-issues {
          width: 100%;
        }

        .open-personals-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .open-personal-card {
          background: #faf5ff;
          border: 2px solid #e9d5ff;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .open-personal-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .open-personal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .open-status {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #8b5cf6;
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .open-personal-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .total-open {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .tax-info-section {
          background: rgba(255, 255, 255, 0.7);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .tax-status-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .tax-status-info .tax-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tax-status-info .tax-value.open {
          background: rgba(139, 92, 246, 0.1);
          color: #7c3aed;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .action-needed {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #dc2626;
          font-size: 12px;
          font-weight: 500;
        }

        /* Students Dropdown Styles */
        .students-dropdown {
          margin-top: 16px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          border: 2px solid rgba(139, 92, 246, 0.2);
          animation: slideDown 0.3s ease-out;
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

        .students-dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        }

        .students-dropdown-header h4 {
          margin: 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 600;
        }

        .students-count-badge {
          background: rgba(139, 92, 246, 0.1);
          color: #7c3aed;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .students-dropdown-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .student-dropdown-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .student-dropdown-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
        }

        .student-dropdown-card.student-aberto::before {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .student-dropdown-card.student-isento::before {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .student-dropdown-card.student-quitado::before {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .student-dropdown-card.student-indefinido::before {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .student-dropdown-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .student-dropdown-header {
          margin-bottom: 12px;
        }

        .student-dropdown-info h5 {
          margin: 0 0 6px;
          color: #1e293b;
          font-size: 14px;
          font-weight: 600;
        }

        .student-dropdown-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .unit-info {
          display: flex;
          align-items: center;
          gap: 3px;
          color: #64748b;
          font-size: 11px;
          font-weight: 500;
        }

        .status-badge-small {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .status-badge-small.status-aberto {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .status-badge-small.status-isento {
          background: rgba(59, 130, 246, 0.1);
          color: #1d4ed8;
        }

        .status-badge-small.status-quitado {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .status-badge-small.status-indefinido {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .student-dropdown-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-item-small {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .detail-item-small:last-child {
          border-bottom: none;
        }

        .detail-label-small {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .detail-value-small {
          font-size: 12px;
          color: #1e293b;
          font-weight: 600;
        }

        .no-students-small {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px;
          color: #64748b;
          font-size: 14px;
        }

        /* Search Section */
        .search-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          text-align: center;
        }

        .search-header h2 {
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 28px;
          font-weight: 700;
        }

        .search-header p {
          color: #64748b;
          margin: 0 0 24px;
        }

        .search-container {
          max-width: 500px;
          margin: 0 auto;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input-wrapper svg {
          position: absolute;
          left: 16px;
          color: #64748b;
          z-index: 2;
        }

        .search-input {
          width: 100%;
          padding: 16px 20px 16px 52px;
          font-size: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          background: #f8fafc;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #10b981;
          background: white;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.3s ease;
        }

        .clear-search:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        /* Search Results Section */
        .search-results-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .search-results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .search-results-header h3 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          color: #1e293b;
          font-size: 20px;
          font-weight: 600;
        }

        .clear-search-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          color: #64748b;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
        }

        .clear-search-btn:hover {
          background: #e2e8f0;
          color: #475569;
        }

        /* Personal Cards Grid */
        .personal-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }

        .personal-result-card {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .personal-result-card:hover {
          border-color: #10b981;
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .personal-card-header {
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
          flex-shrink: 0;
        }

        .personal-info h4 {
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .personal-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .unit-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .unit-alphaville {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .unit-buenavista {
          background: rgba(59, 130, 246, 0.1);
          color: #1d4ed8;
        }

        .unit-marista {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        /* Personal Stats Grid */
        .personal-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .stat-item:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-icon.users {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .stat-icon.pending {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .stat-icon.exempt {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .stat-icon.paid {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .stat-info {
          flex: 1;
        }

        .stat-number {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 2px;
        }

        .stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Tax Validation Card */
        .tax-validation-card {
          margin-bottom: 16px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .tax-status {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tax-status.tax-valid {
          color: #059669;
        }

        .tax-status.tax-invalid {
          color: #dc2626;
        }

        .tax-status.tax-open {
          color: #8b5cf6;
        }

        .tax-status.tax-exempt {
          color: #3b82f6;
        }

        .tax-status.tax-special {
          color: #f59e0b;
        }

        .tax-validation-card .tax-status.tax-valid {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .tax-validation-card .tax-status.tax-invalid {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .tax-validation-card .tax-status.tax-open {
          background: rgba(139, 92, 246, 0.05);
          border-color: rgba(139, 92, 246, 0.2);
        }

        .tax-validation-card .tax-status.tax-exempt {
          background: rgba(59, 130, 246, 0.05);
          border-color: rgba(59, 130, 246, 0.2);
        }

        .tax-validation-card .tax-status.tax-special {
          background: rgba(245, 158, 11, 0.05);
          border-color: rgba(245, 158, 11, 0.2);
        }

        .tax-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .tax-status.tax-valid .tax-icon {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .tax-status.tax-invalid .tax-icon {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .tax-status.tax-open .tax-icon {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .tax-status.tax-exempt .tax-icon {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .tax-status.tax-special .tax-icon {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .tax-info {
          flex: 1;
        }

        .tax-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .tax-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .tax-details small {
          font-size: 11px;
          opacity: 0.8;
          font-weight: 500;
        }

        /* Personal Actions */
        .personal-actions {
          display: flex;
          gap: 12px;
        }

        .view-students-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          font-size: 14px;
        }

        .view-students-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        /* No Search Results */
        .no-search-results {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .no-search-results svg {
          color: #cbd5e1;
          margin-bottom: 20px;
        }

        .no-search-results h3 {
          margin: 0 0 12px;
          color: #475569;
          font-size: 20px;
          font-weight: 600;
        }

        .no-search-results p {
          margin: 0 0 24px;
          font-size: 16px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        /* Students Section */
        .students-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-top: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 2px solid #10b981;
        }

        .students-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f1f5f9;
        }

        .students-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .students-title h3 {
          margin: 0;
          color: #1e293b;
          font-size: 20px;
          font-weight: 600;
        }

        .students-count {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .close-students {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f1f5f9;
          color: #64748b;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          font-weight: 500;
        }

        .close-students:hover {
          background: #e2e8f0;
          color: #475569;
        }

        /* Students Grid */
        .students-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .student-card {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .student-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }

        .student-card.student-aberto::before {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .student-card.student-isento::before {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .student-card.student-quitado::before {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .student-card.student-indefinido::before {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .student-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .student-header {
          margin-bottom: 16px;
        }

        .student-info h4 {
          margin: 0 0 8px;
          color: #1e293b;
          font-size: 16px;
          font-weight: 600;
        }

        .student-meta {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .unit-info {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-aberto {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .status-isento {
          background: rgba(59, 130, 246, 0.1);
          color: #1d4ed8;
        }

        .status-quitado {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .status-indefinido {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        /* Student Details */
        .student-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 14px;
          color: #1e293b;
          font-weight: 600;
        }

        /* No Students */
        .no-students {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .no-students svg {
          color: #cbd5e1;
          margin-bottom: 20px;
        }

        .no-students h3 {
          margin: 0 0 12px;
          color: #475569;
          font-size: 18px;
          font-weight: 600;
        }

        .no-students p {
          margin: 0;
          font-size: 14px;
        }

        /* Upload Section */
        .upload-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        /* Responsividade */
        @media (max-width: 1200px) {
          .dashboard-content {
            margin-left: 0;
            padding: 20px;
            padding-top: 100px;
          }
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .header-actions {
            width: 100%;
            justify-content: stretch;
          }

          .view-btn {
            flex: 1;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .tabs-navigation {
            flex-direction: column;
          }

          .tab-btn {
            justify-content: center;
          }

          .tax-comparison {
            grid-template-columns: 1fr;
          }

          .students-breakdown {
            justify-content: center;
          }

          .students-summary {
            grid-template-columns: 1fr 1fr;
          }

          .issues-header {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .dashboard-content {
            padding: 16px;
          }

          .dashboard-header,
          .search-section,
          .tab-content {
            padding: 20px;
          }

          .stat-card {
            flex-direction: column;
            text-align: center;
          }
          .students-summary {
            grid-template-columns: 1fr;
          }
          .open-personal-header {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
          .tax-status-info {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}