// src/App.jsx - Versão Atualizada com Módulos e Code Splitting
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./auth/PrivateRoute";
import AdminRoute from "./auth/AdminRoute";
import PersonalRoute from "./auth/PersonalRoute";
import { DataProvider } from "./contexts/DataContext";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import Login from "./pages/Login";
import ModuleSelector from "./pages/ModuleSelector";
import UnidadeSelector from "./pages/UnidadeSelector";
import "./styles/variables.css";

// ============ SKELETON PAGE LOADER ============
const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'var(--background, #f8fafc)',
    overflow: 'hidden'
  }}>
    {/* Skeleton sidebar */}
    <div style={{ display: 'flex', flex: 1 }}>
      <div style={{
        width: '260px',
        background: 'var(--card, #fff)',
        borderRight: '1px solid var(--border, #e2e8f0)',
        padding: '1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ width: '140px', height: '28px', borderRadius: '8px', background: 'var(--border, #e2e8f0)', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ height: '1px', background: 'var(--border, #e2e8f0)', margin: '0.5rem 0' }} />
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ width: `${70 + Math.random() * 30}%`, height: '32px', borderRadius: '6px', background: 'var(--border, #e2e8f0)', opacity: 1 - i * 0.12, animation: `shimmer 1.5s infinite ${i * 0.1}s` }} />
        ))}
      </div>
      {/* Skeleton content */}
      <div style={{ flex: 1, padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ width: '200px', height: '32px', borderRadius: '8px', background: 'var(--border, #e2e8f0)', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: '120px', borderRadius: '12px', background: 'var(--card, #fff)', border: '1px solid var(--border, #e2e8f0)', animation: `shimmer 1.5s infinite ${i * 0.15}s` }} />
          ))}
        </div>
        <div style={{ flex: 1, borderRadius: '12px', background: 'var(--card, #fff)', border: '1px solid var(--border, #e2e8f0)', animation: 'shimmer 1.5s infinite 0.4s' }} />
      </div>
    </div>
    <style>{`
      @keyframes shimmer {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
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
const CicloAluno = lazy(() => import("./pages/CicloAluno"));

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <ErrorBoundary>
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

            {/* Ciclo do Aluno */}
            <Route
              path="/ciclo-aluno/:unidade"
              element={
                <PrivateRoute>
                  <CicloAluno />
                </PrivateRoute>
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
        </ErrorBoundary>
      </DataProvider>
    </BrowserRouter>
  );
}