const mongoose = require('mongoose');
const { Schema } = mongoose;

const notesSchema = new Schema({
    // Owner of this record. Every query must filter on it.
    shopkeeper: {
      type: Schema.Types.ObjectId,
      ref: 'Shopkeeper',
      required: true,
      index: true
    },
    // The customer this transaction belongs to.
    user:{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {type: Number,required: true},
    description: {type: String, required: true},
    type: {type: String, required: true, enum: ['credit', 'debit']},
    date: {type: Date, default: Date.now},
    images: [String]
  });

exports.Transaction = mongoose.model('Transaction', notesSchema);
