// src/App.jsx - Versão Atualizada com Módulos e Code Splitting
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./auth/PrivateRoute";
import AdminRoute from "./auth/AdminRoute";
import PersonalRoute from "./auth/PersonalRoute";
import { DataProvider } from "./contexts/DataContext";
import Login from "./pages/Login";
import ModuleSelector from "./pages/ModuleSelector";
import UnidadeSelector from "./pages/UnidadeSelector";
import "./styles/variables.css";

// ============ LOADING FALLBACK COMPONENT ============
const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff'
  }}>
    <div style={{
      width: '50px',
      height: '50px',
      border: '3px solid rgba(255,255,255,0.1)',
      borderTop: '3px solid #10b981',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <p style={{ marginTop: '1rem', opacity: 0.7 }}>Carregando...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// ============ LAZY LOADED PAGES ============
// Páginas pesadas - carregam sob demanda (code splitting)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Metas = lazy(() => import("./pages/Metas"));
const AddSale = lazy(() => import("./pages/AddSale"));
const ConfigRemuneracao = lazy(() => import("./pages/ConfigRemuneracao"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DescontosPage = lazy(() => import("./pages/DescontosPage"));
const ComissaoDetalhes = lazy(() => import("./pages/ComissaoDetalhes"));
const UnifiedPersonalDashboard = lazy(() => import("./pages/UnifiedPersonalDashboard"));
const PersonalUnidadeSelector = lazy(() => import("./pages/PersonalUnidadeSelector"));
const TesteClassificacao = lazy(() => import("./pages/teste-page"));
const AdminProdutoConfig = lazy(() => import("./components/admin/AdminProdutoConfig"));

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Suspense fallback={<PageLoader />}>
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

            {/* modulo de comissões */}
            <Route
              path="/comissao/:unidade"
              element={
                <PrivateRoute>
                  <ComissaoDetalhes />
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

            {/* Teste de classificação */}
            <Route
              path="/teste-classificacao"
              element={
                <PrivateRoute>
                  <TesteClassificacao />
                </PrivateRoute>
              }
            />
            
            {/* Redireciona para a seleção de módulos */}
            <Route path="/" element={<Navigate to="/modules" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </DataProvider>
    </BrowserRouter>
  );
}