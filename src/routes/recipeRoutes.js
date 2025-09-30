const express = require('express');
const router = express.Router();
const {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  likeRecipe,
} = require('../controllers/recipeController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(getRecipes).post(protect, createRecipe);

router
  .route('/:id')
  .get(getRecipeById)
  .put(protect, updateRecipe)
  .delete(protect, deleteRecipe);

router.post('/:id/like', protect, likeRecipe);

module.exports = router;