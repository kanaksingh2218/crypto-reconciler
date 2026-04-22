import { config } from '../config/index.js';
import Transaction from '../models/Transaction.js';
import ReportEntry from '../models/Report.js';

function isTypeMatch(userType, exchangeType) {
  if (userType === exchangeType) return true;
  if (userType === 'TRANSFER_OUT' && exchangeType === 'TRANSFER_IN') return true;
  if (userType === 'TRANSFER_IN' && exchangeType === 'TRANSFER_OUT') return true;
  return false;
}

export async function runReconciliation(runId, overrides = {}) {
  const timeTolSecs = overrides.timestampToleranceSeconds || config.timestampToleranceSeconds;
  const qtyTolPct = overrides.quantityTolerancePct || config.quantityTolerancePct;

  const userTxns = await Transaction.find({ runId, source: 'user', isValid: true });
  const exchangeTxns = await Transaction.find({ runId, source: 'exchange', isValid: true });

  const reportData = [];
  const matchedExchangeIds = new Set();

  for (const uTxn of userTxns) {
    let bestMatch = null;
    let isConflicting = false;
    let conflictReason = '';

    for (const eTxn of exchangeTxns) {
      if (matchedExchangeIds.has(eTxn._id.toString())) continue;

      const uAsset = uTxn.asset === 'BITCOIN' ? 'BTC' : uTxn.asset;
      const eAsset = eTxn.asset === 'BITCOIN' ? 'BTC' : eTxn.asset;
      if (uAsset !== eAsset) continue;

      if (!isTypeMatch(uTxn.type, eTxn.type)) continue;

      const timeDiffSecs = Math.abs(uTxn.timestamp - eTxn.timestamp) / 1000;
      const withinTime = timeDiffSecs <= timeTolSecs;

      const qtyDiff = Math.abs(uTxn.quantity - eTxn.quantity);
      const allowedDiff = uTxn.quantity * (qtyTolPct / 100); 
      const withinQty = qtyDiff <= allowedDiff;

      if (withinTime && withinQty) {
        bestMatch = eTxn;
        break; 
      } else if (withinTime && !withinQty) {
        bestMatch = eTxn;
        isConflicting = true;
        conflictReason = `Quantity difference (${qtyDiff}) exceeds tolerance`;
        break;
      }
    }

    if (bestMatch) {
      matchedExchangeIds.add(bestMatch._id.toString());
      reportData.push({
        runId,
        category: isConflicting ? 'conflicting' : 'matched',
        reason: isConflicting ? conflictReason : 'Perfect match',
        userTxn: uTxn,
        exchangeTxn: bestMatch
      });
    } else {
      reportData.push({
        runId,
        category: 'unmatched_user',
        reason: 'Present in user file, not found in exchange file',
        userTxn: uTxn,
        exchangeTxn: null
      });
    }
  }

  for (const eTxn of exchangeTxns) {
    if (!matchedExchangeIds.has(eTxn._id.toString())) {
      reportData.push({
        runId,
        category: 'unmatched_exchange',
        reason: 'Present in exchange file, not found in user file',
        userTxn: null,
        exchangeTxn: eTxn
      });
    }
  }

  return reportData;
}

export async function saveReport(runId, reportData) {
  if (reportData.length > 0) {
    await ReportEntry.insertMany(reportData);
  }
}

export function jsonToCsv(reportData) {
  const header = "Category,Reason,User_TxnId,Exchange_TxnId,Asset,User_Qty,Exchange_Qty\n";
  const rows = reportData.map(row => {
    const uId = row.userTxn ? row.userTxn.transactionId : '';
    const eId = row.exchangeTxn ? row.exchangeTxn.transactionId : '';
    const asset = row.userTxn ? row.userTxn.asset : (row.exchangeTxn ? row.exchangeTxn.asset : '');
    const uQty = row.userTxn ? row.userTxn.quantity : '';
    const eQty = row.exchangeTxn ? row.exchangeTxn.quantity : '';
    return `${row.category},"${row.reason}",${uId},${eId},${asset},${uQty},${eQty}`;
  });
  return header + rows.join('\n');
}