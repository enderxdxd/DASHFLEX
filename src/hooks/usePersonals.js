// src/hooks/usePersonals.js
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export function usePersonals(unidade) {
  const [personals, setPersonals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Função removida - não usa mais localStorage

  // Função para carregar dados do Firestore
  const loadPersonalsFromFirestore = () => {
    if (!unidade) return;

    setLoading(true);

    try {
      const personalsRef = collection(db, 'faturamento', unidade, 'personals');
      const q = query(personalsRef, orderBy('dataImportacao', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const firestoreData = [];
        snapshot.forEach((doc) => {
          firestoreData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        
        setPersonals(firestoreData);
        setLoading(false);
      }, (error) => {
        setError('Erro ao carregar dados do servidor: ' + error.message);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      setError('Erro ao conectar com o servidor: ' + err.message);
      setLoading(false);
    }
  };

  // Função removida - não usa mais localStorage

  // Função para adicionar novos dados
  const addPersonals = (newData) => {
    setLoading(true);
    try {
      // Validação de entrada
      if (!newData) {
        throw new Error('Dados não fornecidos');
      }
      
      // Garante que newData é um array
      const dataArray = Array.isArray(newData) ? newData : [newData];
      
      
      const updatedData = [...personals, ...dataArray];
      setPersonals(updatedData);
      
      setSuccessMessage(`${dataArray.length} registros adicionados com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError('Erro ao adicionar dados: ' + err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar todos os dados
  const clearPersonals = () => {
    setPersonals([]);
    setSuccessMessage('Dados limpos com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Função para remover um registro específico
  const removePersonal = (id) => {
    const updatedData = personals.filter(p => p.id !== id);
    setPersonals(updatedData);
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    if (unidade) {
      
      
      // Configura listener do Firestore para dados em tempo real
      const unsubscribe = loadPersonalsFromFirestore();
      
      // Cleanup function
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [unidade]);

  return {
    personals,
    loading,
    error,
    successMessage,
    addPersonals,
    clearPersonals,
    removePersonal,
    setError,
    setSuccessMessage
  };
}
