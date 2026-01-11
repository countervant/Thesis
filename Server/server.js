import express from 'express';
import dotenv from 'dotenv';

import {dbConnect} from './config/dbConnect.js';
import auth from './routes/auth.js';

const app = express();
dotenv.config();

const port = process.env.PORT || 5000;



app.use(express.json());

app.use('/api/auth', auth);
// Back-compat / alternate base path (some clients call this as /api/user/*)
app.use('/api/user', auth);

dbConnect();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});