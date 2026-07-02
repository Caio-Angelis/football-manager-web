import express from 'express';
import cors from 'cors';
import { gameRouter } from './routes/game.js';
import { roomsRouter } from './routes/rooms.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { hydrateSavesFromDisk } from './store/slices/saves.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);
app.use(rateLimiter);
app.use(authMiddleware);

app.use('/api/rooms', roomsRouter);
app.use('/api', gameRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  await hydrateSavesFromDisk();
  console.log('[SAVE] Saves hydrated from disk');
});
