import 'dotenv/config';

export const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/crypto-reconciler',
  port: process.env.PORT || 3000,
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