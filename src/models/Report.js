import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  runId: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['matched', 'conflicting', 'unmatched_user', 'unmatched_exchange'],
    required: true 
  },
  reason: { type: String },
  userTxn: { type: Object },
  exchangeTxn: { type: Object }
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);