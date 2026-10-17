import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apierror.js';
import { ApiResponse } from '../utils/apiresponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendOtpEmail } from '../utils/mail.js';

// Helper function to generate a 6-digit numeric OTP
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register user and send verification OTP email
 */
export const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
        throw new ApiError(400, 'Username, email, and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    const existingUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
    });

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    if (existingUser) {
        if (existingUser.isVerified) {
            throw new ApiError(409, 'User with this email or username already exists');
        }

        // Unverified user requesting new registration/OTP
        existingUser.password = password;
        existingUser.username = normalizedUsername;
        existingUser.role = role || existingUser.role;
        existingUser.otp = otp;
        existingUser.otpExpiry = otpExpiry;
        await existingUser.save();

        await sendOtpEmail(normalizedEmail, otp, normalizedUsername);

        return res.status(200).json(
            new ApiResponse(
                200,
                { email: normalizedEmail, username: normalizedUsername },
                'Account unverified. A new verification OTP has been sent to your email.'
            )
        );
    }

    const newUser = new User({
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        role: role || 'user',
        isVerified: false,
        otp,
        otpExpiry
    });

    await newUser.save();
    await sendOtpEmail(normalizedEmail, otp, newUser.username);

    return res.status(201).json(
        new ApiResponse(
            201,
            { email: newUser.email, username: newUser.username },
            'Registration successful. An OTP has been sent to your email for verification.'
        )
    );
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and return authentication JWT token
 */
export const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, 'Email and OTP are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new ApiError(404, 'User not found with this email');
    }

    if (user.isVerified) {
        throw new ApiError(400, 'Account is already verified. Please login.');
    }

    if (!user.otp || user.otp !== String(otp).trim()) {
        throw new ApiError(400, 'Invalid OTP provided');
    }

    if (new Date() > new Date(user.otpExpiry)) {
        throw new ApiError(400, 'OTP has expired. Please request a new one.');
    }

    // Approve user and clear OTP fields
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Generate token
    const token = user.generateToken();

    const userData = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
    };

    return res.status(200).json(
        new ApiResponse(
            200,
            { user: userData, token },
            'Account successfully verified and authenticated'
        )
    );
});

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP to registered email
 */
export const resendOtp = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, 'Email is required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (user.isVerified) {
        throw new ApiError(400, 'Account is already verified. Please login.');
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail(normalizedEmail, otp, user.username);

    return res.status(200).json(
        new ApiResponse(
            200,
            { email: normalizedEmail },
            'A new verification OTP has been sent to your email.'
        )
    );
});

/**
 * @route   POST /api/auth/login
 * @desc    Login with email and password, returns JWT token
 */
export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        throw new ApiError(404, 'User does not exist with this email');
    }

    if (!user.isVerified) {
        throw new ApiError(403, 'Account is not verified. Please verify your OTP sent during registration.');
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid user credentials');
    }

    const token = user.generateToken();

    const userData = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
    };

    return res.status(200).json(
        new ApiResponse(
            200,
            { user: userData, token },
            'User logged in successfully'
        )
    );
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile (Protected route)
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            'Current user profile retrieved successfully'
        )
    );
});
