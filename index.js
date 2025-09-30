require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const recipeRoutes = require('./src/routes/recipeRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const userRoutes = require('./src/routes/userRoutes');

connectDB();

const app = express();

// Middleware para parsear JSON y datos de formularios (esto ya lo tenías y está bien)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- PIEZA #1: LOGGER DE PETICIONES (AÑADIDO) ---
// Este middleware se ejecutará por cada petición que llegue a tu servidor.
app.use((req, res, next) => {
  console.log(`Petición Recibida: ${req.method} ${req.originalUrl}`);
  next();
});

// Ruta de prueba (esto ya lo tenías)
app.get('/', (req, res) => {
  res.send('La API está funcionando...');
});

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);


const notFound = (req, res, next) => {
  const error = new Error(`No Encontrado - ${req.originalUrl}`);
  res.status(404);
  next(error);
};


const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  
  console.error('--- ERROR DETECTADO POR EL MANEJADOR GLOBAL ---');
  console.error(err.stack); 
  
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

app.use(notFound);
app.use(errorHandler); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Servidor corriendo en el puerto ${PORT}`),
);