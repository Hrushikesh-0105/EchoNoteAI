const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const UPLOAD_TIMEOUT_MS = 30_000;

// Top-level Cloudinary folder for this app's screenshots
function screenshotFolder(userId, sessionId) {
    const root = process.env.CLOUDINARY_COLLECTION_NAME || 'echonote';
    return `${root}/${userId}/${sessionId}`;
}

// Tag put on every screenshot of a session, so they can all be deleted together (works whatever the
// account's folder mode, and also catches uploads that never made it into the database)
function sessionTag(sessionId) {
    return `session_${sessionId}`;
}

// Uploads an image buffer (public delivery, random public id) → { publicId, url }
function uploadImage(buffer, { folder, tags = [] }) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, tags, resource_type: 'image', timeout: UPLOAD_TIMEOUT_MS },
            (error, result) => {
                if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
                resolve({ publicId: result.public_id, url: result.secure_url });
            }
        );
        stream.end(buffer);
    });
}

// Deletes an uploaded image; resolves to Cloudinary's result ('ok' or 'not found')
async function deleteImage(publicId) {
    const response = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return response.result;
}

// Deletes every screenshot of a session (by its tag, in pages of up to 1000) and purges them from the
// CDN cache, then removes the empty folder. Throws if the images couldn't be deleted; returns the count.
async function deleteSessionImages(sessionId, folder) {
    let deleted = 0;
    for (let page = 0; page < 20; page += 1) {
        const response = await cloudinary.api.delete_resources_by_tag(sessionTag(sessionId), {
            resource_type: 'image',
            invalidate: true
        });
        deleted += Object.values(response.deleted || {}).filter((result) => result === 'deleted').length;
        if (!response.partial) break;
    }
    // Best effort: the folder may not exist (no uploads, or dynamic folder mode) and holds nothing now
    await cloudinary.api.delete_folder(folder).catch(() => {});
    return deleted;
}

module.exports = { screenshotFolder, sessionTag, uploadImage, deleteImage, deleteSessionImages };
