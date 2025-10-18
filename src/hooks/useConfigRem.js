// src/hooks/useConfigRem.js
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useConfigRem(unidade, month) {
  const [configRem, setConfigRem] = useState({
    metaUnidade: 0,
    premiacao: [],
    premiacaoSupervisor: [],
    comissaoPlanos: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!unidade || !month) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribeSecondary = null;

    const ref = doc(
      db,
      "faturamento",
      unidade.toLowerCase(),
      "configRemuneracao",
      `premiacao-${month}`
    );

    const unsub = onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const data = snap.data();
          setConfigRem({
            metaUnidade: data.metaUnidade || 0,
            premiacao: Array.isArray(data.premiacao) ? data.premiacao : [],
            premiacaoSupervisor: Array.isArray(data.premiacaoSupervisor) ? data.premiacaoSupervisor : [],
            comissaoPlanos: Array.isArray(data.comissaoPlanos) ? data.comissaoPlanos : []
          });
          setLoading(false);
        } else {
          // Se não existir configuração para este mês, tentamos carregar o mês anterior
          const mesAnterior = month.split('-')[1] === '01' 
            ? `${parseInt(month.split('-')[0]) - 1}-12`
            : `${month.split('-')[0]}-${String(parseInt(month.split('-')[1]) - 1).padStart(2, '0')}`;
          
          const refAnterior = doc(
            db,
            "faturamento",
            unidade.toLowerCase(),
            "configRemuneracao",
            `premiacao-${mesAnterior}`
          );

          unsubscribeSecondary = onSnapshot(
            refAnterior,
            snapAnterior => {
              if (snapAnterior.exists()) {
                const data = snapAnterior.data();
                setConfigRem({
                  metaUnidade: data.metaUnidade || 0,
                  premiacao: Array.isArray(data.premiacao) ? data.premiacao : [],
                  premiacaoSupervisor: Array.isArray(data.premiacaoSupervisor) ? data.premiacaoSupervisor : [],
                  comissaoPlanos: Array.isArray(data.comissaoPlanos) ? data.comissaoPlanos : []
                });
              } else {
                // Se não existir configuração anterior, mantém os valores padrão
                setConfigRem({
                  metaUnidade: 0,
                  premiacao: [],
                  premiacaoSupervisor: [],
                  comissaoPlanos: []
                });
              }
              setLoading(false);
            },
            err => {
              console.error(err);
              setError(err.message);
              setLoading(false);
            }
          );
        }
      },
      err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsub();
      if (unsubscribeSecondary) {
        unsubscribeSecondary();
      }
    };
  }, [unidade, month]);

  return { configRem, loading, error };
}
