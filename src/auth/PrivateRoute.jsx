// src/auth/PrivateRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import Loading3D from '../components/ui/Loading3D';

export default function PrivateRoute({ children }) {
  const { unidade } = useParams();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState({});
  const [firestoreRole, setFirestoreRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          // Busca claims do Firebase Auth
          const idTokenResult = await u.getIdTokenResult(true);
          setClaims(idTokenResult.claims || {});
          
          // Busca role do Firestore
          // Primeiro tenta buscar pelo UID atual
          let userDoc = await getDoc(doc(db, "users", u.uid));
          
          // Se não encontrar e for tesouraria, tenta buscar pelo ID conhecido
          if (!userDoc.exists() && u.email === "tesouraria@flexacademia.com.br") {
            userDoc = await getDoc(doc(db, "users", "cMEb4iTvC1tt7eUl0EJ"));
          }
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFirestoreRole(userData.role);
          } else {
            // Criar documento automaticamente para usuário tesouraria
            if (u.email === "tesouraria@flexacademia.com.br") {
              try {
                await setDoc(doc(db, "users", u.uid), {
                  email: u.email,
                  role: "tesouraria",
                  name: "Tesouraria",
                  createdAt: new Date()
                });
                setFirestoreRole("tesouraria");
              } catch (error) {
                console.error("Erro ao criar documento:", error);
              }
            }
          }
          
          setUser(u);
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          setUser(u);
        }
      } else {
        setUser(null);
        setFirestoreRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [auth]);

  if (loading) return <Loading3D size={100} />;
  if (!user) return <Navigate to="/login" replace />;

  // Usa role do Firestore como prioridade, depois claims do Firebase Auth
  const role = firestoreRole || claims.role || "user";
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
