import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

let ioServer = null;
let pythonSocket = null;

// Map of sessionId -> { clientSocket, pythonSocket, userId, username }
const activeSessions = new Map();

/**
 * Initialize Socket.IO server and attach to HTTP server
 * @param {import('http').Server} httpServer
 */
export const initSocketServer = (httpServer) => {
    ioServer = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        maxHttpBufferSize: 50 * 1024 * 1024 // 50 MB
    });

    // Authenticate socket connections via JWT
    ioServer.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;

            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
            const user = await User.findById(decoded._id).select('-password -otp -otpExpiry');

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            next(new Error(`Authentication error: ${err.message}`));
        }
    });

    ioServer.on('connection', (clientSocket) => {
        const user = clientSocket.user;
        const sessionId = `session_${user._id}_${Date.now()}`;

        console.log(`[SOCKET] Client connected: ${user.username} (${user._id}) | Session: ${sessionId}`);

        // Connect to Python backend for this session
        const pythonUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
        const pySocket = ioClient(pythonUrl, {
            query: {
                sessionId,
                userId: user._id.toString(),
                username: user.username
            },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5
        });

        // Store session
        activeSessions.set(sessionId, {
            clientSocket,
            pythonSocket: pySocket,
            userId: user._id.toString(),
            username: user.username
        });

        // Send session ID to client
        clientSocket.emit('session:started', { sessionId });

        // --- Forward Python backend messages to client ---

        pySocket.on('connect', () => {
            console.log(`[SOCKET] Connected to Python backend for session: ${sessionId}`);
            clientSocket.emit('python:connected', { message: 'AI backend connected' });
        });

        pySocket.on('ai:response', (data) => {
            clientSocket.emit('ai:response', data);
        });

        pySocket.on('ai:stream', (data) => {
            clientSocket.emit('ai:stream', data);
        });

        pySocket.on('ai:done', (data) => {
            clientSocket.emit('ai:done', data);
        });

        pySocket.on('ai:error', (data) => {
            clientSocket.emit('ai:error', data);
        });

        pySocket.on('connect_error', (err) => {
            console.error(`[SOCKET] Python backend connection error for session ${sessionId}:`, err.message);
            clientSocket.emit('python:error', {
                message: 'Failed to connect to AI backend',
                error: err.message
            });
        });

        pySocket.on('disconnect', (reason) => {
            console.log(`[SOCKET] Python backend disconnected for session ${sessionId}: ${reason}`);
        });

        // --- Forward client messages to Python backend ---

        clientSocket.on('user:message', (data) => {
            pySocket.emit('user:message', {
                sessionId,
                userId: user._id.toString(),
                username: user.username,
                ...data
            });
        });

        clientSocket.on('user:exit', () => {
            console.log(`[SOCKET] User ${user.username} exited session: ${sessionId}`);
            pySocket.emit('user:exit', { sessionId });
            cleanup(sessionId);
        });

        // --- Handle disconnect ---

        clientSocket.on('disconnect', (reason) => {
            console.log(`[SOCKET] Client ${user.username} disconnected: ${reason}`);
            cleanup(sessionId);
        });
    });

    console.log('[SOCKET] Socket.IO server initialized');
    return ioServer;
};

/**
 * Send processed file data to Python backend for a specific session
 * @param {string} sessionId
 * @param {object} payload - The processed file payload
 */
export const sendToPythonBackend = (sessionId, payload) => {
    const session = activeSessions.get(sessionId);
    if (!session) {
        console.error(`[SOCKET] No active session found: ${sessionId}`);
        return false;
    }

    session.pythonSocket.emit('file:processed', payload);

    // Notify client that files were sent to AI
    session.clientSocket.emit('files:sent_to_ai', {
        message: 'Files processed and sent to AI backend',
        fileCount: payload.files?.length || 0
    });

    return true;
};

/**
 * Cleanup a session - disconnect python socket, remove from map
 */
const cleanup = (sessionId) => {
    const session = activeSessions.get(sessionId);
    if (session) {
        if (session.pythonSocket?.connected) {
            session.pythonSocket.disconnect();
        }
        activeSessions.delete(sessionId);
        console.log(`[SOCKET] Session cleaned up: ${sessionId}`);
    }
};

/**
 * Get active session by sessionId
 */
export const getSession = (sessionId) => activeSessions.get(sessionId);

/**
 * Get the Socket.IO server instance
 */
export const getIOServer = () => ioServer;

export default { initSocketServer, sendToPythonBackend, getSession, getIOServer };
