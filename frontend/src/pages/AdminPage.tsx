import { useState, useEffect } from "react";
import {
  getWaitingQueues,
  callNextQueue,
  getConfig,
  resetQueueData,
} from "../api";
import { speakQueue } from "../utils/tts";
import { useAuth } from "../context/AuthContext";
import type { TTSConfig } from "../utils/tts";
import {
  SkipForward,
  Volume2,
  Ban,
  Users,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [service, setService] = useState("");
  const [lastCalled, setLastCalled] = useState<any>(null);
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({});

  useEffect(() => {
    const fetchTtsConfig = async () => {
      try {
        const config = await getConfig();
        if (config) {
          setTtsConfig({
            ttsVoiceUri: config.ttsVoiceUri,
            ttsPitch:
              config.ttsPitch !== undefined ? Number(config.ttsPitch) : 1,
            ttsRate:
              config.ttsRate !== undefined ? Number(config.ttsRate) : 0.8,
          });
        }
      } catch (error) {
        console.error("Failed to load TTS config", error);
      }
    };
    fetchTtsConfig();
  }, []);

  const fetchQueues = async () => {
    setLoading(true);
    try {
      const data = await getWaitingQueues(service);
      setQueues(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, [service]);

  const handleCall = async (_skipId?: string) => {
    if (queues.length === 0) return alert("Tidak ada antrian menunggu.");
    setLoading(true);
    try {
      // Pass the service name based on dropdown choice or first queue's service if "Semua Layanan"
      const serviceName =
        service || (queues.length > 0 ? queues[0].service : "CS");
      const counterName =
        serviceName === "CS"
          ? "Loket Customer Service"
          : serviceName === "PLN"
            ? "Loket PLN Mobile Experience"
            : "Loket Customer Care";
      const res = await callNextQueue(serviceName, counterName);

      const numberCalled = res.number || queues[0].number;
      setLastCalled({
        number: numberCalled,
        service:
          queues.find((q) => q.number === res.number)?.service || serviceName,
        counter: counterName,
      });
      speakQueue(numberCalled, counterName, ttsConfig);
      fetchQueues();
    } catch (error) {
      console.error(error);
      alert("Gagal memanggil antrian.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = () => {
    if (!lastCalled) return alert("Belum ada antrian yang dipanggil.");
    speakQueue(
      lastCalled.number,
      lastCalled.counter || "Loket Customer Service",
      ttsConfig,
    );
  };

  const handleResetQueueData = async () => {
    const ok = window.confirm(
      "Reset seluruh data antrean dan counter? Tindakan ini tidak dapat dibatalkan.",
    );
    if (!ok) return;

    setResetting(true);
    try {
      const res = await resetQueueData(user?.username || "system");
      if (res?.error) {
        alert(res.error);
        return;
      }
      setLastCalled(null);
      await fetchQueues();
      alert("Data antrean berhasil direset.");
    } catch (error) {
      console.error(error);
      alert("Gagal reset data antrean.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="px-4 py-4 sm:px-10 sm:py-8 flex flex-col gap-6 sm:gap-8 h-full">
      {/* Header & Counter Selection */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191c21]">Queue Control</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Manage active customer queues and service flows.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            onClick={handleResetQueueData}
            disabled={resetting || loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg border border-red-700 transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <RotateCcw size={16} className={resetting ? "animate-spin" : ""} />
            Reset Data Antrian
          </button>
          <select
            className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-300 focus-within:border-[#004482] focus-within:ring-1 focus-within:ring-[#004482] transition-all cursor-pointer outline-none text-sm font-medium"
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">Semua Layanan</option>
            <option value="CS">Customer Service</option>
            <option value="PLN">PLN Mobile Experience</option>
            <option value="CC">Customer Care</option>
          </select>
        </div>
      </header>

      {/* Bento Grid: Control Center */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Current Queue Display (Centerpiece) */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden min-h-[180px] sm:min-h-[300px]">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-100/50 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              <span className="text-sm font-medium text-slate-600 uppercase tracking-wider">
                Sedang Dipanggil
              </span>
            </div>

            <h2 className="text-[72px] sm:text-[120px] leading-none font-black text-[#004482] tracking-tighter drop-shadow-sm">
              {lastCalled ? lastCalled.number : "--"}
            </h2>
            <p className="text-xl text-slate-500 mt-4">
              {lastCalled
                ? `${lastCalled.service === "CS" ? "Customer Service" : lastCalled.service === "PLN" ? "PLN Mobile Experience" : lastCalled.service === "CC" ? "Customer Care" : lastCalled.service}`
                : "Belum ada antrian"}
            </p>
          </div>
        </div>

        {/* Action Controls panel */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          {/* NEXT Button (Primary) */}
          <button
            onClick={() => handleCall()}
            disabled={loading || queues.length === 0}
            className="flex-1 bg-[#004482] hover:bg-[#005bac] text-white rounded-xl p-6 flex flex-col items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] border border-blue-900 disabled:opacity-50 disabled:active:scale-100"
          >
            <SkipForward size={40} />
            <span className="text-xl sm:text-2xl font-semibold">Panggil Berikutnya</span>
            <span className="text-sm text-blue-200">
              {queues.length > 0 ? `${queues[0].number} Menunggu` : "Kosong"}
            </span>
          </button>

          <div className="flex gap-4 h-[140px]">
            {/* RECALL Button (Secondary) */}
            <button
              onClick={handleRecall}
              disabled={!lastCalled}
              className="flex-1 bg-white hover:bg-slate-50 text-[#00658d] border border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              <Volume2 size={32} />
              <span className="text-sm font-semibold">Panggil Ulang</span>
            </button>

            {/* SKIP Button (Danger) */}
            <button
              onClick={() => handleCall()} // Skipping basically calls next
              disabled={loading || queues.length === 0}
              className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 border border-red-200 rounded-xl flex flex-col items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              <Ban size={32} />
              <span className="text-sm font-semibold">Lewati Antrian</span>
            </button>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-[300px]">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg sm:text-2xl font-semibold text-[#191c21]">
            Daftar Antrian
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchQueues}
              className="text-slate-500 hover:text-[#005BAC] transition-colors p-2"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <span className="inline-flex items-center gap-2 bg-slate-200 px-3 py-1 rounded-full text-sm font-medium text-slate-700">
              <Users size={16} /> {queues.length} Menunggu
            </span>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-3 px-3 sm:py-4 sm:px-6 text-sm text-slate-500 font-semibold">
                  No. Antrian
                </th>
                <th className="py-3 px-3 sm:py-4 sm:px-6 text-sm text-slate-500 font-semibold">
                  Layanan
                </th>
                <th className="hidden sm:table-cell py-4 px-6 text-sm text-slate-500 font-semibold">
                  Nama Pelanggan
                </th>
                <th className="py-3 px-3 sm:py-4 sm:px-6 text-sm text-slate-500 font-semibold">
                  Status
                </th>
                <th className="hidden sm:table-cell py-4 px-6 text-sm text-slate-500 font-semibold">
                  Waktu Ambil
                </th>
              </tr>
            </thead>
            <tbody className="text-base text-[#191c21] divide-y divide-slate-100">
              {queues.length > 0 ? (
                queues.map((q, idx) => {
                  const timeStr = q.created_at
                    ? new Date(q.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }) + " WIB"
                    : "--:-- WIB";
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-3 sm:py-4 sm:px-6 font-semibold text-[#004482]">
                        {q.number}
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-6 text-sm sm:text-base">
                        {q.service === "CS"
                          ? "Customer Service"
                          : q.service === "PLN"
                            ? "PLN Mobile"
                            : "Customer Care"}
                      </td>
                      <td className="hidden sm:table-cell py-4 px-6 text-slate-600">
                        {q.customer_name || (
                          <span className="text-slate-300 italic text-sm">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:py-4 sm:px-6">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-200 text-slate-600">
                          {q.status}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell py-4 px-6 text-slate-500">{timeStr}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 px-6 text-center text-slate-500"
                  >
                    Tidak ada antrian yang menunggu untuk layanan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
