// Checks and repairs Gemini's structured summary, and maps its screenshot indices to stored screenshots.
// Pure: no I/O, so it can be unit-tested. Throws if the output can't be used (counts as a failed attempt).
//
//   output  — Gemini's parsed JSON: { equations: [{ id, latex, spoken }], completeSummary,
//             intervals: [{ startIndex, endIndex, heading, summary, keyImages: [{ index, caption }] }] }
//   entries — from buildSummaryInput: entries[index] = { imageId, capturedAt }
//   images  — the session's images (to copy each key screenshot's url/publicId/capturedAt)
// Returns { completeSummary, intervalSummaries, equations, warnings } in the shape of the session schema;
// `warnings` lists repairs worth logging.

const MAX_KEY_IMAGES = 3;
const PLACEHOLDER = /\{\{\s*([A-Za-z][\w-]*)\s*\}\}/g;
// LaTeX written straight into the text instead of through a placeholder (the frontend still renders
// $...$, but text-to-speech can't read it well, so it's worth a warning)
const STRAY_LATEX = /\$[^$\n]+\$|\\(frac|sqrt|sum|int|cdot|times|pm|leq?|geq?|alpha|beta|theta|lambda|pi|log|infty)\b/;
const FALLBACK_SPOKEN = 'the equation shown on screen';

const asText = (value) => (typeof value === 'string' ? value.trim() : '');
const asInteger = (value) => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : null);

// LaTeX is stored without delimiters; the frontend adds them
function normalizeLatex(latex) {
    return asText(latex)
        .replace(/^\$\$([\s\S]*)\$\$$/, '$1')
        .replace(/^\$([\s\S]*)\$$/, '$1')
        .replace(/^\\\[([\s\S]*)\\\]$/, '$1')
        .replace(/^\\\(([\s\S]*)\\\)$/, '$1')
        .trim();
}

// Spoken text is read aloud as-is, so strip anything that isn't words
function cleanSpoken(text) {
    return asText(text)
        .replace(/\$+/g, '')
        .replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/[{}\\^_]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Validates the equation list and rewrites placeholders in the summaries:
// - markdown texts keep {{id}} for known equations (normalized), unknown placeholders are removed
// - plain texts (headings, captions) get the spoken form instead, since they're shown as plain text
// Returns the rewriting functions and the final list of equations, in order of first use.
function prepareEquations(rawEquations, warnings) {
    const byId = new Map();
    for (const raw of Array.isArray(rawEquations) ? rawEquations : []) {
        const id = asText(raw?.id);
        const latex = normalizeLatex(raw?.latex);
        if (!id || !latex || byId.has(id)) continue;
        let spoken = cleanSpoken(raw?.spoken);
        if (!spoken) {
            warnings.push(`equation ${id} had no spoken form`);
            spoken = FALLBACK_SPOKEN;
        }
        byId.set(id, { id, latex, spoken });
    }

    const used = new Map(); // id -> equation, in order of first use
    const unknown = new Set();

    const rewriteMarkdown = (text) => {
        if (STRAY_LATEX.test(text)) warnings.push('summary text contains LaTeX outside a placeholder');
        return text.replace(PLACEHOLDER, (match, id) => {
            const equation = byId.get(id);
            if (!equation) {
                unknown.add(id);
                return '';
            }
            used.set(id, equation);
            return `{{${id}}}`;
        });
    };

    const rewritePlain = (text) => text
        .replace(PLACEHOLDER, (match, id) => {
            const equation = byId.get(id);
            if (!equation) unknown.add(id);
            return equation ? equation.spoken : '';
        })
        .replace(/\s{2,}/g, ' ')
        .trim();

    const finish = () => {
        if (unknown.size > 0) warnings.push(`removed placeholders with no equation: ${[...unknown].join(', ')}`);
        const unused = byId.size - used.size;
        if (unused > 0) warnings.push(`${unused} equation(s) defined but never used; dropped`);
        return [...used.values()];
    };

    return { rewriteMarkdown, rewritePlain, finish };
}

function buildIntervalSummaries(output, entries, images) {
    if (!output || typeof output !== 'object') throw new Error('Gemini output is not an object');
    if (entries.length === 0) throw new Error('No screenshots to map the summary onto');
    const warnings = [];
    const equationText = prepareEquations(output.equations, warnings);

    const completeSummary = asText(output.completeSummary);
    if (!completeSummary) throw new Error('Gemini returned an empty completeSummary');

    const lastIndex = entries.length - 1;
    const clamp = (index) => Math.min(Math.max(index, 0), lastIndex);

    // 1. Keep well-formed intervals, clamp their indices, and sort them
    const candidates = (Array.isArray(output.intervals) ? output.intervals : [])
        .map((interval) => {
            const start = asInteger(interval?.startIndex);
            const end = asInteger(interval?.endIndex);
            const heading = asText(interval?.heading);
            const summary = asText(interval?.summary);
            if (start === null || end === null || !heading || !summary) return null;
            return {
                start: clamp(Math.min(start, end)),
                end: clamp(Math.max(start, end)),
                heading,
                summary,
                keyImages: Array.isArray(interval.keyImages) ? interval.keyImages : []
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start || a.end - b.end);

    // 2. Make them contiguous: drop intervals already covered, trim overlaps, and fill gaps by
    //    extending the previous interval, so every index belongs to exactly one interval
    const intervals = [];
    let nextStart = 0;
    for (const interval of candidates) {
        if (interval.end < nextStart) continue;
        let start = Math.max(interval.start, nextStart);
        if (start > nextStart) {
            if (intervals.length > 0) intervals[intervals.length - 1].end = start - 1;
            else start = 0;
        }
        intervals.push({ ...interval, start });
        nextStart = interval.end + 1;
    }
    if (intervals.length === 0) throw new Error('Gemini returned no usable intervals');
    intervals[intervals.length - 1].end = lastIndex;

    // 3. Map to stored values, keeping 1-3 valid key screenshots per interval
    const imagesById = new Map((images || []).map((img) => [String(img._id), img]));
    const toKeyImage = (index, caption) => {
        const image = imagesById.get(String(entries[index].imageId));
        if (!image) return null;
        return { imageId: image._id, url: image.url, publicId: image.publicId, capturedAt: image.capturedAt, caption };
    };

    const intervalSummaries = intervals.map((interval) => {
        const seen = new Set();
        let keyImages = interval.keyImages
            .map((key) => ({ index: asInteger(key?.index), caption: asText(key?.caption) }))
            .filter(({ index }) => index !== null && index >= interval.start && index <= interval.end && !seen.has(index) && seen.add(index))
            .slice(0, MAX_KEY_IMAGES)
            .map(({ index, caption }) => toKeyImage(index, caption))
            .filter(Boolean);
        if (keyImages.length === 0) {
            const fallback = toKeyImage(Math.floor((interval.start + interval.end) / 2), '');
            keyImages = fallback ? [fallback] : [];
        }

        return {
            startTime: entries[interval.start].capturedAt,
            endTime: entries[interval.end].capturedAt,
            heading: equationText.rewritePlain(interval.heading),
            summary: equationText.rewriteMarkdown(interval.summary),
            keyImages: keyImages.map((key) => ({ ...key, caption: equationText.rewritePlain(key.caption) }))
        };
    });

    // 4. Equations: placeholders resolved in reading order (sections, then the complete summary)
    const finalCompleteSummary = equationText.rewriteMarkdown(completeSummary);
    const equations = equationText.finish();

    return { completeSummary: finalCompleteSummary, intervalSummaries, equations, warnings: [...new Set(warnings)] };
}

module.exports = { buildIntervalSummaries };
