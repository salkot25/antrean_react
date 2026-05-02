import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import DisplayPage from "./pages/DisplayPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import ServiceConfigPage from "./pages/ServiceConfigPage";
import UserManagementPage from "./pages/UserManagementPage";
import LogsPage from "./pages/LogsPage";
import ProfilePage from "./pages/ProfilePage";
import HistoryPage from "./pages/HistoryPage";
import AdminLayout from "./components/AdminLayout";
import RequireAuth from "./components/RequireAuth";
import ConnectionLogger from "./components/ConnectionLogger";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/">
      <AuthProvider>
        <ConnectionLogger />
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/display" element={<DisplayPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<App />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route element={<AdminLayout />}>
              <Route
                path="/admin"
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route path="/admin/dashboard" element={<DashboardPage />} />
              <Route path="/admin/queue" element={<AdminPage />} />
              <Route path="/admin/config" element={<ServiceConfigPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/logs" element={<LogsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
