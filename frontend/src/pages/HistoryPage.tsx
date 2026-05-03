import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getTodayHistoryQueues, getConfig } from "../api";
import {
  requestBridgePrint,
  browserPrint,
  isBridgeAvailable,
} from "../utils/printBridge";
import type { TicketPrintPayload } from "../utils/printBridge";
import type { PrintedTicket } from "../App";
import {
  ChevronLeft,
  Printer,
  RefreshCw,
  Clock,
  CheckCircle2,
  Inbox,
} from "lucide-react";

const SERVICE_NAMES: Record<string, string> = {
  PLN: "PLN Mobile Experience",
  CS: "Customer Service",
  CC: "Customer Care",
};

type TicketStatus = "waiting" | "called" | "loading";

type DisplayTicket = PrintedTicket & { status: TicketStatus };

export default function HistoryPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<DisplayTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState<string | null>(null);
  const [browserPrintTicket, setBrowserPrintTicket] =
    useState<PrintedTicket | null>(null);
  const [officeName, setOfficeName] = useState("PLN");

  const formatPrintedAt = (iso: string) => {
    if (!iso) return "";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return (
      dt.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " " +
      dt.toLocaleTimeString("id-ID")
    );
  };

  const refreshStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getTodayHistoryQueues();
      if (!Array.isArray(rows) || rows.length === 0) {
        setTickets([]);
        return;
      }

      const mapped: DisplayTicket[] = rows.map((row: any) => ({
        number: String(row.number || ""),
        service: String(row.service || ""),
        customerName: String(row.customer_name || ""),
        printedAt: formatPrintedAt(String(row.created_at || "")),
        status: row.status === "waiting" ? "waiting" : "called",
      }));

      setTickets(mapped);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const config = await getConfig();
        if (config?.officeName) setOfficeName(String(config.officeName));
      } catch {
        // keep default
      }
      await refreshStatuses();
    };
    void init();
  }, [refreshStatuses]);

  const handleReprint = async (ticket: PrintedTicket) => {
    setPrinting(ticket.number);
    try {
      const payload: TicketPrintPayload = {
        number: ticket.number,
        serviceCode: ticket.service,
        serviceName: SERVICE_NAMES[ticket.service] || ticket.service,
        printedAt: ticket.printedAt,
        customerName: ticket.customerName,
        officeName,
      };

      if (isBridgeAvailable()) {
        const result = await requestBridgePrint(payload, 8000);
        if (!result || result.status !== "success") {
          alert(
            `Cetak ulang gagal (${result?.reason ?? "unknown"}). Cek Bluetooth/printer.`,
          );
        }
      } else {
        // Browser mode: print only selected ticket using dedicated print area.
        setBrowserPrintTicket(ticket);
        setTimeout(() => {
          browserPrint();
          setTimeout(() => setBrowserPrintTicket(null), 300);
        }, 80);
      }
    } finally {
      setPrinting(null);
    }
  };

  const waitingTickets = tickets.filter((t) => t.status === "waiting");
  const calledTickets = tickets.filter((t) => t.status === "called");

  return (
    <div className="min-h-screen bg-[#f9f9ff] flex flex-col font-['Inter']">
      <header className="bg-[#002e5b] text-white w-full h-16 flex items-center justify-between px-4 shadow-md sticky top-0 z-10">
        <button
          onClick={() => navigate("/ambil")}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Kembali"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Riwayat Cetak</h1>
        <button
          onClick={() => void refreshStatuses()}
          disabled={loading}
          className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
          aria-label="Refresh"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-6 pb-12 flex flex-col gap-5">
        <p className="text-sm text-gray-500 text-center">
          Daftar nomor antrean hari ini yang tersinkronisasi di sistem.
        </p>

        {loading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <RefreshCw size={32} className="animate-spin" />
            <p className="text-sm">Memuat data antrean hari ini...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <Inbox size={48} strokeWidth={1.2} />
            <p className="text-sm font-medium">
              Belum ada riwayat antrean untuk hari ini
            </p>
            <button
              onClick={() => navigate("/ambil")}
              className="mt-2 text-[#002e5b] text-sm font-semibold hover:underline"
            >
              Ambil Nomor Antrean Sekarang
            </button>
          </div>
        ) : (
          <>
            {waitingTickets.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock size={14} />
                  Menunggu dipanggil ({waitingTickets.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {waitingTickets.map((t) => (
                    <TicketCard
                      key={t.number}
                      ticket={t}
                      onReprint={() => void handleReprint(t)}
                      isPrinting={printing === t.number}
                    />
                  ))}
                </div>
              </section>
            )}

            {calledTickets.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Sudah dipanggil ({calledTickets.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {calledTickets.map((t) => (
                    <TicketCard
                      key={t.number}
                      ticket={t}
                      onReprint={() => void handleReprint(t)}
                      isPrinting={printing === t.number}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Browser print layout: only visible in print media */}
      <div id="history-thermal-print" className="print-only">
        {browserPrintTicket ? (
          <>
            <div className="thermal-header">{officeName}</div>
            <div className="thermal-sub">NOMOR ANTREAN</div>
            <div className="thermal-number-box">
              <span className="thermal-number">
                {browserPrintTicket.number}
              </span>
            </div>
            <div className="thermal-loket">
              Layanan:{" "}
              {SERVICE_NAMES[browserPrintTicket.service] ||
                browserPrintTicket.service}
            </div>
            <div className="thermal-time">{browserPrintTicket.printedAt}</div>
            {browserPrintTicket.customerName ? (
              <p className="thermal-detail">
                Atas nama: {browserPrintTicket.customerName}
              </p>
            ) : null}
            <p className="thermal-thanks">Terima kasih</p>
          </>
        ) : null}
      </div>

      <style>{`
        .print-only { display: none; }

        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }

          body * { visibility: hidden !important; }
          #history-thermal-print, #history-thermal-print * { visibility: visible !important; }

          #history-thermal-print {
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 58mm;
            padding: 4mm 3mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
        }

        .thermal-header {
          text-align: center;
          font-weight: 900;
          font-size: 13px;
          margin-bottom: 2px;
        }

        .thermal-sub {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .thermal-number-box {
          border: 2px solid #000;
          border-radius: 4px;
          text-align: center;
          padding: 4px 0;
          margin: 4px 0 6px 0;
        }

        .thermal-number {
          font-size: 36px;
          font-weight: 900;
          line-height: 1.1;
        }

        .thermal-loket,
        .thermal-time,
        .thermal-detail,
        .thermal-thanks {
          text-align: center;
          font-size: 10px;
          margin: 3px 0;
        }

        .thermal-thanks {
          margin-top: 6px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

function TicketCard({
  ticket,
  onReprint,
  isPrinting,
}: {
  ticket: DisplayTicket;
  onReprint: () => void;
  isPrinting: boolean;
}) {
  const isWaiting = ticket.status === "waiting";
  const isLoading = ticket.status === "loading";

  return (
    <div
      className={`w-full bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-4 transition-all ${
        isWaiting
          ? "border-blue-200"
          : isLoading
            ? "border-gray-200"
            : "border-gray-100 opacity-60"
      }`}
    >
      <div
        className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg leading-tight text-center ${
          isWaiting
            ? "bg-[#002e5b] text-white"
            : isLoading
              ? "bg-gray-200 text-gray-400"
              : "bg-gray-100 text-gray-400"
        }`}
      >
        {ticket.number}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">
          {SERVICE_NAMES[ticket.service] || ticket.service}
        </p>
        {ticket.customerName && (
          <p className="text-xs text-gray-500 truncate">
            {ticket.customerName}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{ticket.printedAt}</p>
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${
            isWaiting
              ? "bg-blue-50 text-blue-700"
              : isLoading
                ? "bg-gray-100 text-gray-400"
                : "bg-green-50 text-green-700"
          }`}
        >
          {isLoading ? (
            "Memuat..."
          ) : isWaiting ? (
            <>
              <Clock size={11} />
              Menunggu
            </>
          ) : (
            <>
              <CheckCircle2 size={11} />
              Sudah Dipanggil
            </>
          )}
        </span>
      </div>

      <button
        onClick={onReprint}
        disabled={isPrinting || isLoading}
        className="flex-shrink-0 p-2.5 rounded-xl bg-[#002e5b]/10 hover:bg-[#002e5b]/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        title="Cetak ulang"
      >
        {isPrinting ? (
          <RefreshCw size={18} className="text-[#002e5b] animate-spin" />
        ) : (
          <Printer size={18} className="text-[#002e5b]" />
        )}
      </button>
    </div>
  );
}
