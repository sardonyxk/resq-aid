import { Router } from 'express';
import multer from 'multer';
import { assessImage } from '../controllers/assessmentController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/image', upload.single('image'), assessImage);

export default router;