import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apierror.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization') || req.headers['authorization'];
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
        } else if (authHeader) {
            token = authHeader.trim();
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            throw new ApiError(401, 'Unauthorized request: Token not found');
        }

        const decodedToken = jwt.verify(
            token,
            process.env.JWT_SECRET || 'default_jwt_secret'
        );

        const user = await User.findById(decodedToken?._id).select('-password -otp -otpExpiry');

        if (!user) {
            throw new ApiError(401, 'Invalid Access Token: User not found');
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Authentication token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new ApiError(401, 'Invalid authentication token');
        }
        throw new ApiError(error?.statusCode || 401, error?.message || 'Invalid access token');
    }
});

export const authenticateToken = verifyJWT;
export default verifyJWT;
