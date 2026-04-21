import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  runId:         { type: String, required: true },
  source:        { type: String, enum: ['user', 'exchange'], required: true },
  rawRow:        { type: Object },          
  transactionId: { type: String },
  timestamp:     { type: Date },
  type:          { type: String },
  asset:         { type: String },          
  quantity:      { type: Number },
  priceUsd:      { type: Number },
  fee:           { type: Number },
  note:          { type: String },
  
  // Data Quality Flags
  isValid:       { type: Boolean, default: true },
  issues:        [{ type: String }],
}, { timestamps: true });

transactionSchema.index({ runId: 1, source: 1, isValid: 1 });

export default mongoose.model('Transaction', transactionSchema);