import { useState, useEffect, useRef } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../api";
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// ─── Types ─────────────────────────────────────────────────────
export interface UserRow {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

type UserForm = {
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  password: string;
};

const ROLES = ["admin", "supervisor", "operator"];
const PAGE_SIZE = 10;

// ─── Helpers ────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleColor(role: string) {
  switch (role) {
    case "admin":
      return "bg-primary/10 text-primary border-primary/20";
    case "supervisor":
      return "bg-secondary/10 text-secondary border-secondary/20";
    default:
      return "bg-surface-container-high text-on-surface border-surface-variant";
  }
}

function fmtLastLogin(raw: string) {
  if (!raw) return "Belum pernah";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400)
    return `Hari ini, ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Modal ─────────────────────────────────────────────────────
function UserModal({
  title,
  form,
  setForm,
  onSave,
  onClose,
  saving,
  isEdit,
  error,
}: {
  title: string;
  form: UserForm;
  setForm: (f: UserForm) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  isEdit: boolean;
  error: string;
}) {
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-surface-variant">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-variant">
          <h3 className="font-semibold text-on-surface text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-error-container text-on-error-container text-sm border border-error/30">
              {error}
            </div>
          )}

          <div>
            <label className="label-xs">Username</label>
            <input
              type="text"
              disabled={isEdit}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="field"
              placeholder="Contoh: budi.santoso"
            />
          </div>
          <div>
            <label className="label-xs">Nama Lengkap</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="field"
              placeholder="Nama lengkap pengguna"
            />
          </div>
          <div>
            <label className="label-xs">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="field"
              placeholder="email@plnulp.local"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-xs">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="field"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-xs">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="field"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-xs">
              {isEdit
                ? "Password Baru (kosongkan jika tidak diubah)"
                : "Password"}
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="field pr-10"
                placeholder={
                  isEdit
                    ? "Biarkan kosong jika tidak diubah"
                    : "Min. 8 karakter"
                }
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-variant bg-surface-container-lowest rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors border border-surface-variant"
          >
            Batal
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-container transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} />
            )}
            {isEdit ? "Simpan Perubahan" : "Tambah User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [page, setPage] = useState(1);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [form, setForm] = useState<UserForm>({
    username: "",
    fullName: "",
    email: "",
    role: "operator",
    status: "active",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ─────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      if (Array.isArray(data)) setUsers(data);
    } catch {
      showToast("Gagal memuat daftar user.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── Derived list ─────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Handlers ─────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm({
      username: "",
      fullName: "",
      email: "",
      role: "operator",
      status: "active",
      password: "",
    });
    setModalError("");
    setModalOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditTarget(u);
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      password: "",
    });
    setModalError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editTarget && !form.username.trim()) {
      setModalError("Username wajib diisi.");
      return;
    }
    if (!editTarget && !form.password) {
      setModalError("Password wajib diisi untuk user baru.");
      return;
    }

    setSaving(true);
    setModalError("");

    try {
      if (editTarget) {
        await updateUser(editTarget.id, {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          status: form.status,
          ...(form.password ? { password: form.password } : {}),
        });
        showToast(`User "${editTarget.username}" berhasil diperbarui.`);
      } else {
        await createUser({
          username: form.username.trim(),
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          status: form.status,
          password: form.password,
        });
        showToast(`User "${form.username}" berhasil ditambahkan.`);
      }
      setModalOpen(false);
      // Refresh after brief delay to let GAS write complete
      setTimeout(fetchUsers, 1500);
    } catch {
      setModalError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      showToast(`User "${deleteTarget.username}" berhasil dihapus.`);
      setDeleteTarget(null);
      setTimeout(fetchUsers, 1500);
    } catch {
      showToast("Gagal menghapus user.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-safe-margin space-y-xl min-h-screen bg-background">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-secondary text-white"
              : "bg-error text-white"
          }`}
        >
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm">
        <div>
          <h1 className="font-heading-lg text-on-surface flex items-center gap-2">
            <Users size={28} className="text-primary" />
            User Management
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Kelola akses sistem, peran, dan status untuk seluruh personel.
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <button
            onClick={openCreate}
            className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
          >
            <UserPlus size={16} />
            Tambah User Baru
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-sm rounded-xl border border-surface-variant shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari username, nama, atau email..."
            className="w-full bg-surface-container-low border border-surface-variant rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setPage(1);
            }}
            className="flex-1 sm:flex-none bg-surface-container-low border border-surface-variant rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
          >
            <option value="all">Semua Role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
          <span className="text-xs text-outline whitespace-nowrap">
            {filtered.length} user
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-variant shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-on-surface-variant">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-outline opacity-60">
            <ShieldCheck size={28} />
            <span className="text-sm">
              {search || filterRole !== "all"
                ? "Tidak ada user yang cocok."
                : "Belum ada user terdaftar."}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-surface-variant">
                <tr>
                  <th className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    User
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Role
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Login Terakhir
                  </th>
                  {currentUser?.role === "admin" && (
                    <th className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {paginated.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-container-low transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container/30 text-primary flex items-center justify-center text-sm font-bold border border-surface-variant shrink-0">
                          {initials(u.fullName || u.username)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-on-surface">
                            {u.fullName || u.username}
                          </div>
                          <div className="text-xs text-on-surface-variant">
                            @{u.username}
                            {u.email && (
                              <span className="ml-2 opacity-70">
                                • {u.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColor(u.role)}`}
                      >
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {u.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-variant text-on-surface-variant border border-outline-variant">
                          <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-on-surface-variant">
                      {fmtLastLogin(u.lastLogin)}
                    </td>
                    {currentUser?.role === "admin" && (
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={u.id === currentUser?.id}
                            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              u.id === currentUser?.id
                                ? "Tidak bisa hapus diri sendiri"
                                : "Hapus"
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-6 py-4 border-t border-surface-variant flex items-center justify-between bg-surface-container-lowest">
            <span className="text-xs text-on-surface-variant">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} dari{" "}
              {filtered.length} user
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container border border-surface-variant disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                )
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                    acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`e-${i}`} className="px-1 text-outline text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                        page === p
                          ? "bg-primary text-white"
                          : "hover:bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container border border-surface-variant disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <UserModal
          title={
            editTarget
              ? `Edit User: ${editTarget.username}`
              : "Tambah User Baru"
          }
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          saving={saving}
          isEdit={!!editTarget}
          error={modalError}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-surface-variant">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error mx-auto">
                <Trash2 size={22} />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-on-surface text-base">
                  Hapus User
                </h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Yakin ingin menghapus user{" "}
                  <strong>
                    {deleteTarget.fullName || deleteTarget.username}
                  </strong>
                  ? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-surface-variant text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .label-xs {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-on-surface-variant, #424750);
          margin-bottom: 6px;
        }
        .field {
          width: 100%;
          background: #f3f3f9;
          border: 1px solid #c2c6d2;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          color: #191c20;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }
        .field:focus {
          border-color: #002e5b;
          box-shadow: 0 0 0 2px rgba(0,46,91,0.15);
        }
        .field:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
