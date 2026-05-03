import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  KeyRound,
  Save,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { updateUser } from "../api";
import { useAuth } from "../context/AuthContext";

type FeedbackModal = {
  title: string;
  message: string;
  tone: "success" | "error";
  redirectToProfile?: boolean;
};

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal | null>(
    null,
  );

  const showFeedback = (
    title: string,
    message: string,
    tone: FeedbackModal["tone"],
    redirectToProfile = false,
  ) => {
    setFeedbackModal({ title, message, tone, redirectToProfile });
  };

  const closeFeedbackModal = () => {
    const shouldRedirect = feedbackModal?.redirectToProfile;
    setFeedbackModal(null);
    if (shouldRedirect) {
      navigate("/profile");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      showFeedback(
        "Password Saat Ini Wajib Diisi",
        "Masukkan password saat ini sebelum menyimpan perubahan.",
        "error",
      );
      return;
    }
    if (newPassword.length < 6) {
      showFeedback(
        "Password Baru Belum Valid",
        "Password baru minimal harus terdiri dari 6 karakter.",
        "error",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback(
        "Konfirmasi Password Tidak Cocok",
        "Pastikan konfirmasi password sama persis dengan password baru.",
        "error",
      );
      return;
    }
    if (!user?.id) {
      showFeedback(
        "Sesi Tidak Valid",
        "Data pengguna tidak valid. Silakan login ulang untuk melanjutkan.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      // Backend saat ini menerima update_user berdasarkan id; verifikasi password lama
      // belum tersedia di endpoint, jadi validasi currentPassword dilakukan di UI wajib isi.
      await updateUser(user.id, { password: newPassword });
      showFeedback(
        "Password Berhasil Diubah",
        "Password akun Anda sudah berhasil diperbarui.",
        "success",
        true,
      );
    } catch {
      showFeedback(
        "Gagal Mengubah Password",
        "Perubahan password belum berhasil disimpan. Silakan coba lagi.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] flex flex-col items-center font-['Inter']">
      {feedbackModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-sm rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-2xl">
            <div
              className={`border-b border-slate-200 px-5 py-4 ${
                feedbackModal.tone === "success"
                  ? "bg-gradient-to-br from-emerald-50 via-white to-cyan-50"
                  : "bg-gradient-to-br from-amber-50 via-white to-rose-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    feedbackModal.tone === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {feedbackModal.tone === "success" ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <AlertTriangle size={20} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {feedbackModal.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {feedbackModal.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-5 py-4">
              <button
                onClick={closeFeedbackModal}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-container"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-primary text-white w-full h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate("/profile")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Kembali ke profil"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-center leading-tight">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">
            Ubah Password
          </h1>
          <p className="text-[11px] sm:text-xs text-white/70">Keamanan Akun</p>
        </div>
        <div className="w-10" />
      </header>

      <main className="w-full max-w-[45.5rem] px-4 sm:px-5 flex-1 flex flex-col pt-5 sm:pt-7 gap-4 pb-28 lg:pb-8">
        <div className="relative w-full bg-white rounded-3xl shadow-sm border border-white/70 px-5 py-6 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-cyan-100/60 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-blue-100/70 blur-2xl" />
          <div className="relative flex flex-col items-center gap-3 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
              <KeyRound size={14} />
              Pengaturan Keamanan
            </div>
            <h2 className="text-2xl sm:text-[28px] font-extrabold text-primary mb-1 tracking-tight">
              Perbarui Password Akun
            </h2>
            <p className="text-on-surface-variant text-sm">
              Gunakan kombinasi password yang kuat untuk keamanan akses.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-[#002e5b] mb-1">
            <KeyRound size={20} />
            <p className="font-semibold text-base">Input Kredensial Baru</p>
          </div>

          <label className="text-sm font-medium text-gray-700">
            Password Saat Ini
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Masukkan password saat ini"
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Password Baru
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Minimal 6 karakter"
            />
          </label>

          <label className="text-sm font-medium text-gray-700">
            Konfirmasi Password Baru
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Ulangi password baru"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-full min-h-[52px] bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-container active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>
      </main>
    </div>
  );
}
