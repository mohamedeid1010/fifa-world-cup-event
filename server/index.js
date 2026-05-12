import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import routes from './routes.js';

const app = express();
const port = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api', routes);

if (existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

connectDB().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to connect to database, shutting down server.');
  process.exit(1);
});
