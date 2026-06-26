// src/auth/UnitRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Loading3D from '../components/ui/Loading3D';
import { fetchUserClaims, getCachedUserClaims } from "../hooks/useUserData";

export default function UnitRoute({ children }) {
  const { unidade } = useParams();
  const cachedClaims = getCachedUserClaims();
  const currentUser = getAuth().currentUser;
  const [user, setUser] = useState(currentUser || null);
  const [claims, setClaims] = useState(cachedClaims || {});
  const [loading, setLoading] = useState(!(currentUser && cachedClaims));
  const auth = getAuth();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Força o refresh do token para pegar os custom claims atualizados
        const nextClaims = await fetchUserClaims(u, false);
        setClaims(nextClaims || {});
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [auth]);

  if (loading) return <Loading3D size={100} />;
  if (!user)   return <Navigate to="/login" replace />;

  const role = claims.role || "user";
  // se allowedUnits for array
  const allowedUnits = Array.isArray(claims.allowedUnits)
    ? claims.allowedUnits
    : typeof claims.allowedUnits === "string"
    ? claims.allowedUnits.split(",").map(u => u.trim().toLowerCase())
    : [];

  const unitParam = unidade?.toLowerCase();

  const isAuthorized =
    role === "admin" || (unitParam && allowedUnits.includes(unitParam));

  if (!isAuthorized) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>403 — Acesso negado</h1>
        <p>
          Você não tem permissão para acessar a unidade “<strong>{unidade}</strong>”.
        </p>
      </div>
    );
  }

  return children;
}
