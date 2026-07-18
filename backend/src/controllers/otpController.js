import { asyncHandler } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';

// POST /api/auth/otp/send
export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Allow OTP to create a new user if this email hasn't signed up before
      shouldCreateUser: false,
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: 'OTP sent. Check your email for the 6-digit code.' });
});

// POST /api/auth/otp/verify
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ error: 'email and token are required' });
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.json({ user: data.user, session: data.session });
});