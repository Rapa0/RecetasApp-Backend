const Group = require('../models/Group.js');
const Recipe = require('../models/Recipe.js');

const createGroup = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Por favor, proporciona un nombre para el grupo' });
  }
  try {
    const group = new Group({
      name,
      user: req.user._id,
    });
    const createdGroup = await group.save();
    res.status(201).json(createdGroup);
  } catch (error) {
    console.error('Error al crear grupo:', error);
    res.status(400).json({ message: 'Ya existe un grupo con ese nombre' });
  }
};

const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ user: req.user._id }).sort({ name: 1 });
    res.json(groups);
  } catch (error) {
    console.error('--- ERROR AL OBTENER GRUPOS ---', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    if (group.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    group.name = req.body.name || group.name;
    const updatedGroup = await group.save();
    res.json(updatedGroup);
  } catch (error) {
    console.error('Error al actualizar grupo:', error);
    res.status(400).json({ message: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' });
    }
    if (group.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    // Lógica actualizada: Borra las recetas que pertenecen a este grupo
    await Recipe.deleteMany({ _id: { $in: group.recipes } });

    await group.deleteOne();
    res.json({ message: 'Grupo y todas sus recetas han sido eliminados' });
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const addRecipeToGroup = async (req, res) => {
    const { recipeId } = req.body;
    const groupId = req.params.id;

    try {
        const recipe = await Recipe.findById(recipeId);
        const group = await Group.findById(groupId);

        if (!recipe || !group) {
            return res.status(404).json({ message: 'Receta o grupo no encontrado' });
        }
        
        if (group.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'No autorizado, no eres el dueño de este grupo' });
        }

        // Añadimos la receta al grupo y el grupo a la receta
        if (!group.recipes.includes(recipeId)) {
            group.recipes.push(recipeId);
            await group.save();
        }
        if (!recipe.groups.includes(groupId)) {
            recipe.groups.push(groupId);
            await recipe.save();
        }
        
        res.json(group);
    } catch (error) {
        console.error('Error al añadir receta al grupo:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

const removeRecipeFromGroup = async (req, res) => {
    const { recipeId } = req.body;
    const groupId = req.params.id;

    try {
        const recipe = await Recipe.findById(recipeId);
        const group = await Group.findById(groupId);

        if (!recipe || !group) {
            return res.status(404).json({ message: 'Receta o grupo no encontrado' });
        }
        if (group.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'No autorizado' });
        }
        
        group.recipes.pull(recipeId);
        await group.save();
        recipe.groups.pull(groupId);
        await recipe.save();

        res.json(group);
    } catch (error) {
        console.error('Error al quitar receta del grupo:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

const getRecipesInGroup = async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group || group.user.toString() !== req.user._id.toString()) {
        return res.status(404).json({ message: 'Grupo no encontrado o no autorizado' });
      }
      
      await group.populate({
          path: 'recipes',
          populate: { path: 'user', select: 'username' }
      });
      
      res.json(group.recipes);
    } catch (error) {
      console.error('Error al obtener recetas del grupo:', error);
      res.status(500).json({ message: 'Error del servidor' });
    }
  };

module.exports = { 
    createGroup, 
    getMyGroups, 
    updateGroup, 
    deleteGroup, 
    addRecipeToGroup, 
    removeRecipeFromGroup,
    getRecipesInGroup,
};