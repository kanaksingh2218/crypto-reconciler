import express from 'express';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import apiRoutes from './routes/api.js';

const app = express();
app.use(express.json()); 

app.use('/', apiRoutes);

async function startServer() {
  try {
    await mongoose.connect(config.mongoUri);
    
    app.listen(config.port, () => {
      console.log(`http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

startServer();