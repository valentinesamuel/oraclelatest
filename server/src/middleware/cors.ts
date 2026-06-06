import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.CORS_ALLOWED_ORIGIN ?? '',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
