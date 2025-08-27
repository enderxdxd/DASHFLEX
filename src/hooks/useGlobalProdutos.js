// src/hooks/useGlobalProdutos.js
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useGlobalProdutos() {
  const auth = getAuth();
  const [produtosSelecionados, setProdutosSelecionados] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  // Verifica se usuário é admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setUserEmail(null);
        return;
      }
      
      setUserEmail(user.email);
      
      try {
        // Força pegar claims frescos
        const tokenResult = await user.getIdTokenResult(true);
        const isUserAdmin = tokenResult.claims.role === "admin" || tokenResult.claims.admin === true;
        setIsAdmin(isUserAdmin);
        
        console.log('🔐 Verificação admin:', {
          email: user.email,
          isAdmin: isUserAdmin,
          claims: tokenResult.claims
        });
      } catch (error) {
        console.error('Erro ao verificar claims:', error);
        setIsAdmin(false);
      }
    });
    
    return () => unsub();
  }, [auth]);

  // Carrega configuração global de produtos
  useEffect(() => {
    const configRef = doc(db, "configuracoes", "global", "filtros", "produtos");
    
    const unsubscribe = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProdutosSelecionados(data.selecionados || []);
          
          console.log('📦 Produtos globais carregados:', {
            produtos: data.selecionados || [],
            updatedBy: data.updatedBy,
            updatedAt: data.updatedAt?.toDate()
          });
        } else {
          // Se não existe configuração, inicializa vazia
          setProdutosSelecionados([]);
          console.log('📦 Nenhuma configuração global encontrada, usando array vazio');
        }
        setLoaded(true);
      },
      (error) => {
        console.error('Erro ao carregar produtos globais:', error);
        setProdutosSelecionados([]);
        setLoaded(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // Função para salvar configuração (apenas admin)
  const salvarProdutos = async (novosProdutos) => {
    if (!isAdmin) {
      console.error('❌ Apenas administradores podem alterar a configuração de produtos');
      throw new Error('Acesso negado: apenas administradores podem alterar esta configuração');
    }

    if (!userEmail) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const configRef = doc(db, "configuracoes", "global", "filtros", "produtos");
      const configData = {
        selecionados: novosProdutos,
        updatedBy: userEmail,
        updatedAt: new Date(),
        version: Date.now() // Para controle de versão
      };

      await setDoc(configRef, configData);
      
      console.log('✅ Configuração global de produtos salva:', {
        produtos: novosProdutos,
        updatedBy: userEmail
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar produtos globais:', error);
      throw error;
    }
  };

  return {
    produtosSelecionados,
    setProdutosSelecionados: salvarProdutos, // Só admin pode usar
    loaded,
    isAdmin,
    userEmail
  };
}
