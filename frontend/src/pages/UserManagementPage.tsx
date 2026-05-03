import { useState, useEffect, useRef, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROLES = ["admin", "supervisor", "operator"];
const PAGE_SIZE = 10;
const MOBILE_PAGE_SIZE = 6;
const MOBILE_LIST_EXIT_MS = 180;
const MOBILE_LIST_ENTER_MS = 320;
const MOBILE_LIST_EXIT_EASING = "cubic-bezier(0.4, 0, 1, 1)";
const MOBILE_LIST_ENTER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const MOBILE_DOT_FLASH_MS = 280;
const MOBILE_EDGE_PULSE_MS = 280;

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
  const [tableVisible, setTableVisible] = useState(false);
  const tableVisibleTimer = useRef<number | null>(null);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileListPhase, setMobileListPhase] = useState<
    "idle" | "exiting" | "entering"
  >("idle");
  const [isMobileListVisible, setIsMobileListVisible] = useState(false);
  const [mobileRenderedRows, setMobileRenderedRows] = useState<UserRow[]>([]);
  const [mobileSlideDirection, setMobileSlideDirection] = useState<
    "left" | "right" | null
  >(null);
  const [mobileDragOffset, setMobileDragOffset] = useState(0);
  const [showLeftEdgeHint, setShowLeftEdgeHint] = useState(false);
  const [showRightEdgeHint, setShowRightEdgeHint] = useState(false);
  const [edgePulseSide, setEdgePulseSide] = useState<"left" | "right" | null>(
    null,
  );
  const [isActiveDotFlashing, setIsActiveDotFlashing] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const swipeAxisLockRef = useRef<"x" | "y" | null>(null);
  const previousMobilePageRef = useRef(1);
  const hasInitializedMobileListRef = useRef(false);
  const edgePulseTimeoutRef = useRef<number | null>(null);

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
  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          u.username.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q);
        const matchRole = filterRole === "all" || u.role === filterRole;
        return matchSearch && matchRole;
      }),
    [users, search, filterRole],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const mobilePageCount = Math.max(
    1,
    Math.ceil(filtered.length / MOBILE_PAGE_SIZE),
  );
  const mobileCardRows = useMemo(
    () =>
      filtered.slice(
        (mobilePage - 1) * MOBILE_PAGE_SIZE,
        mobilePage * MOBILE_PAGE_SIZE,
      ),
    [mobilePage, filtered],
  );

  useEffect(() => {
    setMobilePage(1);
    hasInitializedMobileListRef.current = false;
  }, [search, filterRole]);

  useEffect(() => {
    setTableVisible(false);
    if (tableVisibleTimer.current) clearTimeout(tableVisibleTimer.current);
    tableVisibleTimer.current = window.setTimeout(
      () => setTableVisible(true),
      60,
    );
    return () => {
      if (tableVisibleTimer.current) clearTimeout(tableVisibleTimer.current);
    };
  }, [paginated.map((u) => u.id).join(",")]);

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

  // ── Mobile swipe ─────────────────────────────────────────
  useEffect(() => {
    const previousPage = previousMobilePageRef.current;
    if (mobilePage > previousPage) setMobileSlideDirection("left");
    else if (mobilePage < previousPage) setMobileSlideDirection("right");
    previousMobilePageRef.current = mobilePage;
  }, [mobilePage]);

  useEffect(() => {
    if (!hasInitializedMobileListRef.current) {
      hasInitializedMobileListRef.current = true;
      setMobileRenderedRows(mobileCardRows);
      setMobileListPhase("entering");
      const frame = requestAnimationFrame(() => setIsMobileListVisible(true));
      const settleTimer = window.setTimeout(
        () => setMobileListPhase("idle"),
        MOBILE_LIST_ENTER_MS,
      );
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(settleTimer);
      };
    }
    setMobileListPhase("exiting");
    setIsMobileListVisible(false);
    const swapTimer = window.setTimeout(() => {
      setMobileRenderedRows(mobileCardRows);
      setMobileListPhase("entering");
      requestAnimationFrame(() => setIsMobileListVisible(true));
    }, MOBILE_LIST_EXIT_MS);
    const settleTimer = window.setTimeout(() => {
      setMobileListPhase("idle");
      setMobileSlideDirection(null);
    }, MOBILE_LIST_EXIT_MS + MOBILE_LIST_ENTER_MS);
    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [mobileCardRows]);

  useEffect(() => {
    if (mobilePageCount <= 1) return;
    setIsActiveDotFlashing(true);
    const timeout = window.setTimeout(
      () => setIsActiveDotFlashing(false),
      MOBILE_DOT_FLASH_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [mobilePage, mobilePageCount]);

  useEffect(() => {
    return () => {
      if (edgePulseTimeoutRef.current !== null)
        window.clearTimeout(edgePulseTimeoutRef.current);
    };
  }, []);

  const triggerEdgePulse = (side: "left" | "right") => {
    setEdgePulseSide(side);
    if (edgePulseTimeoutRef.current !== null)
      window.clearTimeout(edgePulseTimeoutRef.current);
    edgePulseTimeoutRef.current = window.setTimeout(
      () => setEdgePulseSide(null),
      MOBILE_EDGE_PULSE_MS,
    );
  };

  const resetSwipeState = () => {
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
    swipeAxisLockRef.current = null;
    setMobileDragOffset(0);
    setShowLeftEdgeHint(false);
    setShowRightEdgeHint(false);
  };

  const handleMobileCardsTouchStart = (clientX: number, clientY: number) => {
    swipeStartXRef.current = clientX;
    swipeStartYRef.current = clientY;
    swipeAxisLockRef.current = null;
    setMobileDragOffset(0);
  };

  const handleMobileCardsTouchMove = (clientX: number, clientY: number) => {
    if (swipeStartXRef.current === null || swipeStartYRef.current === null)
      return;
    const deltaX = clientX - swipeStartXRef.current;
    const deltaY = clientY - swipeStartYRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (swipeAxisLockRef.current === null) {
      if (absX < 10 && absY < 10) return;
      swipeAxisLockRef.current = absX > absY * 1.15 ? "x" : "y";
    }
    if (swipeAxisLockRef.current !== "x") {
      setMobileDragOffset(0);
      return;
    }
    const isPullingPastFirstPage = mobilePage === 1 && deltaX > 0;
    const isPullingPastLastPage = mobilePage === mobilePageCount && deltaX < 0;
    if (isPullingPastFirstPage && !showLeftEdgeHint) triggerEdgePulse("left");
    if (isPullingPastLastPage && !showRightEdgeHint) triggerEdgePulse("right");
    setShowLeftEdgeHint(isPullingPastFirstPage);
    setShowRightEdgeHint(isPullingPastLastPage);
    if (isPullingPastFirstPage || isPullingPastLastPage) {
      setMobileDragOffset(
        Math.sign(deltaX) * Math.min(28, Math.sqrt(Math.abs(deltaX)) * 3.2),
      );
      return;
    }
    setMobileDragOffset(Math.max(-48, Math.min(48, deltaX * 0.78)));
  };

  const handleMobileCardsTouchEnd = (clientX: number) => {
    if (
      swipeStartXRef.current === null ||
      swipeAxisLockRef.current !== "x" ||
      mobilePageCount <= 1
    ) {
      resetSwipeState();
      return;
    }
    const deltaX = clientX - swipeStartXRef.current;
    if (deltaX <= -48) setMobilePage((p) => Math.min(mobilePageCount, p + 1));
    else if (deltaX >= 48) setMobilePage((p) => Math.max(1, p - 1));
    resetSwipeState();
  };

  const handleMobileCardsTouchCancel = () => resetSwipeState();

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-safe-margin space-y-xl min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb]">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-secondary text-white"
              : "bg-error text-white"
          }`}
        >
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header (Queue Control Style) */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191c21] tracking-tight">
            User Management
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Kelola akses sistem, peran, dan status untuk seluruh personel.
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <button
            onClick={openCreate}
            className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
          >
            <UserPlus size={16} />
            Tambah User Baru
          </button>
        )}
      </header>

      {/* Toolbar */}
      <div className="bg-white/95 backdrop-blur-sm p-sm rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
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

      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {mobilePageCount > 1 && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/80 px-3 py-2 text-[11px] text-cyan-800">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <ChevronLeft size={14} className="text-cyan-600" />
              Geser untuk pindah halaman
              <ChevronRight size={14} className="text-cyan-600" />
            </span>
            <span className="inline-flex items-center gap-1.5 text-cyan-700">
              <span className="block h-1.5 w-1.5 rounded-full bg-cyan-500" />
              Swipe kiri/kanan
            </span>
          </div>
        )}
        <div className="relative overflow-hidden rounded-[26px]">
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 rounded-l-[26px] bg-gradient-to-r from-cyan-200/55 via-cyan-100/30 to-transparent transition-all duration-200 ${showLeftEdgeHint || (mobilePage === 1 && mobileDragOffset > 6) ? "opacity-100" : "opacity-0"}`}
            style={{
              transform:
                edgePulseSide === "left" ? "scaleX(1.14)" : "scaleX(1)",
              transitionDuration: `${MOBILE_EDGE_PULSE_MS}ms`,
              transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
            }}
          >
            <div className="flex h-full items-center justify-center">
              <ChevronLeft
                size={14}
                className={`text-cyan-700/80 transition-all ${edgePulseSide === "left" ? "scale-110 opacity-100" : ""}`}
                style={{
                  transitionDuration: `${MOBILE_EDGE_PULSE_MS}ms`,
                  transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
                }}
              />
            </div>
          </div>
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 rounded-r-[26px] bg-gradient-to-l from-cyan-200/55 via-cyan-100/30 to-transparent transition-all duration-200 ${showRightEdgeHint || (mobilePage === mobilePageCount && mobileDragOffset < -6) ? "opacity-100" : "opacity-0"}`}
            style={{
              transform:
                edgePulseSide === "right" ? "scaleX(1.14)" : "scaleX(1)",
              transitionDuration: `${MOBILE_EDGE_PULSE_MS}ms`,
              transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
            }}
          >
            <div className="flex h-full items-center justify-center">
              <ChevronRight
                size={14}
                className={`text-cyan-700/80 transition-all ${edgePulseSide === "right" ? "scale-110 opacity-100" : ""}`}
                style={{
                  transitionDuration: `${MOBILE_EDGE_PULSE_MS}ms`,
                  transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
                }}
              />
            </div>
          </div>
          <div
            className="grid gap-3"
            onTouchStart={(e) =>
              handleMobileCardsTouchStart(
                e.changedTouches[0].clientX,
                e.changedTouches[0].clientY,
              )
            }
            onTouchMove={(e) =>
              handleMobileCardsTouchMove(
                e.changedTouches[0].clientX,
                e.changedTouches[0].clientY,
              )
            }
            onTouchEnd={(e) =>
              handleMobileCardsTouchEnd(e.changedTouches[0].clientX)
            }
            onTouchCancel={handleMobileCardsTouchCancel}
            style={{
              touchAction: "pan-y",
              transform: `translateX(${mobileDragOffset}px)`,
              opacity: 1 - Math.min(0.18, Math.abs(mobileDragOffset) / 240),
              transitionDuration:
                swipeStartXRef.current === null
                  ? `${MOBILE_LIST_ENTER_MS}ms`
                  : "0ms",
              transitionTimingFunction: MOBILE_LIST_ENTER_EASING,
              transitionProperty: "transform, opacity",
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-10 text-on-surface-variant">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Memuat data...</span>
              </div>
            ) : mobileRenderedRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-sm text-slate-500 text-center">
                {search || filterRole !== "all"
                  ? "Tidak ada user yang cocok."
                  : "Belum ada user terdaftar."}
              </div>
            ) : (
              mobileRenderedRows.map((u, idx) => {
                const isExiting = mobileListPhase === "exiting";
                const isVisible = isMobileListVisible;
                const txEnter =
                  mobileSlideDirection === "left"
                    ? 20
                    : mobileSlideDirection === "right"
                      ? -20
                      : 0;
                const txExit =
                  mobileSlideDirection === "left"
                    ? -16
                    : mobileSlideDirection === "right"
                      ? 16
                      : 0;
                const scaleEnter = 0.97 - idx * 0.006;
                const itemTransform = isExiting
                  ? `translateX(${txExit}px) translateY(4px) scale(0.98)`
                  : isVisible
                    ? "translateX(0px) translateY(0px) scale(1)"
                    : `translateX(${txEnter}px) translateY(8px) scale(${scaleEnter.toFixed(3)})`;
                const itemOpacity = isExiting
                  ? "opacity-0"
                  : isVisible
                    ? "opacity-100"
                    : "opacity-0";
                return (
                  <article
                    key={u.id}
                    className={`rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm ${itemOpacity}`}
                    style={{
                      transform: itemTransform,
                      transition: `transform ${isExiting ? MOBILE_LIST_EXIT_MS : MOBILE_LIST_ENTER_MS}ms ${isExiting ? MOBILE_LIST_EXIT_EASING : MOBILE_LIST_ENTER_EASING}, opacity ${isExiting ? MOBILE_LIST_EXIT_MS : MOBILE_LIST_ENTER_MS}ms ${isExiting ? MOBILE_LIST_EXIT_EASING : MOBILE_LIST_ENTER_EASING}`,
                      transitionDelay: `${idx * 45}ms`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold border border-primary/20 shrink-0">
                          {initials(u.fullName || u.username)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {u.fullName || u.username}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            @{u.username}
                            {u.email ? ` · ${u.email}` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleColor(u.role)}`}
                      >
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-[11px]">
                        {u.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                        <span className="text-slate-400">
                          {fmtLastLogin(u.lastLogin)}
                        </span>
                      </div>
                      {currentUser?.role === "admin" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={u.id === currentUser?.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              u.id === currentUser?.id
                                ? "Tidak bisa hapus diri sendiri"
                                : "Hapus"
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
        {mobilePageCount > 1 && (
          <div className="mt-2 flex items-center justify-center gap-2">
            {Array.from({ length: mobilePageCount }, (_, index) => (
              <button
                key={index}
                onClick={() => setMobilePage(index + 1)}
                aria-label={`Halaman ${index + 1}`}
                style={{
                  width: mobilePage === index + 1 ? 20 : 8,
                  height: 8,
                  borderRadius: 9999,
                  backgroundColor:
                    mobilePage === index + 1
                      ? isActiveDotFlashing
                        ? "rgb(6 182 212)"
                        : "rgb(14 165 233)"
                      : "rgb(203 213 225)",
                  transition: `all ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
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
              <thead className="bg-slate-50 border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-200">
                {paginated.map((u, idx) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                    style={{
                      opacity: tableVisible ? 1 : 0,
                      transform: tableVisible
                        ? "translateY(0px)"
                        : "translateY(6px)",
                      transition: `opacity ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}, transform ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}`,
                      transitionDelay: `${idx * 40}ms`,
                    }}
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
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
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
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${page === p ? "bg-primary text-white" : "hover:bg-surface-container text-on-surface-variant"}`}
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200">
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
