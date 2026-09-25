import { useState, useEffect, useRef } from "react";
import { getDisplayData, getConfig } from "../api";
import { speakQueue } from "../utils/tts";
import type { TTSConfig } from "../utils/tts";
import {
  Zap,
  Clock,
  Smartphone,
  Headphones,
  Users,
  Sun,
  Moon,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function DisplayPage() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pln_display_theme");
      if (saved === "dark" || saved === "light") return saved;
    }
    return "light";
  });

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("pln_display_theme", next);
      return next;
    });
  };

  const [syncStatus, setSyncStatus] = useState<"synced" | "reconnecting">(
    "synced",
  );
  const failCountRef = useRef(0);

  const [displayData, setDisplayData] = useState<Record<string, any>>({});
  // callingState: maps counter loket name -> queue number currently being announced
  const [callingState, setCallingState] = useState<Record<string, string>>({});
  const [runningText, setRunningText] = useState(
    "Selamat datang di PLN ULP Salatiga. Ambil nomor antrean, lalu tunggu panggilan di ruang tunggu. Pelayanan kami mengutamakan kepuasan Anda.",
  );
  const [officeName, setOfficeName] = useState("PLN Pelayanan Pelanggan");
  const prevDataRef = useRef<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Supports both single video and playlist embeds, or none
  const [ytEmbed, setYtEmbed] = useState<{
    type: "video" | "playlist" | "none";
    id: string;
  }>({ type: "video", id: "DHua0l0Hhu4" });

  const ttsConfigRef = useRef<TTSConfig>({});
  const announceTimeoutRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callingCountRef = useRef(0);
  const videoVolumeRef = useRef(100);
  const videoVolumeDuckedRef = useRef(15);
  const autoAudioTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // YouTube volume helpers via postMessage (requires enablejsapi=1)
  const setVideoVolume = (volume: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "setVolume", args: [volume] }),
      "*",
    );
  };

  const activateVideoAudio = () => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;

    const send = (func: string, args: unknown[] = []) => {
      target.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    };

    send("unMute");
    send("playVideo");
    send("setVolume", [videoVolumeRef.current]);
  };

  const scheduleAutoVideoAudioActivation = () => {
    autoAudioTimersRef.current.forEach(clearTimeout);
    autoAudioTimersRef.current = [0, 500, 1300].map((delay) =>
      setTimeout(() => {
        activateVideoAudio();
      }, delay),
    );
  };

  const duckVideo = () => {
    callingCountRef.current += 1;
    setVideoVolume(videoVolumeDuckedRef.current);
  };

  const restoreVideo = () => {
    callingCountRef.current = Math.max(0, callingCountRef.current - 1);
    if (callingCountRef.current === 0) {
      setVideoVolume(videoVolumeRef.current);
    }
  };

  // 30 seconds = enough for TTS + Panggil Ulang window.
  const CALLING_DURATION_MS = 30_000;

  // 3 fixed lokets — always shown regardless of API data
  const FIXED_COUNTERS = [
    {
      loketName: "Loket PLN Mobile Experience",
      service: "PLN",
      label: "PLN Mobile Experience",
      shortLabel: "PLN",
    },
    {
      loketName: "Loket Customer Service",
      service: "CS",
      label: "Customer Service",
      shortLabel: "CS",
    },
    {
      loketName: "Loket Customer Care",
      service: "CC",
      label: "Customer Care",
      shortLabel: "CC",
    },
  ];

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    return () => {
      autoAudioTimersRef.current.forEach(clearTimeout);
      autoAudioTimersRef.current = [];
    };
  }, []);

  // Load config once on page open/reload.
  useEffect(() => {
    const loadConfigOnce = async () => {
      try {
        const config = await getConfig();

        if (config && config.youtubeUrl) {
          try {
            const raw = (config.youtubeUrl as string).trim();
            if (raw.toLowerCase() === "none" || raw.toLowerCase() === "off" || !raw) {
              setYtEmbed({ type: "none", id: "" });
            } else {
              const urlObj = new URL(raw);
              const listId = urlObj.searchParams.get("list");
              const videoId = urlObj.searchParams.get("v");

              if (listId) {
                setYtEmbed({ type: "playlist", id: listId });
              } else if (videoId) {
                setYtEmbed({ type: "video", id: videoId });
              } else {
                const pathParts = urlObj.pathname.split("/").filter(Boolean);
                const possibleId = pathParts[pathParts.length - 1];
                if (possibleId && possibleId.length === 11) {
                  setYtEmbed({ type: "video", id: possibleId });
                }
              }
            }
          } catch {
            const raw = (config.youtubeUrl as string).trim();
            if (raw.toLowerCase() === "none" || raw.toLowerCase() === "off" || !raw) {
              setYtEmbed({ type: "none", id: "" });
            } else if (raw.startsWith("PL") || raw.startsWith("RD")) {
              setYtEmbed({ type: "playlist", id: raw });
            } else {
              setYtEmbed({ type: "video", id: raw });
            }
          }
        }

        if (config) {
          ttsConfigRef.current = {
            ttsVoiceUri: config.ttsVoiceUri,
            ttsPitch:
              config.ttsPitch !== undefined ? Number(config.ttsPitch) : 1,
            ttsRate:
              config.ttsRate !== undefined ? Number(config.ttsRate) : 0.8,
          };
          if (config.videoVolume !== undefined) {
            videoVolumeRef.current = Number(config.videoVolume);
          }
          if (config.videoVolumeDucked !== undefined) {
            videoVolumeDuckedRef.current = Number(config.videoVolumeDucked);
          }
          if (config.runningText) setRunningText(config.runningText);
          if (config.officeName) setOfficeName(config.officeName);
        }
      } catch (error) {
        console.error("Failed to fetch display config", error);
      }
    };

    loadConfigOnce();
  }, []);

  // Poll queue/counter data only; do not poll settings.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDisplayData();
        if (data && typeof data === "object") {
          setDisplayData(data);
          failCountRef.current = 0;
          setSyncStatus("synced");
        }

        for (const fixed of FIXED_COUNTERS) {
          const item = data[fixed.loketName] as any;
          const prevItem = prevDataRef.current[fixed.loketName] as any;

          const currentNum = item?.number;
          const prevNum = prevItem?.number;

          if (currentNum && currentNum !== "--" && currentNum !== prevNum) {
            duckVideo();
            speakQueue(currentNum, fixed.loketName, {
              ...ttsConfigRef.current,
              onEnd: () => restoreVideo(),
            });

            setCallingState((prev) => ({
              ...prev,
              [fixed.loketName]: currentNum,
            }));

            if (announceTimeoutRef.current[fixed.loketName]) {
              clearTimeout(announceTimeoutRef.current[fixed.loketName]);
            }

            announceTimeoutRef.current[fixed.loketName] = setTimeout(() => {
              restoreVideo();
              setCallingState((prev) => {
                const next = { ...prev };
                delete next[fixed.loketName];
                return next;
              });
            }, CALLING_DURATION_MS);
          }
        }

        prevDataRef.current = data;
      } catch (error) {
        console.error("Failed to fetch display data", error);
        failCountRef.current += 1;
        if (failCountRef.current >= 3) {
          setSyncStatus("reconnecting");
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        // noop, triggers voice list availability in some browsers
      };
    }

    return () => clearInterval(interval);
  }, []);

  const displayCounters = FIXED_COUNTERS.map((fixed) => {
    const apiData = displayData[fixed.loketName] as any;
    const number = apiData?.number || "--";
    const isCalling = !!callingState[fixed.loketName];
    const isServing = !isCalling && number !== "--";
    const waitingCount: number = apiData?.waitingCount ?? 0;
    const nextNumber: string = apiData?.nextNumber || "";
    return {
      loketName: fixed.loketName,
      service: fixed.service,
      label: fixed.label,
      number,
      isCalling,
      isServing,
      waitingCount,
      nextNumber,
    };
  });

  const getEmbedUrl = () => {
    if (ytEmbed.type === "none" || !ytEmbed.id) return "";

    const origin =
      typeof window !== "undefined" &&
      window.location.origin &&
      window.location.origin !== "null"
        ? window.location.origin
        : "https://antrean.salkot.online";

    const originParam = encodeURIComponent(origin);
    const baseParams = `autoplay=1&mute=1&loop=1&controls=0&enablejsapi=1&playsinline=1&rel=0&iv_load_policy=3&origin=${originParam}`;

    if (ytEmbed.type === "playlist") {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(ytEmbed.id)}&${baseParams}`;
    }
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytEmbed.id)}?${baseParams}&playlist=${encodeURIComponent(ytEmbed.id)}`;
  };

  const formattedDateTime = () => {
    const d = currentTime;

    const weekday = d.toLocaleDateString("id-ID", { weekday: "long" });
    const datePart = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${weekday}, ${datePart} | ${hours}.${minutes} WIB`;
  };

  const getServiceStyles = (service: string) => {
    switch (service) {
      case "PLN":
        return {
          icon: (
            <Smartphone
              size={28}
              className={isDark ? "text-emerald-400" : "text-[#16A34A]"}
            />
          ),
          borderColor: isDark ? "border-emerald-500" : "border-[#16A34A]",
          labelBg: isDark
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-[#16A34A]/15 text-[#16A34A]",
          callingBg: "bg-yellow-400/20 text-yellow-500",
        };
      case "CS":
        return {
          icon: (
            <Users
              size={28}
              className={isDark ? "text-cyan-400" : "text-[#005BAC]"}
            />
          ),
          borderColor: isDark ? "border-cyan-500" : "border-[#005BAC]",
          labelBg: isDark
            ? "bg-cyan-500/20 text-cyan-300"
            : "bg-[#005BAC]/10 text-[#005BAC]",
          callingBg: "bg-yellow-400/20 text-yellow-500",
        };
      case "CC":
        return {
          icon: (
            <Headphones
              size={28}
              className={isDark ? "text-amber-400" : "text-[#F59E0B]"}
            />
          ),
          borderColor: isDark ? "border-amber-500" : "border-[#F59E0B]",
          labelBg: isDark
            ? "bg-amber-500/20 text-amber-300"
            : "bg-[#F59E0B]/15 text-[#F59E0B]",
          callingBg: "bg-yellow-400/20 text-yellow-500",
        };
      default:
        return {
          icon: <Zap size={28} className="text-slate-400" />,
          borderColor: isDark ? "border-slate-600" : "border-slate-400",
          labelBg: isDark
            ? "bg-slate-700 text-slate-300"
            : "bg-slate-200 text-slate-600",
          callingBg: "bg-yellow-400/20 text-yellow-500",
        };
    }
  };

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col font-['Inter'] transition-colors duration-500 ${
        isDark
          ? "bg-gradient-to-b from-[#080d1a] via-[#0e1628] to-[#070b14] text-slate-100"
          : "bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] text-slate-800"
      }`}
    >
      <header
        className={`leading-tight tracking-tight border-b shadow-sm flex justify-between items-center h-16 lg:h-20 px-4 lg:px-8 w-full shrink-0 z-50 text-white transition-colors duration-500 ${
          isDark
            ? "bg-[#09152b] border-slate-700/60"
            : "bg-primary border-blue-900/20"
        }`}
      >
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <Zap className="text-[#FFC72C] shrink-0" size={30} fill="#FFC72C" />
          <div className="min-w-0">
            <h1 className="text-base lg:text-2xl font-black uppercase tracking-wide lg:tracking-widest truncate">
              {officeName}
            </h1>
            <p className="text-[11px] lg:text-xs text-white/75 font-medium">
              Tampilan Antrean Real-Time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 lg:gap-4">
          <div className="text-white/90 font-semibold text-xs lg:text-lg flex items-center gap-1.5 lg:gap-2">
            <Clock size={18} className="lg:w-6 lg:h-6" />
            <span className="hidden md:inline">{formattedDateTime()}</span>
            <span className="md:hidden">
              {currentTime.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Real-time Connection Watchdog Badge */}
          {syncStatus === "synced" ? (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${
                isDark
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-emerald-500/20 border-emerald-400/40 text-emerald-100"
              }`}
              title="Terhubung ke server antrean (Real-time live sync)"
            >
              <Wifi size={13} className={isDark ? "text-emerald-400" : "text-emerald-200"} />
              <span>Live</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-semibold animate-pulse"
              title="Koneksi terganggu. Mencoba menghubungkan kembali ke server..."
            >
              <WifiOff size={13} className="text-amber-300" />
              <span>Reconnecting</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 rounded-full border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#FFC72C] cursor-pointer shadow-sm ${
              isDark
                ? "bg-slate-800/90 hover:bg-slate-700/90 border-slate-600/70 text-amber-300"
                : "bg-white/15 hover:bg-white/25 border-white/25 text-white"
            }`}
            title={`Ganti ke mode ${isDark ? "terang (Light Mode)" : "gelap (Dark Mode)"}`}
            aria-label="Toggle dark mode dan light mode"
          >
            {isDark ? (
              <>
                <Moon size={16} className="text-amber-300 fill-amber-300/30" />
                <span className="text-[11px] lg:text-xs font-bold uppercase tracking-wider text-amber-200">
                  Dark
                </span>
              </>
            ) : (
              <>
                <Sun size={16} className="text-yellow-300 fill-yellow-300/30" />
                <span className="text-[11px] lg:text-xs font-bold uppercase tracking-wider text-white">
                  Light
                </span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-4 lg:px-8 py-4 lg:py-6 grid gap-4 lg:gap-6 lg:grid-cols-5 xl:grid-cols-10 mb-16 min-h-0">
        <section className="lg:col-span-2 xl:col-span-3 min-h-0">
          <div className="h-full grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-4">
            {displayCounters.map((c, idx) => {
              const styles = getServiceStyles(c.service);

              return (
                <div
                  key={idx}
                  className={`rounded-3xl border flex flex-col relative overflow-hidden transition-all duration-500 ${
                    isDark
                      ? "bg-[#111c38]/90 border-slate-700/60 shadow-lg shadow-black/40 backdrop-blur-sm"
                      : "bg-white border-slate-200 shadow-sm"
                  } ${
                    c.isCalling
                      ? isDark
                        ? "ring-2 ring-yellow-400 shadow-xl shadow-yellow-500/20 z-10"
                        : "ring-2 ring-yellow-400 shadow-lg shadow-yellow-200/60 z-10"
                      : c.isServing
                        ? isDark
                          ? "ring-2 ring-emerald-500/60 shadow-md shadow-emerald-500/10"
                          : "ring-2 ring-emerald-300 shadow-md shadow-emerald-100/60"
                        : ""
                  }`}
                >
                  {/* top accent bar */}
                  <div
                    className={`absolute top-0 left-0 w-full h-1.5 ${styles.borderColor.replace("border", "bg")}`}
                  />

                  {/* header: loket name + icon */}
                  <div className="flex justify-between items-center px-4 lg:px-5 pt-5 pb-2">
                    <span
                      className={`font-bold text-base lg:text-xl leading-tight truncate ${
                        isDark ? "text-slate-100" : "text-slate-800"
                      }`}
                    >
                      {c.label}
                    </span>
                    {styles.icon}
                  </div>

                  {/* split body */}
                  <div
                    className={`flex flex-1 divide-x px-1 pb-4 lg:pb-5 mt-1 min-h-0 ${
                      isDark ? "divide-slate-700/60" : "divide-slate-200"
                    }`}
                  >
                    {/* left: sedang dilayani */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2 lg:px-3 py-2">
                      <span
                        className={`text-[40px] lg:text-[64px] leading-none tracking-tight whitespace-nowrap tabular-nums font-black transition-all duration-300 ${
                          c.isCalling
                            ? "text-[#FFC72C] animate-pulse drop-shadow-[0_0_12px_rgba(255,199,44,0.4)]"
                            : c.isServing
                              ? isDark
                                ? "text-emerald-400"
                                : "text-emerald-600"
                              : isDark
                                ? "text-slate-600"
                                : "text-slate-300"
                        }`}
                      >
                        {c.number}
                      </span>
                      <span
                        className={`text-[11px] lg:text-xs font-semibold uppercase tracking-widest ${
                          isDark ? "text-slate-400" : "text-slate-400"
                        }`}
                      >
                        {c.isCalling ? "Memanggil" : "Sedang Dilayani"}
                      </span>
                    </div>

                    {/* right: nomor berikutnya / menunggu */}
                    <div
                      className={`flex-1 flex flex-col divide-y px-2 lg:px-3 ${
                        isDark ? "divide-slate-700/60" : "divide-slate-100"
                      }`}
                    >
                      {/* next number */}
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2">
                        <span
                          className={`text-lg lg:text-2xl leading-none tracking-tight font-black tabular-nums transition-all duration-300 ${
                            c.nextNumber
                              ? isDark
                                ? "text-emerald-400"
                                : "text-emerald-500"
                              : isDark
                                ? "text-slate-600"
                                : "text-slate-300"
                          }`}
                        >
                          {c.nextNumber || "—"}
                        </span>
                        <span
                          className={`text-[11px] lg:text-xs font-semibold uppercase tracking-widest ${
                            isDark ? "text-slate-400" : "text-slate-400"
                          }`}
                        >
                          Nomor Berikutnya
                        </span>
                      </div>
                      {/* waiting count */}
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2">
                        <span
                          className={`text-[38px] lg:text-[56px] leading-none tracking-tight font-black tabular-nums ${
                            isDark ? "text-emerald-400" : "text-emerald-500"
                          }`}
                        >
                          {c.waitingCount}
                        </span>
                        <span
                          className={`text-[11px] lg:text-xs font-semibold uppercase tracking-widest ${
                            isDark ? "text-slate-400" : "text-slate-400"
                          }`}
                        >
                          Menunggu
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className={`lg:col-span-3 xl:col-span-7 min-h-0 rounded-3xl overflow-hidden relative border transition-colors duration-500 ${
            isDark
              ? "bg-[#111c38]/90 border-slate-700/60 shadow-lg shadow-black/40"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div className="absolute inset-0">
            {getEmbedUrl() ? (
              <>
                <iframe
                  ref={iframeRef}
                  key={`${ytEmbed.type}-${ytEmbed.id}`}
                  width="100%"
                  height="100%"
                  src={getEmbedUrl()}
                  title="PLN Corporate Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 w-full h-full object-cover"
                  onLoad={scheduleAutoVideoAudioActivation}
                />

                <button
                  onClick={scheduleAutoVideoAudioActivation}
                  className="absolute bottom-3 right-3 z-20 bg-black/55 hover:bg-black/75 text-white text-[11px] lg:text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 transition-all shadow-md"
                  title="Aktifkan suara video agar audio diputar"
                >
                  Aktifkan Audio Video
                </button>

                <div
                  className={`absolute inset-0 pointer-events-none ${
                    isDark ? "bg-black/20" : "bg-primary/10 mix-blend-multiply"
                  }`}
                />
              </>
            ) : (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none ${
                  isDark
                    ? "bg-gradient-to-br from-[#0b1730] via-[#071124] to-[#040914] text-white"
                    : "bg-gradient-to-br from-[#004482] via-[#00386e] to-[#00254c] text-white"
                }`}
              >
                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-6 shadow-inner">
                  <Zap size={44} className="text-[#FFC72C] drop-shadow-md" fill="#FFC72C" />
                </div>
                <h2 className="text-2xl lg:text-4xl font-extrabold uppercase tracking-wider mb-3">
                  {officeName}
                </h2>
                <p className="text-white/80 max-w-lg text-sm lg:text-lg font-medium leading-relaxed mb-6">
                  Listrik untuk Kehidupan yang Lebih Baik. Silakan menunggu nomor antrean Anda dipanggil di loket layanan terkait.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-xs lg:text-sm text-[#FFC72C] font-semibold border border-white/15">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sistem Antrean Aktif
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer
        className={`font-semibold uppercase tracking-wider text-sm lg:text-lg fixed bottom-0 left-0 w-full h-14 lg:h-16 flex items-center overflow-hidden whitespace-nowrap px-4 lg:px-8 z-50 transition-colors duration-500 ${
          isDark
            ? "bg-[#09152b] border-t border-slate-700/60 shadow-[0_-4px_16px_rgba(0,0,0,0.5)]"
            : "bg-primary border-t border-blue-900/20 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]"
        }`}
      >
        <div className="bg-[#FFC72C] text-primary px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg font-bold mr-3 lg:mr-4 shrink-0 flex items-center gap-2">
          <Zap size={18} fill="#002e5b" />
          INFORMASI
        </div>
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="text-white w-full animate-[marquee_20s_linear_infinite] whitespace-nowrap">
            <span className="mr-24">{runningText}</span>
            <span className="mr-24 opacity-50">*</span>
            <span className="mr-24">{runningText}</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
