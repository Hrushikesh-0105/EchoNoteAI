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

// Uploads an image buffer (public delivery, random public id) → { publicId, url }
function uploadImage(buffer, { folder }) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image', timeout: UPLOAD_TIMEOUT_MS },
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

module.exports = { screenshotFolder, uploadImage, deleteImage };
