import { Router } from 'express';
import { handleTriageMessage } from '../controllers/triageController.js';

const router = Router();
router.post('/message', handleTriageMessage);

export default router;