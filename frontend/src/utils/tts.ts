export interface TTSConfig {
  ttsVoiceUri?: string;
  ttsPitch?: number;
  ttsRate?: number;
  onEnd?: () => void; // Callback when TTS finishes speaking
}

// Retain utterances in memory to prevent Chromium garbage collection bug
const activeUtterances = new Set<SpeechSynthesisUtterance>();

export const speakQueue = (
  number: string,
  counterName: string,
  config?: TTSConfig,
) => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    config?.onEnd?.();
    return;
  }

  // Clear previous or stuck utterance to prevent audio queue stalling
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch {
    // ignore synthesizer cancel errors
  }

  // Format number for better reading: CS-012 -> "C S, nol satu dua"
  const [prefix, num] = number.split("-");
  const spelledNum = num?.split("").join(" ") || "";
  const textToSpeak = `Nomor antrean, ${prefix}, ${spelledNum}. Silakan menuju ke, ${counterName}`;

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = "id-ID";

  // Apply config or defaults
  utterance.rate = config?.ttsRate !== undefined ? config.ttsRate : 0.8;
  utterance.pitch = config?.ttsPitch !== undefined ? config.ttsPitch : 1;

  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = null;

  if (config?.ttsVoiceUri) {
    selectedVoice = voices.find((v) => v.voiceURI === config.ttsVoiceUri);
  }

  // Fallback to Indonesian voice if configured voice not found
  if (!selectedVoice) {
    selectedVoice = voices.find(
      (v) => v.lang.includes("id") || v.lang.includes("ID"),
    );
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(safetyTimer);
    activeUtterances.delete(utterance);
    config?.onEnd?.();
  };

  utterance.onend = finish;
  utterance.onerror = finish;

  // Safety fallback: if browser fails to trigger onend/onerror, release ducked audio after 10s
  const safetyTimer = setTimeout(finish, 10_000);

  activeUtterances.add(utterance);
  window.speechSynthesis.speak(utterance);
};
