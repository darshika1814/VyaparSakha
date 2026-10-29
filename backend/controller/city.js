const { City } = require('../model/city');
const { User } = require('../model/user');
const { Transaction } = require('../model/transaction');
const asyncHandler = require('../utils/asyncHandler');
const { isValidId } = require('../utils/ids');

exports.getCity = asyncHandler(async (req, res) => {
    const cities = await City.find({ shopkeeper: req.shopkeeper.id });
    res.json(cities);
});

exports.addCity = asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) {
        return res.status(400).json({ message: 'City name is required.' });
    }

    try {
        await City.create({ shopkeeper: req.shopkeeper.id, name });
    } catch (error) {
        if (error.code === 11000) {
            return res
                .status(409)
                .json({ message: 'Sorry a city with same name exist' });
        }
        throw error;
    }
    res.status(201).json({ Success: 'City added' });
});

exports.deleteCity = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(404).json({ message: 'City not found.' });
    }

    const shopkeeper = req.shopkeeper.id;
    const city = await City.findOne({ _id: req.params.id, shopkeeper });
    if (!city) {
        return res.status(404).json({ message: 'City not found.' });
    }

    const users = await User.find({ address: city.name, shopkeeper });
    const userIds = users.map((user) => user._id);

    await Transaction.deleteMany({ user: { $in: userIds }, shopkeeper });
    await User.deleteMany({ _id: { $in: userIds }, shopkeeper });
    await City.deleteOne({ _id: city._id, shopkeeper });

    res.json({ success: 'Successfully deleted' });
});
