// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import UnidadeSelector from "./pages/UnidadeSelector";
import Dashboard from "./pages/Dashboard";
import Metas from "./pages/Metas";
import AddSale from "./pages/AddSale";
import ConfigRemuneracao from "./pages/ConfigRemuneracao";
import PrivateRoute from "./auth/PrivateRoute";
import "./styles/variables.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/unidade" element={<UnidadeSelector />} />

        {/* Páginas protegidas: login + permissão de unidade */}
        <Route
          path="/dashboard/:unidade"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/metas/:unidade"
          element={
            <PrivateRoute>
              <Metas />
            </PrivateRoute>
          }
        />
        <Route
          path="/add-sale/:unidade"
          element={
            <PrivateRoute>
              <AddSale />
            </PrivateRoute>
          }
        />
        <Route
          path="/config-remuneracao/:unidade"
          element={
            <PrivateRoute>
              <ConfigRemuneracao />
            </PrivateRoute>
          }
        />

        {/* Redireciona tudo mais para login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
