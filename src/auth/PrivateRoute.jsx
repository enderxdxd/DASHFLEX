// src/auth/PrivateRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function PrivateRoute({ children }) {
  const { unidade } = useParams();
  const auth = getAuth();
  const [user, setUser]   = useState(null);
  const [claims, setClaims] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        
        const idTokenResult = await u.getIdTokenResult(true);
        setClaims(idTokenResult.claims || {});
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [auth]);

  if (loading) return <div>Carregando...</div>;
  if (!user)   return <Navigate to="/login" replace />;

  const role = claims.role || "user";
  const allowedUnits = Array.isArray(claims.allowedUnits)
    ? claims.allowedUnits.map(u => u.toLowerCase())
    : typeof claims.allowedUnits === "string"
      ? claims.allowedUnits.split(",").map(u => u.trim().toLowerCase())
      : [];

  const unitParam = unidade?.toLowerCase();
  const isAuthorized = role === "admin" || (unitParam && allowedUnits.includes(unitParam));

  if (!isAuthorized) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>403 — Acesso negado</h1>
        <p>Você não tem permissão para acessar a unidade “<strong>{unidade}</strong>”.</p>
      </div>
    );
  }

  return children;
}
