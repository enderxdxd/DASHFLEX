// src/pages/UnifiedPersonalDashboard.jsx - VERSÃO REDESENHADA
import React, { useState, useMemo, useCallback, memo, Suspense, lazy } from 'react';
// Precisa importar X também
import { 
  Users, Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, Search, X, Eye, MapPin, Activity, UserX, Star, Filter, User, ChevronUp, ChevronDown, AlertCircle, FileSpreadsheet, BarChart3, Upload, Trash2
} from 'lucide-react';

import NavBar from '../components/NavBar.jsx';
import { usePersonals } from '../hooks/usePersonals';
import '../styles/PersonalManager.css';
import '../styles/PersonalDashboardInline.css';
import { writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
// Lazy loading para componentes pesados
const UnifiedPersonalUploader = lazy(() => import('../components/personal/UnifiedPersonalUploader'));
const PersonalStudentTable = lazy(() => import('../components/personal/PersonalStudentTable'));


export default function UnifiedPersonalDashboard() {
  const [selectedView, setSelectedView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnidade, setSelectedUnidade] = useState('all');
  const [selectedPersonal, setSelectedPersonal] = useState('');
  const [selectedSituacao, setSelectedSituacao] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tax-validation' | 'pending-students'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [successMessages, setSuccessMessages] = useState([]);
  const [errors, setErrors] = useState([]);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeleteError, setShowDeleteError] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [selectedPersonalForStudents, setSelectedPersonalForStudents] = useState('');
  const [expandedPersonals, setExpandedPersonals] = useState(new Set());
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);

  // NOVA FUNÇÃO para alternar expansão do card
  const togglePersonalExpansion = (personalName) => {
    const newExpanded = new Set(expandedPersonals);
    if (newExpanded.has(personalName)) {
      newExpanded.delete(personalName);
    } else {
      newExpanded.add(personalName);
    }
    setExpandedPersonals(newExpanded);
  };

  // Função melhorada para toggle com efeito visual - OTIMIZADA
  const togglePersonalExpansionImproved = useCallback((personalName) => {
    setExpandedPersonals(prev => {
      const newExpanded = new Set(prev);
      
      if (newExpanded.has(personalName)) {
        newExpanded.delete(personalName);
      } else {
        newExpanded.add(personalName);
      }
      
      return newExpanded;
    });
  }, []);

  const collapseAllPersonals = useCallback(() => {
    setExpandedPersonals(new Set());
  }, []);

  
  // Hooks para cada unidade
  const alphaville = usePersonals('alphaville');
  const buenavista = usePersonals('buenavista'); 
  const marista = usePersonals('marista');
  const palmas = usePersonals('palmas');

  // Dados unificados - otimizado
  const allPersonalsData = useMemo(() => {
    // Só recalcula se algum dos arrays mudou de tamanho ou referência
    if (!alphaville.personals.length && !buenavista.personals.length && !marista.personals.length && !palmas.personals.length) {
      return [];
    }
    
    const data = [
      ...alphaville.personals.map(p => ({ ...p, unidade: 'alphaville' })),
      ...buenavista.personals.map(p => ({ ...p, unidade: 'buenavista' })),
      ...marista.personals.map(p => ({ ...p, unidade: 'marista' })),
      ...palmas.personals.map(p => ({ ...p, unidade: 'palmas' }))
    ];
    return data;
  }, [alphaville.personals, buenavista.personals, marista.personals, palmas.personals]);

  // Função para buscar aluno e encontrar seu personal trainer
  const searchStudentPersonal = useCallback((searchTerm) => {
    if (!searchTerm.trim()) {
      setStudentSearchResults([]);
      return;
    }

    const results = [];
    const searchLower = searchTerm.toLowerCase().trim();
    
    console.log('🔍 Buscando por:', searchLower);
    console.log('📊 Total de registros:', allPersonalsData.length);

    // A estrutura correta é: cada item já é um aluno com seu personal
    allPersonalsData.forEach((registro) => {
      if (registro.aluno) {
        const alunoLower = registro.aluno.toLowerCase();
        const isReal = isRealStudent(registro.aluno);
        const matches = alunoLower.includes(searchLower);
        
        // Log detalhado para debug
        if (alunoLower.includes('amauri') || alunoLower.includes('sergio') || alunoLower.includes(searchLower)) {
          console.log('👤 Registro encontrado:', {
            aluno: registro.aluno,
            personal: registro.personal,
            unidade: registro.unidade,
            isReal: isReal,
            matches: matches,
            searchTerm: searchLower,
            situacao: registro.situacao
          });
        }
        
        if (isReal && matches) {
          results.push({
            aluno: registro.aluno,
            personal: registro.personal,
            unidade: registro.unidade,
            situacao: registro.situacao || 'Ativo'
          });
        }
      }
    });

    console.log('✅ Resultados encontrados:', results.length);
    setStudentSearchResults(results);
  }, [allPersonalsData]);

  // Effect para executar busca quando o termo muda
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchStudentPersonal(studentSearchTerm);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [studentSearchTerm, searchStudentPersonal]);

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

  // Função isRealStudent otimizada com useCallback
  const isRealStudentOptimized = useCallback((aluno) => {
    if (!aluno) return false;
    const alunoLower = aluno.toLowerCase().trim();
    const adminKeywords = [
      'assinar contrato', 'atualizar telefone', 'atualizar cpf', 'observar se tem alunos',
      'caso nao solicitar isencao', 'caso não solicitar isenção', 'solicitar isenção',
      'alunos de personal do alphaville', 'alunos de personal no marista', 
      'alunos de personal da buenavista', 'alunos de personal buena vista'
    ];
    return !adminKeywords.some(keyword => alunoLower.includes(keyword));
  }, []);

  const realStudentsData = useMemo(() => {
    if (!allPersonalsData.length) return [];
    return allPersonalsData.filter(item => isRealStudentOptimized(item.aluno));
  }, [allPersonalsData, isRealStudentOptimized]);

  // Função melhorada para classificar alunos com mais detalhes
  const classifyStudentImproved = (item) => {
    const valor = item.valorFinal || 0;
    const situacao = item.situacao;
    const produto = item.produto || '';
    
    // Classificação mais detalhada
    if (valor === 0 && situacao === 'Livre') {
      return {
        status: 'Aberto',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        priority: 1, // Alta prioridade para pendências
        description: 'Aguardando pagamento ou definição'
      };
    }
    
    if (valor === 0 && situacao === 'Pago') {
      return {
        status: 'Isento',
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        priority: 3, // Baixa prioridade, já resolvido
        description: 'Isento de pagamento'
      };
    }
    
    if (valor > 0 && situacao === 'Pago') {
      return {
        status: 'Quitado',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
        priority: 4, // Menor prioridade, tudo ok
        description: `Pago: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      };
    }
    
    if (valor > 0 && situacao === 'Livre') {
      return {
        status: 'Pendente',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        priority: 2, // Alta prioridade, valor definido mas não pago
        description: `Pendente: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      };
    }
    
    return {
      status: 'Indefinido',
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      priority: 5,
      description: 'Status não identificado'
    };
  };

  // Manter função original para compatibilidade
  const classifyStudent = (item) => {
    const classification = classifyStudentImproved(item);
    return classification.status;
  };

  // 🎯 NOVA LÓGICA: Validação de taxa unificada - mesma taxa para todas as unidades
  const validateUnifiedTax = (totalStudents, currentTaxName) => {
    if (!currentTaxName) return { isValid: false, expectedTax: 'Taxa não informada', taxType: 'open' };
    
    const normalizedCurrent = currentTaxName.toLowerCase();
    
    // Verificar se é taxa com "apos" - não precisa validar
    if (normalizedCurrent.includes('apos')) {
      return { isValid: true, expectedTax: 'Taxa com prazo especial', taxType: 'special', skipValidation: true };
    }
    
    // Verificar se é personal isento (taxas internas ou especiais)
    // Cobre variações: "Alpha Marista Taxa Personal Interno", "Buena Personal Interno Taxa 2026", etc.
    if ((normalizedCurrent.includes('personal interno') || normalizedCurrent.includes('interno taxa')) ||
        normalizedCurrent.includes('xxxxxxxxxx')) {
      return { isValid: true, expectedTax: 'Personal Interno (Isento)', taxType: 'exempt', skipValidation: true };
    }
    
    let isValid = false;
    let expectedTax = '';
    
    // Determinar a taxa esperada baseada no total de alunos (TODAS as unidades)
    // Intervalos: 1-8, 9-15, a partir de 16
    if (totalStudents >= 1 && totalStudents <= 8) {
      expectedTax = 'Taxa Personal 1 a 8 Alunos';
      isValid = (normalizedCurrent.includes('1 a 8') || normalizedCurrent.includes('1-8')) &&
                (normalizedCurrent.includes('taxa personal') || normalizedCurrent.includes('personal taxa') || normalizedCurrent.includes('taxa'));
    } else if (totalStudents >= 9 && totalStudents <= 15) {
      expectedTax = 'Taxa Personal 9 a 15 Alunos';
      isValid = (normalizedCurrent.includes('9 a 15') || normalizedCurrent.includes('9-15')) &&
                (normalizedCurrent.includes('taxa personal') || normalizedCurrent.includes('personal taxa') || normalizedCurrent.includes('taxa'));
    } else if (totalStudents >= 16) {
      expectedTax = 'Taxa Personal a partir de 16 Alunos';
      isValid = ((normalizedCurrent.includes('a partir de 16') || 
                 normalizedCurrent.includes('16 alunos') ||
                 normalizedCurrent.includes('16+') ||
                 normalizedCurrent.includes('acima de 16') ||
                 normalizedCurrent.includes('acima 16') ||
                 normalizedCurrent.includes('partir de 16')) &&
                (normalizedCurrent.includes('taxa personal') || normalizedCurrent.includes('personal taxa') || normalizedCurrent.includes('taxa')));
    }
    
    return { isValid, expectedTax, totalStudents, taxType: 'regular' };
  };

  // Estatísticas por personal (agrupado por pessoa) - OTIMIZADO
  const personalStats = useMemo(() => {
    if (!realStudentsData.length) {
      return {
        personalsData: [],
        totalPersonals: 0,
        totalAlunosReais: 0,
        totalAlunosUnicos: 0,
        valorTotalFaturamento: 0
      };
    }

    const filteredData = selectedUnidade === 'all' 
      ? realStudentsData 
      : realStudentsData.filter(item => item.unidade === selectedUnidade);

    if (!filteredData.length) {
      return {
        personalsData: [],
        totalPersonals: 0,
        totalAlunosReais: 0,
        totalAlunosUnicos: 0,
        valorTotalFaturamento: 0
      };
    }

    const personalGroups = {};
    let totalFaturamento = 0;
    const uniqueStudents = new Set();

    // Single loop para melhor performance
    for (const item of filteredData) {
      const personal = item.personal || 'Sem Personal';
      const valor = item.valorFinal || 0;
      totalFaturamento += valor;
      uniqueStudents.add(item.aluno);
      
      if (!personalGroups[personal]) {
        personalGroups[personal] = {
          personal,
          unidades: new Set(),
          alunos: new Set(),
          alunosAbertos: new Set(),
          alunosIsentos: new Set(),
          alunosQuitados: new Set(),
          totalFaturamento: 0,
          produtos: new Set()
        };
      }
      
      const group = personalGroups[personal];
      const classification = classifyStudent(item);
      
      group.unidades.add(item.unidade);
      group.alunos.add(item.aluno);
      group.totalFaturamento += valor;
      
      if (item.produto) group.produtos.add(item.produto);
      if (item.plano) group.produtos.add(item.plano);
      
      switch (classification) {
        case 'Aberto':
          group.alunosAbertos.add(item.aluno);
          break;
        case 'Isento':
          group.alunosIsentos.add(item.aluno);
          break;
        case 'Quitado':
          group.alunosQuitados.add(item.aluno);
          break;
      }
    }

    const personalArray = Object.values(personalGroups).map(group => {
      const unidadesArray = Array.from(group.unidades);
      const produtosArray = Array.from(group.produtos);
      
      return {
        ...group,
        totalAlunos: group.alunos.size,
        alunosAbertos: group.alunosAbertos.size,
        alunosIsentos: group.alunosIsentos.size,
        alunosQuitados: group.alunosQuitados.size,
        unidades: unidadesArray,
        produtos: produtosArray,
        unidade: unidadesArray.length === 1 ? unidadesArray[0] : 'Múltiplas',
        alunos: Array.from(group.alunos),
        alunosParaDivergencia: group.alunosQuitados.size + group.alunosIsentos.size
      };
    }).sort((a, b) => b.totalAlunos - a.totalAlunos);

    return {
      personalsData: personalArray,
      totalPersonals: personalArray.length,
      totalAlunosReais: filteredData.length,
      totalAlunosUnicos: uniqueStudents.size,
      valorTotalFaturamento: totalFaturamento
    };
  }, [realStudentsData, selectedUnidade]);

  // Dados filtrados por busca - OTIMIZADO
  const filteredPersonalStats = useMemo(() => {
    if (!searchTerm.trim()) return personalStats.personalsData;
    if (!personalStats.personalsData.length) return [];
    
    const searchLower = searchTerm.toLowerCase().trim();
    return personalStats.personalsData.filter(personal =>
      personal.personal.toLowerCase().includes(searchLower)
    );
  }, [personalStats.personalsData, searchTerm]);

  // Funções otimizadas com useCallback
  const expandAllPersonals = useCallback(() => {
    const allPersonalNames = filteredPersonalStats.map(p => p.personal);
    setExpandedPersonals(new Set(allPersonalNames));
  }, [filteredPersonalStats]);

  // 🎯 VALIDAÇÃO DE TAXAS CORRIGIDA - Verifica consistência entre unidades
  const taxValidationData = useMemo(() => {
    if (!personalStats.personalsData.length) return [];
    
    return personalStats.personalsData.map(personal => {
      // Pegar todas as taxas do personal (uma por unidade)
      const allTaxes = personal.produtos || [];
      // Filtrar taxas válidas, ignorando "Xxxxxxxxxx" e similares
      const validTaxes = allTaxes.filter(tax => 
        tax && 
        tax.trim() && 
        !tax.toLowerCase().includes('xxxxxxxxxx') &&
        !tax.toLowerCase().includes('xxx')
      );
      const uniqueTaxes = [...new Set(validTaxes)];
      
      // Se não tem taxa definida
      if (uniqueTaxes.length === 0) {
        return {
          ...personal,
          taxValidation: {
            isValid: false,
            expectedTax: 'Taxa não informada',
            taxType: 'open',
            currentTax: 'Nenhuma taxa definida'
          }
        };
      }
      
      // Determinar a faixa correta baseada no total de alunos
      let expectedRange = '';
      if (personal.totalAlunos >= 1 && personal.totalAlunos <= 8) {
        expectedRange = '1 a 8';
      } else if (personal.totalAlunos >= 9 && personal.totalAlunos <= 15) {
        expectedRange = '9 a 15';
      } else if (personal.totalAlunos >= 16) {
        expectedRange = 'a partir de 16';
      }
      
      // Verificar se todas as taxas estão na faixa correta
      let allTaxesValid = true;
      let taxType = 'regular';
      let invalidTaxes = [];
      let hasExemptTax = false;
      let hasRegularTax = false;
      
      for (const tax of uniqueTaxes) {
        const validation = validateUnifiedTax(personal.totalAlunos, tax);
        
        if (validation.taxType === 'exempt' || validation.taxType === 'special') {
          hasExemptTax = true;
        } else {
          hasRegularTax = true;
          if (!validation.isValid) {
            allTaxesValid = false;
            invalidTaxes.push(tax);
          }
        }
      }
      
      // Se tem tanto taxa isenta quanto taxa regular, priorizar validação da taxa regular
      if (hasRegularTax) {
        taxType = 'regular';
      } else if (hasExemptTax) {
        taxType = uniqueTaxes.some(tax => validateUnifiedTax(personal.totalAlunos, tax).taxType === 'special') ? 'special' : 'exempt';
        allTaxesValid = true;
      }
      
      // Se tem taxas inconsistentes entre unidades
      if (uniqueTaxes.length > 1 && taxType === 'regular') {
        const taxRanges = uniqueTaxes.map(tax => {
          const normalized = tax.toLowerCase();
          if (normalized.includes('1 a 8') || normalized.includes('1-8')) return '1-8';
          if (normalized.includes('9 a 15') || normalized.includes('9-15')) return '9-15';
          if (normalized.includes('a partir de 16') || 
              normalized.includes('16 alunos') ||
              normalized.includes('16+') ||
              normalized.includes('acima de 16') ||
              normalized.includes('acima 16') ||
              normalized.includes('partir de 16')) return '16+';
          return 'unknown';
        });
        
        const uniqueRanges = [...new Set(taxRanges.filter(range => range !== 'unknown'))];
        if (uniqueRanges.length > 1) {
          allTaxesValid = false;
          invalidTaxes = uniqueTaxes;
        }
      }
      
      return {
        ...personal,
        taxValidation: {
          isValid: allTaxesValid,
          expectedTax: `Taxa Personal ${expectedRange} Alunos (todas as unidades)`,
          taxType: taxType,
          currentTax: uniqueTaxes.join(' | '),
          inconsistentTaxes: invalidTaxes.length > 0 ? invalidTaxes : null,
          totalStudents: personal.totalAlunos
        }
      };
    });
  }, [personalStats.personalsData]);

  // 🎯 PERSONAIS COM ALUNOS EM ABERTO E CATEGORIZAÇÃO
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

  // Funções para modal de exclusão - OTIMIZADAS
  const handleDeleteAllData = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const confirmDeleteAllData = useCallback(async () => {
    console.log('Iniciando exclusão de dados...');
    
    setIsDeleting(true);
    setDeleteError('');
    
    try {
      setShowDeleteModal(false);
      
      const batch = writeBatch(db);
      let totalDeleted = 0;
      const BATCH_SIZE = 500;
      let operationCount = 0;
      let currentBatch = writeBatch(db);
      
      const unidades = ['alphaville', 'buenavista', 'marista', 'palmas'];
      
      for (const unidade of unidades) {
        console.log(`Processando ${unidade}...`);
        
        const personalsRef = collection(db, 'faturamento', unidade, 'personals');
        const snapshot = await getDocs(personalsRef);
        
        console.log(`${unidade}: ${snapshot.size} documentos encontrados`);
        
        for (const doc of snapshot.docs) {
          currentBatch.delete(doc.ref);
          operationCount++;
          totalDeleted++;
          
          // Executar batch quando atingir o limite
          if (operationCount === BATCH_SIZE) {
            await currentBatch.commit();
            console.log(`Batch de ${BATCH_SIZE} operações executado`);
            currentBatch = writeBatch(db);
            operationCount = 0;
          }
        }
      }
      
      // Executar batch restante
      if (operationCount > 0) {
        await currentBatch.commit();
        console.log(`Batch final de ${operationCount} operações executado`);
      }
      
      console.log(`Total deletado: ${totalDeleted} documentos`);
      
      setDeletedCount(totalDeleted);
      setShowDeleteSuccess(true);
      
      setTimeout(() => {
        setShowDeleteSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao deletar dados:', error);
      setDeleteError(`Erro ao deletar dados: ${error.message}`);
      setShowDeleteError(true);
      
      setTimeout(() => {
        setShowDeleteError(false);
      }, 5000);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // MELHORAR a função getStudentsForPersonal com classificação visual - OTIMIZADA
  const getStudentsForPersonal = useCallback((personalName) => {
    if (!realStudentsData.length || !personalName) return [];
    
    return realStudentsData
      .filter(item => item.personal === personalName)
      .map(item => {
        const classification = classifyStudentImproved(item);
        return {
          ...item,
          classificacao: classification.status,
          classificationDetails: classification,
          sortOrder: classification.priority
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [realStudentsData]);

  // Função para obter estatísticas rápidas do personal - OTIMIZADA
  const getPersonalQuickStats = useCallback((personalName) => {
    const students = getStudentsForPersonal(personalName);
    if (!students.length) return { total: 0, categories: {}, hasUrgent: false };
    
    const categorized = students.reduce((acc, student) => {
      const classification = classifyStudentImproved(student);
      acc[classification.status] = (acc[classification.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: students.length,
      categories: categorized,
      hasUrgent: categorized['Aberto'] > 0 || categorized['Pendente'] > 0
    };
  }, [getStudentsForPersonal]);

  // Função para lidar com visualização de alunos - OTIMIZADA
  const handleViewStudents = useCallback((personalName) => {
    setSelectedPersonalForStudents(prev => {
      if (prev === personalName) {
        setShowStudents(false);
        return '';
      } else {
        setShowStudents(true);
        return personalName;
      }
    });
  }, []);

  // NOVO COMPONENTE - StudentCardImproved - MEMOIZADO
  const StudentCardImproved = memo(({ student, index }) => {
    const classification = classifyStudentImproved(student);
    
    return (
      <div 
        className={`student-card-enhanced`}
        style={{
          borderLeftColor: classification.color,
          backgroundColor: classification.bgColor
        }}
      >
        {/* Header do Card do Aluno */}
        <div className="student-card-header">
          <div className="student-avatar-circle">
            <User size={16} />
          </div>
          <div className="student-basic-info">
            <h6 className="student-name-enhanced">{student.aluno}</h6>
            <div className="student-location">
              <MapPin size={10} />
              <span>{student.unidade}</span>
            </div>
          </div>
          <div 
            className="student-status-indicator"
            style={{ backgroundColor: classification.color }}
          >
            {classification.status === 'Aberto' && <Clock size={12} />}
            {classification.status === 'Isento' && <CheckCircle size={12} />}
            {classification.status === 'Quitado' && <DollarSign size={12} />}
            {classification.status === 'Pendente' && <AlertTriangle size={12} />}
            {classification.status === 'Indefinido' && <AlertCircle size={12} />}
          </div>
        </div>

        {/* Status Badge */}
        <div 
          className="status-badge-enhanced"
          style={{
            backgroundColor: classification.bgColor,
            color: classification.color,
            borderColor: classification.color
          }}
        >
          <span className="status-text">{classification.status}</span>
          <span className="status-description">{classification.description}</span>
        </div>

        {/* Detalhes Organizados */}
        <div className="student-details-enhanced">
          <div className="detail-grid">
            <div className="detail-item-enhanced">
              <div className="detail-icon">
                <FileSpreadsheet size={14} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Produto</span>
                <span className="detail-value" title={student.produto}>
                  {student.produto ? 
                    (student.produto.length > 25 ? 
                      student.produto.substring(0, 25) + '...' : 
                      student.produto
                    ) : 
                    'N/A'
                  }
                </span>
              </div>
            </div>

            <div className="detail-item-enhanced">
              <div className="detail-icon">
                <DollarSign size={14} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Valor</span>
                <span className={`detail-value ${student.valorFinal > 0 ? 'has-value' : 'no-value'}`}>
                  {student.valorFinal > 0 
                    ? `R$ ${student.valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : 'Gratuito'
                  }
                </span>
              </div>
            </div>

            <div className="detail-item-enhanced">
              <div className="detail-icon">
                <Activity size={14} />
              </div>
              <div className="detail-content">
                <span className="detail-label">Situação</span>
                <span className={`detail-value situation-${student.situacao?.toLowerCase()}`}>
                  {student.situacao}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com informações extras se necessário */}
        {student.plano && (
          <div className="student-card-footer">
            <div className="plan-info">
              <Calendar size={12} />
              <span>{student.plano}</span>
            </div>
          </div>
        )}
      </div>
    );
  });

  // Componente: Card de Estatísticas - MEMOIZADO
  const StatCard = memo(({ icon: Icon, title, value, subtitle, color = "blue", onClick }) => (
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
  ));

  // Componente: Relatório de Validação de Taxas - MEMOIZADO
  const TaxValidationReport = memo(() => {
    // Filtrar apenas taxas regulares inválidas
    const invalidTaxes = taxValidationData.filter(p => 
      p.taxValidation.taxType === 'regular' && !p.taxValidation.isValid
    );
    
    if (invalidTaxes.length === 0) {
      return (
        <div className="validation-success">
          <CheckCircle size={48} />
          <h3>Todas as taxas regulares estão corretas!</h3>
          <p>Todos os personais com taxas regulares têm valores adequados para sua quantidade de alunos</p>
          
          {/* Informações adicionais */}
          <div className="additional-info">
            <div className="info-item">
              <span className="info-label">Personais Isentos:</span>
              <span className="info-value">{stats.exemptPersonals}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Taxas Especiais (com prazo):</span>
              <span className="info-value">{stats.specialTaxPersonals}</span>
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
          {invalidTaxes.map((personal, index) => {
            const isExpanded = expandedPersonals.has(personal.personal);
            const studentsData = getStudentsForPersonal(personal.personal);
            
            return (
              <div key={index} className="issue-card clickable-card">
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
                  
                  <button 
                    className="view-students-btn-validation"
                    onClick={() => togglePersonalExpansionImproved(personal.personal)}
                  >
                    <Eye size={14} />
                    {isExpanded ? 'Ocultar Alunos' : `Ver ${personal.totalAlunos} Alunos`}
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Seção Expandida de Alunos */}
                {isExpanded && (
                  <div className="students-expanded-section-validation">
                    <div className="students-header-validation">
                      <h4>
                        <Users size={18} />
                        Alunos de {personal.personal}
                      </h4>
                      <div className="students-stats-badges">
                        {(() => {
                          const categorized = studentsData.reduce((acc, student) => {
                            const classification = classifyStudentImproved(student);
                            acc[classification.status] = (acc[classification.status] || 0) + 1;
                            return acc;
                          }, {});
                          
                          return Object.entries(categorized).map(([status, count]) => {
                            const colors = {
                              'Aberto': { bg: '#fffbeb', color: '#d97706' },
                              'Isento': { bg: '#eff6ff', color: '#1d4ed8' },
                              'Quitado': { bg: '#ecfdf5', color: '#059669' },
                              'Pendente': { bg: '#fef2f2', color: '#dc2626' },
                              'Indefinido': { bg: '#f9fafb', color: '#6b7280' }
                            };
                            
                            return (
                              <span 
                                key={status}
                                className="category-badge"
                                style={{
                                  backgroundColor: colors[status]?.bg,
                                  color: colors[status]?.color
                                }}
                              >
                                {count} {status}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    
                    <div className="students-grid-validation">
                      {studentsData
                        .sort((a, b) => {
                          const aClassification = classifyStudentImproved(a);
                          const bClassification = classifyStudentImproved(b);
                          return aClassification.priority - bClassification.priority;
                        })
                        .map((student, idx) => (
                          <StudentCardImproved 
                            key={`${student.aluno}-${idx}`}
                            student={student}
                            index={idx}
                          />
                        ))
                      }
                    </div>
                    
                    {studentsData.length === 0 && (
                      <div className="no-students-message">
                        <UserX size={24} />
                        <p>Nenhum aluno encontrado para este personal</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  });

  // Componente: Personals com Alunos Pendentes - MEMOIZADO
  const PendingStudentsReport = memo(() => {
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
  });

  // Componente: Personals em Aberto - MEMOIZADO
  const OpenPersonalsReport = memo(() => {
    if (personalsWithOpenTax.length === 0) {
      return (
        <div className="validation-success">
          <CheckCircle size={48} />
          <h3>Nenhum personal em aberto!</h3>
          <p>Todos os personais têm taxas definidas</p>
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
  });

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
            <Suspense fallback={
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Carregando uploader...</p>
              </div>
            }>
              <UnifiedPersonalUploader />
            </Suspense>
          </div>
        ) : (
          <>
            {/* Cards de Estatísticas Principais */}
            <div className="stats-grid">
              <StatCard
                icon={Users}
                title="Total de Personais"
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
                subtitle="Personais com taxa divergente"
                color="red"
                onClick={() => setActiveTab('tax-validation')}
              />
              <StatCard
                icon={Clock}
                title="Alunos em Aberto"
                value={stats.totalPendingCount}
                subtitle={`Em ${stats.pendingStudents} personais`}
                color="orange"
                onClick={() => setActiveTab('pending-students')}
              />
              <StatCard
                icon={UserX}
                title="Personais em Aberto"
                value={stats.openTaxPersonals}
                subtitle="Sem taxa definida"
                color="purple"
                onClick={() => setActiveTab('open-personals')}
              />
            </div>

            {/* Background com partículas animadas */}
            <div className="animated-bg">
              <div className="particles">
                {[...Array(30)].map((_, i) => (
                  <div 
                    key={i} 
                    className="particle"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 20}s`,
                      animationDuration: `${15 + Math.random() * 10}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Cards de Busca Redesenhados */}
            <div className="search-cards-grid">
              {/* Card Busca Personal Trainer */}
              <div className="search-card trainer-card">
                <div className="search-card-header">
                  <div className="card-icon trainer">
                    <Users size={24} />
                  </div>
                  <div className="card-info">
                    <h3>Buscar Personal Trainer</h3>
                    <p>Encontre informações detalhadas sobre personal trainers cadastrados</p>
                  </div>
                </div>
                <div className="search-input-container">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" size={18} />
                    <input
                      type="text"
                      placeholder="Digite o nome do personal trainer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    {searchTerm && (
                      <button 
                        className="clear-btn"
                        onClick={() => setSearchTerm('')}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Busca Aluno */}
              <div className="search-card student-card">
                <div className="search-card-header">
                  <div className="card-icon student">
                    <User size={24} />
                  </div>
                  <div className="card-info">
                    <h3>Buscar Aluno</h3>
                    <p>Descubra qual personal trainer está vinculado ao aluno</p>
                  </div>
                </div>
                <div className="search-input-container">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" size={18} />
                    <input
                      type="text"
                      placeholder="Digite o nome do aluno..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    {studentSearchTerm && (
                      <button 
                        className="clear-btn"
                        onClick={() => setStudentSearchTerm('')}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de Resultados */}
            {studentSearchResults.length > 0 && (
              <div className="results-section">
                <div className="results-header">
                  <div className="results-count">
                    <CheckCircle size={16} />
                    <span>
                      {studentSearchResults.length} resultado{studentSearchResults.length !== 1 ? 's' : ''} encontrado{studentSearchResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="results-filter">
                    <Filter size={16} />
                    <select 
                      value={selectedUnidade} 
                      onChange={(e) => setSelectedUnidade(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">Todas as unidades</option>
                      <option value="alphaville">Alphaville</option>
                      <option value="buenavista">Buena Vista</option>
                      <option value="marista">Marista</option>
                    </select>
                  </div>
                </div>

                <div className="results-grid">
                  {studentSearchResults.map((result, index) => (
                    <div key={index} className="result-card">
                      <div className="result-header">
                        <div className="result-avatar">
                          <User size={20} />
                        </div>
                        <div className="result-info">
                          <h4 className="result-name">{result.aluno}</h4>
                          <div className="result-unit">
                            <MapPin size={12} />
                            <span className={`unit-badge ${result.unidade}`}>
                              {result.unidade === 'alphaville' ? 'Alphaville' :
                               result.unidade === 'buenavista' ? 'Buena Vista' : 'Marista'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="result-details">
                        <div className="detail-item">
                          <span className="detail-label">Personal Trainer</span>
                          <span className="detail-value">{result.personal}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Unidade</span>
                          <span className="detail-value">
                            {result.unidade === 'alphaville' ? 'Alphaville' :
                             result.unidade === 'buenavista' ? 'Buena Vista' : 'Marista'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Status</span>
                          <div className={`status-indicator ${result.situacao.toLowerCase()}`}>
                            <div className="status-dot"></div>
                            <span>{result.situacao}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {studentSearchTerm && studentSearchResults.length === 0 && (
              <div className="no-results">
                <div className="no-results-icon">
                  <AlertCircle size={32} />
                </div>
                <div className="no-results-content">
                  <h3>Nenhum aluno encontrado</h3>
                  <p>Não encontramos nenhum aluno com o nome <strong>"{studentSearchTerm}"</strong></p>
                  <p className="suggestion">Tente verificar a grafia ou usar apenas parte do nome</p>
                </div>
              </div>
            )}

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
                Personais em Aberto
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
                    <div className="search-results-section">
                      <div className="search-results-header">
                        <h3>
                          <Search size={20} />
                          Resultados para "{searchTerm}"
                        </h3>
                        
                        {/* NOVOS CONTROLES DE EXPANSÃO */}
                        <div className="expansion-controls">
                          <button 
                            className="expansion-control-btn"
                            onClick={expandAllPersonals}
                            title="Expandir todos os cards"
                          >
                            <ChevronDown size={16} />
                            Expandir Todos
                          </button>
                          
                          <button 
                            className="expansion-control-btn"
                            onClick={collapseAllPersonals}
                            title="Recolher todos os cards"
                          >
                            <ChevronUp size={16} />
                            Recolher Todos
                          </button>
                          
                          <div className="results-summary">
                            <span className="results-count">
                              {filteredPersonalStats.length} personal{filteredPersonalStats.length !== 1 ? 's' : ''}
                            </span>
                            <span className="expanded-count">
                              {expandedPersonals.size} expandido{expandedPersonals.size !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <button 
                            className="clear-search-btn"
                            onClick={() => setSearchTerm('')}
                          >
                            <X size={16} />
                            Limpar busca
                          </button>
                        </div>
                      </div>
                      
                      {filteredPersonalStats.length > 0 ? (
                        <div className="improved-personal-cards-grid">
                          {filteredPersonalStats.map((personal, index) => {
                            const isExpanded = expandedPersonals.has(personal.personal);
                            const studentsData = getStudentsForPersonal(personal.personal);
                            
                            return (
                              <div key={index} className="horizontal-personal-card" data-unidade={personal.unidades[0]} data-personal={personal.personal}>
                                {/* Layout Horizontal Compacto */}
                                <div className="horizontal-card-content">
                                  {/* Seção Esquerda - Info do Personal */}
                                  <div className="personal-info-section">
                                    <div className="personal-avatar-horizontal">
                                      <User size={20} />
                                    </div>
                                    <div className="personal-details-horizontal">
                                      <h3 className="personal-name-horizontal">{personal.personal}</h3>
                                      <div className="personal-badges-horizontal">
                                        {personal.unidades.map(unidade => (
                                          <span key={unidade} className={`unit-badge-horizontal unit-${unidade}`}>
                                            <MapPin size={10} />
                                            {unidade === 'alphaville' ? 'Alphaville' : 
                                             unidade === 'buenavista' ? 'Buena Vista' : 
                                             unidade === 'marista' ? 'Marista' : unidade}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Seção Central - Contador Principal */}
                                  <div className="counter-section-horizontal">
                                    <div className="counter-circle-horizontal">
                                      <Users size={20} />
                                      <span className="counter-number-horizontal">{personal.totalAlunos}</span>
                                    </div>
                                    <span className="counter-label-horizontal">Total de Alunos</span>
                                  </div>

                                  {/* Seção Central-Direita - Stats Compactos */}
                                  <div className="stats-section-horizontal">
                                    <div className="stat-item-horizontal stat-pending">
                                      <Clock size={14} />
                                      <span className="stat-number-horizontal">{personal.alunosAbertos}</span>
                                      <span className="stat-label-horizontal">Abertos</span>
                                    </div>
                                    
                                    <div className="stat-item-horizontal stat-exempt">
                                      <CheckCircle size={14} />
                                      <span className="stat-number-horizontal">{personal.alunosIsentos}</span>
                                      <span className="stat-label-horizontal">Isentos</span>
                                    </div>
                                    
                                    <div className="stat-item-horizontal stat-paid">
                                      <DollarSign size={14} />
                                      <span className="stat-number-horizontal">{personal.alunosQuitados}</span>
                                      <span className="stat-label-horizontal">Quitados</span>
                                    </div>
                                  </div>

                                  {/* Seção Direita - Status e Ações */}
                                  <div className="actions-section-horizontal">
                                    {/* Status da Taxa */}
                                    <div className="tax-status-horizontal">
                                      {(() => {
                                        const taxValidation = taxValidationData.find(p => p.personal === personal.personal);
                                        const validation = taxValidation?.taxValidation;
                                        const isValid = validation?.isValid;
                                        const taxType = validation?.taxType;
                                        
                                        let icon = <CheckCircle size={14} />;
                                        let label = 'Taxa Correta';
                                        let bgColor = '#dcfce7';
                                        let textColor = '#059669';
                                        
                                        if (taxType === 'open') {
                                          icon = <UserX size={14} />;
                                          label = 'Em Aberto';
                                          bgColor = '#f3f4f6';
                                          textColor = '#6b7280';
                                        } else if (taxType === 'exempt') {
                                          icon = <Star size={14} />;
                                          label = 'Isento';
                                          bgColor = '#dbeafe';
                                          textColor = '#1d4ed8';
                                        } else if (taxType === 'special') {
                                          icon = <Clock size={14} />;
                                          label = 'Taxa Especial';
                                          bgColor = '#fef3c7';
                                          textColor = '#d97706';
                                        } else if (!isValid) {
                                          icon = <AlertTriangle size={14} />;
                                          label = 'Taxa Incorreta';
                                          bgColor = '#fee2e2';
                                          textColor = '#dc2626';
                                        }
                                        
                                        return (
                                          <div 
                                            className="tax-badge-horizontal"
                                            style={{ backgroundColor: bgColor, color: textColor }}
                                          >
                                            {icon}
                                            <span>{label}</span>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Botão de Ver Alunos */}
                                    <button 
                                      className="view-students-btn-horizontal"
                                      onClick={() => togglePersonalExpansionImproved(personal.personal)}
                                    >
                                      <Eye size={14} />
                                      {isExpanded ? 'Ocultar' : 'Ver Alunos'}
                                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                  </div>
                                </div>

                                {/* Seção Expandida de Alunos */}
                                {isExpanded && (
                                  <div className="students-expanded-section">
                                    <div className="students-header-improved">
                                      <h4>
                                        <Users size={18} />
                                        Alunos de {personal.personal}
                                      </h4>
                                      <div className="students-stats-badges">
                                        {(() => {
                                          const categorized = studentsData.reduce((acc, student) => {
                                            const classification = classifyStudentImproved(student);
                                            acc[classification.status] = (acc[classification.status] || 0) + 1;
                                            return acc;
                                          }, {});
                                          
                                          return Object.entries(categorized).map(([status, count]) => {
                                            const colors = {
                                              'Aberto': { bg: '#fffbeb', color: '#d97706' },
                                              'Isento': { bg: '#eff6ff', color: '#1d4ed8' },
                                              'Quitado': { bg: '#ecfdf5', color: '#059669' },
                                              'Pendente': { bg: '#fef2f2', color: '#dc2626' },
                                              'Indefinido': { bg: '#f9fafb', color: '#6b7280' }
                                            };
                                            
                                            return (
                                              <span 
                                                key={status}
                                                className="category-badge"
                                                style={{
                                                  backgroundColor: colors[status]?.bg,
                                                  color: colors[status]?.color
                                                }}
                                              >
                                                {count} {status}
                                              </span>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>
                                    
                                    <div className="students-grid-improved">
                                      {studentsData
                                        .sort((a, b) => {
                                          const aClassification = classifyStudentImproved(a);
                                          const bClassification = classifyStudentImproved(b);
                                          return aClassification.priority - bClassification.priority;
                                        })
                                        .map((student, idx) => (
                                          <StudentCardImproved 
                                            key={`${student.aluno}-${idx}`}
                                            student={student}
                                            index={idx}
                                          />
                                        ))
                                      }
                                    </div>
                                    
                                    {studentsData.length === 0 && (
                                      <div className="no-students-improved">
                                        <Users size={32} />
                                        <p>Nenhum aluno encontrado</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="no-search-results">
                          <Search size={48} />
                          <h3>Nenhum personal encontrado</h3>
                          <p>Não foram encontrados personais com o termo "{searchTerm}"</p>
                          <button 
                            className="btn btn-primary"
                            onClick={() => setSearchTerm('')}
                          >
                            Ver todos os personais
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Mostra tabela geral quando não há busca
                    <Suspense fallback={
                      <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Carregando tabela...</p>
                      </div>
                    }>
                      <PersonalStudentTable 
                        personalStats={personalStats}
                        selectedUnidade={selectedUnidade}
                      />
                    </Suspense>
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
                  <li>• <strong>{stats.totalPersonals}</strong> personais</li>
                  <li>• <strong>{stats.totalStudents}</strong> alunos cadastrados</li>
                  <li>• Todos os dados de faturamento</li>
                  <li>• Dados de todas as unidades (Alphaville, Buena Vista, Marista)</li>
                </ul>
              </div>
              
              <div className="warning-text">
                <p><strong>ATENÇÃO:</strong> Esta ação não pode ser desfeita!</p>
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
              >
                <Trash2 size={16} />
                SIM, EXCLUIR TUDO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Confirmação de Exclusão */}
      {showDeleteSuccess && (
        <div className="delete-success-toast">
          <div className="toast-content">
            <div className="toast-icon">
              <CheckCircle size={32} />
            </div>
            <div className="toast-text">
              <h3>Exclusão Concluída!</h3>
              <p>{deletedCount} registros foram excluídos com sucesso</p>
            </div>
            <div className="toast-animation">
              <div className="success-particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
            </div>
          </div>
          <div className="toast-progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      )}

      {/* Styles */}
    </div>
  );
}