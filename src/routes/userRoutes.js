const express = require('express');
const router = express.Router();
const { 
    getUserProfile, 
    updateUserProfile, 
    deleteUser, 
    changePassword 
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)
  .delete(protect, deleteUser);

router.route('/profile/changepassword').put(protect, changePassword);

module.exports = router;