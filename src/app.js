import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import crypto from 'crypto';
import { config } from './config/index.js';
import { ingestFile } from './ingestion/parser.js';
import { runReconciliation, saveReport, jsonToCsv } from './matching/engine.js';
import Transaction from './models/Transaction.js';
import ReportEntry from './models/Report.js';

const app = express();

async function startApp() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('📦 Connected to MongoDB');

    const runId = crypto.randomUUID();
    const dataDir = path.resolve('data');

    console.log(`Starting Run: ${runId}`);
    await ingestFile(path.join(dataDir, 'user_transactions.csv'), 'user', runId);
    await ingestFile(path.join(dataDir, 'exchange_transactions.csv'), 'exchange', runId);
    console.log('Ingestion complete.');

    const reportData = await runReconciliation(runId);
    console.log('Matching complete.');

    await saveReport(runId, reportData);
    console.log('Report saved to database.');


    app.get('/', async (req, res) => {
      try {
        const allTransactions = await Transaction.find({ runId }).select('-__v'); 
        res.json({
          message: "Ingested transactions for this run",
          totalRows: allTransactions.length,
          data: allTransactions
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch data" });
      }
    });

    app.get('/report', async (req, res) => {
      try {
        const resultsFromDb = await ReportEntry.find({ runId });
        res.json({
          success: true,
          runId: runId,
          summary: {
            perfectMatches: reportData.matched.length,
            conflicts: reportData.conflicting.length,
            unmatchedUser: reportData.unmatchedUser.length,
            unmatchedExchange: reportData.unmatchedExchange.length
          },
          results: resultsFromDb
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to fetch report" });
      }
    });

    app.get('/report/csv', async (req, res) => {
      try {
        const resultsFromDb = await ReportEntry.find({ runId });
        const csvContent = jsonToCsv(resultsFromDb);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=reconciliation_report_${runId}.csv`);
        res.status(200).send(csvContent);
      } catch (err) {
        res.status(500).send("Error generating CSV");
      }
    });

    app.listen(config.port, () => {
      console.log(`\nWeb Server is alive!`);
      console.log(`View Data: http://localhost:${config.port}`);
      console.log(`View Report: http://localhost:${config.port}/report`);
      console.log(`Download CSV Report: http://localhost:${config.port}/report/csv`);
    });

  } catch (error) {
    console.error('Critical System Error:', error);
    process.exit(1);
  }
}

startApp();