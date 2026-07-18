import { asyncHandler } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';

// GET /api/admin/cases
// GET /api/admin/cases
export const listCases = asyncHandler(async (req, res) => {
  const { data, error } = await supabase.rpc('list_cases_with_coords');

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.json({ cases: data });
});

// PATCH /api/admin/cases/:id/status
export const updateCaseStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['reported', 'triaged', 'dispatched', 'in_progress', 'rescued', 'closed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const { data, error } = await supabase
    .from('rescue_cases')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  await supabase.from('rescue_updates').insert({
    case_id: id,
    status,
    note: `Status manually updated by coordinator`,
    updated_by: req.user.id,
  });

  res.json({ case: data });
});

// PATCH /api/admin/cases/:id/assign
export const assignTeamToCase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { teamId } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: 'teamId is required' });
  }

  const { data, error } = await supabase
    .from('rescue_cases')
    .update({ assigned_team_id: teamId, status: 'dispatched', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });

  await supabase.from('rescue_updates').insert({
    case_id: id,
    status: 'dispatched',
    note: `Assigned to team ${teamId} by coordinator`,
    updated_by: req.user.id,
  });

  res.json({ case: data });
});

// GET /api/admin/teams
export const listTeams = asyncHandler(async (req, res) => {
  const { data, error } = await supabase.from('rescue_teams').select('*').order('name');
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.json({ teams: data });
});

// POST /api/admin/teams
export const createTeam = asyncHandler(async (req, res) => {
  const { name, phone, lat, lng } = req.body;

  if (!name || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'name, lat, and lng are required' });
  }

  const { data, error } = await supabase
    .from('rescue_teams')
    .insert({
      name,
      phone: phone ?? null,
      is_available: true,
      location: `SRID=4326;POINT(${lng} ${lat})`,
    })
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.status(201).json({ team: data });
});

// PATCH /api/admin/teams/:id
export const updateTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, isAvailable, lat, lng } = req.body;

  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (isAvailable !== undefined) updates.is_available = isAvailable;
  if (lat !== undefined && lng !== undefined) {
    updates.location = `SRID=4326;POINT(${lng} ${lat})`;
  }

  const { data, error } = await supabase
    .from('rescue_teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.json({ team: data });
});