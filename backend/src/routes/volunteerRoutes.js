import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { listMyCases, updateMyCaseStatus } from '../controllers/volunteerController.js';

const router = Router();

router.use(requireAuth, requireRole(['volunteer', 'ngo_admin', 'superadmin']));

router.get('/cases', listMyCases);
router.patch('/cases/:id/status', updateMyCaseStatus);

export default router;