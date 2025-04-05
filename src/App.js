// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import UnidadeSelector from "./components/UnidadeSelector";
import Dashboard from "./components/Dashboard";
import Metas from "./components/Metas";
import PrivateRoute from "./auth/PrivateRoute";
import AddSale from "./components/AddSale";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* A rota de seleção de unidade é pública para que o usuário possa escolher sua unidade */}
        <Route path="/unidade" element={<UnidadeSelector />} />
        {/* Rotas protegidas */}
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
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
