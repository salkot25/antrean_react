import { useState, useEffect, useRef } from "react";
import { getDisplayData, getConfig } from "../api";
import { speakQueue } from "../utils/tts";
import type { TTSConfig } from "../utils/tts";
import { Zap, Clock, Cloud, Smartphone, Headphones, Users } from "lucide-react";

export default function DisplayPage() {
  const [displayData, setDisplayData] = useState<Record<string, any>>({});
  // callingState: maps counter loket name -> queue number currently being announced
  const [callingState, setCallingState] = useState<Record<string, string>>({});
  const [runningText, setRunningText] = useState(
    "Selamat datang di PLN ULP Salatiga. Silakan ambil nomor antrian dan tunggu panggilan. Pelayanan kami mengutamakan kepuasan Anda.",
  );
  const [officeName, setOfficeName] = useState("PLN Pelayanan Pelanggan");
  const prevDataRef = useRef<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Supports both single video and playlist embeds
  const [ytEmbed, setYtEmbed] = useState<{
    type: "video" | "playlist";
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
            const raw = config.youtubeUrl as string;
            const urlObj = new URL(raw);
            const listId = urlObj.searchParams.get("list");
            const videoId = urlObj.searchParams.get("v");

            if (listId) {
              setYtEmbed({ type: "playlist", id: listId });
            } else if (videoId) {
              setYtEmbed({ type: "video", id: videoId });
            } else {
              const pathParts = urlObj.pathname.split("/");
              const possibleId = pathParts[pathParts.length - 1];
              if (possibleId && possibleId.length === 11) {
                setYtEmbed({ type: "video", id: possibleId });
              }
            }
          } catch {
            const raw = config.youtubeUrl as string;
            if (raw.startsWith("PL") || raw.startsWith("RD")) {
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
        setDisplayData(data);

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
          icon: <Smartphone size={28} className="text-[#16A34A]" />,
          borderColor: "border-[#16A34A]",
          labelBg: "bg-[#16A34A]/15 text-[#16A34A]",
          callingBg: "bg-yellow-400/20 text-yellow-700",
        };
      case "CS":
        return {
          icon: <Users size={28} className="text-[#005BAC]" />,
          borderColor: "border-[#005BAC]",
          labelBg: "bg-[#005BAC]/10 text-[#005BAC]",
          callingBg: "bg-yellow-400/20 text-yellow-700",
        };
      case "CC":
        return {
          icon: <Headphones size={28} className="text-[#F59E0B]" />,
          borderColor: "border-[#F59E0B]",
          labelBg: "bg-[#F59E0B]/15 text-[#F59E0B]",
          callingBg: "bg-yellow-400/20 text-yellow-700",
        };
      default:
        return {
          icon: <Zap size={28} className="text-slate-400" />,
          borderColor: "border-slate-400",
          labelBg: "bg-slate-200 text-slate-600",
          callingBg: "bg-yellow-400/20 text-yellow-700",
        };
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#eaf4ff] via-[#f7fbff] to-[#eef4fb] h-screen w-screen overflow-hidden flex flex-col font-['Inter']">
      <header className="bg-primary leading-tight tracking-tight border-b border-blue-900/20 shadow-sm flex justify-between items-center h-16 lg:h-20 px-4 lg:px-8 w-full shrink-0 z-50 text-white">
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <Zap className="text-[#FFC72C] shrink-0" size={30} fill="#FFC72C" />
          <div className="min-w-0">
            <h1 className="text-base lg:text-2xl font-black uppercase tracking-wide lg:tracking-widest truncate">
              {officeName}
            </h1>
            <p className="text-[11px] lg:text-xs text-white/75 font-medium">
              Display Antrean Real-Time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 lg:gap-5">
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
          <Cloud size={22} className="text-white/80 lg:w-7 lg:h-7" />
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
                  className={`bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden transition-all duration-500 ${
                    c.isCalling
                      ? "ring-2 ring-yellow-400 shadow-lg shadow-yellow-200/60 z-10"
                      : c.isServing
                        ? "ring-2 ring-emerald-300 shadow-md shadow-emerald-100/60"
                        : ""
                  }`}
                >
                  {/* top accent bar */}
                  <div
                    className={`absolute top-0 left-0 w-full h-1.5 ${styles.borderColor.replace("border", "bg")}`}
                  />

                  {/* header: loket name + icon */}
                  <div className="flex justify-between items-center px-4 lg:px-5 pt-5 pb-2">
                    <span className="font-bold text-base lg:text-xl text-slate-800 leading-tight truncate">
                      {c.label}
                    </span>
                    {styles.icon}
                  </div>

                  {/* split body */}
                  <div className="flex flex-1 divide-x divide-slate-200 px-1 pb-4 lg:pb-5 mt-1 min-h-0">
                    {/* left: sedang dilayani */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2 lg:px-3 py-2">
                      <span
                        className={`text-[40px] lg:text-[64px] leading-none tracking-tight whitespace-nowrap tabular-nums font-black transition-all duration-300 ${
                          c.isCalling
                            ? "text-[#FFC72C] animate-pulse drop-shadow-md"
                            : c.isServing
                              ? "text-emerald-600"
                              : "text-slate-300"
                        }`}
                      >
                        {c.number}
                      </span>
                      <span className="text-[11px] lg:text-xs font-semibold uppercase tracking-widest text-slate-400">
                        {c.isCalling ? "Memanggil" : "Sedang Dilayani"}
                      </span>
                    </div>

                    {/* right: selanjutnya / menunggu */}
                    {/* right: next number (top) + waiting count (bottom) */}
                    <div className="flex-1 flex flex-col divide-y divide-slate-100 px-2 lg:px-3">
                      {/* next number */}
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2">
                        <span
                          className={`text-lg lg:text-2xl leading-none tracking-tight font-black tabular-nums transition-all duration-300 ${c.nextNumber ? "text-emerald-500" : "text-slate-300"}`}
                        >
                          {c.nextNumber || "—"}
                        </span>
                        <span className="text-[11px] lg:text-xs font-semibold uppercase tracking-widest text-slate-400">
                          Selanjutnya
                        </span>
                      </div>
                      {/* waiting count */}
                      <div className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2">
                        <span className="text-[38px] lg:text-[56px] leading-none tracking-tight font-black text-emerald-500 tabular-nums">
                          {c.waitingCount}
                        </span>
                        <span className="text-[11px] lg:text-xs font-semibold uppercase tracking-widest text-slate-400">
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

        <section className="lg:col-span-3 xl:col-span-7 min-h-0 bg-white rounded-3xl overflow-hidden relative border border-slate-200 shadow-sm">
          <div className="absolute inset-0">
            <iframe
              ref={iframeRef}
              key={`${ytEmbed.type}-${ytEmbed.id}`}
              width="100%"
              height="100%"
              src={
                ytEmbed.type === "playlist"
                  ? `https://www.youtube.com/embed/videoseries?list=${ytEmbed.id}&autoplay=1&mute=1&loop=1&controls=0&enablejsapi=1`
                  : `https://www.youtube.com/embed/${ytEmbed.id}?autoplay=1&mute=1&loop=1&playlist=${ytEmbed.id}&controls=0&enablejsapi=1`
              }
              title="PLN Corporate Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full object-cover"
              onLoad={scheduleAutoVideoAudioActivation}
            />

            <button
              onClick={scheduleAutoVideoAudioActivation}
              className="absolute bottom-3 right-3 z-20 bg-black/55 hover:bg-black/75 text-white text-[11px] lg:text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 transition-all"
              title="Klik untuk mengaktifkan suara video"
            >
              Aktifkan Suara Video
            </button>

            <div className="absolute inset-0 bg-primary/10 mix-blend-multiply pointer-events-none" />
          </div>
        </section>
      </main>

      <footer className="bg-primary font-semibold uppercase tracking-wider text-sm lg:text-lg fixed bottom-0 left-0 w-full h-14 lg:h-16 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] flex items-center overflow-hidden whitespace-nowrap px-4 lg:px-8 z-50">
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
