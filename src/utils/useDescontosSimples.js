// hooks/useDescontosSimples.js
// Hook simplificado para buscar descontos do Firebase

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useDescontosSimples(unidade) {
  const [descontos, setDescontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!unidade) {
      setDescontos([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const descontosRef = collection(
        db, 
        "faturamento", 
        unidade.toLowerCase(), 
        "descontos"
      );
      
      const unsubscribe = onSnapshot(
        descontosRef,
        (snapshot) => {
          const descontosData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setDescontos(descontosData);
          setLoading(false);
        },
        (err) => {
          console.error("Erro ao buscar descontos:", err);
          setError(err.message);
          setLoading(false);
        }
      );
      
      return () => unsubscribe();
    } catch (err) {
      console.error("Erro ao configurar listener:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [unidade]);
  
  return { descontos, loading, error };
}