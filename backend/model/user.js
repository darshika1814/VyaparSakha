const mongoose = require('mongoose');
const { Schema } = mongoose;

// A "User" is a customer of a shopkeeper.
const userSchema = new Schema({
    shopkeeper: {
        type: Schema.Types.ObjectId,
        ref: 'Shopkeeper',
        required: true,
        index: true
    },
    name: {type: String, required: true},
    mobileno: {type: Number, required: true},
    address: {type: String, required: true}
});

// The same mobile number may be a customer of different shopkeepers,
// but only once per shopkeeper.
userSchema.index({ shopkeeper: 1, mobileno: 1 }, { unique: true });

exports.User = mongoose.model('User', userSchema);
