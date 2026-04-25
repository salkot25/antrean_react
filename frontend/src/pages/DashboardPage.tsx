import { useState, useEffect, useRef } from "react";
import { getDisplayData, getWaitingQueues, getConfig } from "../api";
import {
  Zap,
  Ticket,
  UserCheck,
  Hourglass,
  Timer,
  RefreshCw,
  Smartphone,
  Headphones,
  Users,
  ChevronRight,
  Megaphone,
  CheckCircle2,
  PlusCircle,
  Clock,
  BarChart2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Parse "CS-016" → 16 */
function parseNumber(numStr: string | undefined): number {
  if (!numStr || numStr === "--") return 0;
  const parts = numStr.split("-");
  return parseInt(parts[parts.length - 1], 10) || 0;
}

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}d yang lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m yang lalu`;
  return `${Math.floor(diff / 3600)}j yang lalu`;
}

type ActivityItem = {
  id: number;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  sub: string;
  time: Date;
};

const SERVICES = [
  {
    key: "Loket Customer Service",
    service: "CS",
    label: "Customer Service",
    accentColor: "bg-secondary",
    textColor: "text-secondary",
    serveLabel: "text-secondary",
  },
  {
    key: "Loket PLN Mobile Experience",
    service: "PLN",
    label: "PLN Mobile Experience",
    accentColor: "bg-primary",
    textColor: "text-primary",
    serveLabel: "text-primary",
  },
  {
    key: "Loket Customer Care",
    service: "CC",
    label: "Customer Care",
    accentColor: "bg-[#723100]",
    textColor: "text-[#723100]",
    serveLabel: "text-[#723100]",
  },
];

// ─────────────────────────────────────────────
// Chart bars — static distribution shape
// ─────────────────────────────────────────────
const CHART_HOURS = [
  { label: "08:00", heightPct: 30, active: false },
  { label: "09:00", heightPct: 45, active: false },
  { label: "10:00", heightPct: 85, active: true },
  { label: "11:00", heightPct: 95, active: true },
  { label: "12:00", heightPct: 60, active: false },
  { label: "13:00", heightPct: 70, active: false },
  { label: "14:00", heightPct: 50, active: false },
  { label: "15:00", heightPct: 40, active: false },
  { label: "16:00", heightPct: 25, active: false },
];

export default function DashboardPage() {
  const [displayData, setDisplayData] = useState<Record<string, any>>({});
  const [waitingQueues, setWaitingQueues] = useState<any[]>([]);
  const [runningText, setRunningText] = useState(
    "Selamat datang di PLN ULP Salatiga. Silakan ambil nomor antrian dan tunggu panggilan.",
  );
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const activityIdRef = useRef(1000);
  const prevDisplayRef = useRef<Record<string, any>>({});

  // ── Initial config load (once)
  useEffect(() => {
    getConfig()
      .then((cfg) => {
        if (cfg?.runningText) setRunningText(cfg.runningText);
      })
      .catch(() => {});
  }, []);

  // ── Polling display + waiting data every 5s
  const fetchData = async () => {
    setLoading(true);
    try {
      const [display, queues] = await Promise.all([
        getDisplayData(),
        getWaitingQueues(),
      ]);

      // Detect new calls → add to activity feed
      for (const svc of SERVICES) {
        const curr = display[svc.key]?.number;
        const prev = prevDisplayRef.current[svc.key]?.number;
        if (curr && curr !== "--" && curr !== prev) {
          const id = ++activityIdRef.current;
          setActivity((old) => [
            {
              id,
              icon: <Megaphone size={18} />,
              iconBg: "bg-secondary-container/20 text-secondary",
              title: `${curr} dipanggil`,
              sub: `Diarahkan ke ${svc.key}`,
              time: new Date(),
            },
            ...old.slice(0, 19),
          ]);
        }
      }

      // Detect new waiting tickets (queue length increased)
      if (
        Array.isArray(queues) &&
        queues.length > waitingQueues.length &&
        waitingQueues.length > 0
      ) {
        const newTickets = queues.slice(waitingQueues.length);
        for (const t of newTickets) {
          const id = ++activityIdRef.current;
          setActivity((old) => [
            {
              id,
              icon: <PlusCircle size={18} />,
              iconBg: "bg-tertiary-fixed/30 text-[#723100]",
              title: `Tiket baru ${t.number}`,
              sub: `Layanan: ${
                t.service === "CS"
                  ? "Customer Service"
                  : t.service === "PLN"
                    ? "PLN Mobile Experience"
                    : "Customer Care"
              }`,
              time: new Date(),
            },
            ...old.slice(0, 19),
          ]);
        }
      }

      prevDisplayRef.current = display;
      setDisplayData(display);
      setWaitingQueues(Array.isArray(queues) ? queues : []);
      setLastRefreshed(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived stats
  const csNow = displayData["Loket Customer Service"]?.number;
  const plnNow = displayData["Loket PLN Mobile Experience"]?.number;
  const ccNow = displayData["Loket Customer Care"]?.number;

  const csCount = parseNumber(csNow);
  const plnCount = parseNumber(plnNow);
  const ccCount = parseNumber(ccNow);
  const totalTickets = csCount + plnCount + ccCount;

  const waitingCount = waitingQueues.length;
  const servedCount = Math.max(0, totalTickets - waitingCount);

  const csWaiting = waitingQueues.filter((q) => q.service === "CS").length;
  const plnWaiting = waitingQueues.filter((q) => q.service === "PLN").length;
  const ccWaiting = waitingQueues.filter((q) => q.service === "CC").length;

  const waitingByService: Record<string, number> = {
    "Loket Customer Service": csWaiting,
    "Loket PLN Mobile Experience": plnWaiting,
    "Loket Customer Care": ccWaiting,
  };

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* ── TopBar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-white border-b border-surface-variant shadow-sm">
        <div className="flex items-center gap-3">
          <Zap size={22} className="text-primary" fill="#002e5b" />
          <h1 className="font-heading-md text-primary">Dashboard</h1>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant">
          <div className="flex items-center gap-1.5 text-xs text-outline">
            <Clock size={14} />
            <span>
              Diperbarui:{" "}
              {lastRefreshed.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="flex-1 p-safe-margin space-y-xl">
        {/* ── Summary Cards ──────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
          <div className="bg-white p-sm rounded-xl shadow-sm border-l-4 border-primary flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Ticket size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
                Total Tiket
              </p>
              <h3 className="text-heading-lg font-bold text-primary">
                {totalTickets}
              </h3>
            </div>
          </div>

          <div className="bg-white p-sm rounded-xl shadow-sm border-l-4 border-secondary flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <UserCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
                Dilayani
              </p>
              <h3 className="text-heading-lg font-bold text-secondary">
                {servedCount}
              </h3>
            </div>
          </div>

          <div className="bg-white p-sm rounded-xl shadow-sm border-l-4 border-[#723100] flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-[#723100]/10 flex items-center justify-center text-[#723100]">
              <Hourglass size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
                Menunggu
              </p>
              <h3 className="text-heading-lg font-bold text-[#723100]">
                {waitingCount}
              </h3>
            </div>
          </div>

          <div className="bg-white p-sm rounded-xl shadow-sm border-l-4 border-surface-tint flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-surface-tint/10 flex items-center justify-center text-surface-tint">
              <Timer size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
                Rata-rata Layanan
              </p>
              <h3 className="text-heading-lg font-bold text-surface-tint">
                ~12m
              </h3>
            </div>
          </div>
        </section>

        {/* ── 70/30 Grid ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-xl">
          {/* ── Left (70%) ── */}
          <div className="lg:col-span-7 space-y-xl">
            {/* Live Queue Status */}
            <div className="space-y-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-heading-md text-on-surface flex items-center gap-2">
                  <BarChart2 size={22} className="text-primary" />
                  Status Antrian Live
                </h2>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                {SERVICES.map((svc) => {
                  const current = displayData[svc.key]?.number || "--";
                  const waiting = waitingByService[svc.key] ?? 0;

                  return (
                    <div
                      key={svc.key}
                      className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-variant flex flex-col"
                    >
                      <div className={`h-1.5 ${svc.accentColor}`} />
                      <div className="p-md flex-1">
                        <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider mb-4">
                          {svc.label}
                        </h4>
                        <div className="flex flex-col items-center py-sm">
                          <p
                            className={`text-[10px] font-bold ${svc.serveLabel} uppercase tracking-widest mb-1`}
                          >
                            Sedang Dilayani
                          </p>
                          <p className="text-[40px] font-black text-on-surface leading-tight">
                            {current}
                          </p>
                        </div>
                      </div>
                      <div className="bg-surface-container-low px-md py-sm border-t border-surface-variant flex justify-between items-center">
                        <span className="text-xs text-on-surface-variant">
                          Menunggu: <strong>{waiting}</strong>
                        </span>
                        <ChevronRight size={16} className={svc.textColor} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Traffic Chart */}
            <div className="bg-white p-xl rounded-xl shadow-sm border border-surface-variant">
              <div className="flex items-center justify-between mb-xl">
                <div>
                  <h2 className="font-heading-md text-on-surface">
                    Antrean Hari Ini
                  </h2>
                  <p className="text-xs text-outline">
                    Distribusi antrian per jam
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-surface-variant text-outline hover:bg-surface-container-low transition-colors">
                    Download CSV
                  </button>
                  <button className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-primary-container text-white hover:bg-primary transition-colors">
                    Laporan Penuh
                  </button>
                </div>
              </div>

              <div className="relative h-64 w-full flex items-end justify-between px-md gap-1">
                {CHART_HOURS.map((bar) => {
                  const now = new Date().getHours();
                  const barHour = parseInt(bar.label.split(":")[0], 10);
                  const isCurrentHour = barHour === now;

                  // If we have real data, scale based on known total
                  const realBars = waitingCount > 0;
                  const heightPct =
                    isCurrentHour && realBars
                      ? Math.max(20, Math.min(100, waitingCount * 5))
                      : bar.heightPct;

                  return (
                    <div
                      key={bar.label}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <div
                        className={`w-full rounded-t-lg relative transition-all duration-300 ${
                          isCurrentHour
                            ? "bg-primary-container"
                            : bar.active
                              ? "bg-secondary-container"
                              : "bg-surface-container-highest hover:bg-secondary-container"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] font-bold text-outline whitespace-nowrap transition-opacity">
                          {bar.label}
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-medium transition-colors ${
                          isCurrentHour
                            ? "text-primary font-bold"
                            : "text-outline"
                        }`}
                      >
                        {bar.label.replace(":00", "")}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-surface-variant pt-4 flex items-center justify-between text-[10px] text-outline font-bold uppercase tracking-widest">
                <span>08:00</span>
                <span>Puncak: 10:00 – 11:30</span>
                <span>17:00</span>
              </div>
            </div>
          </div>

          {/* ── Right (30%) ── */}
          <div className="lg:col-span-3 space-y-xl">
            {/* Recent Activity Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden flex flex-col min-h-[460px]">
              <div className="p-md border-b border-surface-variant bg-surface-container-lowest">
                <h2 className="font-heading-md text-on-surface">
                  Aktivitas Terkini
                </h2>
                <p className="text-xs text-outline">
                  Event tiket secara real-time
                </p>
              </div>

              <div className="flex-1 p-sm space-y-sm overflow-y-auto max-h-[400px]">
                {activity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-outline text-xs gap-2 opacity-60">
                    <Clock size={24} />
                    <span>Belum ada aktivitas</span>
                  </div>
                ) : (
                  activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-sm items-start p-sm bg-surface-container-low rounded-lg border border-surface-variant"
                    >
                      <div
                        className={`p-2 rounded-full shrink-0 ${item.iconBg}`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface">
                          {item.title}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {item.sub}
                        </p>
                        <span className="text-[10px] text-outline">
                          {relativeTime(item.time)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-md border-t border-surface-variant text-center">
                <button className="text-[10px] font-bold text-primary-container uppercase tracking-widest hover:underline">
                  Lihat Log Lengkap
                </button>
              </div>
            </div>

            {/* Queue Breakdown Card */}
            <div className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden">
              <div className="p-md border-b border-surface-variant bg-surface-container-lowest">
                <h2 className="font-heading-md text-on-surface">
                  Perincian Antrian
                </h2>
                <p className="text-xs text-outline">
                  Sesi hari ini per layanan
                </p>
              </div>
              <div className="p-md space-y-sm">
                {[
                  {
                    label: "Customer Service",
                    icon: <Users size={16} />,
                    color: "bg-secondary",
                    textColor: "text-secondary",
                    total: csCount,
                    waiting: csWaiting,
                  },
                  {
                    label: "PLN Mobile",
                    icon: <Smartphone size={16} />,
                    color: "bg-primary",
                    textColor: "text-primary",
                    total: plnCount,
                    waiting: plnWaiting,
                  },
                  {
                    label: "Customer Care",
                    icon: <Headphones size={16} />,
                    color: "bg-[#723100]",
                    textColor: "text-[#723100]",
                    total: ccCount,
                    waiting: ccWaiting,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-sm p-sm bg-surface-container-low rounded-lg"
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${row.color} bg-opacity-10 flex items-center justify-center ${row.textColor}`}
                    >
                      {row.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {row.label}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex-1 bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full transition-all`}
                            style={{
                              width:
                                row.total > 0
                                  ? `${Math.min(100, (row.total / Math.max(totalTickets, 1)) * 100)}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${row.textColor}`}>
                        {row.total}
                      </p>
                      <p className="text-[10px] text-outline">
                        {row.waiting} tunggu
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Marquee ──────────────────────── */}
        <footer className="h-12 bg-primary-container rounded-lg flex items-center overflow-hidden shadow-lg">
          <div className="px-md h-full bg-primary flex items-center text-white font-bold text-xs uppercase tracking-widest whitespace-nowrap border-r border-white/10 gap-2">
            <Zap size={16} fill="white" />
            Sistem Antrean PLN
          </div>
          <div className="flex-1 px-md overflow-hidden">
            <div className="animate-[marquee_30s_linear_infinite] whitespace-nowrap text-on-primary-container text-sm font-medium">
              <span className="mr-16">{runningText}</span>
              <span className="mr-16 opacity-40">•</span>
              <span className="mr-16">{runningText}</span>
            </div>
          </div>
          <div className="px-md text-[10px] text-primary-fixed font-mono">
            <CheckCircle2 size={12} className="inline mr-1" />
            ONLINE
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-150%); }
        }
      `}</style>
    </div>
  );
}
