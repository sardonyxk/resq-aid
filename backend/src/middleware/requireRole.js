import { supabase } from '../config/supabase.js';

// Usage: requireRole(['ngo_admin', 'superadmin'])
export function requireRole(allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(403).json({ error: 'Could not verify user role' });
    }

    if (!allowedRoles.includes(data.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }

    req.userRole = data.role;
    next();
  };
}