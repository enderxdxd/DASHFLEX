// src/auth/PrivateRoute.jsx
import React, { useEffect, useState, useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import Loading3D from '../components/ui/Loading3D';
import { getCachedUserData } from '../hooks/useUserData';

export default function PrivateRoute({ children }) {
  const { unidade } = useParams();
  const auth = getAuth();
  
  // ✅ Estado único para evitar múltiplos re-renders que desmontam children
  const [authState, setAuthState] = useState({
    user: null,
    firestoreRole: null,
    loading: true
  });
  // Claims em ref — não causa re-render (usado apenas na lógica de autorização abaixo)
  const claimsRef = useRef({});

  useEffect(() => {
    const _t0 = performance.now();
    console.log('[PERF] PrivateRoute useEffect start');
    const unsub = onAuthStateChanged(auth, async (u) => {
      console.log(`[PERF] onAuthStateChanged fired: +${(performance.now()-_t0).toFixed(0)}ms, user=${!!u}`);
      if (u) {
        try {
          // ✅ FAST PATH: cache singleton → desbloqueia em 1 setState
          const cached = getCachedUserData();
          if (cached && cached.uid === u.uid && cached.role) {
            console.log(`[PERF] PrivateRoute FAST PATH (cache hit): +${(performance.now()-_t0).toFixed(0)}ms`);
            // Busca claims em background (não bloqueia, não causa re-render)
            u.getIdTokenResult(false).then(r => { claimsRef.current = r.claims || {}; }).catch(() => {});
            setAuthState({ user: u, firestoreRole: cached.role, loading: false });
            return;
          }
          
          // SLOW PATH: busca claims e dados do usuário em PARALELO
          console.log(`[PERF] PrivateRoute SLOW PATH start: +${(performance.now()-_t0).toFixed(0)}ms`);
          const [idTokenResult, userDoc] = await Promise.all([
            u.getIdTokenResult(false),
            getDoc(doc(db, "users", u.uid))
          ]);
          console.log(`[PERF] PrivateRoute SLOW PATH done: +${(performance.now()-_t0).toFixed(0)}ms`);
          
          claimsRef.current = idTokenResult.claims || {};
          let role = null;
          
          if (userDoc.exists()) {
            role = userDoc.data().role;
          } else if (u.email === "tesouraria@flexacademia.com.br") {
            const fallbackDoc = await getDoc(doc(db, "users", "cMEb4iTvC1tt7eUl0EJ"));
            if (fallbackDoc.exists()) {
              role = fallbackDoc.data().role;
            } else {
              try {
                await setDoc(doc(db, "users", u.uid), {
                  email: u.email,
                  role: "tesouraria",
                  name: "Tesouraria",
                  createdAt: new Date()
                });
                role = "tesouraria";
              } catch (error) {
                console.error("Erro ao criar documento:", error);
              }
            }
          }
          
          // ✅ Um único setState — um único re-render
          setAuthState({ user: u, firestoreRole: role, loading: false });
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          setAuthState({ user: u, firestoreRole: null, loading: false });
        }
      } else {
        setAuthState({ user: null, firestoreRole: null, loading: false });
      }
    });
    return () => unsub();
  }, [auth]);

  if (authState.loading) return <Loading3D size={100} />;
  if (!authState.user) return <Navigate to="/login" replace />;

  // Usa role do Firestore como prioridade, depois claims do Firebase Auth
  const claims = claimsRef.current;
  const role = authState.firestoreRole || claims.role || "user";
  const allowedUnits = Array.isArray(claims.allowedUnits)
    ? claims.allowedUnits.map(u => u.toLowerCase())
    : typeof claims.allowedUnits === "string"
      ? claims.allowedUnits.split(",").map(u => u.trim().toLowerCase())
      : [];

  const unitParam = unidade?.toLowerCase();
  
  // Debug logs para identificar problemas
 
  
  // Lógica de autorização baseada na role e tipo de rota
  let isAuthorized = false;
  
  if (role === "admin") {
    // Admin tem acesso total
    isAuthorized = true;
  } else if (role === "tesouraria") {
    // Tesouraria só tem acesso a rotas que não são de vendas (dashboard de unidades)
    // Bloqueia acesso a rotas como /dashboard/:unidade, /metas/:unidade, etc.
    const isVendasRoute = unitParam && (
      window.location.pathname.includes('/dashboard/') ||
      window.location.pathname.includes('/metas/') ||
      window.location.pathname.includes('/add-sale/') ||
      window.location.pathname.includes('/analytics/') ||
      window.location.pathname.includes('/config-remuneracao/')
    );
    isAuthorized = !isVendasRoute;
    console.log("🏦 Tesouraria:", { isVendasRoute, isAuthorized });
  } else if (role === "user") {
    // Usuários normais: se não há unitParam (rotas como /modules), autorizar
    // Se há unitParam, verificar se está nas allowedUnits
    if (!unitParam) {
      isAuthorized = true; // Rotas sem unidade são sempre autorizadas para users autenticados
    } else {
      isAuthorized = allowedUnits.includes(unitParam);
    }
  } else {
    // Para outras roles ou casos não especificados
    if (!unitParam) {
      isAuthorized = true; // Rotas sem unidade são sempre autorizadas para users autenticados
    } else {
      isAuthorized = allowedUnits.includes(unitParam);
    }
  }

  if (!isAuthorized) {

    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>403 — Acesso negado</h1>
        <p>Você não tem permissão para acessar a unidade "<strong>{unidade}</strong>".</p>
        <div style={{ marginTop: "20px" }}>
          <button 
            onClick={() => {
              // Força o redirecionamento limpando o histórico
              window.history.replaceState(null, null, '/modules');
              window.location.reload();
            }}
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            ← Voltar para Seleção de Módulos
          </button>
        </div>
      </div>
    );
  }

  return children;
}
