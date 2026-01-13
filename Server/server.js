import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import {dbConnect} from './config/dbConnect.js';
import auth from './routes/auth.js';

const app = express();
dotenv.config();

const port = process.env.PORT || 5000;

// CORS configuration - allow Vite dev server on various ports
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth', auth);
// Back-compat / alternate base path (some clients call this as /api/user/*)
app.use('/api/user', auth);

dbConnect();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});