// src/auth/PrivateRoute.jsx
import React, { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import Loading3D from "../components/ui/Loading3D";
import {
  fetchUserClaims,
  fetchUserData,
  getCachedUserClaims,
  getCachedUserData,
} from "../hooks/useUserData";

const normalizeAllowedUnits = (claims, fallbackUnits = []) => {
  if (Array.isArray(claims.allowedUnits)) {
    return claims.allowedUnits.map((u) => String(u).trim().toLowerCase());
  }

  if (typeof claims.allowedUnits === "string") {
    return claims.allowedUnits.split(",").map((u) => u.trim().toLowerCase());
  }

  if (Array.isArray(fallbackUnits)) {
    return fallbackUnits.map((u) => String(u).trim().toLowerCase());
  }

  return [];
};

export default function PrivateRoute({ children }) {
  const { unidade } = useParams();
  const auth = getAuth();
  const cachedUser = getCachedUserData();
  const cachedClaims = getCachedUserClaims();
  const currentUser = auth.currentUser;
  const hasFastUser = currentUser && cachedUser?.uid === currentUser.uid && cachedUser?.role;
  const hasFastRouteAccess = hasFastUser && (cachedClaims || cachedUser.role === "admin" || !unidade);

  const [authState, setAuthState] = useState({
    user: hasFastRouteAccess ? currentUser : null,
    firestoreRole: hasFastRouteAccess ? cachedUser.role : null,
    allowedUnits: hasFastRouteAccess ? cachedUser.allowedUnits || [] : [],
    loading: !hasFastRouteAccess,
  });

  const claimsRef = useRef(cachedClaims || {});

  useEffect(() => {
    const t0 = performance.now();
    if (process.env.NODE_ENV !== "production") {
      console.log("[PERF] PrivateRoute useEffect start");
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[PERF] PrivateRoute auth +${(performance.now() - t0).toFixed(0)}ms, user=${!!user}`);
      }

      if (!user) {
        setAuthState({ user: null, firestoreRole: null, allowedUnits: [], loading: false });
        return;
      }

      try {
        const userCache = getCachedUserData();
        const claimsCache = getCachedUserClaims();

        if (userCache?.uid === user.uid && userCache.role && (claimsCache || userCache.role === "admin")) {
          claimsRef.current = claimsCache || {};
          setAuthState({
            user,
            firestoreRole: userCache.role,
            allowedUnits: userCache.allowedUnits || [],
            loading: false,
          });
          return;
        }

        const [claims, userData] = await Promise.all([
          fetchUserClaims(user, false),
          fetchUserData(user),
        ]);

        claimsRef.current = claims || {};
        let role = userData?.role || null;
        const allowedUnits = userData?.allowedUnits || [];

        if (!userData?.firestoreData && user.email === "tesouraria@flexacademia.com.br") {
          const fallbackDoc = await getDoc(doc(db, "users", "cMEb4iTvC1tt7eUl0EJ"));
          if (fallbackDoc.exists()) {
            role = fallbackDoc.data().role;
          } else {
            try {
              await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: "tesouraria",
                name: "Tesouraria",
                createdAt: new Date(),
              });
              role = "tesouraria";
            } catch (error) {
              console.error("Erro ao criar documento:", error);
            }
          }
        }

        setAuthState({ user, firestoreRole: role, allowedUnits, loading: false });
      } catch (error) {
        console.error("Erro ao buscar dados do usuario:", error);
        setAuthState({ user, firestoreRole: null, allowedUnits: [], loading: false });
      }
    });

    return () => unsub();
  }, [auth]);

  if (authState.loading) return <Loading3D size={100} />;
  if (!authState.user) return <Navigate to="/login" replace />;

  const claims = claimsRef.current;
  const role = authState.firestoreRole || claims.role || "user";
  const allowedUnits = normalizeAllowedUnits(claims, authState.allowedUnits);
  const unitParam = unidade?.toLowerCase();

  let isAuthorized = false;

  if (role === "admin") {
    isAuthorized = true;
  } else if (role === "tesouraria") {
    const isVendasRoute = unitParam && (
      window.location.pathname.includes("/dashboard/") ||
      window.location.pathname.includes("/metas/") ||
      window.location.pathname.includes("/add-sale/") ||
      window.location.pathname.includes("/analytics/") ||
      window.location.pathname.includes("/config-remuneracao/")
    );
    isAuthorized = !isVendasRoute;
  } else if (!unitParam) {
    isAuthorized = true;
  } else {
    isAuthorized = allowedUnits.includes(unitParam);
  }

  if (!isAuthorized) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>403 - Acesso negado</h1>
        <p>
          Você não tem permissão para acessar a unidade "<strong>{unidade}</strong>".
        </p>
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => {
              window.history.replaceState(null, null, "/modules");
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
              cursor: "pointer",
            }}
          >
            Voltar para Seleção de Módulos
          </button>
        </div>
      </div>
    );
  }

  return children;
}
