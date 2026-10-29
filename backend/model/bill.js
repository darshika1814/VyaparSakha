const mongoose = require('mongoose');
const { Schema } = mongoose;

const billSchema = new Schema({
    shopkeeper: {
        type: Schema.Types.ObjectId,
        ref: 'Shopkeeper',
        required: true,
        index: true
    },
    name: {type: String, required: true},
    price: {type: Number, required: true},
    quantity: {type: Number, required: true}
});

billSchema.index({ shopkeeper: 1, name: 1 }, { unique: true });

exports.Bill = mongoose.model('Bill', billSchema);
