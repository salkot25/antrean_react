import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

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

  const getService = (code: string) => SERVICES.find((s) => s.code === code);

  const getDeviceId = () => {
    const key = "pln_device_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated =
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    localStorage.setItem(key, generated);
    return generated;
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
      const res = await createQueue(
        selectedService,
        customerName || undefined,
        getDeviceId(),
      );
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
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex flex-col items-center font-['Inter']">
        {/* Header */}
        <header className="bg-[#002e5b] text-white w-full h-16 flex items-center justify-between px-4 shadow-md sticky top-0 z-10 no-print">
          <img
            src="/logo.png"
            alt="PLN Logo"
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-xl font-bold">Tiket Berhasil Dicetak</h1>
          <div className="w-8" />
        </header>

        <main className="w-full max-w-md px-4 flex-1 flex flex-col items-center pt-10 gap-6 no-print">
          {/* Check icon */}
          <div className="bg-[#8ad1ff]/40 rounded-full p-6 flex items-center justify-center">
            <CheckCircle2
              size={80}
              className="text-[#00658d]"
              fill="#8ad1ff"
              strokeWidth={1.5}
            />
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Tiket Berhasil Dicetak
            </h2>
            <p className="text-gray-500 max-w-xs mx-auto">
              Silakan ambil tiket Anda dan tunggu nomor Anda dipanggil.
            </p>
          </div>

          {/* Queue number card */}
          <div className="w-full max-w-xs bg-white shadow-md rounded-2xl py-8 px-10 border border-gray-200 flex flex-col items-center">
            <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase mb-3">
              Nomor Antrean
            </p>
            <h1 className="text-6xl font-black text-[#002e5b] tracking-tight">
              {ticket.number}
            </h1>
          </div>

          <div className="w-full max-w-xs flex flex-col gap-3">
            <button
              onClick={handleManualPrint}
              className="w-full bg-[#002e5b] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-[#004482] active:scale-95 transition-all"
            >
              <Printer size={20} /> Cetak Ulang
            </button>
            <button
              onClick={handleReset}
              className="w-full text-[#002e5b] py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Home size={20} /> Kembali ke Beranda
            </button>
          </div>

          <p className="text-gray-400 text-sm flex items-center gap-1.5">
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

  // ─── MAIN SELECT + MODAL VIEW ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center font-['Inter']">
      {/* Header */}
      <header className="bg-primary text-white w-full h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => navigate("/profile")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Profil saya"
        >
          <User size={22} />
        </button>
        <h1 className="text-base sm:text-lg font-semibold tracking-tight">
          Ambil Nomor Antrean
        </h1>
        <button
          onClick={() => navigate("/history")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Riwayat cetak tiket"
        >
          <History size={22} />
        </button>
      </header>

      <main className="w-full max-w-md px-4 sm:px-5 flex-1 flex flex-col pt-6 sm:pt-8 gap-5 pb-28 sm:pb-8">
        {/* Logo & Headline */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-white rounded-3xl shadow-sm border border-surface-variant w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center p-2">
            <img
              src="/logo.png"
              alt="PLN Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-2xl sm:text-[28px] font-bold text-primary mb-1 tracking-tight">
              Sistem Antrean Digital
            </h2>
            <p className="text-on-surface-variant text-sm">
              Pilih layanan, ambil tiket, lalu tunggu dipanggil.
            </p>
          </div>
        </div>

        {/* Service Selection Card */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-surface-variant p-4 sm:p-5">
          <div className="flex flex-col items-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#002e5b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-1"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <h3 className="font-semibold text-on-surface">
              Pilih Loket Layanan
            </h3>
          </div>
          <div className="space-y-3">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              const isSelected = selectedService === service.code;
              return (
                <button
                  key={service.code}
                  onClick={() => handleSelectService(service.code)}
                  className={`w-full min-h-[76px] border rounded-xl p-3 flex items-center text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-surface-variant bg-surface-container-lowest hover:border-primary/60"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg mr-4 flex-shrink-0 transition-colors ${isSelected ? "bg-primary" : "bg-surface-container"}`}
                  >
                    <Icon
                      size={22}
                      className={
                        isSelected ? "text-white" : "text-on-surface-variant"
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`font-semibold text-sm mb-0.5 ${isSelected ? "text-primary" : "text-on-surface"}`}
                    >
                      {service.name}
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      {service.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="ml-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <svg
                        width="12"
                        height="12"
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

        {/* Customer Name */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-surface-variant p-4 sm:p-5">
          <div className="flex flex-col items-center mb-4">
            <User size={24} className="text-primary mb-1" />
            <label
              className="font-semibold text-on-surface"
              htmlFor="customerName"
            >
              Nama Customer{" "}
              <span className="text-outline font-normal">(Opsional)</span>
            </label>
          </div>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Masukkan nama..."
            className="w-full bg-surface-container-low border border-surface-variant rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-on-surface placeholder:text-outline"
          />
        </div>

        {/* Print Status / Printer Setup */}
        {isBridgeAvailable() && printerStatus !== null ? (
          /* Android app: show Bluetooth printer status */
          <div
            className={`w-full rounded-xl p-3 flex items-center justify-between border ${
              printerStatus.address
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <Printer
                size={20}
                className={
                  printerStatus.address ? "text-green-700" : "text-amber-600"
                }
              />
              <div>
                <p
                  className={`text-sm font-medium ${
                    printerStatus.address ? "text-green-700" : "text-amber-700"
                  }`}
                >
                  {printerStatus.address
                    ? printerStatus.connected
                      ? "Printer Terhubung"
                      : "Printer Siap Digunakan"
                    : "Printer Belum Dipilih"}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[160px]">
                  {printerStatus.address
                    ? printerStatus.address
                    : "Belum ada printer dipilih"}
                </p>
              </div>
            </div>
            <button
              onClick={() => pickPrinter()}
              className="text-xs font-semibold text-[#004482] bg-white border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 active:scale-95 transition-all"
            >
              {printerStatus.address ? "Ganti" : "Pilih Printer"}
            </button>
          </div>
        ) : !isBridgeAvailable() ? (
          /* Browser mode: show simple auto-print indicator */
          <div className="w-full bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Printer
                size={20}
                className={autoPrint ? "text-green-700" : "text-slate-500"}
              />
              <div>
                <p
                  className={`text-sm font-medium ${autoPrint ? "text-green-700" : "text-slate-600"}`}
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

        {/* CTA sticky for mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent sm:static sm:p-0 sm:bg-none">
          <button
            onClick={handleOpenModal}
            disabled={!selectedService}
            className={`w-full font-semibold py-4 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all focus:outline-none ${
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
            {selectedService ? "Ambil Tiket" : "Pilih Loket Terlebih Dahulu"}
          </button>
        </div>
      </main>

      {/* ── CONFIRMATION MODAL ── */}
      {appState === "modal" && svc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col items-center overflow-hidden">
            {/* Accent bar */}
            <div className="w-full h-2 bg-[#002e5b]" />
            <div className="p-8 flex flex-col items-center w-full text-center gap-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Nomor Antrian Anda
              </h3>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-4 py-1 rounded-full">
                {svc.name}
              </span>
              {customerName && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <User size={14} /> {customerName}
                </span>
              )}

              {/* Number preview area */}
              <div className="w-full border-y border-gray-200 py-6 flex flex-col items-center">
                <p className="text-4xl font-black text-[#002e5b] tracking-tight">
                  Menunggu...
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Nomor akan ditetapkan saat konfirmasi
                </p>
              </div>

              <p className="text-sm text-gray-500">
                Silakan tunggu panggilan di ruang tunggu.
              </p>

              <div className="w-full flex flex-col gap-3 mt-2">
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-[#002e5b] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#004482] active:scale-95 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <Printer size={20} />
                  )}
                  {loading ? "Memproses..." : "Cetak Tiket"}
                </button>
                <button
                  onClick={() => setAppState("select")}
                  disabled={loading}
                  className="w-full text-[#002e5b] py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
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
