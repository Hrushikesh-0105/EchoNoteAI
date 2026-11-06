import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { listSessionImages } from '../api/sessionsApi';
import { thumbnailUrl } from '../utils/cloudinaryUrl';
import { offsetFrom } from '../utils/formatTime';
import ScreenshotLightbox from './ScreenshotLightbox';

const PAGE_SIZE = 50;

// Every screenshot of a session with its time, loaded a page at a time. No OCR text is shown.
export default function ScreenshotGallery({ sessionId, startedAt }) {
  const { getToken } = useAuth();
  const [images, setImages] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);

  const loadPage = useCallback(async (offset) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const page = await listSessionImages(token, sessionId, { offset, limit: PAGE_SIZE });
      setImages((previous) => (offset === 0 ? page.images : [...previous, ...page.images]));
      setTotal(page.total);
    } catch (err) {
      console.error('Error loading screenshots:', err);
      setError('Could not load the screenshots.');
    } finally {
      setLoading(false);
    }
  }, [getToken, sessionId]);

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  if (total === 0) {
    return <p className="card-brutal p-6 text-center font-heading font-bold text-text">No screenshots in this session.</p>;
  }

  return (
    <div>
      {total !== null && (
        <p className="mb-4 text-sm text-text/60">Showing {images.length} of {total} screenshots</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <button
            key={image._id}
            onClick={() => setOpenIndex(index)}
            className="card-brutal overflow-hidden text-left hover:shadow-brutal-lg transition-shadow"
          >
            <img
              src={thumbnailUrl(image.url, 480)}
              alt={`Screenshot at ${offsetFrom(startedAt, image.capturedAt)}`}
              loading="lazy"
              className="w-full aspect-video object-cover bg-muted"
            />
            <p className="px-3 py-2 text-sm font-heading font-bold text-text border-t-4 border-text">
              {offsetFrom(startedAt, image.capturedAt)}
            </p>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 font-heading font-bold text-primary">{error}</p>}

      {total !== null && images.length < total && (
        <div className="mt-6 text-center">
          <button
            onClick={() => loadPage(images.length)}
            disabled={loading}
            className="btn-brutal bg-surface text-text px-6 py-2 rounded-pill font-heading font-bold"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
      {total === null && loading && <p className="font-heading font-bold text-text animate-pulse">Loading screenshots…</p>}

      {openIndex !== null && (
        <ScreenshotLightbox
          items={images}
          index={openIndex}
          startedAt={startedAt}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
