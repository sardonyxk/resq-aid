import { Router } from 'express';
import { findNearestTeam } from '../controllers/dispatchController.js';

const router = Router();
router.get('/nearest-team', findNearestTeam);

export default router;