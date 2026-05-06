import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDB } from './db.js';
import routes from './routes.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(process.cwd(), 'src')));

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src/pages/user-portal.html'));
});

app.use('/api', routes);

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to connect to database, shutting down server.');
  process.exit(1);
});
