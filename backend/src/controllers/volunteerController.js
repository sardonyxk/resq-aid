import { asyncHandler } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';

// GET /api/volunteer/cases
export const listMyCases = asyncHandler(async (req, res) => {
  const { data, error } = await supabase.rpc('list_cases_for_volunteer', { p_user_id: req.user.id });
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  res.json({ cases: data });
});

// PATCH /api/volunteer/cases/:id/status -- volunteers can only mark in_progress or rescued,
// and only on cases actually assigned to them (checked below, not just trusted from the URL).
export const updateMyCaseStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['in_progress', 'rescued'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const { data: myCases, error: checkError } = await supabase.rpc('list_cases_for_volunteer', { p_user_id: req.user.id });
  if (checkError) throw Object.assign(new Error(checkError.message), { status: 500 });

  const owns = myCases.some((c) => c.id === id);
  if (!owns) return res.status(403).json({ error: 'This case is not assigned to you' });

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
    note: 'Status updated by volunteer',
    updated_by: req.user.id,
  });

  res.json({ case: data });
});