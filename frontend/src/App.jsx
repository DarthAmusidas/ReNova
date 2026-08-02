import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Reservations from "./pages/Reservations";
import ImpactReport from "./pages/ImpactReport";
import CreateProduct from "./pages/CreateProduct";
import EditProduct from "./pages/EditProduct";
import AdminUsers from "./pages/AdminUsers";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products/create"
          element={
            <ProtectedRoute>
              <CreateProduct />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute>
              <EditProduct />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reservations"
          element={
            <ProtectedRoute>
              <Reservations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/impact"
          element={
            <ProtectedRoute>
              <ImpactReport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
