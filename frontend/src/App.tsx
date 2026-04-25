import { useState, useEffect } from "react";
import { createQueue, getConfig } from "./api";
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
type LastPrintedTicket = {
  number: string;
  service: string;
  printedAt: string;
  customerName: string;
};

export default function App() {
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
  const [lastPrinted, setLastPrinted] = useState<LastPrintedTicket | null>(
    null,
  );

  const getService = (code: string) => SERVICES.find((s) => s.code === code);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pln_last_printed_ticket");
      if (!raw) return;
      const parsed = JSON.parse(raw) as LastPrintedTicket;
      if (parsed?.number && parsed?.service) {
        setLastPrinted(parsed);
      }
    } catch {
      localStorage.removeItem("pln_last_printed_ticket");
    }
  }, []);

  useEffect(() => {
    const loadPrintSetting = async () => {
      try {
        const config = await getConfig();
        const raw = config?.autoPrint;
        const enabled =
          typeof raw === "boolean" ? raw : String(raw).toLowerCase() === "true";
        setAutoPrint(enabled);
      } catch {
        // Keep default true if config fetch fails
      }
    };
    loadPrintSetting();
  }, []);

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
      setLastPrinted(latest);
      localStorage.setItem("pln_last_printed_ticket", JSON.stringify(latest));

      setAppState("success");

      // Auto print follows Service Config (autoPrint)
      if (autoPrint) {
        setTimeout(() => window.print(), 800);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengambil antrian. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleReprintLatest = () => {
    if (!lastPrinted) return;
    setTicket({ number: lastPrinted.number, service: lastPrinted.service });
    setPrintedAt(lastPrinted.printedAt || "");
    setCustomerName(lastPrinted.customerName || "");
    setCountdown(5);
    setAppState("success");
    setTimeout(() => window.print(), 800);
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
              onClick={() => window.print()}
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
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="PLN Logo"
            className="h-8 w-8 object-contain"
          />
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">
            Ambil Nomor Antrean
          </h1>
        </div>
        <button
          onClick={handleReprintLatest}
          disabled={!lastPrinted}
          className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            lastPrinted
              ? "Cetak ulang tiket terakhir"
              : "Belum ada tiket untuk dicetak ulang"
          }
        >
          <Printer size={18} />
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

        {/* Print Status */}
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
