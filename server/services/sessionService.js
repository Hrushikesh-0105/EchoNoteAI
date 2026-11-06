const mongoose = require("mongoose");
const SessionModel = require("../schemas/sessionSchema");
const ApiError = require("../utils/ApiError");

// Fields too large to send in session lists
const LIST_PROJECTION = { images: 0, intervalSummaries: 0, completeSummary: 0 };

// Invalid ids can't match anything, so treat them as "not found" instead of letting a CastError become a 500
function assertValidId(id, label) {
  if (!mongoose.isValidObjectId(id))
    throw new ApiError(404, `${label} not found`);
}

// Starts a new recording session (sessionStatus defaults to in_progress)
async function createSession(userId, title) {
  return SessionModel.create({ userId, title });
}

// The user's sessions, newest first, without images or summaries
async function listSessions(userId) {
  return SessionModel.find({ userId }, LIST_PROJECTION)
    .sort({ startedAt: -1 })
    .lean();
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

// Atomically appends a screenshot to an in-progress session; returns false if the session is missing or already completed
async function pushImage(sessionId, image) {
  const result = await SessionModel.updateOne(
    { _id: sessionId, sessionStatus: "in_progress" },
    { $push: { images: image }, $set: { lastActivityAt: new Date() } },
    { runValidators: true },
  );
  return result.matchedCount === 1;
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

// Marks an in-progress session completed; idempotent — returns the updated session, or null if it was already completed
async function completeSession(sessionId, endReason) {
  return SessionModel.findOneAndUpdate(
    { _id: sessionId, sessionStatus: "in_progress" },
    { $set: { sessionStatus: "completed", endedAt: new Date(), endReason } },
    { new: true, runValidators: true, projection: LIST_PROJECTION },
  ).lean();
}

module.exports = {
  createSession,
  listSessions,
  findOwnedSession,
  pushImage,
  setImageResult,
  completeSession,
};
