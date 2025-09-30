const User = require('../models/User.js');
const Recipe = require('../models/Recipe.js'); // Importamos Recipe para usarlo en deleteUser

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

    // --- INICIO DE LA CORRECCIÓN ---

    // Verificar si el nuevo username ya está en uso por OTRO usuario
    if (req.body.username && req.body.username !== user.username) {
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Ese nombre de usuario ya está en uso' });
      }
      user.username = req.body.username;
    }

    // Verificar si el nuevo email ya está en uso por OTRO usuario
    if (req.body.email && req.body.email !== user.email) {
      const existingEmail = await User.findOne({ email: req.body.email });
      if (existingEmail && existingEmail._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Ese correo electrónico ya está en uso' });
      }
      user.email = req.body.email;
    }
    
    // --- FIN DE LA CORRECCIÓN ---

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    // Devuelve un mensaje de error más específico si aún ocurre un error de duplicado
    if (error.code === 11000) {
        return res.status(400).json({ message: 'El nombre de usuario o email ya está en uso.' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            // CORRECCIÓN DE BUG: Se elimina también las recetas del usuario
            // La variable 'usuarioId' no estaba definida, se usa req.user._id
            await Recipe.deleteMany({ user: req.user._id });
            
            await user.deleteOne();
            res.json({ message: 'Usuario y sus recetas han sido eliminados' });
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

module.exports = { getUserProfile, updateUserProfile, deleteUser, changePassword };