import { supabase } from '../config/supabase.js';

export async function findNearestTeamForLocation(lat, lng, radiusMeters = 10000) {
  const { data, error } = await supabase.rpc('nearest_available_team', {
    lat,
    lng,
    radius_meters: radiusMeters,
  });

  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }

  return data ?? [];
}

export async function findNearbyActiveCases(lat, lng, radiusMeters = 50) {
  const { data, error } = await supabase.rpc('nearby_active_cases', {
    lat,
    lng,
    radius_meters: radiusMeters,
  });

  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }

  return data ?? [];
}