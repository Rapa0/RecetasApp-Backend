const crypto = require('crypto');
const User = require('../models/User.js');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const generateToken = id => {
  return jwt.sign({id}, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  const {username, email, password} = req.body;
  try {
    let user = await User.findOne({email});
    if (user && user.isVerified) {
      return res.status(400).json({message: 'El usuario ya existe'});
    }
    if (user && !user.isVerified) {
        await User.findByIdAndDelete(user._id);
    }
    
    user = await User.create({
      username,
      email,
      password,
    });

    const confirmToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.accountConfirmationToken = confirmToken;
    user.accountConfirmationExpires = Date.now() + 10 * 60 * 1000;
    await user.save({validateBeforeSave: false});

    const message = `Bienvenido a RecetasApp. Usa este código para confirmar tu cuenta: ${confirmToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Confirma tu cuenta en RecetasApp',
      message,
    });

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Por favor, revisa tu correo para confirmar tu cuenta.',
    });
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

const loginUser = async (req, res) => {
  const {email, password} = req.body;
  try {
    const user = await User.findOne({email});

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
        const user = await User.findOne({email: req.body.email});
        if (user) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({validateBeforeSave: false});
        }
        console.log(error);
        res.status(500).json({message: 'Hubo un error enviando el correo'});
    }
};

const resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      passwordResetToken: req.params.token,
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

    const token = generateToken(user._id);
    res.status(200).json({token});
  } catch (error) {
    res.status(500).json({message: 'Error restableciendo la contraseña'});
  }
};

const confirmEmail = async (req, res) => {
    try {
        const user = await User.findOne({
            accountConfirmationToken: req.body.token,
            accountConfirmationExpires: {$gt: Date.now()}
        });

        if (!user) {
            return res.status(400).json({message: 'Código inválido o expirado'});
        }

        user.isVerified = true;
        user.accountConfirmationToken = undefined;
        user.accountConfirmationExpires = undefined;
        await user.save();

        res.status(200).json({success: true, message: 'Cuenta confirmada exitosamente'});

    } catch (error) {
        res.status(500).json({message: 'Error confirmando la cuenta'});
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
    res.status(500).json({ message: 'Error del servidor' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  confirmEmail,
  verifyResetCode,
};