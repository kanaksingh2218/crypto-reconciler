import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import crypto from 'crypto';
import { config } from './config/index.js';
import { ingestFile } from './ingestion/parser.js';
import Transaction from './models/Transaction.js';

const app = express();

async function startApp() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    const runId = crypto.randomUUID();
    console.log(`Starting ingestion run: ${runId}`);

    const dataDir = path.resolve('data');
    await ingestFile(path.join(dataDir, 'user_transactions.csv'), 'user', runId);
    await ingestFile(path.join(dataDir, 'exchange_transactions.csv'), 'exchange', runId);
    console.log('Ingestion complete.');

    app.listen(config.port, () => {
      console.log(`\n Web Server is alive!`);
      console.log(`Open your browser to: http://localhost:${config.port}`);
    });

  } catch (error) {
    console.error('Critical Error:', error);
    process.exit(1);
  }
}

app.get('/', async (req, res) => {
  try {
    const allTransactions = await Transaction.find().select('-__v'); 
   
    res.json({
      message: "Here is your ingested data!",
      totalRows: allTransactions.length,
      data: allTransactions
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

startApp();