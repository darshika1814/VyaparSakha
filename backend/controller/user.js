const { User } = require('../model/user');
const { City } = require('../model/city');
const { Transaction } = require('../model/transaction');
const asyncHandler = require('../utils/asyncHandler');
const { isValidId } = require('../utils/ids');

// Every query below filters on req.shopkeeper.id, so a shopkeeper can only
// ever see or change their own customers.

exports.getAlluser = asyncHandler(async (req, res) => {
    const users = await User.find({ shopkeeper: req.shopkeeper.id });
    res.json(users);
});

exports.searchUser = asyncHandler(async (req, res) => {
    const users = await User.find({
        shopkeeper: req.shopkeeper.id,
        name: String(req.query.name || '')
    });
    res.json(users);
});

exports.getUserbyCity = asyncHandler(async (req, res) => {
    const users = await User.find({
        shopkeeper: req.shopkeeper.id,
        address: String(req.query.address || '')
    });
    res.json(users);
});

exports.createUser = asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const address = String(req.body.address || '').trim();
    const mobileno = Number(req.body.mobileno);

    if (!name) {
        return res.status(400).json({ message: 'Customer name is required.' });
    }
    if (!Number.isInteger(mobileno) || String(mobileno).length !== 10) {
        return res
            .status(400)
            .json({ message: 'Please enter a valid 10 digit mobile number.' });
    }

    // The customer must be placed in one of this shopkeeper's cities.
    const city = await City.findOne({
        shopkeeper: req.shopkeeper.id,
        name: address
    });
    if (!city) {
        return res.status(400).json({ message: 'Please choose one of your cities.' });
    }

    try {
        const user = await User.create({
            shopkeeper: req.shopkeeper.id,
            name,
            mobileno,
            address: city.name
        });
        return res.status(201).json(user);
    } catch (error) {
        if (error.code === 11000) {
            return res
                .status(409)
                .json({ message: 'A customer with this mobile number already exists.' });
        }
        throw error;
    }
});

exports.deleteUser = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(404).json({ message: 'Customer not found.' });
    }

    const user = await User.findOneAndDelete({
        _id: req.params.id,
        shopkeeper: req.shopkeeper.id
    });
    if (!user) {
        return res.status(404).json({ message: 'Customer not found.' });
    }

    await Transaction.deleteMany({
        user: user._id,
        shopkeeper: req.shopkeeper.id
    });

    res.json({ success: 'deleted' });
});
