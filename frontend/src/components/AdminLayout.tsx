import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MousePointerClick,
  Settings,
  LogOut,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Queue Control", path: "/admin/queue", icon: MousePointerClick },
    { name: "Service Config", path: "/admin/config", icon: Settings },
    { name: "User Management", path: "/admin/users", icon: Users },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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
        {/* Header — logged-in user */}
        <div className="px-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials(user?.fullName || user?.username)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#005BAC] truncate">
                {user?.fullName || user?.username || "Admin"}
              </h2>
              <p className="font-['Inter'] font-medium text-xs text-slate-500 flex items-center gap-1">
                <ShieldCheck size={11} />
                {user?.role
                  ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                  : ""}
              </p>
            </div>
          </div>
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

        {/* Footer — logout */}
        <div className="px-4 mt-auto border-t border-slate-200 pt-4">
          <button
            onClick={handleLogout}
            className="text-slate-600 w-full mx-2 flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
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
