import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ChevronLeft,
  UserCircle2,
  LogOut,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] flex flex-col items-center font-['Inter']">
      <header className="bg-primary text-white w-full h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate("/ambil")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Kembali ke ambil antrean"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          <div className="text-center leading-tight">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">
              Profil
            </h1>
            <p className="text-[11px] sm:text-xs text-white/70">Akun Operator</p>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <main className="w-full max-w-[45.5rem] px-4 sm:px-5 flex-1 flex flex-col pt-5 sm:pt-7 gap-4 pb-28 lg:pb-8">
        <div className="relative w-full bg-white rounded-3xl shadow-sm border border-white/70 px-5 py-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-cyan-100/60 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-blue-100/70 blur-2xl" />
          <div className="relative flex flex-col items-center gap-3 text-center">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center p-2">
              <UserCircle2 size={76} className="text-[#002e5b]" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-[28px] font-extrabold text-primary mb-1 tracking-tight">
                {user?.fullName || "Pengguna"}
              </h2>
              <p className="text-on-surface-variant text-sm">
                @{user?.username || "-"}
              </p>
              {user?.email && (
                <p className="text-on-surface-variant text-sm">{user.email}</p>
              )}
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck size={14} />
              Role: {user?.role || "user"}
            </div>
          </div>
        </div>

        <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col gap-3">
          <button
            onClick={() => navigate("/change-password")}
            className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound size={18} />
            Ubah Password
          </button>

          <button
            onClick={handleLogout}
            className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>

          <p className="text-xs text-slate-400 text-center pt-1">
            Setelah logout, Anda perlu login kembali untuk mengakses aplikasi.
          </p>
        </div>
      </main>
    </div>
  );
}
