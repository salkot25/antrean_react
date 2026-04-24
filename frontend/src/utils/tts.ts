export interface TTSConfig {
  ttsVoiceUri?: string;
  ttsPitch?: number;
  ttsRate?: number;
  onEnd?: () => void; // Callback when TTS finishes speaking
}

export const speakQueue = (number: string, counterName: string, config?: TTSConfig) => {
  if (!window.speechSynthesis) return;
  
  // Format number for better reading: CS-012 -> "C S, nol satu dua"
  const [prefix, num] = number.split('-');
  const spelledNum = num?.split('').join(' ') || '';
  const textToSpeak = `Nomor antrian, ${prefix}, ${spelledNum}. Silakan menuju ke, ${counterName}`;

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = 'id-ID';
  
  // Apply config or defaults
  utterance.rate = config?.ttsRate !== undefined ? config.ttsRate : 0.8;
  utterance.pitch = config?.ttsPitch !== undefined ? config.ttsPitch : 1;
  
  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = null;

  if (config?.ttsVoiceUri) {
    selectedVoice = voices.find(v => v.voiceURI === config.ttsVoiceUri);
  }

  // Fallback to Indonesian voice if configured voice not found
  if (!selectedVoice) {
    selectedVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  // Fire callback when TTS finishes
  if (config?.onEnd) {
    utterance.onend = () => config.onEnd!();
  }

  window.speechSynthesis.speak(utterance);
};
