// File: src/hooks/usepersistedProdutos.js
import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export function usePersistedProdutos() {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  const [produtosSelecionados, setProdutosSelecionados] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const primeiroLoad = useRef(true);

  // 1) Carrega do Firestore
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "userSettings", uid);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          setProdutosSelecionados(snap.data().produtosSelecionados || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, [uid]);

  // 2) Persiste no Firestore (só depois do primeiro load)
  useEffect(() => {
    if (!uid || !loaded) return;
    // Ignora a gravação inicial de array vazio
    if (primeiroLoad.current) {
      primeiroLoad.current = false;
      return;
    }
    const ref = doc(db, "userSettings", uid);
    setDoc(ref, { produtosSelecionados }, { merge: true }).catch(console.error);
  }, [uid, produtosSelecionados, loaded]);

  return [produtosSelecionados, setProdutosSelecionados, loaded];
}
