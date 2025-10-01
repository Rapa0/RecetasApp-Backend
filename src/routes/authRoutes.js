const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  confirmEmail,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  resendConfirmationCode, 
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/confirmEmail', confirmEmail);
router.post('/forgotpassword', forgotPassword);
router.post('/verifyresetcode', verifyResetCode);
router.put('/resetpassword', resetPassword); 

router.post('/resend-confirmation', resendConfirmationCode);

module.exports = router;