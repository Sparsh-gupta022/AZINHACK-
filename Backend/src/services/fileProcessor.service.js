import { extractText, extractImages, getMeta } from 'unpdf';
import sharp from 'sharp';

/**
 * Extract text and images from a PDF buffer
 * @param {Buffer} pdfBuffer - The raw PDF file buffer
 * @returns {Promise<{ text: string, totalPages: number, images: Buffer[] }>}
 */
export const extractFromPdf = async (pdfBuffer) => {
    const uint8 = new Uint8Array(pdfBuffer);

    // Extract text
    let extractedText = '';
    try {
        const { text } = await extractText(uint8);
        extractedText = text;
    } catch (err) {
        console.warn('[PDF] Text extraction failed:', err.message);
    }

    // Get page count from metadata
    let totalPages = 0;
    try {
        const meta = await getMeta(uint8);
        totalPages = meta?.info?.numPages || 0;
    } catch (err) {
        console.warn('[PDF] Meta extraction failed:', err.message);
    }

    // Extract images
    let images = [];
    try {
        const result = await extractImages(uint8);
        images = result?.images || [];
    } catch (err) {
        console.warn('[PDF] Image extraction failed:', err.message);
    }

    return {
        text: extractedText,
        totalPages,
        images
    };
};

/**
 * Process an image buffer with Sharp (normalize, compress)
 * @param {Buffer} imageBuffer
 * @returns {Promise<Buffer>} Processed image buffer (JPEG)
 */
export const processImage = async (imageBuffer) => {
    return sharp(imageBuffer)
        .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
};

export default { extractFromPdf, processImage };
