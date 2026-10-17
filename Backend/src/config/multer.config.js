import multer from 'multer';
import path from 'path';
import { ApiError } from '../utils/apierror.js';

// Allowed MIME types grouped by category
const ALLOWED_MIME_TYPES = {
    image: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'image/bmp', 'image/tiff', 'image/svg+xml'
    ],
    audio: [
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac',
        'audio/aac', 'audio/mp4', 'audio/webm', 'audio/x-m4a'
    ],
    pdf: [
        'application/pdf'
    ]
};

const ALL_ALLOWED = [
    ...ALLOWED_MIME_TYPES.image,
    ...ALLOWED_MIME_TYPES.audio,
    ...ALLOWED_MIME_TYPES.pdf
];

/**
 * Determine file category from MIME type
 * @param {string} mimetype
 * @returns {'image'|'audio'|'pdf'|null}
 */
export const getFileCategory = (mimetype) => {
    if (ALLOWED_MIME_TYPES.image.includes(mimetype)) return 'image';
    if (ALLOWED_MIME_TYPES.audio.includes(mimetype)) return 'audio';
    if (ALLOWED_MIME_TYPES.pdf.includes(mimetype)) return 'pdf';
    return null;
};

// Use memory storage so we get Buffers (no temp files on disk)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (ALL_ALLOWED.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, `Unsupported file type: ${file.mimetype}. Allowed: images, audio, pdf`), false);
    }
};

/**
 * Multer upload instance
 * - max 5 files per request
 * - max 50MB per file
 * - field name: "files"
 */
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB per file
        files: 5
    }
});

export { ALLOWED_MIME_TYPES };
export default upload;
