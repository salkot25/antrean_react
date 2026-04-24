import { useState, useEffect } from "react";
import {
  Save,
  RefreshCw,
  MonitorPlay,
  Printer,
  Volume2,
  Play,
  Building2,
} from "lucide-react";
import { getConfig, updateConfig } from "../api";

export default function ServiceConfigPage() {
  const [loading, setLoading] = useState(false);
  const [hasLoadedConfig, setHasLoadedConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [officeName, setOfficeName] = useState("PLN ULP Salatiga");
  const [resetTime, setResetTime] = useState("00:00");
  const [dateFormat, setDateFormat] = useState("LONG_ID");
  const [youtubeUrl, setYoutubeUrl] = useState(
    "https://www.youtube.com/watch?v=DHua0l0Hhu4",
  );
  const [autoPrint, setAutoPrint] = useState(true);
  const [ttsVoiceUri, setTtsVoiceUri] = useState("");
  const [ttsPitch, setTtsPitch] = useState(1);
  const [ttsRate, setTtsRate] = useState(0.8);
  const [videoVolume, setVideoVolume] = useState(100);
  const [videoVolumeDucked, setVideoVolumeDucked] = useState(15);
  const [runningText, setRunningText] = useState(
    "Selamat datang di PLN ULP Salatiga. Silakan ambil nomor antrian dan tunggu panggilan. Pelayanan kami mengutamakan kepuasan Anda.",
  );
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await getConfig();
      if (data) {
        if (data.officeName !== undefined) setOfficeName(data.officeName);
        if (data.resetTime !== undefined) setResetTime(data.resetTime);
        if (data.dateFormat !== undefined) setDateFormat(data.dateFormat);
        if (data.youtubeUrl !== undefined) setYoutubeUrl(data.youtubeUrl);
        if (data.autoPrint !== undefined) setAutoPrint(data.autoPrint);
        if (data.ttsVoiceUri !== undefined) setTtsVoiceUri(data.ttsVoiceUri);
        if (data.ttsPitch !== undefined) setTtsPitch(Number(data.ttsPitch));
        if (data.ttsRate !== undefined) setTtsRate(Number(data.ttsRate));
        if (data.videoVolume !== undefined)
          setVideoVolume(Number(data.videoVolume));
        if (data.videoVolumeDucked !== undefined)
          setVideoVolumeDucked(Number(data.videoVolumeDucked));
        if (data.runningText !== undefined) setRunningText(data.runningText);
      }
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Gagal mengambil konfigurasi dari server.",
      });
    } finally {
      setHasLoadedConfig(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateConfig({
        officeName,
        resetTime,
        dateFormat,
        youtubeUrl,
        autoPrint,
        ttsVoiceUri,
        ttsPitch,
        ttsRate,
        videoVolume,
        videoVolumeDucked,
        runningText,
      });

      // Read back from sheet so UI always reflects persisted values.
      await fetchConfig();
      setMessage({ type: "success", text: "Konfigurasi berhasil disimpan!" });
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Gagal menyimpan konfigurasi." });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleTestVoice = () => {
    import("../utils/tts").then(({ speakQueue }) => {
      speakQueue("CS-012", "Loket Customer Service", {
        ttsVoiceUri,
        ttsPitch,
        ttsRate,
      });
    });
  };

  return (
    <div className="bg-background text-on-background min-h-full p-sm md:p-lg lg:p-safe-margin">
      <div className="max-w-5xl mx-auto">
        {!hasLoadedConfig && (
          <div className="mb-md p-4 rounded-xl border border-outline-variant bg-surface-container-lowest font-label-sm text-on-surface-variant">
            Memuat konfigurasi dari server...
          </div>
        )}

        {/* Page Header */}
        <div className="mb-lg">
          <h1 className="font-heading-lg text-on-background">Service Config</h1>
          <p className="font-body-lg text-on-surface-variant mt-1">
            Pengaturan tampilan TV dan fungsionalitas Kiosk.
          </p>
        </div>

        {/* Notification Message */}
        {message && (
          <div
            className={`mb-md p-4 rounded-xl flex items-center gap-3 border font-label-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-error-container text-on-error-container border-error/20"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 12-column grid: 8 left + 4 right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-md">
          {/* ── Left column (8 cols) ── */}
          <div className="lg:col-span-8 space-y-md">
            {/* General Configuration Card */}
            <section className="bg-surface-bright rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-md py-sm border-b border-surface-variant bg-surface-container-lowest">
                <h2 className="font-heading-md text-on-surface flex items-center gap-2">
                  <Building2 size={22} className="text-secondary" />
                  General Configuration
                </h2>
              </div>
              <div className="p-md space-y-sm">
                <div>
                  <label className="block font-label-sm text-on-surface-variant mb-base">
                    Nama Kantor
                  </label>
                  <input
                    type="text"
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    placeholder="Contoh: PLN ULP Salatiga"
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    Ditampilkan di header layar TV Display dan tiket Kiosk.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div>
                    <label className="block font-label-sm text-on-surface-variant mb-base">
                      Waktu Reset Nomor Antrian
                    </label>
                    <input
                      type="time"
                      value={resetTime}
                      onChange={(e) => setResetTime(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    />
                    <p className="text-xs text-on-surface-variant mt-1">
                      Nomor antrian direset setiap hari pada jam ini.
                    </p>
                  </div>

                  <div>
                    <label className="block font-label-sm text-on-surface-variant mb-base">
                      Format Tanggal
                    </label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface"
                    >
                      <option value="LONG_ID">
                        Panjang — Sabtu, 25 April 2026 | 06.10 WIB
                      </option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Format tanggal yang digunakan di seluruh tampilan sistem.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Display & Media Card */}
            <section className="bg-surface-bright rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-md py-sm border-b border-surface-variant bg-surface-container-lowest flex justify-between items-center">
                <h2 className="font-heading-md text-on-surface flex items-center gap-2">
                  <MonitorPlay size={22} className="text-secondary" />
                  Display &amp; Media
                </h2>
                <button
                  onClick={fetchConfig}
                  disabled={loading}
                  title="Muat ulang pengaturan"
                  className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container"
                >
                  <RefreshCw
                    size={18}
                    className={loading ? "animate-spin" : ""}
                  />
                </button>
              </div>
              <div className="p-md space-y-sm">
                <div>
                  <label className="block font-label-sm text-on-surface-variant mb-base">
                    URL Video YouTube / Playlist
                  </label>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    Gunakan URL{" "}
                    <code className="bg-surface-container px-1 rounded">
                      watch?v=...
                    </code>{" "}
                    atau{" "}
                    <code className="bg-surface-container px-1 rounded">
                      playlist?list=...
                    </code>
                    . Video/playlist di-loop otomatis.
                  </p>
                </div>

                <div>
                  <label className="block font-label-sm text-on-surface-variant mb-base">
                    Running Text / Ticker
                  </label>
                  <textarea
                    value={runningText}
                    onChange={(e) => setRunningText(e.target.value)}
                    rows={3}
                    placeholder="Pesan yang ditampilkan sebagai berjalan di layar TV..."
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface resize-none"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    Teks berjalan yang tampil di bagian bawah layar TV Display.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  {/* Normal Volume */}
                  <div>
                    <div className="flex justify-between mb-base">
                      <label className="font-label-sm text-on-surface-variant">
                        Volume Video Normal
                      </label>
                      <span className="font-label-sm text-on-surface">
                        {videoVolume}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={videoVolume}
                      onChange={(e) => setVideoVolume(Number(e.target.value))}
                      className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-on-surface-variant mt-1">
                      Volume saat tidak ada pemanggilan antrian.
                    </p>
                  </div>

                  {/* Ducked Volume */}
                  <div>
                    <div className="flex justify-between mb-base">
                      <label className="font-label-sm text-on-surface-variant">
                        Volume Saat Memanggil
                      </label>
                      <span className="font-label-sm text-on-surface">
                        {videoVolumeDucked}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={5}
                      value={videoVolumeDucked}
                      onChange={(e) =>
                        setVideoVolumeDucked(Number(e.target.value))
                      }
                      className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-on-surface-variant mt-1">
                      Volume selama TTS membaca antrian (maks. 50%).
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Kiosk Printer Card */}
            <section className="bg-surface-bright rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-md py-sm border-b border-surface-variant bg-surface-container-lowest">
                <h2 className="font-heading-md text-on-surface flex items-center gap-2">
                  <Printer size={22} className="text-secondary" />
                  Kiosk Printer
                </h2>
              </div>
              <div className="p-md">
                <label className="flex items-start gap-4 cursor-pointer group p-3 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={autoPrint}
                      onChange={(e) => setAutoPrint(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-10 h-6 bg-surface-container-high rounded-full peer peer-checked:bg-primary transition-colors
                                    peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-1 after:left-1
                                    after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform after:shadow-sm"
                    ></div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-on-surface group-hover:text-primary transition-colors font-semibold">
                      Otomatis Cetak Tiket
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      Dialog print browser otomatis terbuka setelah pelanggan
                      mengambil antrian di mesin Kiosk.
                    </span>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* ── Right column (4 cols) ── */}
          <div className="lg:col-span-4 space-y-md">
            {/* Audio & Voice Card */}
            <section className="bg-surface-bright rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-md py-sm border-b border-surface-variant bg-surface-container-lowest">
                <h2 className="font-heading-md text-on-surface flex items-center gap-2">
                  <Volume2 size={22} className="text-secondary" />
                  Audio &amp; Voice
                </h2>
              </div>
              <div className="p-md space-y-sm">
                <div>
                  <label className="block font-label-sm text-on-surface-variant mb-base">
                    Jenis Suara (Voice)
                  </label>
                  <select
                    value={ttsVoiceUri}
                    onChange={(e) => setTtsVoiceUri(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface"
                  >
                    <option value="">
                      -- Default / Otomatis (Indonesia) --
                    </option>
                    {availableVoices.map((voice, idx) => (
                      <option key={idx} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-base">
                    <label className="font-label-sm text-on-surface-variant">
                      Intonasi (Pitch)
                    </label>
                    <span className="font-label-sm text-on-surface">
                      {ttsPitch}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={ttsPitch}
                    onChange={(e) => setTtsPitch(Number(e.target.value))}
                    className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    Nilai normal: 1.0
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-base">
                    <label className="font-label-sm text-on-surface-variant">
                      Kecepatan (Rate)
                    </label>
                    <span className="font-label-sm text-on-surface">
                      {ttsRate}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={ttsRate}
                    onChange={(e) => setTtsRate(Number(e.target.value))}
                    className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    Nilai normal: 1.0 (0.8 lebih disarankan)
                  </p>
                </div>

                <button
                  onClick={handleTestVoice}
                  className="w-full mt-2 py-2 px-4 border border-outline-variant rounded-lg font-label-sm text-on-surface hover:bg-surface-container transition-colors flex justify-center items-center gap-2"
                >
                  <Play size={16} />
                  Test Audio
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-lg pt-md border-t border-surface-variant flex justify-end gap-sm">
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="py-2 px-6 border border-outline rounded-lg font-label-sm text-on-surface hover:bg-surface-container transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="py-2 px-6 bg-primary text-on-primary rounded-lg font-label-sm hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </div>
    </div>
  );
}
