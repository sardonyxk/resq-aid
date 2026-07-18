import { Router } from 'express';
import { signup, login } from '../controllers/authController.js';
import { sendOtp, verifyOtp } from '../controllers/otpController.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);

router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);

export default router;