// A resized, compressed version of a Cloudinary image for thumbnails: Cloudinary applies the
// transformation in the URL path (width limit, automatic quality and format). Other URLs are returned as-is.
export function thumbnailUrl(url, width = 480) {
    if (!url || !url.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/w_${width},c_limit,q_auto,f_auto/`);
}
