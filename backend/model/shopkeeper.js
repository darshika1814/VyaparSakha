const mongoose = require('mongoose');
const { Schema } = mongoose;

const shopkeeperSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        shopName: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        // Never returned by default; select it explicitly at login.
        password: { type: String, required: true, select: false },
        mobileno: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
        gstin: { type: String, trim: true, default: '' }
    },
    { timestamps: true }
);

// Safe public representation (no password, no internal fields).
shopkeeperSchema.methods.toPublic = function () {
    return {
        id: this._id.toString(),
        name: this.name,
        shopName: this.shopName,
        email: this.email,
        mobileno: this.mobileno,
        address: this.address,
        gstin: this.gstin
    };
};

exports.Shopkeeper = mongoose.model('Shopkeeper', shopkeeperSchema);
