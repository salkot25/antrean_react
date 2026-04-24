import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MousePointerClick, 
  Settings, 
  BarChart2, 
  LogOut, 
  User 
} from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Queue Control', path: '/admin', icon: MousePointerClick },
    { name: 'Service Config', path: '/admin/config', icon: Settings },
    { name: 'Reports', path: '/admin/reports', icon: BarChart2 },
  ];

  return (
    <div className="bg-[#F5F7FA] text-[#191c21] font-['Inter'] h-screen w-full flex overflow-hidden">
      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-full w-[280px] bg-slate-50 border-r border-slate-200 flex flex-col py-6 gap-4 z-50">
        {/* Header */}
        <div className="px-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#005bac] flex items-center justify-center text-white">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#005BAC]">PLN Admin</h2>
              <p className="font-['Inter'] font-medium text-sm text-slate-500">Unit Pelaksana Pelanggan</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col gap-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/admin' && location.pathname === '/admin/');
            
            return (
              <Link 
                key={item.name}
                to={item.path}
                className={`mx-2 flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-white text-[#005BAC] shadow-sm border-l-4 border-[#005BAC] scale-[0.98] duration-150' 
                    : 'text-slate-600 hover:bg-slate-200 cursor-pointer'
                }`}
              >
                <Icon size={20} />
                <span className="font-['Inter'] font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 mt-auto">
          <button className="text-slate-600 w-full mx-2 flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-200 transition-all cursor-pointer">
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
