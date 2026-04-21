import fs from 'fs';
import { parse } from 'csv-parse';
import { validateRow } from './validator.js';
import Transaction from '../models/Transaction.js';

export async function ingestFile(filePath, source, runId) {
  const batchSize = 1000;
  let batch = [];
  const seenIds = new Set();
  
  let flaggedCount = 0;
  let totalCount = 0;

  const parser = fs.createReadStream(filePath).pipe(
    parse({
      columns: true,           
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true
    })
  );

  try {
    for await (const record of parser) {
      const validated = validateRow(record, seenIds);
      batch.push({ ...validated, source, runId, rawRow: record });
      
      if (!validated.isValid) flaggedCount++;
      totalCount++;

      if (batch.length >= batchSize) {
        await Transaction.insertMany(batch);
        batch = []; 
      }
    }

    if (batch.length > 0) {
      await Transaction.insertMany(batch);
    }

    console.log(`[${source}] Ingestion complete: ${totalCount} total rows parsed, ${flaggedCount} flagged with issues.`);
    
  } catch (err) {
    console.error(`[${source}] Error parsing file:`, err);
    throw err; 
  }
}