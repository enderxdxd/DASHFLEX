// src/auth/AdminRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Loading3D from '../components/ui/Loading3D';

export default function AdminRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    // 1) quando a auth muda, pega o token e verifica claim
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      // força pegar claims frescos
      const tokenResult = await user.getIdTokenResult(true);
      setIsAdmin(tokenResult.claims.role === "admin");
      setChecking(false);
    });
    return () => unsub();
  }, [auth]);

  if (checking) {
    return <Loading3D size={100} />;
  }
  if (!isAdmin) {
    // redireciona quem não é admin
    return <Navigate to="/dashboard{/boa-vista}" replace />;
  }
  return children;
}
