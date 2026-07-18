import { asyncHandler } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';

// POST /api/adoption-interest
export const submitAdoptionInterest = asyncHandler(async (req, res) => {
  const { fullName, phone, email, preferredAnimalType, message } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({ error: 'fullName and phone are required' });
  }

  const { data, error } = await supabase
    .from('adoption_interests')
    .insert({
      full_name: fullName,
      phone,
      email: email ?? null,
      preferred_animal_type: preferredAnimalType ?? 'any',
      message: message ?? null,
    })
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.status(201).json({ interest: data });
});