// Session lifecycle and summary limits, read once from the environment (see .env.example at the repo root)

function numberFromEnv(name, fallback) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

module.exports = {
    // No screenshot for this long while in progress → the session counts as abandoned (auto-closed on summary request)
    staleSessionMs: numberFromEnv('STALE_SESSION_MS', 60_000),
    // A screenshot still 'processing' this long after it arrived is marked failed (its OCR job was lost)
    imageStuckMs: numberFromEnv('IMAGE_STUCK_MS', 5 * 60_000),
    // A summary still 'generating' this long after it was requested may be claimed again
    summaryStuckMs: numberFromEnv('SUMMARY_STUCK_MS', 10 * 60_000),
    // Longest a recording may run; the extension stops itself at this point
    maxSessionDurationMs: numberFromEnv('MAX_SESSION_DURATION_MS', 60 * 60_000),
    // Screenshots captured just before the time limit may arrive a little after it
    durationGraceMs: 15_000,
    // Backstop on the number of screenshots in one session
    maxImagesPerSession: numberFromEnv('MAX_IMAGES_PER_SESSION', 760)
};
