import { useRef, useState } from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { markdownToSpeechText } from '../utils/textForSpeech';

function TextToSpeech({ text }) {
  const utteranceRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleSpeak = () => {
    if (!text) return;

    window.speechSynthesis.cancel(); // stop any previous speech

    const utterance = new SpeechSynthesisUtterance(markdownToSpeechText(text));
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onpause = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handlePause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return (
    <div className="mt-6 flex gap-3">
      {!isSpeaking && (
        <button
          onClick={handleSpeak}
          className="btn-brutal flex items-center gap-2 bg-accent text-surface px-4 py-2 rounded-pill font-heading font-bold"
        >
          <Play className="w-4 h-4" strokeWidth={2.5} />
          Start Reading
        </button>
      )}

      {isSpeaking && !isPaused && (
        <button
          onClick={handlePause}
          className="btn-brutal flex items-center gap-2 bg-muted text-text px-4 py-2 rounded-pill font-heading font-bold"
        >
          <Pause className="w-4 h-4" strokeWidth={2.5} />
          Pause
        </button>
      )}

      {isPaused && (
        <button
          onClick={handleResume}
          className="btn-brutal flex items-center gap-2 bg-accent text-surface px-4 py-2 rounded-pill font-heading font-bold"
        >
          <Play className="w-4 h-4" strokeWidth={2.5} />
          Resume
        </button>
      )}

      {isSpeaking && (
        <button
          onClick={handleStop}
          className="btn-brutal flex items-center gap-2 bg-primary text-text px-4 py-2 rounded-pill font-heading font-bold"
        >
          <Square className="w-4 h-4" strokeWidth={2.5} />
          Stop
        </button>
      )}
    </div>
  );
}

export default TextToSpeech;
