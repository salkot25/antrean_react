import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MousePointerClick,
  Settings,
  LogOut,
  Users,
  ShieldCheck,
  ScrollText,
  Menu,
  X,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getConfig } from "../api";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navGroups = [
    {
      label: "Manajemen Antrean",
      items: [
        { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        {
          name: "Kendali Antrean",
          path: "/admin/queue",
          icon: MousePointerClick,
        },
        { name: "Konfigurasi Layanan", path: "/admin/config", icon: Settings },
      ],
    },
    {
      label: "Pengguna & Sistem",
      items: [
        { name: "Manajemen Pengguna", path: "/admin/users", icon: Users },
        { name: "Log Sistem", path: "/admin/logs", icon: ScrollText },
      ],
    },
    {
      label: "Survey & Analitik",
      items: [
        {
          name: "Dashboard Survey",
          path: "/survey-kepuasan-dashboard",
          icon: BarChart3,
        },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const [officeName, setOfficeName] = useState("ULP Salatiga");

  useEffect(() => {
    getConfig()
      .then((data) => {
        if (data?.officeName) setOfficeName(data.officeName);
      })
      .catch(() => {});
  }, []);

  const initials = (name?: string) =>
    (name || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] text-[#191c21] font-['Inter'] h-screen w-full flex overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="sm:hidden fixed top-3 left-3 z-[70] inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <button
          className="sm:hidden fixed inset-0 z-[55] bg-black/30"
          aria-label="Tutup menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SideNavBar */}
      <nav
        className={`fixed left-0 top-0 h-full w-[280px] bg-white/95 backdrop-blur-sm border-r border-slate-200 flex flex-col py-6 gap-4 z-[60] transition-transform duration-200 sm:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sm:hidden px-4 mb-1 flex justify-end">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-600 hover:bg-slate-200"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Logo */}
        <div className="px-6 mb-2 flex items-center gap-3">
          <img
            src="/logo.png"
            alt="PLN Logo"
            className="h-10 w-10 object-contain"
          />
          <span className="text-sm font-bold text-[#002e5b] leading-tight">
            QMS PLN
            <br />
            <span className="text-xs font-medium text-slate-500">
              {officeName}
            </span>
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="mx-4 mb-1 mt-2 text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/admin/queue" &&
                    location.pathname === "/admin/queue/");
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`mx-2 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-['Inter'] font-medium text-sm">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer — identity row + logout icon, same as kiosk sidebar */}
        <div className="px-4 mt-auto border-t border-slate-200 pt-4 pb-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              onClick={() => setIsSidebarOpen(false)}
              className="flex-1 px-2 py-2 flex items-center gap-3 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials(user?.fullName || user?.username)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#005BAC] truncate">
                  {user?.fullName || user?.username || "Admin"}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : ""}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 transition-colors flex items-center justify-center"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="ml-0 sm:ml-[280px] flex-1 h-full overflow-y-auto pt-14 sm:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
