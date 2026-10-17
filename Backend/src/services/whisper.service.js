import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Temporary directory for audio processing
const TEMP_DIR = join(__dirname, '../../tmp');

/**
 * Transcribe an audio buffer using whisper.cpp via CLI
 * Falls back to a placeholder if whisper binary is not available.
 *
 * @param {Buffer} audioBuffer - The raw audio file buffer
 * @param {string} fileName - Original filename for the temp file
 * @returns {Promise<string>} The transcript text
 */
export const transcribeAudio = async (audioBuffer, fileName) => {
    // Ensure temp directory exists
    if (!existsSync(TEMP_DIR)) {
        await mkdir(TEMP_DIR, { recursive: true });
    }

    const tempFilePath = join(TEMP_DIR, `whisper_${Date.now()}_${fileName}`);

    try {
        // Write buffer to temp file
        await writeFile(tempFilePath, audioBuffer);

        // whisper.cpp model path from env
        const whisperModelPath = process.env.WHISPER_MODEL_PATH || '';
        const whisperBinaryPath = process.env.WHISPER_BINARY_PATH || 'whisper';

        if (!whisperModelPath) {
            console.warn('[WHISPER] WHISPER_MODEL_PATH not set. Returning placeholder transcript.');
            return `[Audio Transcript Placeholder] File: ${fileName} - Configure WHISPER_MODEL_PATH and WHISPER_BINARY_PATH in .env to enable real transcription.`;
        }

        // Run whisper.cpp CLI
        const { stdout, stderr } = await execAsync(
            `"${whisperBinaryPath}" -m "${whisperModelPath}" -f "${tempFilePath}" --output-txt --no-timestamps`,
            { timeout: 120000 } // 2 minute timeout
        );

        if (stderr && !stdout) {
            console.warn('[WHISPER] stderr:', stderr);
        }

        return stdout.trim() || `[Transcription completed but returned empty for: ${fileName}]`;
    } catch (error) {
        console.error('[WHISPER] Transcription error:', error.message);
        return `[Audio Transcription Failed] File: ${fileName} - Error: ${error.message}. Ensure whisper.cpp is installed and configured.`;
    } finally {
        // Clean up temp file
        try {
            await unlink(tempFilePath);
        } catch {
            // Ignore cleanup errors
        }
    }
};

export default transcribeAudio;
