import 'dotenv/config';

export const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/crypto-reconciler',
  port: process.env.PORT || 3000,
  timestampToleranceSeconds: 300, 
  quantityTolerancePct: 0.0001,  
  assetAliases: {
    bitcoin: 'BTC',
    eth:     'ETH',
    btc:     'BTC',
    sol:     'SOL',
    usdt:    'USDT',
    matic:   'MATIC',
    link:    'LINK',
  }
};