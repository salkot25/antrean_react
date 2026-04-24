import { useState, useEffect, useRef } from 'react';
import { getDisplayData, getConfig } from '../api';
import { speakQueue } from '../utils/tts';
import type { TTSConfig } from '../utils/tts';
import { Zap, Clock, Cloud, Smartphone, Headphones, Users } from 'lucide-react';

export default function DisplayPage() {
  const [displayData, setDisplayData] = useState<Record<string, any>>({});
  // callingState: maps counter loket name → queue number currently being announced
  const [callingState, setCallingState] = useState<Record<string, string>>({});
  const prevDataRef = useRef<Record<string, any>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  // Supports both single video and playlist embeds
  const [ytEmbed, setYtEmbed] = useState<{ type: 'video' | 'playlist'; id: string }>({ type: 'video', id: 'DHua0l0Hhu4' });
  const ttsConfigRef = useRef<TTSConfig>({}); // Use ref so fetchData closure always has latest value
  const announceTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);  // YouTube iframe ref for volume control
  const callingCountRef = useRef(0);                 // how many lokets are currently calling
  const videoVolumeRef = useRef(100);                // normal volume (from config)
  const videoVolumeDuckedRef = useRef(15);           // ducked volume during TTS (from config)

  // ── YouTube volume helpers via postMessage (requires enablejsapi=1) ──────────
  const setVideoVolume = (volume: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }),
      '*'
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

  // CALLING_DISPLAY_DURATION: how long the "Memanggil" badge stays on screen.
  // 30 seconds = enough for TTS + Panggil Ulang window.
  const CALLING_DURATION_MS = 30_000;

  // 3 Fixed lokets — always shown regardless of API data
  const FIXED_COUNTERS = [
    { loketName: 'Loket Customer Service',      service: 'CS',  label: 'Customer Service',      shortLabel: 'CS' },
    { loketName: 'Loket PLN Mobile Experience', service: 'PLN', label: 'PLN Mobile Experience',  shortLabel: 'PLN' },
    { loketName: 'Loket Customer Care',         service: 'CC',  label: 'Customer Care',          shortLabel: 'CC' },
  ];

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDisplayData();
        setDisplayData(data);
        
        // Check for new calls to announce — compare by each fixed loket
        for (const fixed of FIXED_COUNTERS) {
          const item = data[fixed.loketName] as any;
          const prevItem = prevDataRef.current[fixed.loketName] as any;
          
          const currentNum = item?.number;
          const prevNum    = prevItem?.number;

          if (currentNum && currentNum !== "--" && currentNum !== prevNum) {
            // New number called for this counter — speak and mark as calling
            duckVideo(); // lower video volume while TTS speaks
            speakQueue(currentNum, fixed.loketName, {
              ...ttsConfigRef.current,
              onEnd: () => restoreVideo(), // restore as soon as TTS finishes
            });

            setCallingState(prev => ({ ...prev, [fixed.loketName]: currentNum }));

            // Clear any existing timer for this loket
            if (announceTimeoutRef.current[fixed.loketName]) {
              clearTimeout(announceTimeoutRef.current[fixed.loketName]);
            }
            // Auto-reset after CALLING_DURATION_MS (also failsafe restore)
            announceTimeoutRef.current[fixed.loketName] = setTimeout(() => {
              restoreVideo(); // failsafe if onEnd never fired (e.g. no TTS support)
              setCallingState(prev => {
                const next = { ...prev };
                delete next[fixed.loketName];
                return next;
              });
            }, CALLING_DURATION_MS);
          }
        }
        
        prevDataRef.current = data;
        
        // Fetch config to update youtube url and TTS config
        const config = await getConfig();
        if (config && config.youtubeUrl) {
          try {
            const raw = config.youtubeUrl as string;
            const urlObj = new URL(raw);

            // Check for playlist first (playlist?list=... or watch?list=...)
            const listId = urlObj.searchParams.get('list');
            const videoId = urlObj.searchParams.get('v');

            if (listId) {
              setYtEmbed({ type: 'playlist', id: listId });
            } else if (videoId) {
              setYtEmbed({ type: 'video', id: videoId });
            } else {
              // Maybe raw video ID was stored directly
              const pathParts = urlObj.pathname.split('/');
              const possibleId = pathParts[pathParts.length - 1];
              if (possibleId && possibleId.length === 11) {
                setYtEmbed({ type: 'video', id: possibleId });
              }
            }
          } catch(e) {
            // If URL parsing fails, treat it as a raw video ID
            const raw = config.youtubeUrl as string;
            if (raw.startsWith('PL') || raw.startsWith('RD')) {
              setYtEmbed({ type: 'playlist', id: raw });
            } else {
              setYtEmbed({ type: 'video', id: raw });
            }
          }
        }
        if (config) {
          ttsConfigRef.current = {
            ttsVoiceUri: config.ttsVoiceUri,
            ttsPitch: config.ttsPitch !== undefined ? Number(config.ttsPitch) : 1,
            ttsRate: config.ttsRate !== undefined ? Number(config.ttsRate) : 0.8
          };
          // Update volume references from config
          if (config.videoVolume !== undefined)       videoVolumeRef.current = Number(config.videoVolume);
          if (config.videoVolumeDucked !== undefined) videoVolumeDuckedRef.current = Number(config.videoVolumeDucked);
        }
      } catch (error) {
        console.error("Failed to fetch display data", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll every 3 seconds
    
    // Handle voice loading
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Just loads voices
      };
    }

    return () => clearInterval(interval);
  }, []);

  // Build the display counters by merging fixed config with API data
  const displayCounters = FIXED_COUNTERS.map(fixed => {
    const apiData = displayData[fixed.loketName] as any;
    const number  = apiData?.number || '--';
    const isCalling = !!callingState[fixed.loketName];
    // isServing: has a queue number but NOT actively calling (30s window expired)
    const isServing = !isCalling && number !== '--';
    return {
      loketName: fixed.loketName,
      service:   fixed.service,
      label:     fixed.label,
      number,
      isCalling,
      isServing,
    };
  });

  // Helper to format date like "Senin, 24 Mei 2024 | 14:30"
  const formattedDateTime = () => {
    const dateStr = currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} | ${timeStr}`;
  };

  // Helper to map service to icon and colors
  const getServiceStyles = (service: string) => {
    switch (service) {
      case 'PLN':
        return { icon: <Smartphone size={28} className="text-[#16A34A]" />, borderColor: 'border-[#16A34A]', labelBg: 'bg-[#16A34A]/15 text-[#16A34A]', callingBg: 'bg-yellow-400/20 text-yellow-700' };
      case 'CS':
        return { icon: <Users size={28} className="text-[#005BAC]" />, borderColor: 'border-[#005BAC]', labelBg: 'bg-[#005BAC]/10 text-[#005BAC]', callingBg: 'bg-yellow-400/20 text-yellow-700' };
      case 'CC':
        return { icon: <Headphones size={28} className="text-[#F59E0B]" />, borderColor: 'border-[#F59E0B]', labelBg: 'bg-[#F59E0B]/15 text-[#F59E0B]', callingBg: 'bg-yellow-400/20 text-yellow-700' };
      default:
        return { icon: <Zap size={28} className="text-slate-400" />, borderColor: 'border-slate-400', labelBg: 'bg-slate-200 text-slate-600', callingBg: 'bg-yellow-400/20 text-yellow-700' };
    }
  };

  return (
    <div className="bg-[#F5F7FA] h-screen w-screen overflow-hidden flex flex-col font-['Inter']">
      {/* TopAppBar */}
      <header className="bg-white leading-tight tracking-tight docked full-width top-0 border-b border-slate-200 shadow-sm shadow-blue-900/10 flex justify-between items-center h-20 px-10 w-full shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Zap className="text-[#005BAC]" size={36} fill="#005BAC" />
          <h1 className="text-2xl font-black text-[#005BAC] uppercase tracking-widest">PLN Pelayanan Pelanggan</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-slate-500 font-semibold text-xl flex items-center gap-2">
            <Clock size={24} />
            {formattedDateTime()}
          </div>
          <Cloud size={28} className="text-slate-500" />
        </div>
      </header>

      {/* Main Content Canvas (30/70 Split via Grid) */}
      <main className="flex-1 w-full p-10 grid grid-cols-10 gap-10 mb-16 relative">
        
        {/* Left Column: Queue Cards (30%) */}
        <section className="col-span-3 flex flex-col gap-5 h-full">
          {displayCounters.map((c, idx) => {
            const styles = getServiceStyles(c.service);
            
            return (
              <div 
                key={idx} 
                className={`flex-1 bg-white rounded-xl shadow-sm border-t-8 ${styles.borderColor} flex flex-col p-5 relative overflow-hidden transition-all duration-500 ${
                  c.isCalling ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-200/60 z-10' :
                  c.isServing ? 'ring-2 ring-green-300 shadow-md shadow-green-100/60' : ''
                }`}
              >
                {/* Header: Label + Icon */}
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-2xl text-[#1F2937] leading-tight">
                    {c.label}
                  </span>
                  {styles.icon}
                </div>

                {/* Queue Number — big hero display */}
                <div className="flex-1 flex flex-col items-center justify-center py-2">
                  <span className={`text-[90px] leading-none tracking-tight font-black transition-all duration-300 ${
                    c.isCalling ? 'text-[#FFC72C] animate-pulse drop-shadow-md' :
                    c.isServing ? 'text-[#16A34A]' :
                    'text-[#1F2937]'
                  }`}>
                    {c.number}
                  </span>
                </div>

                {/* Footer: Loket name + status badge */}
                <div className="bg-[#F5F7FA] rounded-lg px-4 py-3 flex justify-between items-center mt-2">
                  <span className="font-medium text-base text-[#6B7280] truncate mr-2">{c.loketName}</span>
                  {c.isCalling ? (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 bg-yellow-400/20 text-yellow-700 animate-pulse">
                      Memanggil
                    </span>
                  ) : c.isServing ? (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 bg-green-100 text-green-700">
                      Sedang Dilayani
                    </span>
                  ) : (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 ${styles.labelBg}`}>
                      Menunggu
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Right Column: Media Player (70%) */}
        <section className="col-span-7 h-full bg-slate-200 rounded-xl overflow-hidden relative shadow-sm">
          <div className="absolute inset-0">
            <iframe
              ref={iframeRef}
              key={`${ytEmbed.type}-${ytEmbed.id}`}
              width="100%"
              height="100%"
              src={
                ytEmbed.type === 'playlist'
                  ? `https://www.youtube.com/embed/videoseries?list=${ytEmbed.id}&autoplay=1&mute=1&loop=1&controls=0&enablejsapi=1`
                  : `https://www.youtube.com/embed/${ytEmbed.id}?autoplay=1&mute=1&loop=1&playlist=${ytEmbed.id}&controls=0&enablejsapi=1`
              }
              title="PLN Corporate Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full object-cover"
            ></iframe>

            {/* Audio unlock button — browser requires user gesture to unmute.
                Click once at the start of each session to enable video sound. */}
            <button
              onClick={() => {
                // Unmute via postMessage after user gesture
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: 'command', func: 'unMute', args: [] }),
                  '*'
                );
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: 'command', func: 'setVolume', args: [videoVolumeRef.current] }),
                  '*'
                );
              }}
              className="absolute bottom-3 right-3 z-20 bg-black/50 hover:bg-black/75 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 transition-all"
              title="Klik untuk mengaktifkan suara video"
            >
              🔊 Aktifkan Suara Video
            </button>

            {/* Optional Overlay */}
            <div className="absolute inset-0 bg-[#005BAC]/10 mix-blend-multiply pointer-events-none"></div>
          </div>
        </section>
      </main>

      {/* Footer Marquee */}
      <footer className="bg-[#005BAC] font-semibold uppercase tracking-wider text-lg fixed bottom-0 left-0 w-full h-16 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] flex items-center overflow-hidden whitespace-nowrap px-8 z-50">
        {/* Static Label */}
        <div className="bg-[#FFC72C] text-[#005BAC] px-4 py-2 rounded font-bold mr-4 shrink-0 flex items-center gap-2">
          <Zap size={20} fill="#005BAC" />
          INFORMASI
        </div>
        {/* Scrolling Text Container */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className="text-white w-full animate-[marquee_20s_linear_infinite]">
            <span className="mr-16">Mohon antre dengan tertib. Pastikan Anda membawa dokumen identitas diri untuk keperluan administrasi. Layanan PLN Mobile kini tersedia di App Store dan Play Store.</span>
            <span className="mr-16 opacity-80">|</span>
            <span className="mr-16">Untuk bantuan lebih lanjut, silakan hubungi petugas Customer Service kami di area depan.</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        /* Hide scrollbar for clean TV display look */
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
