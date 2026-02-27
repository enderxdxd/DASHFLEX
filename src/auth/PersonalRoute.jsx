// src/auth/PersonalRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Loading3D from '../components/ui/Loading3D';
import { getCachedUserData } from '../hooks/useUserData';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function PersonalRoute({ children }) {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        
        // ✅ Tenta usar cache singleton primeiro
        const cached = getCachedUserData();
        if (cached && cached.uid === u.uid && cached.role) {
          setUserRole(cached.role);
          setLoading(false);
          return;
        }
        
        // Fallback: buscar role do Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role);
          } else {
            setUserRole(null);
          }
        } catch (error) {
          console.error("Erro ao buscar role do usuário:", error);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    
    return () => unsub();
  }, [auth]);

  if (loading) return <Loading3D size={100} />;
  
  if (!user) return <Navigate to="/login" replace />;

  // Verificar se o usuário tem permissão para acessar o módulo de personal
  const hasPersonalAccess = userRole === "admin" || userRole === "tesouraria";

  if (!hasPersonalAccess) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#f8fafc"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e2e8f0",
          maxWidth: "500px"
        }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "16px"
          }}>🔒</div>
          <h1 style={{
            color: "#ef4444",
            fontSize: "24px",
            fontWeight: "700",
            margin: "0 0 16px"
          }}>
            403 — Acesso Negado
          </h1>
          <p style={{
            color: "#64748b",
            fontSize: "16px",
            lineHeight: "1.5",
            margin: "0 0 24px"
          }}>
            Você não tem permissão para acessar o <strong>Módulo de Personal Trainers</strong>.
            <br />
            Este módulo é restrito apenas para usuários com perfil de <strong>Tesouraria</strong> ou <strong>Administrador</strong>.
          </p>
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "24px"
          }}>
            <p style={{
              color: "#991b1b",
              fontSize: "14px",
              margin: "0",
              fontWeight: "500"
            }}>
              <strong>Seu perfil atual:</strong> {userRole || 'Não definido'}
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(99, 102, 241, 0.4)";
            }}
            onMouseOut={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  return children;
}
