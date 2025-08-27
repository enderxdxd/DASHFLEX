// src/App.jsx - Versão Atualizada com Módulos
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ModuleSelector from "./pages/ModuleSelector";
import UnidadeSelector from "./pages/UnidadeSelector";
import PersonalUnidadeSelector from "./pages/PersonalUnidadeSelector";
import Dashboard from "./pages/Dashboard";
import UnifiedPersonalDashboard from "./pages/UnifiedPersonalDashboard";
import Metas from "./pages/Metas";
import AddSale from "./pages/AddSale";
import ConfigRemuneracao from "./pages/ConfigRemuneracao";
import PrivateRoute from "./auth/PrivateRoute";
import "./styles/variables.css";
import AdminRoute from "./auth/AdminRoute";
import PersonalRoute from "./auth/PersonalRoute";
import AnalyticsPage from "./pages/AnalyticsPage";
import DescontosPage from "./pages/DescontosPage";
import AdminProdutoConfig from "./components/admin/AdminProdutoConfig";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas */}
        <Route path="/login" element={<Login />} />
        
        {/* Seleção de módulo - primeira tela após login */}
        <Route path="/modules" element={
          <PrivateRoute>
            <ModuleSelector />
          </PrivateRoute>
        } />

        {/* MÓDULO DE VENDAS - Rotas existentes */}
        <Route path="/unidade" element={
          <PrivateRoute>
            <UnidadeSelector />
          </PrivateRoute>
        } />

        <Route
          path="/dashboard/:unidade"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        
        <Route path="/metas/:unidade" element={
          <PrivateRoute>
            <Metas />
          </PrivateRoute>
        } />
        
        <Route
          path="/add-sale/:unidade"
          element={
            <PrivateRoute>
              <AddSale />
            </PrivateRoute>
          }
        />
        
        <Route path="/config-remuneracao/:unidade"
          element={
            <PrivateRoute>
              <AdminRoute>
                <ConfigRemuneracao />
              </AdminRoute>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/analytics/:unidade"
          element={
            <PrivateRoute>
              <AnalyticsPage />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/descontos/:unidade"
          element={
            <PrivateRoute>
              <DescontosPage />
            </PrivateRoute>
          }
        />
        
        {/* Configuração Admin de Produtos */}
        <Route
          path="/admin/produtos"
          element={
            <PrivateRoute>
              <AdminRoute>
                <AdminProdutoConfig />
              </AdminRoute>
            </PrivateRoute>
          }
        />

        {/* MÓDULO DE PERSONAL - Nova estrutura unificada */}
        <Route
          path="/personal/dashboard"
          element={
            <PersonalRoute>
              <UnifiedPersonalDashboard />
            </PersonalRoute>
          }
        />

        {/* Futuras rotas do módulo Personal */}
        {/* 
        <Route
          path="/personal/relatorios/:unidade"
          element={
            <PrivateRoute>
              <PersonalRelatorios />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/personal/configuracoes/:unidade"
          element={
            <PrivateRoute>
              <AdminRoute>
                <PersonalConfiguracoes />
              </AdminRoute>
            </PrivateRoute>
          }
        />
        */}
        
        {/* Redireciona para a seleção de módulos */}
        <Route path="/" element={<Navigate to="/modules" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}