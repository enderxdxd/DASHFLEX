// src/auth/AdminRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import Loading3D from "../components/ui/Loading3D";
import { useUserData } from "../hooks/useUserData";

export default function AdminRoute({ children }) {
  const { role, loading } = useUserData();

  if (loading) {
    return <Loading3D size={100} />;
  }

  if (role !== "admin") {
    return <Navigate to="/modules" replace />;
  }

  return children;
}
