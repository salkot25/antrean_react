import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  BarChart3,
  CalendarDays,
  MessageSquare,
  SmilePlus,
  TrendingUp,
  RefreshCw,
  Search,
  ArrowUpDown,
  Filter,
  LayoutDashboard,
  MousePointerClick,
  Settings,
  Users,
  ScrollText,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { getConfig, getCustomerSatisfaction, type SurveyRow } from "../api";
import { useAuth } from "../context/AuthContext";

type SatisfactionOption = "Sangat Puas" | "Puas" | "Kurang Puas" | "Tidak Puas";

type SurveyItem = SurveyRow;

const SAT_ORDER: SatisfactionOption[] = [
  "Sangat Puas",
  "Puas",
  "Kurang Puas",
  "Tidak Puas",
];

const SAT_SCORE: Record<SatisfactionOption, number> = {
  "Sangat Puas": 4,
  Puas: 3,
  "Kurang Puas": 2,
  "Tidak Puas": 1,
};

const SAT_COLOR: Record<SatisfactionOption, string> = {
  "Sangat Puas": "bg-emerald-500",
  Puas: "bg-cyan-500",
  "Kurang Puas": "bg-amber-500",
  "Tidak Puas": "bg-rose-500",
};

const SAT_LABEL_COLOR: Record<SatisfactionOption, string> = {
  "Sangat Puas": "text-emerald-700",
  Puas: "text-cyan-700",
  "Kurang Puas": "text-amber-700",
  "Tidak Puas": "text-rose-700",
};

function fmtDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SurveyRecapDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [officeName, setOfficeName] = useState("ULP Salatiga");
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [tableQuery, setTableQuery] = useState("");
  const [tableFilterSat, setTableFilterSat] = useState<
    "all" | SatisfactionOption
  >("all");
  const [tableSort, setTableSort] = useState<
    | "date_desc"
    | "date_asc"
    | "phone_asc"
    | "phone_desc"
    | "sat_desc"
    | "sat_asc"
  >("date_desc");

  const navGroups = [
    {
      label: "Manajemen Antrean",
      items: [
        { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        {
          name: "Queue Control",
          path: "/admin/queue",
          icon: MousePointerClick,
        },
        { name: "Service Config", path: "/admin/config", icon: Settings },
      ],
    },
    {
      label: "Pengguna & Sistem",
      items: [
        { name: "User Management", path: "/admin/users", icon: Users },
        { name: "Logs", path: "/admin/logs", icon: ScrollText },
      ],
    },
    {
      label: "Survey & Analitik",
      items: [
        {
          name: "Dashboard Survey",
          path: "/survey-kepuasan-dashboard",
          icon: BarChart3,
        },
      ],
    },
  ];

  const initials = (name?: string) =>
    (name || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const fetchSurveys = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const data = await getCustomerSatisfaction(500);
      if (Array.isArray(data)) {
        setSurveys(data as SurveyItem[]);
        setLastUpdated(new Date());
      }
    } catch {
      setSurveys([]);
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const runFetch = async () => {
      if (!active) return;
      await fetchSurveys(false);
    };

    runFetch();
    const interval = setInterval(runFetch, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchSurveys]);

  useEffect(() => {
    getConfig()
      .then((data) => {
        if (data?.officeName) setOfficeName(data.officeName);
      })
      .catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const total = surveys.length;
    const bySatisfaction: Record<SatisfactionOption, number> = {
      "Sangat Puas": 0,
      Puas: 0,
      "Kurang Puas": 0,
      "Tidak Puas": 0,
    };

    let scoreSum = 0;
    let withFeedback = 0;
    const byDate: Record<string, number> = {};

    for (const s of surveys) {
      if (SAT_ORDER.includes(s.satisfaction)) {
        bySatisfaction[s.satisfaction] += 1;
        scoreSum += SAT_SCORE[s.satisfaction];
      }
      if (s.feedback && s.feedback.trim()) withFeedback += 1;
      const key = s.inputDate || "Tanpa Tanggal";
      byDate[key] = (byDate[key] || 0) + 1;
    }

    const positive = bySatisfaction["Sangat Puas"] + bySatisfaction["Puas"];
    const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;
    const avgScore = total > 0 ? scoreSum / total : 0;
    const index = total > 0 ? Math.round((avgScore / 4) * 100) : 0;

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayCount = byDate[todayKey] || 0;

    const trend = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7);

    return {
      total,
      bySatisfaction,
      positiveRate,
      index,
      withFeedback,
      todayCount,
      trend,
    };
  }, [surveys]);

  const tableRows = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    const rows = surveys.filter((row) => {
      const satOk =
        tableFilterSat === "all" || row.satisfaction === tableFilterSat;
      const text =
        `${row.phoneNumber || ""} ${row.feedback || ""} ${row.satisfaction || ""}`.toLowerCase();
      const qOk = !q || text.includes(q);
      return satOk && qOk;
    });

    const toDateValue = (s: SurveyItem) => {
      const raw = s.createdAt || s.inputDate || "";
      const t = new Date(raw).getTime();
      return Number.isNaN(t) ? 0 : t;
    };

    return [...rows].sort((a, b) => {
      switch (tableSort) {
        case "date_asc":
          return toDateValue(a) - toDateValue(b);
        case "phone_asc":
          return (a.phoneNumber || "").localeCompare(b.phoneNumber || "");
        case "phone_desc":
          return (b.phoneNumber || "").localeCompare(a.phoneNumber || "");
        case "sat_desc":
          return SAT_SCORE[b.satisfaction] - SAT_SCORE[a.satisfaction];
        case "sat_asc":
          return SAT_SCORE[a.satisfaction] - SAT_SCORE[b.satisfaction];
        case "date_desc":
        default:
          return toDateValue(b) - toDateValue(a);
      }
    });
  }, [surveys, tableFilterSat, tableQuery, tableSort]);

  const maxSatCount = Math.max(1, ...Object.values(stats.bySatisfaction));
  const maxTrendCount = Math.max(1, ...stats.trend.map(([, v]) => v));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] flex flex-col font-['Inter']">
      {isSidebarOpen && (
        <button
          className="sm:hidden fixed inset-0 z-[55] bg-black/30"
          aria-label="Tutup menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <nav
        className={`fixed left-0 top-0 h-full w-[280px] bg-white/95 backdrop-blur-sm border-r border-slate-200 flex flex-col py-6 gap-4 z-[60] transition-transform duration-200 sm:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sm:hidden px-4 mb-1 flex justify-end">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-600 hover:bg-slate-200"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

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

        <div className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              <p className="mx-4 mb-1 mt-2 text-[10px] uppercase tracking-widest font-semibold text-slate-400">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/admin/queue" &&
                    location.pathname === "/admin/queue/");
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`mx-2 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-['Inter'] font-medium text-sm">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-4 mt-auto border-t border-slate-200 pt-4 pb-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/users"
              onClick={() => setIsSidebarOpen(false)}
              className="flex-1 px-2 py-2 flex items-center gap-3 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
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
            </Link>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 transition-colors flex items-center justify-center"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full sm:w-[calc(100%-280px)] sm:ml-[280px] px-4 sm:px-safe-margin flex-1 flex flex-col pt-5 sm:pt-7 gap-4 pb-8">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="sm:hidden p-2 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#191c21] tracking-tight">
                Dashboard Survey
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1">
                Rekap kepuasan pelanggan secara real-time.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="text-xs sm:text-sm text-slate-500 text-right">
              Update terakhir: {lastUpdated.toLocaleTimeString("id-ID")}
              {isLoading ? " (memuat...)" : ""}
            </div>
            <button
              type="button"
              onClick={() => void fetchSurveys(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-container disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw
                size={15}
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Total Respon
            </p>
            <p className="mt-1 text-2xl font-extrabold text-primary">
              {stats.total}
            </p>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Index Kepuasan
            </p>
            <p className="mt-1 text-2xl font-extrabold text-primary">
              {stats.index}%
            </p>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Positive Rate
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600">
              {stats.positiveRate}%
            </p>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Respon Hari Ini
            </p>
            <p className="mt-1 text-2xl font-extrabold text-cyan-700">
              {stats.todayCount}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Distribusi Kepuasan
              </h2>
            </div>

            <div className="space-y-3">
              {SAT_ORDER.map((k) => {
                const count = stats.bySatisfaction[k];
                const pct =
                  stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const width = Math.max(
                  6,
                  Math.round((count / maxSatCount) * 100),
                );
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`font-semibold ${SAT_LABEL_COLOR[k]}`}>
                        {k}
                      </span>
                      <span className="text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SAT_COLOR[k]}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
              <p className="flex items-center gap-2 font-semibold text-slate-700">
                <SmilePlus size={16} className="text-primary" />
                Insight Cepat
              </p>
              <p className="mt-1">
                {stats.positiveRate >= 80
                  ? "Mayoritas pelanggan merasa puas. Pertahankan standar layanan saat ini."
                  : "Masih ada ruang peningkatan. Fokus pada feedback pelanggan untuk perbaikan layanan."}
              </p>
            </div>
          </div>

          <div className="xl:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Trend 7 Hari Terakhir
              </h2>
            </div>

            {stats.trend.length === 0 ? (
              <div className="h-[220px] rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
                Belum ada data survey.
              </div>
            ) : (
              <div className="h-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-end gap-2">
                {stats.trend.map(([date, count]) => {
                  const h = Math.max(
                    12,
                    Math.round((count / maxTrendCount) * 100),
                  );
                  return (
                    <div
                      key={date}
                      className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1"
                    >
                      <div className="text-[10px] text-slate-500">{count}</div>
                      <div
                        className="w-full rounded-t-md bg-primary/80"
                        style={{ height: `${h}%` }}
                      />
                      <div className="text-[10px] text-slate-500 truncate w-full text-center">
                        {fmtDate(date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Feedback Terkirim
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">
                  {stats.withFeedback}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Tanpa Feedback
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">
                  {Math.max(0, stats.total - stats.withFeedback)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              <h2 className="text-base font-bold text-slate-900">
                Respon Terbaru
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="relative md:col-span-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  placeholder="Cari No. HP / isi kritik"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </label>

              <label className="relative md:col-span-1">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={tableFilterSat}
                  onChange={(e) =>
                    setTableFilterSat(
                      e.target.value as "all" | SatisfactionOption,
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="all">Semua Kepuasan</option>
                  {SAT_ORDER.map((sat) => (
                    <option key={sat} value={sat}>
                      {sat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative md:col-span-1">
                <ArrowUpDown
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={tableSort}
                  onChange={(e) =>
                    setTableSort(
                      e.target.value as
                        | "date_desc"
                        | "date_asc"
                        | "phone_asc"
                        | "phone_desc"
                        | "sat_desc"
                        | "sat_asc",
                    )
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="date_desc">Tanggal Terbaru</option>
                  <option value="date_asc">Tanggal Terlama</option>
                  <option value="phone_asc">No. HP A-Z</option>
                  <option value="phone_desc">No. HP Z-A</option>
                  <option value="sat_desc">Kepuasan Tertinggi</option>
                  <option value="sat_asc">Kepuasan Terendah</option>
                </select>
              </label>
            </div>
          </div>

          {tableRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 text-center">
              Data tidak ditemukan. Coba ubah filter atau kata kunci pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm bg-white">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                    <th className="py-2.5 px-3 font-semibold">No. HP</th>
                    <th className="py-2.5 px-3 font-semibold">Kepuasan</th>
                    <th className="py-2.5 px-3 font-semibold">Saran/Kritik</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((item, idx) => (
                    <tr
                      key={`${item.phoneNumber}-${idx}`}
                      className="border-b border-slate-100 align-top hover:bg-slate-50"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <CalendarDays size={13} className="text-slate-400" />
                          {fmtDate(item.inputDate)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {item.phoneNumber || "-"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 ${SAT_LABEL_COLOR[item.satisfaction]}`}
                        >
                          {item.satisfaction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {item.feedback || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
