import { Router } from 'express';
import {
    registerUser,
    verifyOtp,
    resendOtp,
    loginUser,
    getCurrentUser
} from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', loginUser);

// Protected routes
router.get('/me', verifyJWT, getCurrentUser);

export default router;
