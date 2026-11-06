import { useEffect, useId, useRef, useState } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { toSpeechText } from '../utils/equations';

// Only one reader speaks at a time: starting one tells the others to reset
const TTS_START_EVENT = 'echonote-tts-start';
// Chrome can stop long utterances partway, so speech is queued in sentence-sized chunks
const MAX_CHUNK_CHARS = 220;

function splitIntoChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHUNK_CHARS && current) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Reads summary text aloud, with equations spoken as words (never as LaTeX).
// `compact` renders a single small play/stop button, for use beside each timeline section.
function TextToSpeech({ text, equations, compact = false, label = 'Start Reading' }) {
  const id = useId();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const runRef = useRef(0);          // bumps on every start/stop so callbacks from an old run are ignored
  const speakingRef = useRef(false); // whether this reader owns the current speech

  // Stable across renders (only touches refs and state setters), so effects can use it
  const resetRef = useRef(() => {
    runRef.current += 1;
    speakingRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
  });
  const reset = resetRef.current;

  useEffect(() => {
    const onOtherStart = (event) => {
      if (event.detail !== id) resetRef.current();
    };
    window.addEventListener(TTS_START_EVENT, onOtherStart);
    return () => {
      window.removeEventListener(TTS_START_EVENT, onOtherStart);
    };
  }, [id]);

  // Stop speaking when this reader goes away mid-sentence (e.g. leaving the page)
  useEffect(() => () => {
    if (speakingRef.current) window.speechSynthesis.cancel();
  }, []);

  const handleSpeak = () => {
    const speech = toSpeechText(text, equations);
    if (!speech) return;

    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent(TTS_START_EVENT, { detail: id }));
    const run = ++runRef.current;

    const chunks = splitIntoChunks(speech);
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.pitch = 1;
      if (index === chunks.length - 1) {
        utterance.onend = () => {
          if (runRef.current === run) reset();
        };
      }
      window.speechSynthesis.speak(utterance);
    });
    speakingRef.current = true;
    setIsSpeaking(true);
    setIsPaused(false);
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
    reset();
  };

  if (compact) {
    return (
      <button
        onClick={isSpeaking ? handleStop : handleSpeak}
        className="flex items-center gap-1.5 text-sm font-heading font-bold text-text hover:text-primary transition-colors"
        aria-label={isSpeaking ? 'Stop reading' : label}
      >
        {isSpeaking ? <Square className="w-4 h-4" strokeWidth={2.5} /> : <Volume2 className="w-4 h-4" strokeWidth={2.5} />}
        {isSpeaking ? 'Stop' : label}
      </button>
    );
  }

  return (
    <div className="mt-6 flex gap-3">
      {!isSpeaking && (
        <button
          onClick={handleSpeak}
          className="btn-brutal flex items-center gap-2 bg-accent text-surface px-4 py-2 rounded-pill font-heading font-bold"
        >
          <Play className="w-4 h-4" strokeWidth={2.5} />
          {label}
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
