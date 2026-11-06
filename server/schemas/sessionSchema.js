const { Schema, model, Types } = require('mongoose');

// One screenshot uploaded during a session; OCR fills in ocrText (completed) or error (failed)
const imageSchema = new Schema({
    capturedAt: { type: Date, required: true },        // capture time sent by the extension
    receivedAt: { type: Date, default: Date.now },     // server time
    status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
    publicId: { type: String, required: true },        // Cloudinary public_id, kept for deletes and future image auth
    url: { type: String, required: true },             // Cloudinary secure_url, used directly by the website
    ocrText: { type: String, default: '' },            // set when completed
    error: { type: String }                            // set when failed
});

// A screenshot Gemini picked as representative of an interval
const keyImageSchema = new Schema({
    imageId: { type: Types.ObjectId, required: true }, // _id of an entry in images
    url: { type: String, required: true },             // Cloudinary link the website shows
    publicId: { type: String, required: true },
    capturedAt: { type: Date, required: true },
    caption: { type: String, default: '' }             // from Gemini: why this screenshot matters
}, { _id: false });

// An equation referenced from summary text by the placeholder {{id}}. The website shows `latex` (rendered)
// in place of the placeholder, and text-to-speech reads `spoken` instead. A placeholder on its own line
// is a displayed (block) equation; inside a sentence it's inline.
const equationSchema = new Schema({
    id: { type: String, required: true },              // e.g. "eq1"
    latex: { type: String, required: true },           // KaTeX-compatible LaTeX, without $ delimiters
    spoken: { type: String, required: true }           // how to read it aloud, e.g. "x squared plus one"
}, { _id: false });

// One topic-based section of the session, with boundaries chosen by Gemini
const intervalSummarySchema = new Schema({
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    heading: { type: String, required: true },
    summary: { type: String, required: true },         // Markdown; equations as {{id}} placeholders
    keyImages: [keyImageSchema]                        // 1–3 per interval
});

const sessionSchema = new Schema({
    userId: { type: Types.ObjectId, ref: 'user', required: true },
    title: { type: String, required: true, trim: true },

    sessionStatus: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    endReason: { type: String, enum: ['stopped', 'auto_closed', 'time_limit'] },
    lastActivityAt: { type: Date, default: Date.now }, // server time of the last screenshot

    images: [imageSchema],

    summaryStatus: {
        type: String,
        enum: ['not_started', 'generating', 'completed', 'failed'],
        default: 'not_started'
    },
    summaryRequestedAt: { type: Date },                // used to detect stuck generation
    summaryGeneratedAt: { type: Date },
    summaryError: { type: String },
    intervalSummaries: [intervalSummarySchema],
    completeSummary: { type: String, default: '' },    // Markdown summary of the whole session; equations as {{id}} placeholders
    equations: [equationSchema]                        // every equation used in intervalSummaries and completeSummary
}, { timestamps: true });

sessionSchema.index({ userId: 1, startedAt: -1 });

const SessionModel = model('session', sessionSchema);

module.exports = SessionModel;
