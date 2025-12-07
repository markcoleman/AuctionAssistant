import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import uploadRouter from './routes/upload';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to AuctionAssistant API',
    version: '1.0.0',
    status: 'running',
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Upload route
app.use('/upload', uploadRouter);

// Static files - serve after API routes
app.use(express.static(path.join(__dirname, '../public')));

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
