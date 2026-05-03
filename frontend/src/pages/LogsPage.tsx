import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { clearLogs, getLogs, type LogRow } from "../api";
import {
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MOBILE_PAGE_SIZE = 10;
const MOBILE_LIST_EXIT_MS = 180;
const MOBILE_LIST_ENTER_MS = 320;
const MOBILE_LIST_EXIT_EASING = "cubic-bezier(0.4, 0, 1, 1)";
const MOBILE_LIST_ENTER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const MOBILE_DOT_FLASH_MS = 280;
const MOBILE_EDGE_PULSE_MS = 280;

const LIMIT_OPTIONS = [50, 100, 200, 500];

function levelBadge(level: string) {
  const lv = (level || "").toUpperCase();
  if (lv === "ERROR") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (lv === "WARN") {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  return "bg-green-100 text-green-700 border-green-200";
}

function statusBadge(status: string) {
  const st = (status || "").toUpperCase();
  if (st === "OFFLINE" || st === "BACKEND_UNREACHABLE") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (st === "UNKNOWN") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function parseDetails(detailsJson: string): Record<string, any> {
  if (!detailsJson) return {};
  try {
    const parsed = JSON.parse(detailsJson);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function queueProgressLabel(eventName: string): string {
  const event = (eventName || "").toLowerCase();
  if (event === "create_queue") return "Diambil";
  if (event === "call_queue") return "Dipanggil";
  if (event === "skip_queue") return "Dilewati";
  if (event === "call_queue_failed") return "Gagal Dipanggil";
  return "Lainnya";
}

function actorLabel(actor: string): string {
  const value = (actor || "").toLowerCase();
  if (value === "kiosk") return "Antrean App";
  return actor;
}

export default function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [tableVisible, setTableVisible] = useState(false);
  const tableVisibleTimer = useRef<number | null>(null);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileListPhase, setMobileListPhase] = useState<
    "idle" | "exiting" | "entering"
  >("idle");
  const [isMobileListVisible, setIsMobileListVisible] = useState(false);
  const [mobileRenderedRows, setMobileRenderedRows] = useState<LogRow[]>([]);
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

  const initialLimit = Number(searchParams.get("limit") || "100");
  const [limit, setLimit] = useState(
    LIMIT_OPTIONS.includes(initialLimit) ? initialLimit : 100,
  );
  const [level, setLevel] = useState(searchParams.get("level") || "");
  const [moduleName, setModuleName] = useState(
    searchParams.get("module") || "",
  );
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const syncFilterToUrl = () => {
    const next = new URLSearchParams();
    if (limit !== 100) next.set("limit", String(limit));
    if (level) next.set("level", level);
    if (moduleName) next.set("module", moduleName);
    if (status) next.set("status", status);
    if (query) next.set("q", query);
    setSearchParams(next, { replace: true });
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getLogs({
        limit,
        level: level || undefined,
        module: moduleName || undefined,
        status: status || undefined,
        q: query || undefined,
      });
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        setLogs([]);
      }
      setLastUpdated(new Date());
    } catch {
      setError("Gagal memuat log dari server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const executeClearLogs = async () => {
    setClearing(true);
    setError("");
    try {
      await clearLogs(user?.username || "system");
      await fetchLogs();
      setShowClearConfirm(false);
    } catch {
      setError("Gagal menghapus log.");
    } finally {
      setClearing(false);
    }
  };

  const modules = useMemo(() => {
    const all = logs.map((x) => x.module).filter(Boolean);
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  useEffect(() => {
    setMobilePage(1);
    hasInitializedMobileListRef.current = false;
    setTableVisible(false);
    if (tableVisibleTimer.current) clearTimeout(tableVisibleTimer.current);
    tableVisibleTimer.current = window.setTimeout(
      () => setTableVisible(true),
      60,
    );
    return () => {
      if (tableVisibleTimer.current) clearTimeout(tableVisibleTimer.current);
    };
  }, [logs]);

  const stats = useMemo(() => {
    let info = 0;
    let warn = 0;
    let errorCount = 0;
    for (const row of logs) {
      const lv = (row.level || "").toUpperCase();
      if (lv === "ERROR") errorCount += 1;
      else if (lv === "WARN") warn += 1;
      else info += 1;
    }
    return { info, warn, error: errorCount };
  }, [logs]);

  const mobilePageCount = Math.max(
    1,
    Math.ceil(logs.length / MOBILE_PAGE_SIZE),
  );
  const mobileCardRows = useMemo(
    () =>
      logs.slice(
        (mobilePage - 1) * MOBILE_PAGE_SIZE,
        mobilePage * MOBILE_PAGE_SIZE,
      ),
    [mobilePage, logs],
  );

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

  return (
    <div className="p-safe-margin space-y-lg bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] min-h-screen">
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="relative p-5 sm:p-6 bg-gradient-to-br from-red-50 via-white to-rose-50 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Hapus Semua Log?
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Seluruh data log akan dihapus dan tindakan ini tidak dapat
                    dibatalkan.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeClearLogs}
                disabled={clearing}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <Trash2 size={14} className={clearing ? "animate-pulse" : ""} />
                {clearing ? "Menghapus..." : "Ya, Hapus Logs"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191c21] tracking-tight">
            Application Logs
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Pantau event penting aplikasi, error, dan status koneksi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-on-surface-variant">
              Update: {lastUpdated.toLocaleTimeString("id-ID")}
            </span>
          )}
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={clearing || loading}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            <Trash2 size={15} className={clearing ? "animate-pulse" : ""} />
            Hapus Logs
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading || clearing}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="text-green-600" size={22} />
          <div>
            <p className="text-xs text-outline uppercase tracking-wider font-semibold">
              Info
            </p>
            <p className="text-xl font-bold text-on-surface">{stats.info}</p>
          </div>
        </div>
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
          <AlertTriangle className="text-amber-600" size={22} />
          <div>
            <p className="text-xs text-outline uppercase tracking-wider font-semibold">
              Warn
            </p>
            <p className="text-xl font-bold text-on-surface">{stats.warn}</p>
          </div>
        </div>
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
          <AlertCircle className="text-red-600" size={22} />
          <div>
            <p className="text-xs text-outline uppercase tracking-wider font-semibold">
              Error
            </p>
            <p className="text-xl font-bold text-on-surface">{stats.error}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-3xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Limit
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-3 py-2 text-sm"
          >
            {LIMIT_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Level
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Semua</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Modul
          </label>
          <select
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Semua</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Koneksi
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-surface-container-low border border-surface-variant rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Semua</option>
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="BACKEND_UNREACHABLE">BACKEND_UNREACHABLE</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Cari
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="event, pesan, pelaku..."
              className="w-full bg-surface-container-low border border-surface-variant rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="md:col-span-5 flex items-center gap-2 justify-end">
          <button
            onClick={() => {
              setLevel("");
              setModuleName("");
              setStatus("");
              setQuery("");
              setLimit(100);
              setSearchParams({}, { replace: true });
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm text-on-surface-variant hover:bg-slate-50"
          >
            Reset Filter
          </button>
          <button
            onClick={() => {
              syncFilterToUrl();
              fetchLogs();
            }}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-container"
          >
            Terapkan
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          {error}
        </div>
      )}

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
            {mobileRenderedRows.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-sm text-slate-500 text-center">
                Belum ada data log.
              </div>
            ) : (
              mobileRenderedRows.map((row, idx) => {
                const details = parseDetails(row.details_json || "");
                const queueNumber = String(details.number || "").trim();
                const queueService = String(details.service || "").trim();
                const progress = queueProgressLabel(row.event);
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
                    key={`${row.timestamp}-${idx}`}
                    className={`rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm ${itemOpacity}`}
                    style={{
                      transform: itemTransform,
                      transition: `transform ${isExiting ? MOBILE_LIST_EXIT_MS : MOBILE_LIST_ENTER_MS}ms ${isExiting ? MOBILE_LIST_EXIT_EASING : MOBILE_LIST_ENTER_EASING}, opacity ${isExiting ? MOBILE_LIST_EXIT_MS : MOBILE_LIST_ENTER_MS}ms ${isExiting ? MOBILE_LIST_EXIT_EASING : MOBILE_LIST_ENTER_EASING}`,
                      transitionDelay: `${idx * 45}ms`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${levelBadge(row.level)}`}
                      >
                        {row.level}
                      </span>
                      {row.connection_status && (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${statusBadge(row.connection_status)}`}
                        >
                          {row.connection_status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {row.event}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {row.module}
                    </p>
                    {(progress !== "Lainnya" || queueNumber) && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-medium text-slate-600">
                          {progress}
                        </span>
                        {queueNumber && (
                          <span className="text-xs font-bold text-slate-700">
                            {queueNumber}
                            {queueService ? ` (${queueService})` : ""}
                          </span>
                        )}
                      </div>
                    )}
                    {row.message && (
                      <p className="mt-2 text-sm text-slate-700 line-clamp-2">
                        {row.message}
                      </p>
                    )}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                      {row.actor && (
                        <span className="font-medium text-slate-500">
                          {actorLabel(row.actor)}
                        </span>
                      )}
                      {row.actor && row.timestamp && <span>·</span>}
                      <span className="tabular-nums">{row.timestamp}</span>
                      {row.path && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[140px]">
                            {row.path}
                          </span>
                        </>
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
      <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Waktu
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Level
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Modul
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Peristiwa
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Progres
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Nomor
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Pesan
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Koneksi
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Pelaku
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Jalur
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-on-surface-variant"
                  >
                    {loading ? "Memuat log..." : "Belum ada data log."}
                  </td>
                </tr>
              ) : (
                logs.map((row, idx) =>
                  (() => {
                    const details = parseDetails(row.details_json || "");
                    const queueNumber = String(details.number || "").trim();
                    const queueService = String(details.service || "").trim();
                    const progress = queueProgressLabel(row.event);
                    return (
                      <tr
                        key={`${row.timestamp}-${idx}`}
                        className="border-b border-slate-100 hover:bg-slate-50/80"
                        style={{
                          opacity: tableVisible ? 1 : 0,
                          transform: tableVisible
                            ? "translateY(0px)"
                            : "translateY(6px)",
                          transition: `opacity ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}, transform ${MOBILE_LIST_ENTER_MS}ms ${MOBILE_LIST_ENTER_EASING}`,
                          transitionDelay: `${idx * 30}ms`,
                        }}
                      >
                        <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                          {row.timestamp}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${levelBadge(row.level)}`}
                          >
                            {row.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface">
                          {row.module}
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface font-medium">
                          {row.event}
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant whitespace-nowrap">
                          {progress}
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap font-semibold">
                          {queueNumber || "-"}
                          {queueService ? ` (${queueService})` : ""}
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface max-w-[360px] truncate">
                          {row.message}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-semibold ${statusBadge(row.connection_status)}`}
                          >
                            {row.connection_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">
                          {actorLabel(row.actor)}
                        </td>
                        <td className="px-4 py-3 text-xs text-outline">
                          {row.path || "-"}
                        </td>
                      </tr>
                    );
                  })(),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
