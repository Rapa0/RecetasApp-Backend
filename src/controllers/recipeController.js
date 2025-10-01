const Recipe = require('../models/Recipe.js');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getRecipes = async (req, res) => {
  try {
    const sortQuery = req.query.sort;
    let sortOptions;

    switch (sortQuery) {
      case 'alphabetical':
        sortOptions = { title: 1 }; 
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const recipes = await Recipe.find({}).sort(sortOptions).populate('user', 'username email');
    res.json(recipes);
  } catch (error) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const getMyRecipes = async (req, res) => {
  try {
    const sortQuery = req.query.sort;
    let sortOptions;

    switch (sortQuery) {
      case 'alphabetical':
        sortOptions = { title: 1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const recipes = await Recipe.find({ user: req.user._id }).sort(sortOptions).populate('user', 'username email');
    res.json(recipes);
  } catch (error) {
    console.error('Error al obtener mis recetas:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('user', 'username email');
    if (recipe) {
      res.json(recipe);
    } else {
      res.status(404).json({ message: 'Receta no encontrada' });
    }
  } catch (error) {
    console.error('Error al obtener receta por ID:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const createRecipe = async (req, res) => {
  const { title, description, ingredients, instructions, imageData } = req.body;
  if (!title || !ingredients || !instructions) {
    return res.status(400).json({ message: 'Por favor, completa los campos obligatorios' });
  }
  try {
    let imageUrl = '';
    if (imageData) {
      const uploadedImage = await cloudinary.uploader.upload(imageData, {
        upload_preset: 'recetas_app',
      });
      imageUrl = uploadedImage.secure_url;
    }
    const recipe = new Recipe({
      title,
      description,
      ingredients,
      instructions,
      imageUrl,
      user: req.user._id,
    });
    const createdRecipe = await recipe.save();
    res.status(201).json(createdRecipe);
  } catch (error) {
    console.error('Error al crear receta:', error);
    res.status(400).json({ message: error.message });
  }
};

const updateRecipe = async (req, res) => {
  const { title, description, ingredients, instructions, imageData } = req.body;
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) { return res.status(404).json({ message: 'Receta no encontrada' }); }
    if (recipe.user.toString() !== req.user._id.toString()) { return res.status(401).json({ message: 'No autorizado' }); }
    recipe.title = title || recipe.title;
    recipe.description = description || recipe.description;
    recipe.ingredients = ingredients || recipe.ingredients;
    recipe.instructions = instructions || recipe.instructions;
    if (imageData) {
      const uploadedImage = await cloudinary.uploader.upload(imageData, { upload_preset: 'recetas_app' });
      recipe.imageUrl = uploadedImage.secure_url;
    } else if (imageData === null) {
      recipe.imageUrl = '';
    }
    const updatedRecipe = await recipe.save();
    res.json(updatedRecipe);
  } catch (error) {
    console.error('Error al actualizar receta:', error);
    res.status(400).json({ message: error.message });
  }
};

const deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (recipe) {
      if (recipe.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'No autorizado' });
      }
      await recipe.deleteOne();
      res.json({ message: 'Receta eliminada' });
    } else {
      res.status(404).json({ message: 'Receta no encontrada' });
    }
  } catch (error) {
    console.error('Error al eliminar receta:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

const likeRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Receta no encontrada' });
        }
        const index = recipe.likes.findIndex(id => id.toString() === req.user._id.toString());
        if (index === -1) {
            recipe.likes.push(req.user._id);
        } else {
            recipe.likes.splice(index, 1);
        }
        await recipe.save();
        res.json(recipe);
    } catch (error) {
        console.error('Error en likeRecipe:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

module.exports = {
  getRecipes,
  getMyRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  likeRecipe,
};