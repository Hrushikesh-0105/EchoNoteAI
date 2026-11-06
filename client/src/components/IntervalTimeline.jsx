import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { thumbnailUrl } from '../utils/cloudinaryUrl';
import { offsetFrom } from '../utils/formatTime';
import SummaryMarkdown from './SummaryMarkdown';
import TextToSpeech from './TTS';
import ScreenshotLightbox from './ScreenshotLightbox';

// The session's topic sections in order: time range, heading, summary, read-aloud, and key screenshots
export default function IntervalTimeline({ intervals, equations, startedAt }) {
  // All key screenshots in one list, so the viewer can step through them across sections
  const keyImages = useMemo(() => intervals.flatMap((interval) => interval.keyImages), [intervals]);
  const [openIndex, setOpenIndex] = useState(null);

  let keyImageOffset = 0;

  return (
    <>
    <ol className="space-y-8">
      {intervals.map((interval) => {
        const firstKeyIndex = keyImageOffset;
        keyImageOffset += interval.keyImages.length;

        return (
          <li key={interval._id || interval.startTime} className="card-brutal p-6">
            <p className="flex items-center gap-1.5 text-sm font-bold text-text/60">
              <Clock className="w-4 h-4" strokeWidth={2.5} />
              {offsetFrom(startedAt, interval.startTime)} – {offsetFrom(startedAt, interval.endTime)}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-heading font-extrabold text-xl text-text">{interval.heading}</h2>
              <TextToSpeech text={`${interval.heading}. ${interval.summary}`} equations={equations} compact label="Read" />
            </div>

            <SummaryMarkdown text={interval.summary} equations={equations} className="mt-4" />

            {interval.keyImages.length > 0 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {interval.keyImages.map((image, index) => (
                  <button
                    key={image.imageId}
                    onClick={() => setOpenIndex(firstKeyIndex + index)}
                    className="border-4 border-text rounded-chunky overflow-hidden text-left bg-surface hover:shadow-brutal transition-shadow"
                  >
                    <img
                      src={thumbnailUrl(image.url, 480)}
                      alt={image.caption || `Key screenshot at ${offsetFrom(startedAt, image.capturedAt)}`}
                      loading="lazy"
                      className="w-full aspect-video object-cover bg-muted"
                    />
                    <div className="px-3 py-2 border-t-4 border-text">
                      <p className="text-xs font-bold text-text/60">{offsetFrom(startedAt, image.capturedAt)}</p>
                      {image.caption && <p className="text-sm text-text">{image.caption}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>

      {openIndex !== null && (
        <ScreenshotLightbox
          items={keyImages}
          index={openIndex}
          startedAt={startedAt}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
