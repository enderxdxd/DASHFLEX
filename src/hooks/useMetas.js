// File: src/hooks/useMetas.js
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const useMetas = (unidade) => {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responsaveisOficiais, setResponsaveisOficiais] = useState([]);

  // Busca as metas da unidade atual
  useEffect(() => {
    if (!unidade) return;
    
    setLoading(true);
    const metasRef = collection(db, "faturamento", unidade.toLowerCase(), "metas");
    const unsubscribeMetas = onSnapshot(
      metasRef,
      (snapshot) => {
        const metasData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMetas(metasData);
        
        // Extrai os responsáveis oficiais das metas
        const oficiais = metasData.map((m) =>
          m.responsavel.trim().toLowerCase()
        );
        setResponsaveisOficiais(oficiais);
        
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Erro ao carregar metas:", err);
        setError("Falha ao carregar metas.");
        setLoading(false);
      }
    );
    
    return () => unsubscribeMetas();
  }, [unidade]);

  return {
    metas,
    loading,
    error,
    responsaveisOficiais
  };
};


