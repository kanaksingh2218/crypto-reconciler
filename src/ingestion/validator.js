import { config } from '../config/index.js';

export function normalizeAsset(raw) {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  return config.assetAliases[lower] ?? raw.trim().toUpperCase();
}

export function validateRow(row, seenIds) {
  const issues = [];
  
  let transactionId = row.transaction_id?.trim();
  if (transactionId) {
    if (seenIds.has(transactionId)) {
      issues.push('Duplicate transaction_id');
    } else {
      seenIds.add(transactionId);
    }
  } else {
    issues.push('Missing transaction_id');
  }

  let timestamp = null;
  if (!row.timestamp || row.timestamp.trim() === '') {
    issues.push('Missing timestamp');
  } else {
    const parsed = new Date(row.timestamp.trim());
    if (isNaN(parsed.getTime())) {
      issues.push(`Malformed timestamp: "${row.timestamp}"`);
    } else {
      timestamp = parsed;
    }
  }

  const quantity = parseFloat(row.quantity);
  if (isNaN(quantity)) {
    issues.push('Non-numeric quantity');
  } else if (quantity < 0) {
    issues.push('Negative quantity — data error');
  }

  const typeRaw = row.type?.trim().toUpperCase() ?? '';
  if (!typeRaw) {
    issues.push('Missing type field');
  } else if (!['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT'].includes(typeRaw)) {
    issues.push(`Unknown type: "${typeRaw}"`);
  }

  const parsedPrice = parseFloat(row.price_usd);
  const parsedFee = parseFloat(row.fee);

  return {
    transactionId,
    timestamp,
    type: typeRaw || null,
    asset: normalizeAsset(row.asset),
    quantity: isNaN(quantity) ? null : quantity,
    priceUsd: isNaN(parsedPrice) ? null : parsedPrice,
    fee: isNaN(parsedFee) ? null : parsedFee,
    note: row.note?.trim() ?? '',
    isValid: issues.length === 0,
    issues,
  };
}