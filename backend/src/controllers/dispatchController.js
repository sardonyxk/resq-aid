import { asyncHandler } from '../middleware/errorHandler.js';
import { findNearestTeamForLocation } from '../services/dispatchService.js';

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

  const teams = await findNearestTeamForLocation(
    parsedLat,
    parsedLng,
    radiusMeters ? Number(radiusMeters) : undefined
  );

  res.json({ teams });
});