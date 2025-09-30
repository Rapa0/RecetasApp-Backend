const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  confirmEmail,
  verifyResetCode,
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgotpassword', forgotPassword);
router.patch('/resetpassword/:token', resetPassword);
router.post('/confirmemail', confirmEmail);
router.post('/verifyresetcode', verifyResetCode);

module.exports = router;