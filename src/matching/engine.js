import { config } from '../config/index.js';
import Transaction from '../models/Transaction.js';

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
    conflicts.push({ 
      field: 'quantity', 
      userVal: user.quantity, 
      exchangeVal: exchange.quantity 
    });
  }

  return { 
    match: true, 
    isPerfect: conflicts.length === 0, 
    conflicts 
  };
}


export async function runReconciliation(runId) {
  const userTxns = await Transaction.find({ runId, source: 'user', isValid: true });
  const exchangeTxns = await Transaction.find({ runId, source: 'exchange', isValid: true });

  const results = {
    matched: [],
    conflicting: [],
    unmatchedUser: [],
    unmatchedExchange: []
  };

  const matchedExchangeIds = new Set();

  for (const user of userTxns) {
    let foundMatch = false;

    for (const exchange of exchangeTxns) {
      if (matchedExchangeIds.has(exchange._id.toString())) continue;

      const assessment = isMatch(user, exchange);

      if (assessment.match) {
        const pair = { user, exchange, conflicts: assessment.conflicts };
        
        if (assessment.isPerfect) {
          results.matched.push(pair);
        } else {
          results.conflicting.push(pair);
        }

        matchedExchangeIds.add(exchange._id.toString());
        foundMatch = true;
        break; 
      }
    }

    if (!foundMatch) {
      results.unmatchedUser.push(user);
    }
  }

  results.unmatchedExchange = exchangeTxns.filter(
    ex => !matchedExchangeIds.has(ex._id.toString())
  );

  return results;
}