import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  listCases,
  updateCaseStatus,
  assignTeamToCase,
  listTeams,
  createTeam,
  updateTeam,
} from '../controllers/adminController.js';

const router = Router();

// Every route here requires being logged in AND being ngo_admin or superadmin
router.use(requireAuth, requireRole(['ngo_admin', 'superadmin']));

router.get('/cases', listCases);
router.patch('/cases/:id/status', updateCaseStatus);
router.patch('/cases/:id/assign', assignTeamToCase);

router.get('/teams', listTeams);
router.post('/teams', createTeam);
router.patch('/teams/:id', updateTeam);

export default router;