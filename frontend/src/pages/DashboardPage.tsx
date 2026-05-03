import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDisplayData,
  getWaitingQueues,
  getConfig,
  getTodayHistoryQueues,
  getLogs,
  type LogRow,
} from "../api";
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
  AlertTriangle,
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
  progressLabel: string;
  progressBadgeClass: string;
  number: string;
  serviceLabel: string;
  actorLabel: string;
  rawEvent: string;
  title: string;
  sub: string;
  time: Date;
  message: string;
};

function parseDetailsJson(detailsJson: string): Record<string, any> {
  if (!detailsJson) return {};
  try {
    const parsed = JSON.parse(detailsJson);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getServiceLabel(service: string): string {
  if (service === "CS") return "Customer Service";
  if (service === "PLN") return "PLN Mobile Experience";
  if (service === "CC") return "Customer Care";
  return service || "Layanan tidak diketahui";
}

function eventMeta(eventName: string) {
  const event = (eventName || "").toLowerCase();
  if (event === "create_queue") {
    return {
      label: "Diambil",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }
  if (event === "call_queue") {
    return {
      label: "Dipanggil",
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }
  if (event === "skip_queue") {
    return {
      label: "Dilewati",
      badgeClass: "bg-slate-200 text-slate-700 border-slate-300",
    };
  }
  if (event === "call_queue_failed") {
    return {
      label: "Gagal",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
    };
  }
  return {
    label: "Event",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateTime(value: any): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: unknown): string {
  const text = value == null ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mapQueueLogToActivity(row: LogRow, idx: number): ActivityItem {
  const details = parseDetailsJson(row.details_json || "");
  const number = String(details.number || "").trim();
  const service = String(details.service || "").trim();
  const actor = String(row.actor || "").trim();
  const event = String(row.event || "").toLowerCase();

  let icon: React.ReactNode = <Clock size={18} />;
  let iconBg = "bg-slate-200 text-slate-700";
  let title = row.message || "Aktivitas antrean";
  let sub = `Event: ${row.event || "-"}`;
  const meta = eventMeta(event);

  if (event === "create_queue") {
    icon = <PlusCircle size={18} />;
    iconBg = "bg-tertiary-fixed/30 text-[#723100]";
    title = number ? `Tiket baru ${number}` : "Tiket baru dibuat";
    sub = `Layanan: ${getServiceLabel(service)}`;
  } else if (event === "call_queue") {
    icon = <Megaphone size={18} />;
    iconBg = "bg-secondary-container/20 text-secondary";
    title = number ? `${number} dipanggil` : "Nomor antrean dipanggil";
    sub = actor ? `Loket: ${actor}` : `Layanan: ${getServiceLabel(service)}`;
  } else if (event === "skip_queue") {
    icon = <Clock size={18} />;
    iconBg = "bg-amber-100 text-amber-700";
    title = number ? `${number} dilewati` : "Antrean dilewati";
    sub = `Layanan: ${getServiceLabel(service)}`;
  } else if (event === "call_queue_failed") {
    icon = <Clock size={18} />;
    iconBg = "bg-red-100 text-red-700";
    title = "Panggilan antrean gagal";
    sub = `Layanan: ${getServiceLabel(service)}`;
  }

  const parsedTime = new Date(row.timestamp);
  const time = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;

  return {
    id: Date.now() + idx,
    icon,
    iconBg,
    progressLabel: meta.label,
    progressBadgeClass: meta.badgeClass,
    number: number || "-",
    serviceLabel: getServiceLabel(service),
    actorLabel: actor || "-",
    rawEvent: row.event || "-",
    title,
    sub,
    time,
    message: row.message || "-",
  };
}

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [displayData, setDisplayData] = useState<Record<string, any>>({});
  const [waitingQueues, setWaitingQueues] = useState<any[]>([]);
  const [todayHistory, setTodayHistory] = useState<any[]>([]);
  const [runningText, setRunningText] = useState(
    "Selamat datang di PLN ULP Salatiga. Silakan ambil nomor antrian dan tunggu panggilan.",
  );
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    message: string;
    tone: "info" | "warning";
  } | null>(null);

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
      const [display, queues, history, queueLogs] = await Promise.all([
        getDisplayData(),
        getWaitingQueues(),
        getTodayHistoryQueues(),
        getLogs({ limit: 30, module: "queue" }),
      ]);

      if (Array.isArray(queueLogs)) {
        setActivity(
          queueLogs
            .slice(0, 20)
            .map((row, idx) => mapQueueLogToActivity(row, idx)),
        );
      } else {
        setActivity([]);
      }

      setDisplayData(display);
      setWaitingQueues(Array.isArray(queues) ? queues : []);
      setTodayHistory(Array.isArray(history) ? history : []);
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

  const avgServiceMinutes = (() => {
    const calledRows = todayHistory.filter(
      (row) => row?.status === "called" && row?.created_at && row?.called_at,
    );
    if (calledRows.length === 0) return null;

    let totalMinutes = 0;
    let validRows = 0;

    for (const row of calledRows) {
      const createdAt = new Date(row.created_at).getTime();
      const calledAt = new Date(row.called_at).getTime();
      if (!Number.isFinite(createdAt) || !Number.isFinite(calledAt)) continue;

      const diffMs = calledAt - createdAt;
      if (diffMs < 0) continue;

      totalMinutes += diffMs / 60000;
      validRows += 1;
    }

    if (validRows === 0) return null;
    return Math.round(totalMinutes / validRows);
  })();

  const avgServiceLabel = (() => {
    if (avgServiceMinutes === null) return "-";
    if (avgServiceMinutes < 60) return `~${avgServiceMinutes}m`;

    const hours = Math.floor(avgServiceMinutes / 60);
    const minutes = avgServiceMinutes % 60;
    if (minutes === 0) return `~${hours}j`;
    return `~${hours}j ${minutes}m`;
  })();

  const chartHours = (() => {
    const startHour = 7;
    const endHour = 16;

    const counts = Array.from({ length: endHour - startHour + 1 }, () => 0);
    for (const row of todayHistory) {
      const raw = row?.created_at || row?.date;
      if (!raw) continue;
      const dt = new Date(raw);
      const hour = dt.getHours();
      if (Number.isNaN(dt.getTime())) continue;
      if (hour < startHour || hour > endHour) continue;
      counts[hour - startHour] += 1;
    }

    return counts.map((count, idx) => {
      const hour = startHour + idx;
      return {
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        count,
      };
    });
  })();

  const maxHourlyCount = Math.max(1, ...chartHours.map((h) => h.count));
  const yAxisTop = maxHourlyCount;
  const yAxisMid = Math.ceil(maxHourlyCount / 2);

  const peakHourInfo = (() => {
    const maxCount = Math.max(...chartHours.map((h) => h.count));
    if (maxCount <= 0) return "Belum ada puncak antrean";

    const peakHours = chartHours
      .filter((h) => h.count === maxCount)
      .map((h) => h.label);

    if (peakHours.length === 1) {
      return `Puncak: ${peakHours[0]} (${maxCount} antrean)`;
    }

    return `Puncak: ${peakHours.join(", ")} (${maxCount} antrean/jam)`;
  })();

  const handleDownloadCsv = () => {
    if (todayHistory.length === 0) {
      setNoticeModal({
        title: "Data Belum Tersedia",
        message: "Belum ada data antrean hari ini untuk diunduh.",
        tone: "info",
      });
      return;
    }

    const header = [
      "No",
      "Nomor Antrean",
      "Layanan",
      "Status",
      "Nama Pelanggan",
      "Loket",
      "Waktu Dibuat",
      "Waktu Dipanggil",
      "Durasi Tunggu (menit)",
    ];

    const rows = todayHistory.map((row, idx) => {
      const createdAt = row?.created_at ? new Date(row.created_at) : null;
      const calledAt = row?.called_at ? new Date(row.called_at) : null;

      const waitMinutes =
        createdAt &&
        calledAt &&
        !Number.isNaN(createdAt.getTime()) &&
        !Number.isNaN(calledAt.getTime()) &&
        calledAt.getTime() >= createdAt.getTime()
          ? ((calledAt.getTime() - createdAt.getTime()) / 60000).toFixed(1)
          : "";

      return [
        idx + 1,
        row?.number || "-",
        getServiceLabel(row?.service || ""),
        row?.status || "-",
        row?.customer_name || "-",
        row?.counter || "-",
        formatDateTime(row?.created_at),
        formatDateTime(row?.called_at),
        waitMinutes,
      ];
    });

    const csv = [header, ...rows]
      .map((line) => line.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateToken = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `antrean-hari-ini-${dateToken}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenFullReport = () => {
    const reportWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!reportWindow) {
      setNoticeModal({
        title: "Popup Diblokir",
        message:
          "Browser memblokir popup laporan. Aktifkan popup untuk situs ini agar laporan dapat dibuka di tab baru.",
        tone: "warning",
      });
      return;
    }

    const dateLabel = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const rowsHtml = todayHistory
      .map((row, idx) => {
        const createdAt = row?.created_at ? new Date(row.created_at) : null;
        const calledAt = row?.called_at ? new Date(row.called_at) : null;
        const waitMinutes =
          createdAt &&
          calledAt &&
          !Number.isNaN(createdAt.getTime()) &&
          !Number.isNaN(calledAt.getTime()) &&
          calledAt.getTime() >= createdAt.getTime()
            ? ((calledAt.getTime() - createdAt.getTime()) / 60000).toFixed(1)
            : "-";

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(row?.number || "-")}</td>
            <td>${escapeHtml(getServiceLabel(row?.service || ""))}</td>
            <td>${escapeHtml(row?.status || "-")}</td>
            <td>${escapeHtml(row?.customer_name || "-")}</td>
            <td>${escapeHtml(row?.counter || "-")}</td>
            <td>${escapeHtml(formatDateTime(row?.created_at))}</td>
            <td>${escapeHtml(formatDateTime(row?.called_at))}</td>
            <td>${escapeHtml(waitMinutes)}</td>
          </tr>
        `;
      })
      .join("");

    const chartRowsHtml = chartHours
      .map(
        (h) =>
          `<tr><td>${escapeHtml(h.label)}</td><td>${escapeHtml(h.count)}</td></tr>`,
      )
      .join("");

    reportWindow.document.open();
    reportWindow.document.write(`
      <!doctype html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Laporan Antrean Hari Ini</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 4px; }
          .meta { margin-bottom: 16px; color: #4b5563; }
          .actions { margin-bottom: 16px; }
          .actions button {
            background: #002e5b; color: white; border: none; border-radius: 8px;
            padding: 8px 12px; cursor: pointer; font-size: 12px;
          }
          .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #f8fafc; }
          .card .k { font-size: 11px; color: #6b7280; text-transform: uppercase; }
          .card .v { font-size: 20px; font-weight: bold; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; }
          .section-title { margin-top: 20px; font-size: 16px; font-weight: bold; }
          @media print {
            .actions { display: none; }
            body { margin: 12px; }
          }
        </style>
      </head>
      <body>
        <h1>Laporan Penuh Antrean Hari Ini</h1>
        <div class="meta">
          <p><strong>Tanggal:</strong> ${escapeHtml(dateLabel)}</p>
          <p><strong>Rentang Operasional:</strong> 07:00 - 16:00 WIB</p>
          <p><strong>Puncak:</strong> ${escapeHtml(peakHourInfo)}</p>
        </div>

        <div class="actions">
          <button onclick="window.print()">Cetak / Simpan PDF</button>
        </div>

        <div class="grid">
          <div class="card"><div class="k">Total Tiket</div><div class="v">${totalTickets}</div></div>
          <div class="card"><div class="k">Dilayani</div><div class="v">${servedCount}</div></div>
          <div class="card"><div class="k">Menunggu</div><div class="v">${waitingCount}</div></div>
          <div class="card"><div class="k">Rata-rata Layanan</div><div class="v">${escapeHtml(avgServiceLabel)}</div></div>
        </div>

        <div class="section-title">Distribusi Antrean Per Jam</div>
        <table>
          <thead>
            <tr><th>Jam</th><th>Jumlah Antrean</th></tr>
          </thead>
          <tbody>
            ${chartRowsHtml}
          </tbody>
        </table>

        <div class="section-title">Detail Antrean Hari Ini</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nomor</th>
              <th>Layanan</th>
              <th>Status</th>
              <th>Nama Pelanggan</th>
              <th>Loket</th>
              <th>Waktu Dibuat</th>
              <th>Waktu Dipanggil</th>
              <th>Durasi Tunggu (menit)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="9">Belum ada data antrean hari ini.</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `);
    reportWindow.document.close();
  };

  return (
    <div className="bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] min-h-screen flex flex-col">
      {noticeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="relative p-5 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    noticeModal.tone === "warning"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {noticeModal.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {noticeModal.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 flex justify-end">
              <button
                type="button"
                onClick={() => setNoticeModal(null)}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-container"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header (Queue Control Style) ───────────────────── */}
      <header className="mx-4 mt-4 sm:mx-safe-margin sm:mt-safe-margin flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white/95 backdrop-blur-sm p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#191c21] tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">
              Ringkasan operasional antrean secara real-time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-slate-500">
            Diperbarui: {lastRefreshed.toLocaleTimeString("id-ID")}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-xl border border-blue-900/20 transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-60"
            title="Refresh data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-safe-margin space-y-xl">
        {/* ── Summary Cards ──────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-md">
          <div className="bg-white/95 backdrop-blur-sm p-3 sm:p-sm rounded-3xl shadow-sm border border-slate-200 flex items-center gap-3 sm:gap-md">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Ticket size={20} />
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

          <div className="bg-white/95 backdrop-blur-sm p-3 sm:p-sm rounded-3xl shadow-sm border border-slate-200 flex items-center gap-3 sm:gap-md">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <UserCheck size={20} />
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

          <div className="bg-white/95 backdrop-blur-sm p-3 sm:p-sm rounded-3xl shadow-sm border border-slate-200 flex items-center gap-3 sm:gap-md">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#723100]/10 flex items-center justify-center text-[#723100] shrink-0">
              <Hourglass size={20} />
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

          <div className="bg-white/95 backdrop-blur-sm p-3 sm:p-sm rounded-3xl shadow-sm border border-slate-200 flex items-center gap-3 sm:gap-md">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-surface-tint/10 flex items-center justify-center text-surface-tint shrink-0">
              <Timer size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
                Rata-rata Layanan
              </p>
              <h3 className="text-heading-lg font-bold text-surface-tint">
                {avgServiceLabel}
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
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
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
                      className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200 flex flex-col"
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
                      <div className="bg-slate-50 px-md py-sm border-t border-slate-200 flex justify-between items-center rounded-b-3xl">
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
            <div className="bg-white p-xl rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-xl">
                <div>
                  <h2 className="font-heading-md text-on-surface">
                    Antrean Hari Ini
                  </h2>
                  <p className="text-xs text-outline">
                    Distribusi antrian per jam
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadCsv}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-slate-200 text-outline hover:bg-slate-50 transition-colors"
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={handleOpenFullReport}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-primary-container text-white hover:bg-primary transition-colors"
                  >
                    Laporan Penuh
                  </button>
                </div>
              </div>

              <div className="relative h-48 sm:h-64 w-full flex gap-2 sm:gap-3">
                <div className="w-8 h-full flex flex-col justify-between text-[10px] text-slate-400 font-semibold pt-1 pb-5">
                  <span>{yAxisTop}</span>
                  <span>{yAxisMid}</span>
                  <span>0</span>
                </div>

                <div className="relative flex-1 h-full border-l border-slate-200 border-b border-slate-200 px-1 sm:px-md pb-5 pt-1">
                  <div className="absolute left-0 right-0 top-[10%] border-t border-dashed border-slate-200" />
                  <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-slate-200" />

                  <div className="h-full w-full flex items-end justify-between gap-0.5 sm:gap-1">
                    {chartHours.map((bar) => {
                      const now = new Date().getHours();
                      const isCurrentHour = bar.hour === now;
                      const heightPct = Math.round(
                        (bar.count / maxHourlyCount) * 100,
                      );

                      return (
                        <div
                          key={bar.label}
                          className="flex-1 flex flex-col items-center gap-1 group"
                        >
                          <div
                            className={`w-full rounded-t-lg relative transition-all duration-300 ${
                              isCurrentHour
                                ? "bg-primary-container"
                                : bar.count > 0
                                  ? "bg-secondary-container"
                                  : "bg-surface-container-highest hover:bg-secondary-container"
                            }`}
                            style={{ height: `${Math.max(4, heightPct)}%` }}
                          >
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] font-bold text-outline whitespace-nowrap transition-opacity">
                              {bar.label} ({bar.count})
                            </div>
                          </div>
                          <span
                            className={`text-[8px] sm:text-[9px] font-medium transition-colors ${
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
                </div>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-outline font-bold uppercase tracking-widest">
                <span>07:00 WIB</span>
                <span>{peakHourInfo}</span>
                <span>16:00 WIB</span>
              </div>
            </div>
          </div>

          {/* ── Right (30%) ── */}
          <div className="lg:col-span-3 space-y-xl">
            {/* Recent Activity Feed */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[460px]">
              <div className="p-md border-b border-slate-200 bg-slate-50">
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
                      className="flex gap-sm items-start p-sm bg-slate-50 rounded-xl border border-slate-200"
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
                        <p className="text-xs text-on-surface-variant">
                          {item.sub}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${item.progressBadgeClass}`}
                          >
                            {item.progressLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-700">
                            {item.number}
                          </span>
                          <span className="text-[10px] text-slate-600">
                            {item.serviceLabel}
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] text-slate-500">
                          Loket/Aktor: {item.actorLabel} · Event:{" "}
                          {item.rawEvent}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.message}
                        </p>
                        <span className="text-[10px] text-outline">
                          {formatClockTime(item.time)} ·{" "}
                          {relativeTime(item.time)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-md border-t border-slate-200 text-center">
                <button
                  onClick={() => navigate("/admin/logs?module=queue")}
                  className="text-[10px] font-bold text-primary-container uppercase tracking-widest hover:underline"
                >
                  Lihat Log Lengkap
                </button>
              </div>
            </div>

            {/* Queue Breakdown Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-md border-b border-slate-200 bg-slate-50">
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
                    className="flex items-center gap-sm p-sm bg-slate-50 rounded-xl"
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
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
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
        <footer className="h-12 bg-primary rounded-xl flex items-center overflow-hidden shadow-sm border border-blue-900/20">
          <div className="px-md h-full bg-primary flex items-center text-white font-bold text-xs uppercase tracking-widest whitespace-nowrap border-r border-white/10 gap-2">
            <Zap size={16} fill="white" />
            Sistem Antrean PLN
          </div>
          <div className="flex-1 px-md overflow-hidden">
            <div className="animate-[marquee_30s_linear_infinite] whitespace-nowrap text-white text-sm font-medium">
              <span className="mr-16">{runningText}</span>
              <span className="mr-16 opacity-40">•</span>
              <span className="mr-16">{runningText}</span>
            </div>
          </div>
          <div className="px-md text-[10px] text-white/90 font-mono">
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
