import express from 'express';


import mongoose from 'mongoose';
import dotenv from 'dotenv';

const app = express();
dotenv.config();

app.use(express.json());

const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT

mongoose.connect(mongoURI) .then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

async function adduser() {
    
}

app.listen(5000, () => {
  console.log(`Server running on port 5000`);
});