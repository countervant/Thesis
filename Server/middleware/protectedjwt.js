import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';


export const protect = async (req, res, next) => {
  let token;

  if (!process.env.JWT_SECRET) {
    console.error('[auth] JWT_SECRET is not configured');
    return res.status(500).json({ message: 'Server authentication is not configured' });
  }

  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
    try{
    token = req.headers.authorization.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id)
      .select('-password')
      .maxTimeMS(8000)
      .lean();

    if (!req.user) {
      console.warn(`[auth] Token user not found for ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    return next();
    } catch (error){
      console.error(`[auth] Token failed for ${req.method} ${req.originalUrl}:`, error.message);
      return res.status(401).json({message: 'Not authorized, token failed'});
    }
}
console.warn(`[auth] Missing token for ${req.method} ${req.originalUrl}`);
return res.status(401).json({message: 'Not authorized, no token'});
}
