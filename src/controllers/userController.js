const User = require('../models/User.js');
const Recipe = require('../models/Recipe.js');
const Group = require('../models/Group.js');
const sendEmail = require('../utils/sendEmail.js');

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
      });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (req.body.username && req.body.username !== user.username) {
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Ese nombre de usuario ya está en uso' });
      }
      user.username = req.body.username;
    }
    
    await user.save();
    res.json({ _id: user._id, username: user.username, email: user.email });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error del servidor al actualizar perfil' });
  }
};

const requestEmailChange = async (req, res) => {
    const { newEmail } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        if (newEmail.toLowerCase() === user.email.toLowerCase()) {
            return res.status(400).json({ message: 'El nuevo correo es el mismo que el actual.' });
        }
        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return res.status(400).json({ message: 'Ese correo ya está registrado.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.emailChangeCandidate = newEmail;
        user.emailChangeCode = verificationCode;
        user.emailChangeCodeExpires = Date.now() + 10 * 60 * 1000; 
        await user.save();

        const message = `Tu código para verificar tu nuevo correo es: ${verificationCode}\nEste código expira en 10 minutos.`;
        await sendEmail({
            email: newEmail,
            subject: 'Código de Verificación - Cambio de Correo',
            message: message,
        });

        res.json({ message: `Se ha enviado un código a ${newEmail}` });
    } catch (error) {
        console.error('Error al solicitar cambio de email:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};


const verifyEmailChange = async (req, res) => {
    const { code } = req.body;
    try {
        const user = await User.findOne({ 
            _id: req.user._id,
            emailChangeCode: code,
            emailChangeCodeExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Código inválido o expirado.' });
        }

        user.email = user.emailChangeCandidate;
        user.emailChangeCandidate = undefined;
        user.emailChangeCode = undefined;
        user.emailChangeCodeExpires = undefined;
        await user.save();

        res.json({ message: 'Correo electrónico actualizado con éxito.' });
    } catch (error) {
        console.error('Error al verificar cambio de email:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            await Recipe.deleteMany({ user: req.user._id });
            await Group.deleteMany({ user: req.user._id });

            await user.deleteOne();
            res.json({ message: 'Usuario, recetas y grupos han sido eliminados' });
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Por favor, proporciona la contraseña antigua y la nueva' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    
    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(oldPassword))) {
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Contraseña actualizada correctamente' });
    } else {
        res.status(401).json({ message: 'La contraseña antigua es incorrecta' });
    }
  } catch(error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

module.exports = { 
    getUserProfile, 
    updateUserProfile, 
    deleteUser, 
    changePassword,
    requestEmailChange,
    verifyEmailChange,
};