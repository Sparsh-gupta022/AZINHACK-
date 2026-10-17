import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './src/db/db.js';

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to database:', err);
});
