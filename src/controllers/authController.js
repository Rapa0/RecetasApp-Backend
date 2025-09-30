const User = require('../models/User.js');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');

const generateToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ 
        $or: [{ email: email.toLowerCase() }, { username }] 
    });
    if (userExists && userExists.isVerified) {
      return res.status(400).json({ message: 'El nombre de usuario o correo ya está en uso.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const confirmToken = Math.floor(100000 + Math.random() * 900000).toString();

    const registrationPayload = {
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      confirmationCode: confirmToken,
    };

    const registrationToken = jwt.sign(registrationPayload, process.env.JWT_SECRET, {
      expiresIn: '15m', 
    });

    const message = `Bienvenido a RecetasApp. Tu código de confirmación es: ${confirmToken}`;
    await sendEmail({
      email: email,
      subject: 'Confirma tu cuenta en RecetasApp',
      message,
    });
    
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

const loginUser = async (req, res) => {
  const {email, password} = req.body;
  try {
    const user = await User.findOne({email: email.toLowerCase()});

    if (!user) {
      return res.status(401).json({message: 'Credenciales inválidas'});
    }

    if (!user.isVerified) {
      return res.status(401).json({message: 'Por favor, confirma tu correo antes de iniciar sesión.'});
    }

    if (await user.matchPassword(password)) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({message: 'Credenciales inválidas'});
    }
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
};