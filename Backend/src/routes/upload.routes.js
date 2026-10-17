import { Router } from 'express';
import { uploadFiles } from '../controllers/upload.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../config/multer.config.js';

const router = Router();

// POST /api/upload - Authenticated, up to 5 files
router.post(
    '/',
    verifyJWT,
    upload.array('files', 5),
    uploadFiles
);

export default router;
