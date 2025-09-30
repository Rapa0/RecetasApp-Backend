const User = require('../models/User.js');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const generateToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists && userExists.isVerified) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists && usernameExists.isVerified && usernameExists.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso.' });
    }

    let user;
    if (userExists && !userExists.isVerified) {
      console.log('Actualizando usuario "fantasma" existente...');
      user = userExists;
      user.username = username;
      user.password = password; 
    } else {
      console.log('Creando nuevo usuario...');
      user = new User({
        username,
        email,
        password,
      });
    }

    const confirmToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.accountConfirmationToken = confirmToken;
    user.accountConfirmationExpires = Date.now() + 24 * 60 * 60 * 1000; 
    
    await user.save();

    const message = `Bienvenido a RecetasApp. Tu código de confirmación es: ${confirmToken}`;
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
    console.error('Error en el registro:', error);
    if (error.code === 11000) {
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso por una cuenta verificada.' });
    }
    res.status(500).json({ message: 'Error del servidor durante el registro.' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
        return res.status(400).json({message: 'Por favor, introduce correo y contraseña.'})
    }
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Por favor, confirma tu correo antes de iniciar sesión.' });
    }

    if (await user.matchPassword(password)) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Credenciales inválidas' });
    }
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error del servidor' });
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
        await user.save({ validateBeforeSave: false }); 

        res.status(200).json({success: true, message: 'Cuenta confirmada exitosamente'});
    } catch (error) {
        console.error('Error confirmando email:', error);
        res.status(500).json({message: 'Error confirmando la cuenta'});
    }
};

const forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: 'No existe un usuario con ese correo' });
        }

        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutos
        await user.save({ validateBeforeSave: false });

        const message = `¿Olvidaste tu contraseña? Usa este código para restablecerla: ${resetToken}`;
        await sendEmail({
            email: user.email,
            subject: 'Código para restablecer tu contraseña',
            message,
        });

        res.status(200).json({ message: 'Token enviado al correo!' });
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ message: 'Hubo un error enviando el correo' });
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
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'El código es inválido o ha expirado' });
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
    res.status(500).json({ message: 'Error restableciendo la contraseña' });
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