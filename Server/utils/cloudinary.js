import { v2 as cloudinary } from "cloudinary";

/**
 * Checks whether Cloudinary environment credentials are configured.
 */
export const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );
};

let isInitialized = false;
const initCloudinary = () => {
  if (isInitialized || !isCloudinaryConfigured()) return;
  
  if (process.env.CLOUDINARY_URL) {
    try {
      const url = new URL(process.env.CLOUDINARY_URL);
      cloudinary.config({
        cloud_name: url.hostname,
        api_key: decodeURIComponent(url.username),
        api_secret: decodeURIComponent(url.password),
        secure: true,
      });
      isInitialized = true;
    } catch (error) {
      console.error("Invalid CLOUDINARY_URL format:", error.message);
    }
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    isInitialized = true;
  }
};

/**
 * Derives the Cloudinary resource_type ('image', 'video', or 'raw') from a MIME type.
 */
export const getCloudinaryResourceType = (mimeType = "") => {
  const normalized = String(mimeType).toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/") || normalized.startsWith("audio/")) return "video";
  return "raw";
};

/**
 * Uploads a binary buffer to Cloudinary using upload_stream.
 *
 * @param {Buffer} buffer - File buffer to upload
 * @param {Object} options
 * @param {string} [options.folder='clientra'] - Target folder path
 * @param {string} [options.publicId] - Specific public_id or filename
 * @param {string} [options.resourceType='auto'] - 'auto', 'image', 'video', or 'raw'
 * @param {Object} [options.extra] - Additional Cloudinary upload parameters
 * @returns {Promise<Object>} Upload result containing secure_url, public_id, resource_type, etc.
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  initCloudinary();
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env"
    );
  }

  const uploadOptions = {
    folder: options.folder || "clientra",
    resource_type: options.resourceType || "auto",
    overwrite: true,
    ...(options.publicId ? { public_id: options.publicId } : {}),
    ...(options.extra || {}),
  };

  // Automatically add a text watermark to video uploads.
  // Note: async is intentionally NOT set here. When async: true is used,
  // Cloudinary returns the URL before the transformation is applied, causing
  // the download fetch to fail (404 / not ready) for freshly uploaded videos.
  if (uploadOptions.resource_type === "video") {
    uploadOptions.transformation = uploadOptions.transformation || [];
    uploadOptions.transformation.push({
      overlay: {
        font_family: "Arial",
        font_size: 40,
        font_weight: "bold",
        text: "Clientra",
      },
      color: "white",
      gravity: "south_east",
      x: 20,
      y: 20,
    });
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

/**
 * Deletes an asset from Cloudinary by its public_id.
 *
 * @param {string} publicId - Cloudinary public_id
 * @param {string} [resourceType='image'] - 'image', 'video', or 'raw'
 */
export const deleteCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!isCloudinaryConfigured() || !publicId) return null;
  try {
    initCloudinary();
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error(`Failed to delete Cloudinary asset '${publicId}':`, error?.message || error);
    return null;
  }
};

export default cloudinary;
