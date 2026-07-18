import express from 'express';
import cors from 'cors';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import dispatchRoutes from './routes/dispatchRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './middleware/requireAuth.js';
import casesRoutes from './routes/casesRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adoptionRoutes from './routes/adoptionRoutes.js';
export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/adoption-interest', adoptionRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/auth', authRoutes);  
app.use('/api/cases', casesRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'resq-aid-backend' });
});

app.use(notFoundHandler);
app.use(errorHandler);