// Decides what POST /api/sessions/:id/summary should do. Pure: no I/O, so it can be unit-tested.
//
// Input `session` (as loaded by sessionService.getSummaryState):
//   { sessionStatus, lastActivityAt, summaryStatus, summaryRequestedAt, summaryError,
//     images: [{ _id, status, receivedAt, hasText }] }
// Returns { effects, response }:
//   effects  — database changes for the caller to apply, in order:
//     { type: 'completeSession', endReason: 'auto_closed' }
//     { type: 'failStuckImages', imageIds: [...] }
//     { type: 'markNoText' }
//     { type: 'claimAndPublish' }          (claim the summary atomically, then queue the Gemini job)
//   response — { status, body } to send, unless the caller's own effect handling overrides it
//     body.state is one of: recording | processing | generating | completed | failed
function decideSummaryAction(session, now, config, { retry = false } = {}) {
    const effects = [];
    const nowMs = now.getTime();

    // 1. Auto-close: a recording with no screenshot for a while was abandoned (no stop request arrived)
    let sessionStatus = session.sessionStatus;
    if (sessionStatus === 'in_progress') {
        const quietFor = nowMs - new Date(session.lastActivityAt).getTime();
        if (quietFor <= config.staleSessionMs) {
            return { effects, response: { status: 202, body: { state: 'recording', imageCounts: countImages(session.images) } } };
        }
        effects.push({ type: 'completeSession', endReason: 'auto_closed' });
        sessionStatus = 'completed';
    }

    // 2. Stuck images: OCR jobs that never finished are given up on, so the summary isn't blocked forever
    const stuckIds = session.images
        .filter((img) => img.status === 'processing' && nowMs - new Date(img.receivedAt).getTime() > config.imageStuckMs)
        .map((img) => img._id);
    const stuck = new Set(stuckIds.map(String));
    const images = session.images.map((img) =>
        stuck.has(String(img._id)) ? { ...img, status: 'failed', hasText: false } : img
    );
    if (stuckIds.length > 0) effects.push({ type: 'failStuckImages', imageIds: stuckIds });

    const imageCounts = countImages(images);

    // 3. OCR still running for some screenshots
    if (imageCounts.processing > 0) {
        return { effects, response: { status: 202, body: { state: 'processing', imageCounts } } };
    }

    // 4. Already summarized: the caller adds the summary itself to the body
    if (session.summaryStatus === 'completed') {
        return { effects, response: { status: 200, body: { state: 'completed', imageCounts } } };
    }

    // 5. Generation in progress (and not stuck)
    if (session.summaryStatus === 'generating') {
        const requestedAt = session.summaryRequestedAt ? new Date(session.summaryRequestedAt).getTime() : 0;
        if (nowMs - requestedAt <= config.summaryStuckMs) {
            return { effects, response: { status: 202, body: { state: 'generating', imageCounts } } };
        }
        // Stuck: fall through and claim it again
    }

    // A failed summary is only retried when the user explicitly asks, so polling doesn't loop on it
    if (session.summaryStatus === 'failed' && !retry) {
        return { effects, response: { status: 200, body: { state: 'failed', reason: session.summaryError || 'unknown', imageCounts } } };
    }

    // 6. Nothing to summarize: no screenshot produced any text
    if (!images.some((img) => img.status === 'completed' && img.hasText)) {
        effects.push({ type: 'markNoText' });
        return { effects, response: { status: 200, body: { state: 'failed', reason: 'no_text', imageCounts } } };
    }

    // 7. Start generation
    effects.push({ type: 'claimAndPublish' });
    return { effects, response: { status: 202, body: { state: 'generating', imageCounts } } };
}

function countImages(images) {
    const counts = { total: images.length, processing: 0, completed: 0, failed: 0 };
    for (const img of images) counts[img.status] += 1;
    return counts;
}

module.exports = { decideSummaryAction, countImages };
