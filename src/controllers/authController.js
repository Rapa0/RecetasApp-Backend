const User = require('../models/User.js');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');

// --- FUNCIÓN AUXILIAR PARA GENERAR TOKEN DE SESIÓN ---
const generateToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// --- NUEVA FUNCIÓN DE REGISTRO (SIN GUARDAR EN DB) ---
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // 1. Verificar si el email o username ya existen EN UN USUARIO VERIFICADO
    const userExists = await User.findOne({ 
        $or: [{ email: email.toLowerCase() }, { username }] 
    });
    if (userExists && userExists.isVerified) {
      return res.status(400).json({ message: 'El nombre de usuario o correo ya está en uso.' });
    }

    // 2. Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Generar código de confirmación
    const confirmToken = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Crear un payload con TODOS los datos necesarios
    const registrationPayload = {
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      confirmationCode: confirmToken,
    };

    // 5. Crear un token JWT temporal que guarde el payload
    const registrationToken = jwt.sign(registrationPayload, process.env.JWT_SECRET, {
      expiresIn: '15m', // El usuario tiene 15 minutos para confirmar
    });

    // 6. Enviar el correo con el código
    const message = `Bienvenido a RecetasApp. Tu código de confirmación es: ${confirmToken}`;
    await sendEmail({
      email: email,
      subject: 'Confirma tu cuenta en RecetasApp',
      message,
    });
    
    // 7. Devolver el token temporal a la app
    res.status(200).json({
      success: true,
      message: 'Código de confirmación enviado al correo.',
      registrationToken: registrationToken,
    });

  } catch (error) {
    console.error('Error en el registro (fase 1):', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};

// --- NUEVA FUNCIÓN DE CONFIRMACIÓN (CREA EL USUARIO EN DB) ---
const confirmEmail = async (req, res) => {
    const { code, registrationToken } = req.body;

    if (!code || !registrationToken) {
        return res.status(400).json({ message: 'Faltan datos para la confirmación.' });
    }

    try {
        const decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);

        if (decoded.confirmationCode !== code) {
            return res.status(400).json({ message: 'Código de confirmación incorrecto.' });
        }
        
        const userExists = await User.findOne({ 
            $or: [{ email: decoded.email }, { username: decoded.username }] 
        });
        if (userExists && userExists.isVerified) {
            return res.status(400).json({ message: 'El nombre de usuario o correo ya fue registrado por otra persona.' });
        }
        
        // Si existe un usuario fantasma, lo eliminamos antes de crear el verificado
        if (userExists && !userExists.isVerified) {
            await User.deleteOne({ _id: userExists._id });
        }

        const user = await User.create({
            username: decoded.username,
            email: decoded.email,
            password: decoded.password,
            isVerified: true,
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user._id),
        });

    } catch (error) {
        console.error('Error en la confirmación (fase 2):', error);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'El proceso de registro ha expirado o es inválido. Por favor, regístrate de nuevo.' });
        }
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// --- NUEVA FUNCIÓN PARA REENVIAR CÓDIGO ---
const resendConfirmationCode = async (req, res) => {
  const { registrationToken: oldToken } = req.body;
  if (!oldToken) {
    return res.status(400).json({ message: 'Token no proporcionado.' });
  }
  try {
    const decodedOld = jwt.verify(oldToken, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });
    const newConfirmToken = Math.floor(100000 + Math.random() * 900000).toString();
    const newRegistrationPayload = {
      username: decodedOld.username,
      email: decodedOld.email,
      password: decodedOld.password,
      confirmationCode: newConfirmToken,
    };
    const newRegistrationToken = jwt.sign(newRegistrationPayload, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });
    const message = `Tu nuevo código de confirmación es: ${newConfirmToken}`;
    await sendEmail({
      email: decodedOld.email,
      subject: 'Nuevo Código de Confirmación - RecetasApp',
      message,
    });
    res.status(200).json({
      success: true,
      message: 'Un nuevo código ha sido enviado a tu correo.',
      registrationToken: newRegistrationToken,
    });
  } catch (error) {
    console.error('Error al reenviar el código:', error);
    res.status(500).json({ message: 'No se pudo reenviar el código. Por favor, intenta registrarte de nuevo.' });
  }
};

// --- TUS OTRAS FUNCIONES ORIGINALES ---
const loginUser = async (req, res) => {
  const {email, password} = req.body;
  try {
    const user = await User.findOne({email: email.toLowerCase()});

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({message: 'Credenciales inválidas'});
    }

    if (!user.isVerified) {
      return res.status(401).json({message: 'Por favor, confirma tu correo antes de iniciar sesión.'});
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({message: 'Error del servidor'});
  }
};

const forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({email: req.body.email});
        if (!user) {
        return res
            .status(404)
            .json({message: 'No existe un usuario con ese correo'});
        }

        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

        await user.save({validateBeforeSave: false});

        const message = `¿Olvidaste tu contraseña? Usa este código para restablecerla: ${resetToken}\n\nSi no lo solicitaste, por favor ignora este correo.`;

        await sendEmail({
            email: user.email,
            subject: 'Código para restablecer tu contraseña (válido por 10 min)',
            message,
        });

        res.status(200).json({status: 'success', message: 'Token enviado al correo!'});
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({message: 'Hubo un error enviando el correo'});
    }
};

const verifyResetCode = async (req, res) => {
  try {
    const user = await User.findOne({
      passwordResetToken: req.body.code,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    res.status(200).json({ success: true, message: 'Código verificado' });
  } catch (error) {
    console.error('Error verificando código de reseteo:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      passwordResetToken: req.body.code,
      passwordResetExpires: {$gt: Date.now()},
    });

    if (!user) {
      return res
        .status(400)
        .json({message: 'El código es inválido o ha expirado'});
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({message: 'Error restableciendo la contraseña'});
  }
};

module.exports = {
  registerUser,
  loginUser,
  confirmEmail,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  resendConfirmationCode,
};