// src/auth/PersonalRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import Loading3D from "../components/ui/Loading3D";
import { useUserData } from "../hooks/useUserData";

export default function PersonalRoute({ children }) {
  const { role, loading, userData } = useUserData();

  if (loading) return <Loading3D size={100} />;
  if (!userData) return <Navigate to="/login" replace />;

  const hasPersonalAccess = role === "admin" || role === "tesouraria";

  if (!hasPersonalAccess) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e2e8f0",
            maxWidth: "500px",
          }}
        >
          <h1 style={{ color: "#ef4444", fontSize: "24px", fontWeight: "700", margin: "0 0 16px" }}>
            403 - Acesso negado
          </h1>
          <p style={{ color: "#64748b", fontSize: "16px", lineHeight: "1.5", margin: "0 0 24px" }}>
            Você não tem permissão para acessar o Módulo de Personal Trainers.
            <br />
            Este módulo é restrito aos perfis Tesouraria e Administrador.
          </p>
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "24px",
            }}
          >
            <p style={{ color: "#991b1b", fontSize: "14px", margin: "0", fontWeight: "500" }}>
              <strong>Seu perfil atual:</strong> {role || "Não definido"}
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
            }}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return children;
}
