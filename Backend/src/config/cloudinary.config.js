import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The desired public_id / filename
 * @param {string} folder - Cloudinary folder path
 * @param {string} resourceType - 'image' | 'video' | 'raw' | 'auto'
 * @returns {Promise<object>} Cloudinary upload result
 */
export const uploadToCloudinary = (fileBuffer, fileName, folder = 'azinahack', resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: fileName,
                folder,
                resource_type: resourceType
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

/**
 * Delete a file from Cloudinary by public_id
 * @param {string} publicId
 * @param {string} resourceType
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
    return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export { cloudinary };
export default cloudinary;
