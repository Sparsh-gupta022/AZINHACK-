import express from 'express';
import { errorHandler } from './src/middlewares/error.middleware.js';
import authRoutes from './src/routes/auth.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
