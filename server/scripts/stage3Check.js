// TEMPORARY Stage 3 check — deleted after running. Creates two clearly-labelled test users and their
// sessions in the real database (the worker reads from it), uploads a few test images to Cloudinary,
// and removes all of it at the end.
require('dotenv').config();
const assert = require('assert');
const express = require('express');
const mongoose = require('mongoose');
const SessionModel = require('../schemas/sessionSchema');
const UserModel = require('../schemas/userSchema');
const queue = require('../queue/connection');
const sessionController = require('../controllers/sessionController');
const { errorHandler } = require('../middlewares/errorHandler');
const { signExtensionToken } = require('../services/extensionTokenService');
const { upsertUserFromClerk } = require('../services/userService');
const { deleteImage } = require('../services/external/cloudinaryClient');

const API = 'http://localhost:3000';
const USER = 'stage3-check@example.invalid';
const OTHER = 'stage3-other@example.invalid';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, condition, detail = '') {
    results.push({ name, ok: Boolean(condition) });
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

// Website routes need a Clerk token; mount the same controllers behind a stand-in that sets the user
function startWebsiteApp() {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.userEmail = req.headers['x-test-user']; next(); });
    app.get('/api/sessions', sessionController.listSessions);
    app.get('/api/sessions/:sessionId', sessionController.getSession);
    app.get('/api/sessions/:sessionId/images', sessionController.listSessionImages);
    app.post('/api/sessions/:sessionId/summary', sessionController.requestSummary);
    app.use(errorHandler);
    return new Promise((resolve) => { const server = app.listen(0, () => resolve(server)); });
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    await queue.connect();
    const web = await startWebsiteApp();
    const WEB = `http://localhost:${web.address().port}`;
    const sessionIds = [];

    const asUser = (email) => ({ 'x-test-user': email });
    const webGet = (path, email = USER) => fetch(`${WEB}${path}`, { headers: asUser(email) });
    const summary = (id, body = {}, email = USER) => fetch(`${WEB}/api/sessions/${id}/summary`, {
        method: 'POST', headers: { ...asUser(email), 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });

    try {
        const user = await upsertUserFromClerk(USER, 'Stage3 Check');
        await upsertUserFromClerk(OTHER, 'Stage3 Other');
        const token = signExtensionToken({ email: USER, firstName: 'Stage3 Check' });
        const otherToken = signExtensionToken({ email: OTHER, firstName: 'Stage3 Other' });
        const ext = (t = token) => ({ Authorization: `Bearer ${t}` });

        // Test images with readable text
        const images = [];
        for (const text of ['Topic One Binary Search', 'Topic One Sorted Arrays', 'Topic Two Hash Tables']) {
            const r = await fetch(`https://placehold.co/900x250/jpg?text=${encodeURIComponent(text)}&font=roboto`);
            images.push(new Blob([await r.arrayBuffer()], { type: 'image/jpeg' }));
        }
        const upload = (id, { blob = images[0], capturedAt = Date.now(), t = token, field = 'image' } = {}) => {
            const form = new FormData();
            if (blob) form.append(field, blob, 'shot.jpg');
            if (capturedAt !== undefined) form.append('capturedAt', String(capturedAt));
            return fetch(`${API}/api/sessions/${id}/screenshots`, { method: 'POST', headers: ext(t), body: form });
        };
        const createSession = async (title) => {
            const r = await fetch(`${API}/api/sessions`, {
                method: 'POST', headers: { ...ext(), 'Content-Type': 'application/json' }, body: JSON.stringify({ title })
            });
            const body = await r.json();
            if (body.session?._id) sessionIds.push(body.session._id);
            return { r, body };
        };

        // ---- Real routes reject requests without a token
        for (const [method, path] of [['GET', '/api/sessions/x/images'], ['POST', '/api/sessions/x/stop'], ['POST', '/api/sessions/x/screenshots']]) {
            const r = await fetch(`${API}${path}`, { method });
            check(`${method} ${path} without token -> 401`, r.status === 401, r.status);
        }

        // ---- Create
        const { r: created, body: createdBody } = await createSession('STAGE 3 CHECK main');
        const S = createdBody.session._id;
        check('create -> 201 with limits.maxDurationMs', created.status === 201 && createdBody.limits?.maxDurationMs === 3600000, JSON.stringify(createdBody.limits));

        // ---- Upload validation
        let r = await upload(S, { blob: null });
        check('upload without image -> 400', r.status === 400, r.status);
        r = await upload(S, { capturedAt: 'yesterday' });
        check('upload with invalid capturedAt -> 400', r.status === 400, r.status);
        r = await upload(S, { blob: new Blob(['hello'], { type: 'text/plain' }) });
        check('upload of a text file -> 400', r.status === 400, `${r.status} ${(await r.json()).code}`);
        r = await upload(S, { t: otherToken });
        check("upload to another user's session -> 404", r.status === 404, r.status);

        // ---- Upload three real screenshots
        const base = Date.now();
        for (let i = 0; i < 3; i++) {
            r = await upload(S, { blob: images[i], capturedAt: base + i * 5000 });
            const body = await r.json();
            check(`upload screenshot ${i + 1} -> 202 processing`, r.status === 202 && body.status === 'processing', r.status);
        }

        // ---- Summary while recording (recent activity)
        r = await summary(S);
        let body = await r.json();
        check('summary while recording -> 202 recording', r.status === 202 && body.state === 'recording', body.state);

        // ---- Stop (twice), then upload after stop
        r = await fetch(`${API}/api/sessions/${S}/stop`, { method: 'POST', headers: ext() });
        body = await r.json();
        check('stop -> 200 completed/stopped', r.status === 200 && body.sessionStatus === 'completed' && body.endReason === 'stopped', JSON.stringify(body));
        r = await fetch(`${API}/api/sessions/${S}/stop`, { method: 'POST', headers: ext() });
        check('stop again -> 200 (idempotent)', r.status === 200, r.status);
        r = await fetch(`${API}/api/sessions/${S}/stop`, { method: 'POST', headers: ext(otherToken) });
        check("stop another user's session -> 404", r.status === 404, r.status);
        r = await upload(S);
        body = await r.json();
        check('upload after stop -> 409 SESSION_COMPLETED', r.status === 409 && body.code === 'SESSION_COMPLETED', `${r.status} ${body.code}`);

        // ---- Summary: processing until OCR finishes, then generating (summary worker is still a stub)
        const states = [];
        for (let i = 0; i < 30; i++) {
            r = await summary(S);
            body = await r.json();
            if (states[states.length - 1] !== body.state) states.push(body.state);
            if (body.state === 'generating') break;
            await sleep(1000);
        }
        check('summary after stop -> processing… then generating', states[states.length - 1] === 'generating' && states.every((s) => ['processing', 'generating'].includes(s)), states.join(' -> '));
        const afterClaim = await SessionModel.findById(S, { summaryStatus: 1, summaryRequestedAt: 1, 'images.status': 1, 'images.ocrText': 1 }).lean();
        check('all 3 screenshots OCRed with text', afterClaim.images.every((img) => img.status === 'completed' && img.ocrText.trim()), afterClaim.images.map((i) => JSON.stringify(i.ocrText.trim().slice(0, 25))).join(', '));
        r = await summary(S);
        body = await r.json();
        check('summary again while generating -> 202 generating (no new claim)', r.status === 202 && body.state === 'generating', body.state);
        const notReclaimed = await SessionModel.findById(S, { summaryRequestedAt: 1 }).lean();
        check('repeat request did not re-claim', String(notReclaimed.summaryRequestedAt) === String(afterClaim.summaryRequestedAt));

        // ---- Website reads
        r = await webGet('/api/sessions');
        body = await r.json();
        const listed = body.sessions.find((s) => String(s._id) === S);
        check('list -> includes session with imageCount 3, no images field', listed?.imageCount === 3 && listed.images === undefined, JSON.stringify({ imageCount: listed?.imageCount, nextBefore: body.nextBefore }));
        r = await webGet(`/api/sessions/${S}`);
        body = await r.json();
        check('detail -> imageCounts {3,0,3,0}, no images', JSON.stringify(body.session.imageCounts) === JSON.stringify({ total: 3, processing: 0, completed: 3, failed: 0 }) && body.session.images === undefined, JSON.stringify(body.session.imageCounts));
        r = await webGet(`/api/sessions/${S}/images`);
        body = await r.json();
        const keys = [...new Set(body.images.flatMap((img) => Object.keys(img)))].sort().join(',');
        const sorted = body.images.every((img, i, all) => i === 0 || new Date(all[i - 1].capturedAt) <= new Date(img.capturedAt));
        check('images -> 3, sorted, only _id/capturedAt/url', body.total === 3 && body.images.length === 3 && sorted && keys === '_id,capturedAt,url', keys);
        r = await webGet(`/api/sessions/${S}/images?offset=1&limit=1`);
        body = await r.json();
        check('images page offset=1 limit=1 -> 1 of 3', body.images.length === 1 && body.total === 3);
        for (const path of [`/api/sessions/${S}`, `/api/sessions/${S}/images`]) {
            r = await webGet(path, OTHER);
            check(`other user GET ${path.replace(S, ':id')} -> 404`, r.status === 404, r.status);
        }
        r = await summary(S, {}, OTHER);
        check('other user summary -> 404', r.status === 404, r.status);
        r = await webGet('/api/sessions/not-an-id');
        check('invalid id -> 404', r.status === 404, r.status);

        // ---- Generating but stuck -> claimed again
        await SessionModel.updateOne({ _id: S }, { $set: { summaryRequestedAt: new Date(Date.now() - 11 * 60_000) } });
        r = await summary(S);
        body = await r.json();
        const reclaimed = await SessionModel.findById(S, { summaryRequestedAt: 1 }).lean();
        check('stuck generating -> re-claimed (202 generating, new requestedAt)', body.state === 'generating' && Date.now() - reclaimed.summaryRequestedAt < 10_000);

        // ---- Completed
        await SessionModel.updateOne({ _id: S }, { $set: { summaryStatus: 'completed', completeSummary: '# Test summary', intervalSummaries: [] } });
        r = await summary(S);
        body = await r.json();
        check('completed -> 200 with completeSummary', r.status === 200 && body.state === 'completed' && body.completeSummary === '# Test summary', body.state);

        // ---- Failed: no retry vs retry
        await SessionModel.updateOne({ _id: S }, { $set: { summaryStatus: 'failed', summaryError: 'gemini_error' } });
        r = await summary(S);
        body = await r.json();
        check('failed without retry -> 200 failed, reason kept', r.status === 200 && body.state === 'failed' && body.reason === 'gemini_error', body.reason);
        r = await summary(S, { retry: true });
        body = await r.json();
        check('failed with retry -> 202 generating', r.status === 202 && body.state === 'generating', body.state);

        // ---- Abandoned session: stale -> auto-closed; stuck image -> failed; no text -> failed no_text
        const { body: b2 } = await createSession('STAGE 3 CHECK abandoned');
        const S2 = b2.session._id;
        await SessionModel.updateOne({ _id: S2 }, {
            $push: { images: { capturedAt: new Date(), receivedAt: new Date(Date.now() - 6 * 60_000), status: 'processing', publicId: 'check/none', url: 'https://example.invalid/x.jpg' } },
            $set: { lastActivityAt: new Date(Date.now() - 2 * 60_000) }
        });
        r = await summary(S2);
        body = await r.json();
        const s2 = await SessionModel.findById(S2).lean();
        check('stale session -> auto-closed (endReason auto_closed)', s2.sessionStatus === 'completed' && s2.endReason === 'auto_closed', s2.endReason);
        check('stuck image -> failed with error timeout', s2.images[0].status === 'failed' && s2.images[0].error === 'timeout', s2.images[0].error);
        check('no text -> 200 failed no_text', r.status === 200 && body.state === 'failed' && body.reason === 'no_text' && s2.summaryError === 'no_text', body.reason);

        // ---- Images still processing (not stuck)
        const { body: b3 } = await createSession('STAGE 3 CHECK processing');
        const S3 = b3.session._id;
        await SessionModel.updateOne({ _id: S3 }, {
            $push: { images: { capturedAt: new Date(), status: 'processing', publicId: 'check/none', url: 'https://example.invalid/x.jpg' } },
            $set: { sessionStatus: 'completed', endReason: 'stopped', endedAt: new Date() }
        });
        r = await summary(S3);
        body = await r.json();
        check('image still processing -> 202 processing with counts', r.status === 202 && body.state === 'processing' && body.imageCounts.processing === 1, JSON.stringify(body.imageCounts));

        // ---- Time limit
        const { body: b4 } = await createSession('STAGE 3 CHECK time limit');
        const S4 = b4.session._id;
        await SessionModel.updateOne({ _id: S4 }, { $set: { startedAt: new Date(Date.now() - 61 * 60_000) } });
        r = await upload(S4);
        body = await r.json();
        const s4 = await SessionModel.findById(S4, { sessionStatus: 1, endReason: 1, images: 1 }).lean();
        check('upload past 1 hour -> 409 SESSION_TIME_LIMIT, session completed time_limit', r.status === 409 && body.code === 'SESSION_TIME_LIMIT' && s4.endReason === 'time_limit' && s4.images.length === 0, `${body.code} ${s4.endReason}`);

        void user;
    } finally {
        // ---- Clean up: Cloudinary images, sessions, users
        const sessions = await SessionModel.find({ _id: { $in: sessionIds } }, { 'images.publicId': 1 }).lean();
        let deleted = 0;
        for (const s of sessions) {
            for (const img of s.images) {
                if (img.publicId.startsWith('check/')) continue;
                if ((await deleteImage(img.publicId).catch(() => 'error')) === 'ok') deleted++;
            }
        }
        const removedSessions = await SessionModel.deleteMany({ _id: { $in: sessionIds } });
        const removedUsers = await UserModel.deleteMany({ email: { $in: [USER, OTHER] } });
        console.log(`cleanup: ${deleted} Cloudinary image(s), ${removedSessions.deletedCount} session(s), ${removedUsers.deletedCount} user(s) deleted`);
        web.close();
        await queue.close();
        await mongoose.disconnect();
    }

    const failed = results.filter((x) => !x.ok).length;
    console.log(failed ? `${failed} CHECK(S) FAILED` : `ALL ${results.length} CHECKS PASSED`);
}

main().catch((err) => { console.error('check script crashed:', err); process.exitCode = 1; });
