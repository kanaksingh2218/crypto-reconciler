import express from 'express';
import path from 'path';
import crypto from 'crypto';

import { ingestFile } from '../ingestion/parser.js';
import { runReconciliation, saveReport, jsonToCsv } from '../matching/engine.js';
import ReportEntry from '../models/Report.js';

const router = express.Router();

router.post('/reconcile', async (req, res) => {
  try {
    const runId = crypto.randomUUID();
    const dataDir = path.resolve('data');

    await ingestFile(path.join(dataDir, 'user_transactions.csv'), 'user', runId);
    await ingestFile(path.join(dataDir, 'exchange_transactions.csv'), 'exchange', runId);
    
    const reportData = await runReconciliation(runId, req.body);
    await saveReport(runId, reportData);

    res.status(201).json({ success: true, runId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/report/:runId', async (req, res) => {
  try {
    const report = await ReportEntry.find({ runId: req.params.runId });
    if (!report.length) return res.status(404).json({ error: 'Run ID not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/report/:runId/summary', async (req, res) => {
  try {
    const entries = await ReportEntry.find({ runId: req.params.runId });
    if (!entries.length) return res.status(404).json({ error: 'Run ID not found' });

    res.json({
      runId: req.params.runId,
      matched: entries.filter(e => e.category === 'matched').length,
      conflicting: entries.filter(e => e.category === 'conflicting').length,
      unmatched_user: entries.filter(e => e.category === 'unmatched_user').length,
      unmatched_exchange: entries.filter(e => e.category === 'unmatched_exchange').length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/report/:runId/unmatched', async (req, res) => {
  try {
    const unmatched = await ReportEntry.find({ 
      runId: req.params.runId, 
      category: { $in: ['unmatched_user', 'unmatched_exchange'] } 
    });
    res.json(unmatched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/report/:runId/csv', async (req, res) => {
  try {
    const entries = await ReportEntry.find({ runId: req.params.runId });
    if (!entries.length) return res.status(404).send('Run ID not found');
    
    const csvData = jsonToCsv(entries);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reconciliation_report_${req.params.runId}.csv`);
    res.send(csvData);
  } catch (error) {
    res.status(500).send("Error generating CSV");
  }
});

export default router;