import { asyncHandler } from '../middleware/errorHandler.js';
import { assessImageBuffer } from '../services/assessmentService.js';

export const assessImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'image file is required' });
  }
  const assessment = await assessImageBuffer(req.file.buffer, req.file.mimetype);
  res.json({ assessment });
});