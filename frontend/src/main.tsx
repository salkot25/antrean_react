import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DisplayPage from "./pages/DisplayPage";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./components/AdminLayout";
import RequireAuth from "./components/RequireAuth";
import ConnectionLogger from "./components/ConnectionLogger";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

// Lazy-loaded pages to keep the initial TV Display and Login bundle ultra-light
const App = lazy(() => import("./App"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ServiceConfigPage = lazy(() => import("./pages/ServiceConfigPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const CustomerSatisfactionPage = lazy(
  () => import("./pages/CustomerSatisfactionPage"),
);
const SurveyRecapDashboardPage = lazy(
  () => import("./pages/SurveyRecapDashboardPage"),
);

const PageFallback = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-[#004482]">
    <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-[#004482] animate-spin mb-3" />
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
      Memuat...
    </span>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/">
      <AuthProvider>
        <ConnectionLogger />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes — no auth required */}
            <Route path="/" element={<DisplayPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />

            {/* Protected routes */}
            <Route element={<RequireAuth />}>
              <Route path="/ambil" element={<App />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route
                path="/survey-kepuasan"
                element={<CustomerSatisfactionPage />}
              />
              <Route
                path="/survey-kepuasan-dashboard"
                element={<SurveyRecapDashboardPage />}
              />
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
