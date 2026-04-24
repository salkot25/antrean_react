import { useState, useEffect } from 'react';
import { Save, RefreshCw, MonitorPlay, Printer, Volume2, Play } from 'lucide-react';
import { getConfig, updateConfig } from '../api';

export default function ServiceConfigPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("https://www.youtube.com/watch?v=DHua0l0Hhu4");
  const [autoPrint, setAutoPrint] = useState(true);
  const [ttsVoiceUri, setTtsVoiceUri] = useState("");
  const [ttsPitch, setTtsPitch] = useState(1);
  const [ttsRate, setTtsRate] = useState(0.8);
  const [videoVolume, setVideoVolume] = useState(100);       // Normal video volume (0-100)
  const [videoVolumeDucked, setVideoVolumeDucked] = useState(15); // Volume during TTS (0-100)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

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
        if (data.youtubeUrl) setYoutubeUrl(data.youtubeUrl);
        if (data.autoPrint !== undefined) setAutoPrint(data.autoPrint);
        if (data.ttsVoiceUri !== undefined) setTtsVoiceUri(data.ttsVoiceUri);
        if (data.ttsPitch !== undefined) setTtsPitch(Number(data.ttsPitch));
        if (data.ttsRate !== undefined) setTtsRate(Number(data.ttsRate));
        if (data.videoVolume !== undefined) setVideoVolume(Number(data.videoVolume));
        if (data.videoVolumeDucked !== undefined) setVideoVolumeDucked(Number(data.videoVolumeDucked));
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Gagal mengambil konfigurasi dari server.' });
    } finally {
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
      await updateConfig({ youtubeUrl, autoPrint, ttsVoiceUri, ttsPitch, ttsRate, videoVolume, videoVolumeDucked });
      setMessage({ type: 'success', text: 'Konfigurasi berhasil disimpan!' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Gagal menyimpan konfigurasi.' });
    } finally {
      setSaving(false);
      // Auto dismiss success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  const handleTestVoice = () => {
    import('../utils/tts').then(({ speakQueue }) => {
      speakQueue('CS-012', 'Loket Customer Service', { ttsVoiceUri, ttsPitch, ttsRate });
    });
  };

  return (
    <div className="px-10 py-8 flex flex-col gap-8 h-full max-w-4xl mx-auto w-full">
      {/* Header */}
      <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-[#191c21]">Service Config</h1>
          <p className="text-base text-slate-500 mt-1">Pengaturan tampilan TV dan fungsionalitas Kiosk.</p>
        </div>
        <button 
          onClick={fetchConfig}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-[#005BAC] transition-colors rounded-full hover:bg-slate-100"
          title="Muat ulang pengaturan"
        >
          <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="p-8 flex flex-col gap-8">
          
          {/* Section: TV Display */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <MonitorPlay className="text-red-500" size={24} />
              <h2 className="text-xl font-semibold text-slate-800">TV Display Settings</h2>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">URL Video YouTube / Playlist</label>
              <input 
                type="text" 
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005BAC] focus:border-transparent transition-all w-full text-slate-800"
              />
              <p className="text-xs text-slate-500">
                Masukkan URL video YouTube (<code className="bg-slate-100 px-1 rounded">watch?v=...</code>) atau URL playlist (<code className="bg-slate-100 px-1 rounded">playlist?list=...</code>). Video/playlist akan di-loop otomatis di layar TV Display.
              </p>
            </div>

            {/* Volume Controls */}
            <div className="grid grid-cols-2 gap-6">
              {/* Normal Volume */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Volume Video Normal
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={100} step={5}
                    value={videoVolume}
                    onChange={e => setVideoVolume(Number(e.target.value))}
                    className="flex-1 accent-[#005BAC]"
                  />
                  <span className="text-sm font-bold text-[#005BAC] w-10 text-right">{videoVolume}%</span>
                </div>
                <p className="text-xs text-slate-400">Volume video saat tidak ada pemanggilan antrian.</p>
              </div>

              {/* Ducked Volume */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Volume Saat Memanggil
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={50} step={5}
                    value={videoVolumeDucked}
                    onChange={e => setVideoVolumeDucked(Number(e.target.value))}
                    className="flex-1 accent-[#F59E0B]"
                  />
                  <span className="text-sm font-bold text-[#F59E0B] w-10 text-right">{videoVolumeDucked}%</span>
                </div>
                <p className="text-xs text-slate-400">Volume video selama TTS membacakan nomor antrian (maks. 50%).</p>
              </div>
            </div>
          </div>

          {/* Section: Text to Speech Settings */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3 justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="text-[#F59E0B]" size={24} />
                <h2 className="text-xl font-semibold text-slate-800">Pengaturan Suara (TTS)</h2>
              </div>
              <button 
                onClick={handleTestVoice}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Play size={16} /> Test Suara
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">Jenis Suara (Voice)</label>
                <select 
                  value={ttsVoiceUri}
                  onChange={(e) => setTtsVoiceUri(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005BAC] focus:border-transparent transition-all w-full text-slate-800"
                >
                  <option value="">-- Default / Otomatis (Indonesia) --</option>
                  {availableVoices.map((voice, idx) => (
                    <option key={idx} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex justify-between text-sm font-semibold text-slate-700">
                  <span>Intonasi (Pitch)</span>
                  <span className="text-[#005BAC]">{ttsPitch}</span>
                </label>
                <input 
                  type="range" 
                  min="0" max="2" step="0.1" 
                  value={ttsPitch}
                  onChange={(e) => setTtsPitch(Number(e.target.value))}
                  className="w-full accent-[#005BAC] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-slate-500">Nilai normal: 1.0</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex justify-between text-sm font-semibold text-slate-700">
                  <span>Kecepatan (Rate)</span>
                  <span className="text-[#005BAC]">{ttsRate}</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" max="2" step="0.1" 
                  value={ttsRate}
                  onChange={(e) => setTtsRate(Number(e.target.value))}
                  className="w-full accent-[#005BAC] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-slate-500">Nilai normal: 1.0 (0.8 lebih disarankan)</p>
              </div>
            </div>
          </div>

          {/* Section: Kiosk Settings */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <Printer className="text-[#005BAC]" size={24} />
              <h2 className="text-xl font-semibold text-slate-800">Kiosk Printer</h2>
            </div>
            
            <label className="flex items-start gap-4 cursor-pointer group mt-2 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="relative flex items-center mt-1">
                <input 
                  type="checkbox" 
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005BAC]"></div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold text-slate-800 group-hover:text-[#005BAC] transition-colors">
                  Otomatis Cetak Tiket
                </span>
                <span className="text-sm text-slate-500">
                  Jika diaktifkan, dialog print browser akan otomatis terbuka setelah pelanggan mengambil antrian di mesin Kiosk.
                </span>
              </div>
            </label>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-[#005BAC] hover:bg-[#004482] text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            {saving ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
