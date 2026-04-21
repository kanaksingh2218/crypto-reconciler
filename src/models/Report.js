import mongoose from 'mongoose';

const reportEntrySchema = new mongoose.Schema({
  runId: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['matched', 'conflicting', 'unmatched_user', 'unmatched_exchange'], 
    required: true 
  },
  reason: { type: String, required: true },
  userTxn: { type: Object },
  exchangeTxn: { type: Object },
  conflicts: [{ 
    field: String, 
    userVal: mongoose.Schema.Types.Mixed, 
    exchangeVal: mongoose.Schema.Types.Mixed 
  }]
}, { timestamps: true });

export default mongoose.model('ReportEntry', reportEntrySchema);