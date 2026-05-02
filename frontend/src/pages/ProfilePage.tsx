import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, UserCircle2, LogOut, KeyRound } from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex flex-col font-['Inter']">
      <header className="bg-[#002e5b] text-white w-full h-16 flex items-center justify-between px-4 shadow-md sticky top-0 z-10">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Kembali"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Profil</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-8 pb-12 flex flex-col gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-surface-variant p-6 flex flex-col items-center text-center gap-4">
          <UserCircle2 size={72} className="text-[#002e5b]" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {user?.fullName || "Pengguna"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              @{user?.username || "-"}
            </p>
            {user?.email && (
              <p className="text-sm text-gray-500">{user.email}</p>
            )}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-blue-50 text-blue-700">
            Role: {user?.role || "user"}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-variant p-4 flex flex-col gap-3">
          <button
            onClick={() => navigate("/change-password")}
            className="w-full py-3.5 px-4 rounded-xl bg-[#002e5b]/10 text-[#002e5b] font-semibold hover:bg-[#002e5b]/20 transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound size={18} />
            Ubah Password
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-3.5 px-4 rounded-xl bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Setelah logout, Anda perlu login kembali untuk mengakses aplikasi.
        </p>
      </main>
    </div>
  );
}
