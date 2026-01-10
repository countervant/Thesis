import express from 'express';
import dotenv from 'dotenv';
import {dbConnect} from './config/dbConnect.js';
const app = express();
dotenv.config();

app.use(express.json());

dbConnect();

const port = process.env.PORT



app.listen(5000, () => {
  console.log(`Server running on port 5000`);
});