import fs from 'fs';
import csv from 'csv-parser';
import Transaction from '../models/Transaction.js';
import { validateRow } from './validator.js';

export async function ingestFile(filePath, source, runId) {
  const transactions = [];
  const seenIds = new Set();

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const validation = validateRow(row, seenIds);

        transactions.push({
          runId,
          source,
          rawRow: row,
          transactionId: row.transaction_id,
          timestamp: validation.parsedTimestamp,
          type: row.type ? row.type.toUpperCase() : null,
          asset: row.asset ? row.asset.toUpperCase() : null,
          quantity: validation.parsedQuantity,
          priceUsd: validation.parsedPrice,
          fee: validation.parsedFee,
          note: row.note || '',
          isValid: validation.isValid,
          issues: validation.issues
        });
      })
      .on('end', async () => {
        if (transactions.length > 0) {
          await Transaction.insertMany(transactions);
        }
        resolve();
      })
      .on('error', reject);
  });
}