
const express = require('express');
const router = express.Router();
const {
  createGroup,
  getMyGroups,
  updateGroup,
  deleteGroup,
  addRecipeToGroup,
  removeRecipeFromGroup,
  getRecipesInGroup,
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');


router.route('/').post(protect, createGroup);


router.route('/mygroups').get(protect, getMyGroups);

router
    .route('/:id')
    .put(protect, updateGroup)
    .delete(protect, deleteGroup);

router.route('/:id/recipes').get(protect, getRecipesInGroup);


router.route('/:id/addRecipe').post(protect, addRecipeToGroup);
router.route('/:id/removeRecipe').post(protect, removeRecipeFromGroup);

module.exports = router;