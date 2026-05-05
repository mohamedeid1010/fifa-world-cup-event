import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import routes from './routes.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to connect to database, shutting down server.');
  process.exit(1);
});
