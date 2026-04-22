import 'dotenv/config';

export const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crypto-reconciler',
  port: process.env.PORT || 3000,
  timestampToleranceSeconds: parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS) || 300,
  quantityTolerancePct: parseFloat(process.env.QUANTITY_TOLERANCE_PCT) || 0.01,
};