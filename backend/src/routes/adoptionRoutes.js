import { Router } from 'express';
import { submitAdoptionInterest } from '../controllers/adoptionController.js';

const router = Router();
router.post('/', submitAdoptionInterest);

export default router;