export function validateRow(row, seenIds) {
  let isValid = true;
  const issues = [];

  const timestamp = new Date(row.timestamp);
  if (isNaN(timestamp.getTime())) {
    isValid = false;
    issues.push(`Malformed timestamp: "${row.timestamp}"`);
  }

  if (!row.type) {
    isValid = false;
    issues.push('Missing type field');
  }

  if (seenIds.has(row.transaction_id)) {
    isValid = false;
    issues.push('Duplicate transaction_id');
  } else {
    seenIds.add(row.transaction_id);
  }

  const quantity = parseFloat(row.quantity);
  if (quantity < 0) {
    isValid = false;
    issues.push('Negative quantity — data error');
  }

  return {
    isValid,
    issues,
    parsedTimestamp: isNaN(timestamp.getTime()) ? null : timestamp,
    parsedQuantity: quantity || 0,
    parsedPrice: parseFloat(row.price_usd) || null,
    parsedFee: parseFloat(row.fee) || 0
  };
}