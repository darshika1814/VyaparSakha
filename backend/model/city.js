const mongoose = require('mongoose');
const { Schema } = mongoose;

const citySchema = new Schema({
    shopkeeper: {
        type: Schema.Types.ObjectId,
        ref: 'Shopkeeper',
        required: true,
        index: true
    },
    name: {type: String, required: true}
});

// City names are unique per shopkeeper, not globally.
citySchema.index({ shopkeeper: 1, name: 1 }, { unique: true });

exports.City = mongoose.model('City', citySchema);
