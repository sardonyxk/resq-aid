import { asyncHandler } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';

// GET /api/dispatch/nearest-team?lat=...&lng=...&radiusMeters=...
export const findNearestTeam = asyncHandler(async (req, res) => {
  const { lat, lng, radiusMeters } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    return res.status(400).json({ error: 'lat and lng must be valid numbers' });
  }

  const { data, error } = await supabase.rpc('nearest_available_team', {
    lat: parsedLat,
    lng: parsedLng,
    radius_meters: radiusMeters ? Number(radiusMeters) : 10000,
  });

  if (error) {
    // Let the centralized error handler decide status/format
    throw Object.assign(new Error(error.message), { status: 500 });
  }

  res.json({ teams: data });
});