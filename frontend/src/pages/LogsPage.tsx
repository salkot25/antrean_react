import { useEffect, useMemo, useState } from "react";
import { clearLogs, getLogs, type LogRow } from "../api";
import {
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Database,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

export default function LogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [limit, setLimit] = useState(100);
  const [level, setLevel] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

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
      setError("Gagal memuat logs dari server.");
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
      setError("Gagal menghapus logs.");
    } finally {
      setClearing(false);
    }
  };

  const modules = useMemo(() => {
    const all = logs.map((x) => x.module).filter(Boolean);
    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
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
                    Hapus Semua Logs?
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Seluruh data logs akan dihapus dan tindakan ini tidak dapat
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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191c21] tracking-tight flex items-center gap-2">
            <Database size={24} className="text-primary" />
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
            Module
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
            Connection
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
            Search
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="event, message, actor..."
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
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm text-on-surface-variant hover:bg-slate-50"
          >
            Reset Filter
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-container"
          >
            Terapkan
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

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
                  Module
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Event
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Message
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Connection
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-outline uppercase tracking-wider">
                  Path
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-on-surface-variant"
                  >
                    {loading ? "Memuat logs..." : "Belum ada data logs."}
                  </td>
                </tr>
              ) : (
                logs.map((row, idx) => (
                  <tr
                    key={`${row.timestamp}-${idx}`}
                    className="border-b border-slate-200 hover:bg-slate-50"
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
                      {row.actor}
                    </td>
                    <td className="px-4 py-3 text-xs text-outline">
                      {row.path || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
