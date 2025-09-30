const User = require('../models/User.js');

const getUserProfile = async (req, res) => {
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
};

const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
    });
  } else {
    res.status(404).json({ message: 'Usuario no encontrado' });
  }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            await user.deleteOne();
            res.json({ message: 'Usuario eliminado' });
            await Recipe.deleteMany({ user: usuarioId });
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor' });
    }
};

const changePassword = async (req, res) => {
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
};

module.exports = { getUserProfile, updateUserProfile, deleteUser, changePassword };