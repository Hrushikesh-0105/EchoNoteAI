const mongoose = require("mongoose");
const SessionModel = require("../schemas/sessionSchema");
const ApiError = require("../utils/ApiError");

// Fields too large to send in session lists
const LIST_PROJECTION = {
  images: 0,
  intervalSummaries: 0,
  completeSummary: 0,
  equations: 0,
};

// Invalid ids can't match anything, so treat them as "not found" instead of letting a CastError become a 500
function assertValidId(id, label) {
  if (!mongoose.isValidObjectId(id))
    throw new ApiError(404, `${label} not found`);
}

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

// Number of images with a given status, as an aggregation expression
const countStatus = (status) => ({
  $size: {
    $filter: { input: "$images", cond: { $eq: ["$$this.status", status] } },
  },
});

// Starts a new recording session (sessionStatus defaults to in_progress)
async function createSession(userId, title) {
  return SessionModel.create({ userId, title });
}

// The user's sessions, newest first, without images or summaries; `before` (a Date) pages through older ones
async function listSessions(userId, { limit, before }) {
  const match = { userId: toObjectId(userId) };
  if (before) match.startedAt = { $lt: before };

  return SessionModel.aggregate([
    { $match: match },
    { $sort: { startedAt: -1 } },
    { $limit: limit },
    {
      $project: {
        title: 1,
        sessionStatus: 1,
        summaryStatus: 1,
        startedAt: 1,
        endedAt: 1,
        endReason: 1,
        lastActivityAt: 1,
        imageCount: { $size: "$images" },
      },
    },
  ]);
}

// A session owned by userId; throws 404 if it doesn't exist or belongs to someone else
async function findOwnedSession(userId, sessionId, projection) {
  assertValidId(sessionId, "Session");
  const session = await SessionModel.findOne(
    { _id: sessionId, userId },
    projection,
  ).lean();
  if (!session) throw new ApiError(404, "Session not found");
  return session;
}

// Session detail for the website: everything except the images array, plus per-status image counts
async function getSessionDetail(userId, sessionId) {
  assertValidId(sessionId, "Session");
  const [session] = await SessionModel.aggregate([
    { $match: { _id: toObjectId(sessionId), userId: toObjectId(userId) } },
    {
      $addFields: {
        imageCounts: {
          total: { $size: "$images" },
          processing: countStatus("processing"),
          completed: countStatus("completed"),
          failed: countStatus("failed"),
        },
      },
    },
    { $unset: "images" },
  ]);
  if (!session) throw new ApiError(404, "Session not found");
  return session;
}

// One page of a session's screenshots in capture order: only id, time and link (never OCR text or status)
async function listSessionImages(userId, sessionId, { offset, limit }) {
  assertValidId(sessionId, "Session");
  const [result] = await SessionModel.aggregate([
    { $match: { _id: toObjectId(sessionId), userId: toObjectId(userId) } },
    {
      $project: {
        _id: 0,
        total: { $size: "$images" },
        images: {
          $slice: [
            {
              $sortArray: {
                input: {
                  $map: {
                    input: "$images",
                    in: {
                      _id: "$$this._id",
                      capturedAt: "$$this.capturedAt",
                      url: "$$this.url",
                    },
                  },
                },
                sortBy: { capturedAt: 1 },
              },
            },
            offset,
            limit,
          ],
        },
      },
    },
  ]);
  if (!result) throw new ApiError(404, "Session not found");
  return result;
}

// What the summary gate needs: statuses and timestamps, and per image only whether OCR found text
// (the OCR text itself is never loaded here). Also the finished summary, for the 'completed' response.
async function getSummaryState(userId, sessionId) {
  assertValidId(sessionId, "Session");
  const [session] = await SessionModel.aggregate([
    { $match: { _id: toObjectId(sessionId), userId: toObjectId(userId) } },
    {
      $project: {
        title: 1,
        sessionStatus: 1,
        lastActivityAt: 1,
        summaryStatus: 1,
        summaryRequestedAt: 1,
        summaryError: 1,
        completeSummary: 1,
        intervalSummaries: 1,
        equations: 1,
        images: {
          $map: {
            input: "$images",
            in: {
              _id: "$$this._id",
              status: "$$this.status",
              receivedAt: "$$this.receivedAt",
              hasText: {
                $gt: [
                  { $strLenCP: { $trim: { input: { $ifNull: ["$$this.ocrText", ""] } } } },
                  0,
                ],
              },
            },
          },
        },
      },
    },
  ]);
  if (!session) throw new ApiError(404, "Session not found");
  return session;
}

// Atomically appends a screenshot to an in-progress session; returns false if the session is missing or already completed
async function pushImage(sessionId, image) {
  const result = await SessionModel.updateOne(
    { _id: sessionId, sessionStatus: "in_progress" },
    { $push: { images: image }, $set: { lastActivityAt: new Date() } },
    { runValidators: true },
  );
  return result.matchedCount === 1;
}

// One image of a session (no ownership check: used by the OCR worker); null if the session or image doesn't exist
async function findImage(sessionId, imageId) {
  if (!mongoose.isValidObjectId(sessionId) || !mongoose.isValidObjectId(imageId))
    return null;
  const session = await SessionModel.findOne(
    { _id: sessionId, "images._id": imageId },
    { "images.$": 1 },
  ).lean();
  return session?.images?.[0] ?? null;
}

// Records an OCR outcome on one image, only while it is still processing (makes repeated deliveries harmless);
// fields: { status: 'completed' | 'failed', ocrText?, error? }. Returns false if nothing was updated.
async function setImageResult(sessionId, imageId, fields) {
  const update = {};
  for (const [key, value] of Object.entries(fields)) {
    update[`images.$.${key}`] = value;
  }

  const result = await SessionModel.updateOne(
    {
      _id: sessionId,
      images: { $elemMatch: { _id: imageId, status: "processing" } },
    },
    { $set: update },
    { runValidators: true },
  );
  return result.modifiedCount === 1;
}

// Marks the given images failed with `error`, but only those still processing
async function failProcessingImages(sessionId, imageIds, error) {
  await SessionModel.updateOne(
    { _id: sessionId },
    {
      $set: {
        "images.$[img].status": "failed",
        "images.$[img].error": error,
      },
    },
    {
      arrayFilters: [
        { "img._id": { $in: imageIds.map(toObjectId) }, "img.status": "processing" },
      ],
    },
  );
}

// Marks an in-progress session completed; idempotent — returns the updated session, or null if it was already completed
async function completeSession(sessionId, endReason) {
  return SessionModel.findOneAndUpdate(
    { _id: sessionId, sessionStatus: "in_progress" },
    { $set: { sessionStatus: "completed", endedAt: new Date(), endReason } },
    { new: true, runValidators: true, projection: LIST_PROJECTION },
  ).lean();
}

// Records that there is nothing to summarize (no screenshot produced text), unless a summary is already underway
async function markSummaryNoText(sessionId) {
  await SessionModel.updateOne(
    { _id: sessionId, summaryStatus: { $in: ["not_started", "failed"] } },
    { $set: { summaryStatus: "failed", summaryError: "no_text" } },
  );
}

// Atomically claims summary generation for a completed session. Only one caller can win: the session
// must be not started, failed, or stuck in 'generating' for longer than stuckMs. Returns true if claimed.
async function claimSummary(sessionId, now, stuckMs) {
  const claimed = await SessionModel.findOneAndUpdate(
    {
      _id: sessionId,
      sessionStatus: "completed",
      $or: [
        { summaryStatus: { $in: ["not_started", "failed"] } },
        {
          summaryStatus: "generating",
          summaryRequestedAt: { $lt: new Date(now.getTime() - stuckMs) },
        },
      ],
    },
    {
      $set: { summaryStatus: "generating", summaryRequestedAt: now },
      $unset: { summaryError: "" },
    },
    { new: true, projection: { _id: 1 } },
  ).lean();
  return Boolean(claimed);
}

// Gives up a claim when the summary job couldn't be queued, so a later request can try again
async function releaseSummaryClaim(sessionId, error) {
  await SessionModel.updateOne(
    { _id: sessionId, summaryStatus: "generating" },
    { $set: { summaryStatus: "failed", summaryError: error } },
  );
}

// Everything the summary worker needs, including all images with their OCR text (no ownership check:
// used by the worker); null if the session doesn't exist
async function loadSessionForSummary(sessionId) {
  if (!mongoose.isValidObjectId(sessionId)) return null;
  return SessionModel.findById(sessionId, {
    title: 1,
    startedAt: 1,
    summaryStatus: 1,
    images: 1,
  }).lean();
}

// Stores a finished summary, but only while the session is still 'generating' (a stale or duplicate
// job can't overwrite a newer result). Returns true if saved.
async function saveSummary(
  sessionId,
  { completeSummary, intervalSummaries, equations },
) {
  const result = await SessionModel.updateOne(
    { _id: sessionId, summaryStatus: "generating" },
    {
      $set: {
        completeSummary,
        intervalSummaries,
        equations,
        summaryStatus: "completed",
        summaryGeneratedAt: new Date(),
      },
      $unset: { summaryError: "" },
    },
    { runValidators: true },
  );
  return result.modifiedCount === 1;
}

// Records that summary generation failed for good (the user can retry from the website)
async function failSummary(sessionId, error) {
  await SessionModel.updateOne(
    { _id: sessionId, summaryStatus: "generating" },
    { $set: { summaryStatus: "failed", summaryError: error } },
  );
}

// Deletes a completed session owned by userId (with its images and summaries, which live inside it).
// Returns false if nothing was deleted (missing, someone else's, or still recording).
async function deleteCompletedSession(userId, sessionId) {
  const result = await SessionModel.deleteOne({
    _id: sessionId,
    userId,
    sessionStatus: "completed",
  });
  return result.deletedCount === 1;
}

module.exports = {
  createSession,
  deleteCompletedSession,
  listSessions,
  findOwnedSession,
  getSessionDetail,
  listSessionImages,
  getSummaryState,
  pushImage,
  findImage,
  setImageResult,
  failProcessingImages,
  completeSession,
  markSummaryNoText,
  claimSummary,
  releaseSummaryClaim,
  loadSessionForSummary,
  saveSummary,
  failSummary,
};
