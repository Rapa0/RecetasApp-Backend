

const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const asyncHandler = require('express-async-handler'); 

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {

      token = req.headers.authorization.split(' ')[1];


      const decoded = jwt.verify(token, process.env.JWT_SECRET);


      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        res.status(401);
        throw new Error('No se encontró el usuario para este token');
      }

      next(); 

    } catch (error) {

      console.error('Error de autenticación en el token:', error.message); 
      res.status(401);
      throw new Error('No autorizado, token fallido');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('No autorizado, no se proporcionó un token');
  }
});

module.exports = { protect };