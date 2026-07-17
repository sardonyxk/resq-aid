import { asyncHandler } from '../middleware/errorHandler.js';

export const handleTriageMessage = asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  res.status(501).json({ error: 'Not implemented yet' });
});