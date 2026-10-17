import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apierror.js';
import { ApiResponse } from '../utils/apiresponse.js';
import { uploadToCloudinary } from '../config/cloudinary.config.js';
import { getFileCategory } from '../config/multer.config.js';
import { extractFromPdf } from '../services/fileProcessor.service.js';
import { transcribeAudio } from '../services/whisper.service.js';
import { sendToPythonBackend } from '../services/socket.service.js';
import path from 'path';

/**
 * @route   POST /api/upload
 * @desc    Authenticated endpoint - receives up to 5 files (image/audio/pdf),
 *          processes each based on type, uploads to Cloudinary, and forwards
 *          the processed payload to the Python backend via Socket.IO.
 */
export const uploadFiles = asyncHandler(async (req, res) => {
    const user = req.user;
    const files = req.files;
    const { sessionId } = req.body;

    if (!files || files.length === 0) {
        throw new ApiError(400, 'No files uploaded. Please attach at least one file.');
    }

    if (!sessionId) {
        throw new ApiError(400, 'sessionId is required. Open a socket connection first to get a sessionId.');
    }

    console.log(`[UPLOAD] Processing ${files.length} file(s) for user: ${user.username}`);

    const processedFiles = [];

    for (const file of files) {
        const category = getFileCategory(file.mimetype);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        const cloudinaryFileName = `${user.username}_${baseName}_${Date.now()}`;

        let cloudinaryResult = null;
        let processedData = {};

        try {
            // Step 1: Upload original file to Cloudinary
            const resourceType = category === 'image' ? 'image'
                : category === 'audio' ? 'video' // Cloudinary uses 'video' for audio
                : 'raw'; // PDFs go as raw

            cloudinaryResult = await uploadToCloudinary(
                file.buffer,
                cloudinaryFileName,
                `azinahack/${user.username}`,
                resourceType
            );

            console.log(`[UPLOAD] Uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);

            // Step 2: Process based on category
            switch (category) {
                case 'image': {
                    processedData = {
                        type: 'image',
                        originalName: file.originalname,
                        cloudinaryUrl: cloudinaryResult.secure_url,
                        publicId: cloudinaryResult.public_id,
                        mimeType: file.mimetype,
                        size: file.size
                    };
                    break;
                }

                case 'pdf': {
                    const pdfResult = await extractFromPdf(file.buffer);
                    processedData = {
                        type: 'pdf',
                        originalName: file.originalname,
                        cloudinaryUrl: cloudinaryResult.secure_url,
                        publicId: cloudinaryResult.public_id,
                        mimeType: file.mimetype,
                        size: file.size,
                        extractedText: pdfResult.text,
                        totalPages: pdfResult.totalPages
                    };
                    break;
                }

                case 'audio': {
                    const transcript = await transcribeAudio(file.buffer, file.originalname);
                    processedData = {
                        type: 'audio',
                        originalName: file.originalname,
                        cloudinaryUrl: cloudinaryResult.secure_url,
                        publicId: cloudinaryResult.public_id,
                        mimeType: file.mimetype,
                        size: file.size,
                        transcript
                    };
                    break;
                }

                default:
                    throw new ApiError(400, `Unsupported file category: ${category}`);
            }

            processedFiles.push(processedData);
        } catch (err) {
            console.error(`[UPLOAD] Error processing file ${file.originalname}:`, err.message);
            processedFiles.push({
                type: category || 'unknown',
                originalName: file.originalname,
                cloudinaryUrl: cloudinaryResult?.secure_url || null,
                error: err.message
            });
        }
    }

    // Step 3: Build the payload for Python backend
    const pythonPayload = {
        sessionId,
        userId: user._id.toString(),
        username: user.username,
        timestamp: new Date().toISOString(),
        files: processedFiles
    };

    // Step 4: Send to Python backend via Socket.IO
    const sent = sendToPythonBackend(sessionId, pythonPayload);

    if (!sent) {
        console.warn(`[UPLOAD] Could not send to Python backend - session ${sessionId} not found`);
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                sessionId,
                filesProcessed: processedFiles.length,
                files: processedFiles,
                sentToPython: sent
            },
            `${processedFiles.length} file(s) processed and ${sent ? 'sent to AI backend' : 'queued (socket session not found)'}`
        )
    );
});
