import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createQueue, getConfig, logEvent } from "./api";
import {
  browserPrint,
  requestBridgePrint,
  isBridgeAvailable,
  getPrinterStatus,
  pickPrinter,
  type BridgePrintResult,
  type TicketPrintPayload,
} from "./utils/printBridge";
import {
  Printer,
  Smartphone,
  Headphones,
  UserCheck,
  RefreshCw,
  User,
  CheckCircle2,
  Home,
  Timer,
  History,
  ClipboardList,
  Info,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";

const SERVICES = [
  {
    code: "PLN",
    name: "PLN Mobile Experience",
    description: "Layanan aplikasi PLN Mobile",
    icon: Smartphone,
    loket: "Loket PLN Mobile Experience",
  },
  {
    code: "CS",
    name: "Customer Service",
    description: "Layanan umum dan informasi",
    icon: Headphones,
    loket: "Loket Customer Service",
  },
  {
    code: "CC",
    name: "Customer Care",
    description: "Pengaduan dan bantuan khusus",
    icon: UserCheck,
    loket: "Loket Customer Care",
  },
];

const SERVICE_THEME = {
  PLN: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    selectedBorder: "border-emerald-500",
    selectedBg: "bg-emerald-50",
    selectedTitle: "text-emerald-800",
    chip: "bg-emerald-100 text-emerald-700",
    helper: "Layanan Aplikasi PLN Mobile",
  },
  CS: {
    iconBg: "bg-cyan-100",
    iconText: "text-cyan-700",
    selectedBorder: "border-cyan-500",
    selectedBg: "bg-cyan-50",
    selectedTitle: "text-cyan-800",
    chip: "bg-cyan-100 text-cyan-700",
    helper: "Informasi layanan umum dan administrasi pelanggan",
  },
  CC: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    selectedBorder: "border-amber-500",
    selectedBg: "bg-amber-50",
    selectedTitle: "text-amber-800",
    chip: "bg-amber-100 text-amber-700",
    helper: "Pengaduan dan bantuan khusus pelanggan",
  },
} as const;

type AppState = "select" | "modal" | "success";
export type PrintedTicket = {
  number: string;
  service: string;
  printedAt: string;
  customerName: string;
  createdAt?: string;
};
type LastPrintedTicket = PrintedTicket;

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appState, setAppState] = useState<AppState>("select");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [ticket, setTicket] = useState<{
    number: string;
    service: string;
  } | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [printedAt, setPrintedAt] = useState("");
  const [autoPrint, setAutoPrint] = useState(true);
  const [printMode, setPrintMode] = useState("auto");
  const [printTimeoutMs, setPrintTimeoutMs] = useState(6000);
  const [printRetryCount, setPrintRetryCount] = useState(1);
  const [officeName, setOfficeName] = useState("PLN ULP Salatiga");
  const [printerStatus, setPrinterStatus] = useState<{
    connected: boolean;
    address: string;
  } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getService = (code: string) => SERVICES.find((s) => s.code === code);

  const sidebarNavItems = [
    { name: "Ambil Antrean", path: "/ambil", icon: Home },
    { name: "Riwayat Cetak", path: "/history", icon: History },
    {
      name: "Survey Kepuasan",
      path: "/survey-kepuasan",
      icon: ClipboardList,
    },
    { name: "About", path: "/about", icon: Info },
  ];

  const initials = (name?: string) =>
    (name || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleLogout = () => {
    setIsSidebarOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  const savePrintedTicket = (ticket: PrintedTicket) => {
    try {
      const raw = localStorage.getItem("pln_printed_tickets");
      const arr: PrintedTicket[] = raw
        ? (JSON.parse(raw) as PrintedTicket[])
        : [];

      const withTimestamp: PrintedTicket = {
        ...ticket,
        createdAt: new Date().toISOString(),
      };

      // Dedupe by queue identity to avoid duplicates across retries.
      const map = new Map<string, PrintedTicket>();
      [...arr, withTimestamp].forEach((t) => {
        const key = `${t.number}|${t.service}|${t.printedAt}`;
        map.set(key, t);
      });

      // Keep latest history entries only.
      const merged = Array.from(map.values()).slice(-200);
      localStorage.setItem("pln_printed_tickets", JSON.stringify(merged));
    } catch {
      // ignore storage errors
    }
  };

  // Poll printer status every 10 s when running inside Android app
  useEffect(() => {
    if (!isBridgeAvailable()) return;

    const checkStatus = () => setPrinterStatus(getPrinterStatus());
    checkStatus();
    const interval = setInterval(checkStatus, 10_000);

    // Handle async print results from Android bridge
    window.onAndroidPrintResult = (result) => {
      // Refresh printer status after any print attempt
      checkStatus();
      if (!result.success) {
        if (result.reason === "bluetooth_disabled") {
          alert(
            "Bluetooth tidak aktif. Harap aktifkan Bluetooth dan coba lagi.",
          );
        } else if (result.reason === "permission_denied") {
          alert(
            "Izin Bluetooth ditolak. Izinkan akses Bluetooth di pengaturan aplikasi.",
          );
        } else if (result.reason === "no_device_paired") {
          alert(
            "Printer belum dipilih. Silakan pilih printer Bluetooth terlebih dahulu.",
          );
        }
      }
    };

    return () => {
      clearInterval(interval);
      window.onAndroidPrintResult = undefined;
    };
  }, []);

  useEffect(() => {
    const loadPrintSetting = async () => {
      try {
        const config = await getConfig();
        const raw = config?.autoPrint;
        const enabled =
          typeof raw === "boolean" ? raw : String(raw).toLowerCase() === "true";
        setAutoPrint(enabled);
        if (config?.printMode) {
          setPrintMode(String(config.printMode));
        }
        if (config?.printTimeoutMs !== undefined) {
          const timeout = Number(config.printTimeoutMs);
          if (Number.isFinite(timeout) && timeout >= 1000 && timeout <= 30000) {
            setPrintTimeoutMs(timeout);
          }
        }
        if (config?.printRetryCount !== undefined) {
          const retry = Number(config.printRetryCount);
          if (Number.isFinite(retry) && retry >= 0 && retry <= 3) {
            setPrintRetryCount(retry);
          }
        }
        if (config?.officeName) {
          setOfficeName(String(config.officeName));
        }
      } catch {
        // Keep default true if config fetch fails
      }
    };
    loadPrintSetting();
  }, []);

  const logPrintEvent = (payload: {
    level?: "INFO" | "WARN" | "ERROR";
    event: string;
    message: string;
    details?: Record<string, unknown>;
  }) => {
    void logEvent({
      level: payload.level,
      module: "kiosk-print",
      event: payload.event,
      message: payload.message,
      connectionStatus: navigator.onLine ? "ONLINE" : "OFFLINE",
      actor: "kiosk",
      path: window.location.pathname,
      details: payload.details,
    }).catch(() => {});
  };

  const buildTicketPrintPayload = (
    data: LastPrintedTicket,
  ): TicketPrintPayload => {
    const svc = getService(data.service);
    return {
      number: data.number,
      serviceCode: data.service,
      serviceName: svc?.name || data.service,
      printedAt: data.printedAt,
      customerName: data.customerName,
      officeName,
      html: document.getElementById("thermal-print")?.innerHTML,
    };
  };

  const dispatchPrint = async (
    data: LastPrintedTicket,
    trigger: "auto_print" | "manual_print" | "reprint_last",
  ) => {
    const payload = buildTicketPrintPayload(data);
    const isBrowserOnlyMode = printMode === "browser";
    const maxAttempts = 1 + printRetryCount;

    logPrintEvent({
      event: "print_requested",
      message: "Print tiket diminta dari kiosk",
      details: {
        trigger,
        printMode,
        maxAttempts,
        ticketNumber: data.number,
        service: data.service,
      },
    });

    if (isBrowserOnlyMode) {
      const fallbackResult = browserPrint();
      logPrintEvent({
        event: "print_fallback_used",
        message: "Browser print digunakan (mode browser)",
        details: {
          trigger,
          mode: fallbackResult.mode,
          status: fallbackResult.status,
          ticketNumber: data.number,
          service: data.service,
        },
      });
      return;
    }

    let bridgeResult: BridgePrintResult = {
      status: "unsupported",
      mode: "bridge",
      reason: "bridge_not_attempted",
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      bridgeResult = await requestBridgePrint(payload, printTimeoutMs);
      if (bridgeResult.status === "success") {
        logPrintEvent({
          event: "print_success",
          message: "Print tiket berhasil via Android bridge",
          details: {
            trigger,
            mode: "bridge",
            attempt,
            ticketNumber: data.number,
            service: data.service,
          },
        });
        return;
      }

      if (attempt < maxAttempts) {
        logPrintEvent({
          level: "WARN",
          event: "print_bridge_retry",
          message: "Print bridge gagal, mencoba ulang",
          details: {
            trigger,
            mode: "bridge",
            attempt,
            nextAttempt: attempt + 1,
            status: bridgeResult.status,
            reason: bridgeResult.reason || "unknown",
            ticketNumber: data.number,
            service: data.service,
          },
        });
      }
    }

    logPrintEvent({
      level: bridgeResult.status === "unsupported" ? "INFO" : "WARN",
      event: "print_bridge_failed",
      message:
        "Android bridge tidak tersedia atau gagal, fallback ke browser print",
      details: {
        trigger,
        mode: "bridge",
        maxAttempts,
        status: bridgeResult.status,
        reason: bridgeResult.reason || "unknown",
        ticketNumber: data.number,
        service: data.service,
      },
    });

    if (isBridgeAvailable()) {
      alert(
        `Print gagal (${bridgeResult.reason || "unknown_error"}). Silakan cek Bluetooth/printer lalu coba cetak ulang.`,
      );
      return;
    }

    const fallbackResult = browserPrint();
    logPrintEvent({
      event: "print_fallback_used",
      message: "Browser print digunakan sebagai fallback",
      details: {
        trigger,
        mode: fallbackResult.mode,
        status: fallbackResult.status,
        ticketNumber: data.number,
        service: data.service,
      },
    });
  };

  const schedulePrint = (
    data: LastPrintedTicket,
    trigger: "auto_print" | "manual_print" | "reprint_last",
  ) => {
    setTimeout(() => {
      void dispatchPrint(data, trigger);
    }, 800);
  };

  // Auto redirect countdown on success page
  useEffect(() => {
    if (appState !== "success") return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          handleReset();
          return 5;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [appState]);

  const handleReset = () => {
    setAppState("select");
    setSelectedService(null);
    setCustomerName("");
    setTicket(null);
    setCountdown(5);
  };

  const handleSelectService = (code: string) => {
    setSelectedService(code);
  };

  const handleOpenModal = () => {
    if (!selectedService) return;
    setAppState("modal");
  };

  const handleConfirm = async () => {
    if (!selectedService) return;
    setLoading(true);
    try {
      const res = await createQueue(selectedService, customerName || undefined);
      const now = new Date();
      const timeStr =
        now.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) +
        " " +
        now.toLocaleTimeString("id-ID");
      setPrintedAt(timeStr);
      setTicket({
        number: res.number || `${selectedService}-001`,
        service: selectedService,
      });

      const latest: LastPrintedTicket = {
        number: res.number || `${selectedService}-001`,
        service: selectedService,
        printedAt: timeStr,
        customerName: customerName || "",
      };
      localStorage.setItem("pln_last_printed_ticket", JSON.stringify(latest));
      savePrintedTicket(latest);

      setAppState("success");

      // Auto print follows Service Config (autoPrint)
      if (autoPrint) {
        schedulePrint(latest, "auto_print");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengambil antrian. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualPrint = () => {
    if (!ticket) return;
    schedulePrint(
      {
        number: ticket.number,
        service: ticket.service,
        printedAt,
        customerName,
      },
      "manual_print",
    );
  };

  const svc = selectedService ? getService(selectedService) : null;

  // ─── SUCCESS PAGE ────────────────────────────────────────────────────────────
  if (appState === "success" && ticket) {
    const tSvc = getService(ticket.service)!;
    const successTheme =
      SERVICE_THEME[ticket.service as keyof typeof SERVICE_THEME] ||
      SERVICE_THEME.CS;
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-[#f7fbff] to-slate-100 flex flex-col items-center font-['Inter']">
        {/* Header */}
        <header className="bg-primary text-white w-full h-16 flex items-center justify-between px-4 shadow-md sticky top-0 z-10 no-print">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="PLN Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-medium opacity-90">
              PLN ULP Salatiga
            </span>
          </div>
          <span className="text-xs sm:text-sm font-semibold bg-white/15 rounded-full px-3 py-1">
            Proses Selesai
          </span>
        </header>

        <main className="w-full max-w-md px-4 flex-1 flex flex-col items-center pt-8 gap-5 no-print">
          {/* Check icon */}
          <div className="bg-white border border-cyan-100 rounded-full p-5 shadow-sm flex items-center justify-center">
            <CheckCircle2
              size={72}
              className="text-[#00658d]"
              fill="#8ad1ff"
              strokeWidth={1.5}
            />
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
              Tiket Berhasil Dicetak
            </h2>
            <p className="text-slate-500 max-w-xs mx-auto">
              Tiket siap digunakan. Mohon menunggu hingga nomor dipanggil.
            </p>
          </div>

          {/* Queue number card */}
          <div className="w-full max-w-sm bg-white shadow-lg rounded-3xl py-8 px-6 border border-slate-200 flex flex-col items-center">
            <span
              className={`text-xs font-semibold rounded-full px-3 py-1 mb-3 ${successTheme.chip}`}
            >
              {tSvc.name}
            </span>
            <p className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-3">
              Nomor Antrean
            </p>
            <h1 className="text-7xl font-black text-primary tracking-tight leading-none">
              {ticket.number}
            </h1>
            <p className="text-xs text-slate-400 mt-4">
              Waktu cetak: {printedAt}
            </p>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3">
            <button
              onClick={handleReset}
              className="w-full bg-primary text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-container active:scale-95 transition-all"
            >
              <Home size={20} /> Layani Pelanggan Berikutnya
            </button>
            <button
              onClick={handleManualPrint}
              className="w-full text-primary bg-white border border-slate-300 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Printer size={20} /> Cetak Ulang Tiket
            </button>
          </div>

          <p className="text-slate-500 text-sm flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-4 py-1.5">
            <Timer size={16} /> Halaman ini akan kembali otomatis dalam{" "}
            {countdown} detik
          </p>
        </main>

        {/* ── THERMAL PRINT LAYOUT ── */}
        <div id="thermal-print" className="print-only">
          <div className="thermal-header">NOMOR ANTREAN</div>
          <div className="thermal-number-box">
            <span className="thermal-number">{ticket.number}</span>
          </div>
          <div className="thermal-loket">LOKET: {tSvc.name}</div>
          <div className="thermal-time">{printedAt}</div>
          <hr className="thermal-divider" />
          <p className="thermal-info">
            Mohon menunggu hingga nomor
            <br />
            Anda dipanggil
          </p>
          <p className="thermal-detail">Menuju: {tSvc.name}</p>
          <p className="thermal-detail">Pantau layar display</p>
          {customerName && (
            <p className="thermal-detail">Atas nama: {customerName}</p>
          )}
          <p className="thermal-thanks">Terima kasih</p>
        </div>

        <style>{`
          /* ── Screen Styles ── */
          .no-print { }
          .print-only { display: none; }

          /* ── Print Styles (Thermal 58mm / 80mm) ── */
          @media print {
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body * { visibility: hidden !important; }
            #thermal-print, #thermal-print * { visibility: visible !important; }
            #thermal-print {
              display: block !important;
              position: fixed;
              top: 0; left: 0;
              width: 58mm;
              padding: 4mm 3mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              color: #000;
              background: #fff;
            }
          }

          /* Thermal layout classes (only visible in print) */
          .thermal-header {
            text-align: center;
            font-weight: 900;
            font-size: 15px;
            letter-spacing: 1px;
            margin-bottom: 4px;
          }
          .thermal-number-box {
            border: 3px solid #000;
            border-radius: 4px;
            text-align: center;
            padding: 4px 0;
            margin: 4px 0 6px 0;
          }
          .thermal-number {
            font-size: 42px;
            font-weight: 900;
            letter-spacing: -1px;
            line-height: 1.1;
          }
          .thermal-loket {
            background: #f0f0f0;
            border-radius: 4px;
            text-align: center;
            font-weight: 700;
            font-size: 11px;
            padding: 5px 4px;
            margin-bottom: 5px;
            letter-spacing: 0.3px;
          }
          .thermal-time {
            text-align: center;
            font-size: 10px;
            color: #444;
            margin-bottom: 5px;
          }
          .thermal-divider {
            border: none;
            border-top: 1px solid #ccc;
            margin: 6px 0;
          }
          .thermal-info {
            text-align: center;
            color: #c00;
            font-size: 10px;
            font-style: italic;
            margin-bottom: 3px;
            line-height: 1.4;
          }
          .thermal-detail {
            text-align: center;
            font-size: 10px;
            color: #000;
            margin-bottom: 2px;
          }
          .thermal-thanks {
            text-align: center;
            font-size: 11px;
            font-style: italic;
            color: #444;
            margin-top: 6px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] flex flex-col items-center font-['Inter']">
      {isSidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-[280px] z-50 bg-white/95 backdrop-blur-sm border-r border-slate-200 transition-transform duration-200 flex flex-col sm:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sm:hidden px-4 py-3 border-b border-slate-200 flex items-center justify-end">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-200">
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

        <div className="flex-1 flex flex-col gap-2 px-2 py-3">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setIsSidebarOpen(false);
                  navigate(item.path);
                }}
                className={`mx-2 flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="px-4 mt-auto border-t border-slate-200 pt-4 pb-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                navigate("/profile");
              }}
              className="flex-1 px-2 py-2 flex items-center gap-3 rounded-xl hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials(user?.fullName || user?.username)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#005BAC] truncate">
                  {user?.fullName || user?.username || "Operator"}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  {user?.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : "User"}
                </p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors inline-flex items-center justify-center"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <header className="bg-primary text-white w-full sm:w-[calc(100%-280px)] sm:ml-[280px] h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="sm:hidden p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Buka menu"
        >
          <Menu size={22} />
        </button>
        <div className="text-center leading-tight">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">
            Ambil Nomor Antrean
          </h1>
          <p className="text-[11px] sm:text-xs text-white/70">
            Mode Operasional Lobby
          </p>
        </div>
        <button
          onClick={() => navigate("/history")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Riwayat cetak tiket"
        >
          <History size={22} />
        </button>
      </header>

      <main className="w-full sm:w-[calc(100%-280px)] sm:ml-[280px] max-w-[45.5rem] px-4 sm:px-5 flex-1 flex flex-col pt-5 sm:pt-7 gap-4 pb-28 lg:pb-8">
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="relative w-full bg-white rounded-3xl shadow-sm border border-white/70 px-5 py-6 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-cyan-100/60 blur-2xl" />
              <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-blue-100/70 blur-2xl" />
              <div className="relative flex flex-col items-center gap-3 text-center">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center p-2">
                  <img
                    src="/logo.png"
                    alt="PLN Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-[28px] font-extrabold text-primary mb-1 tracking-tight">
                    Sistem Antrean Digital
                  </h2>
                  <p className="text-on-surface-variant text-sm">
                    Pilih layanan sesuai kebutuhan pelanggan, lalu cetak nomor
                    antrean.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-on-surface text-base">
                  Pilih Loket Layanan
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  3 Loket
                </span>
              </div>
              <div className="space-y-3">
                {SERVICES.map((service) => {
                  const Icon = service.icon;
                  const isSelected = selectedService === service.code;
                  const theme =
                    SERVICE_THEME[service.code as keyof typeof SERVICE_THEME] ||
                    SERVICE_THEME.CS;

                  return (
                    <button
                      key={service.code}
                      onClick={() => handleSelectService(service.code)}
                      className={`w-full min-h-[84px] border rounded-2xl p-3.5 flex items-center text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        isSelected
                          ? `${theme.selectedBorder} ${theme.selectedBg} shadow-sm`
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-xl mr-4 flex-shrink-0 transition-colors ${
                          isSelected ? theme.iconBg : "bg-slate-100"
                        }`}
                      >
                        <Icon
                          size={22}
                          className={
                            isSelected ? theme.iconText : "text-slate-500"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4
                            className={`font-semibold text-sm ${
                              isSelected
                                ? theme.selectedTitle
                                : "text-on-surface"
                            }`}
                          >
                            {service.name}
                          </h4>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${theme.chip}`}
                          >
                            {service.code}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          {theme.helper}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="ml-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6L5 9L10 3"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <label
                  className="font-semibold text-on-surface flex items-center gap-2"
                  htmlFor="customerName"
                >
                  <User size={18} className="text-primary" /> Nama Pelanggan
                </label>
                <span className="text-[11px] text-slate-500">Opsional</span>
              </div>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Budi Prasetyo"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-on-surface placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {isBridgeAvailable() && printerStatus !== null ? (
              <div
                className={`w-full rounded-xl p-3 flex items-center justify-between border ${
                  printerStatus.address
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Printer
                    size={20}
                    className={
                      printerStatus.address
                        ? "text-emerald-700"
                        : "text-amber-600"
                    }
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        printerStatus.address
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {printerStatus.address
                        ? printerStatus.connected
                          ? "Printer Terhubung"
                          : "Printer Siap Digunakan"
                        : "Printer Belum Dipilih"}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[170px]">
                      {printerStatus.address
                        ? printerStatus.address
                        : "Belum ada printer dipilih"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => pickPrinter()}
                  className="text-xs font-semibold text-primary bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 active:scale-95 transition-all"
                >
                  {printerStatus.address ? "Ganti" : "Pilih Printer"}
                </button>
              </div>
            ) : !isBridgeAvailable() ? (
              <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Printer
                    size={20}
                    className={
                      autoPrint ? "text-emerald-700" : "text-slate-500"
                    }
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${autoPrint ? "text-emerald-700" : "text-slate-600"}`}
                    >
                      {autoPrint ? "Print Aktif" : "Print Nonaktif"}
                    </p>
                    <p
                      className={`text-xs font-medium ${autoPrint ? "text-amber-600" : "text-slate-500"}`}
                    >
                      Mode: {autoPrint ? "Auto Print" : "Manual (Cetak Ulang)"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#eef4fb] via-[#eef4fb] to-transparent lg:static lg:p-0 lg:bg-none">
              <button
                onClick={handleOpenModal}
                disabled={!selectedService}
                className={`w-full min-h-[56px] font-semibold py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all focus:outline-none ${
                  selectedService
                    ? "bg-primary hover:bg-primary-container active:scale-[0.99] text-white"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                {selectedService
                  ? "Ambil & Cetak Nomor Antrean"
                  : "Pilih Loket Terlebih Dahulu"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {appState === "modal" && svc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col items-center overflow-hidden border border-slate-100">
            <div className="w-full h-2 bg-[#002e5b]" />
            <div className="p-7 flex flex-col items-center w-full text-center gap-4">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Konfirmasi Pengambilan Nomor
              </h3>
              <span className="text-xs font-semibold text-primary bg-blue-50 border border-blue-100 px-4 py-1 rounded-full">
                {svc.name}
              </span>
              {customerName && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <User size={14} /> {customerName}
                </span>
              )}

              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-4">
                <p className="text-xs text-slate-500 font-medium mb-2">
                  Konfirmasi Cetak Tiket
                </p>
                <p className="text-sm font-medium text-slate-700">
                  Anda akan mengambil nomor untuk:
                </p>
                <p className="text-lg font-bold text-primary mt-1">
                  {svc.loket}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Nomor antrean dibuat saat Anda menekan tombol cetak.
                </p>
              </div>

              <p className="text-sm text-slate-500">
                Silakan tunggu panggilan di ruang tunggu.
              </p>

              <div className="w-full flex flex-col gap-3 mt-2">
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-primary text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-container active:scale-95 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <Printer size={20} />
                  )}
                  {loading ? "Memproses..." : "Ambil & Cetak Nomor Antrean"}
                </button>
                <button
                  onClick={() => setAppState("select")}
                  disabled={loading}
                  className="w-full text-primary py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
