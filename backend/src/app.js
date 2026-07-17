import express from 'express';
import cors from 'cors';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import dispatchRoutes from './routes/dispatchRoutes.js';
export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/dispatch', dispatchRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'resq-aid-backend' });
});

app.use(notFoundHandler);
app.use(errorHandler);