import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY. Check backend/.env');
}

export const genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1' });

export const MODELS = {
  CORE: 'gemini-3.5-flash',
};