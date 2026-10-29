// One-off migration for data created before authentication existed.
//
// Usage (after registering the shopkeeper who owns the old data):
//   node scripts/assign-existing-data.js owner@example.com
//
// Every customer, city, invoice item and transaction that has no
// "shopkeeper" yet is assigned to that account. Safe to run more than once.
require('dotenv').config();
const mongoose = require('mongoose');
const { Shopkeeper } = require('../model/shopkeeper');
const { User } = require('../model/user');
const { City } = require('../model/city');
const { Bill } = require('../model/bill');
const { Transaction } = require('../model/transaction');

async function run() {
    const email = (process.argv[2] || '').trim().toLowerCase();
    if (!email) {
        console.error('Usage: node scripts/assign-existing-data.js <shopkeeper-email>');
        process.exit(1);
    }

    await mongoose.connect(`${process.env.CLOUD_DATABASE}`);

    const owner = await Shopkeeper.findOne({ email });
    if (!owner) {
        console.error(`No shopkeeper registered with email ${email}. Register first.`);
        await mongoose.disconnect();
        process.exit(1);
    }

    const filter = { shopkeeper: { $exists: false } };
    const update = { $set: { shopkeeper: owner._id } };

    for (const [label, Model] of [
        ['customers', User],
        ['cities', City],
        ['invoice items', Bill],
        ['transactions', Transaction]
    ]) {
        const result = await Model.collection.updateMany(filter, update);
        console.log(`${label}: ${result.modifiedCount} assigned to ${email}`);
    }

    await syncIndexes();
    await mongoose.disconnect();
}

// Build the new per-shopkeeper unique indexes.
async function syncIndexes() {
    await Promise.all([User.init(), City.init(), Bill.init(), Transaction.init()]);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
