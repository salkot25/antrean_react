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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getConfig } from "../api";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Queue Control", path: "/admin/queue", icon: MousePointerClick },
    { name: "Service Config", path: "/admin/config", icon: Settings },
    { name: "User Management", path: "/admin/users", icon: Users },
    { name: "Logs", path: "/admin/logs", icon: ScrollText },
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
    <div className="bg-[#F5F7FA] text-[#191c21] font-['Inter'] h-screen w-full flex overflow-hidden">
      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-full w-[280px] bg-slate-50 border-r border-slate-200 flex flex-col py-6 gap-4 z-50">
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
        <div className="flex-1 flex flex-col gap-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === "/admin/queue" &&
                location.pathname === "/admin/queue/");

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`mx-2 flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-white text-[#005BAC] shadow-sm border-l-4 border-[#005BAC] scale-[0.98] duration-150"
                    : "text-slate-600 hover:bg-slate-200 cursor-pointer"
                }`}
              >
                <Icon size={20} />
                <span className="font-['Inter'] font-medium text-sm">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Footer — user info + logout */}
        <div className="px-4 mt-auto border-t border-slate-200 pt-4 flex flex-col gap-1">
          <div className="px-2 py-2 flex items-center gap-3">
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
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-600 w-full mx-2 flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
          >
            <LogOut size={20} />
            <span className="font-['Inter'] font-medium text-sm">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="ml-[280px] flex-1 h-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
