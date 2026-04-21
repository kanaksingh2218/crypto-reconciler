import { config } from '../config/index.js';
import Transaction from '../models/Transaction.js';
import ReportEntry from '../models/Report.js';


export function isMatch(user, exchange) {
  if (user.asset !== exchange.asset) return { match: false };

  const typeMap = {
    'TRANSFER_OUT': 'TRANSFER_IN',
    'TRANSFER_IN': 'TRANSFER_OUT',
    'BUY': 'BUY',
    'SELL': 'SELL'
  };

  if (user.type !== exchange.type && typeMap[user.type] !== exchange.type) {
    return { match: false };
  }

  const timeDiff = Math.abs(user.timestamp - exchange.timestamp) / 1000;
  if (timeDiff > config.timestampToleranceSeconds) return { match: false };

  const qtyDiff = Math.abs(user.quantity - exchange.quantity);
  const maxAllowedDiff = user.quantity * config.quantityTolerancePct;
  
  const conflicts = [];
  if (qtyDiff > maxAllowedDiff) {
    conflicts.push({ field: 'quantity', userVal: user.quantity, exchangeVal: exchange.quantity });
  }

  return { match: true, isPerfect: conflicts.length === 0, conflicts };
}

export async function runReconciliation(runId) {
  const userTxns = await Transaction.find({ runId, source: 'user', isValid: true });
  const exchangeTxns = await Transaction.find({ runId, source: 'exchange', isValid: true });

  const results = { matched: [], conflicting: [], unmatchedUser: [], unmatchedExchange: [] };
  const matchedExchangeIds = new Set();

  for (const user of userTxns) {
    let foundMatch = false;
    for (const exchange of exchangeTxns) {
      if (matchedExchangeIds.has(exchange._id.toString())) continue;
      const assessment = isMatch(user, exchange);
      if (assessment.match) {
        const pair = { user, exchange, conflicts: assessment.conflicts };
        assessment.isPerfect ? results.matched.push(pair) : results.conflicting.push(pair);
        matchedExchangeIds.add(exchange._id.toString());
        foundMatch = true;
        break;
      }
    }
    if (!foundMatch) results.unmatchedUser.push(user);
  }
  results.unmatchedExchange = exchangeTxns.filter(ex => !matchedExchangeIds.has(ex._id.toString()));
  return results;
}


export async function saveReport(runId, results) {
  const entries = [];

  results.matched.forEach(p => entries.push({
    runId, category: 'matched', reason: 'Exact match across both sources', userTxn: p.user, exchangeTxn: p.exchange
  }));

  results.conflicting.forEach(p => entries.push({
    runId, category: 'conflicting', reason: `Matched by proximity, but ${p.conflicts.map(c => c.field).join(', ')} differs`,
    userTxn: p.user, exchangeTxn: p.exchange, conflicts: p.conflicts
  }));

  results.unmatchedUser.forEach(t => entries.push({
    runId, category: 'unmatched_user', reason: 'Present in user file, not found in exchange file', userTxn: t
  }));

  results.unmatchedExchange.forEach(t => entries.push({
    runId, category: 'unmatched_exchange', reason: 'Present in exchange file, not found in user file', exchangeTxn: t
  }));

  return await ReportEntry.insertMany(entries);
}

export function jsonToCsv(entries) {
  const header = ['Category', 'Reason', 'User_Txn_ID', 'Exch_Txn_ID', 'Asset', 'User_Qty', 'Exch_Qty'];
  
  const rows = entries.map(e => [
    e.category,
    `"${e.reason}"`,
    e.userTxn?.transactionId || 'N/A',
    e.exchangeTxn?.transactionId || 'N/A',
    e.userTxn?.asset || e.exchangeTxn?.asset || '',
    e.userTxn?.quantity || 0,
    e.exchangeTxn?.quantity || 0
  ]);

  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}