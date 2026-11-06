import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { offsetFrom } from '../utils/formatTime';

// Full-size screenshot viewer. `items` are { url, capturedAt, caption? }; arrow keys move, Esc closes.
export default function ScreenshotLightbox({ items, index, startedAt, onIndexChange, onClose }) {
  const item = items[index];
  const hasPrevious = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft' && hasPrevious) onIndexChange(index - 1);
      else if (event.key === 'ArrowRight' && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, hasPrevious, hasNext, onIndexChange, onClose]);

  if (!item) return null;

  const navButton = 'btn-brutal bg-surface text-text rounded-pill p-2 disabled:opacity-30';

  return (
    <div
      className="fixed inset-0 z-50 bg-text/80 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot viewer"
    >
      <div className="card-brutal max-w-6xl w-full max-h-full flex flex-col overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b-4 border-text">
          <p className="font-heading font-bold text-text">
            {offsetFrom(startedAt, item.capturedAt)}
            <span className="ml-3 text-sm font-normal text-text/60">{index + 1} of {items.length}</span>
          </p>
          <button onClick={onClose} className="text-text hover:text-primary" aria-label="Close">
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative flex-1 min-h-0 bg-muted flex items-center justify-center">
          <img src={item.url} alt={item.caption || `Screenshot at ${offsetFrom(startedAt, item.capturedAt)}`} className="max-h-[75vh] w-auto object-contain" />
          <button className={`${navButton} absolute left-3`} onClick={() => onIndexChange(index - 1)} disabled={!hasPrevious} aria-label="Previous screenshot">
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button className={`${navButton} absolute right-3`} onClick={() => onIndexChange(index + 1)} disabled={!hasNext} aria-label="Next screenshot">
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {item.caption && (
          <p className="px-4 py-3 border-t-4 border-text text-text">{item.caption}</p>
        )}
      </div>
    </div>
  );
}
