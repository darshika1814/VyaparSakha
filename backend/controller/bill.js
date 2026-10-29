const { Bill } = require('../model/bill');
const asyncHandler = require('../utils/asyncHandler');
const { isValidId } = require('../utils/ids');

function parseProduct(body) {
    const name = String(body.name || '').trim();
    const price = Number(body.price);
    const quantity = Number(body.quantity);

    if (!name) return { error: 'Item name is required.' };
    if (!Number.isFinite(price) || price < 0) return { error: 'Invalid price.' };
    if (!Number.isFinite(quantity) || quantity < 0) return { error: 'Invalid quantity.' };

    return { name, price, quantity };
}

exports.getAllProduct = asyncHandler(async (req, res) => {
    const products = await Bill.find({ shopkeeper: req.shopkeeper.id });
    res.json(products);
});

exports.addProduct = asyncHandler(async (req, res) => {
    const parsed = parseProduct(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    try {
        const product = await Bill.create({
            shopkeeper: req.shopkeeper.id,
            name: parsed.name,
            price: parsed.price,
            quantity: parsed.quantity
        });
        return res.status(201).json(product);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Product Already Exist' });
        }
        throw error;
    }
});

exports.updateProduct = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(404).json({ message: 'Product not found.' });
    }

    const parsed = parseProduct(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    try {
        const updated = await Bill.findOneAndUpdate(
            { _id: req.params.id, shopkeeper: req.shopkeeper.id },
            { name: parsed.name, price: parsed.price, quantity: parsed.quantity },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        return res.json(updated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Product Already Exist' });
        }
        throw error;
    }
});

exports.deleteProduct = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(404).json({ message: 'Product not found.' });
    }

    const deleted = await Bill.findOneAndDelete({
        _id: req.params.id,
        shopkeeper: req.shopkeeper.id
    });
    if (!deleted) {
        return res.status(404).json({ message: 'Product not found.' });
    }
    res.json({ success: 'Successfully Deleted' });
});

// Clears only this shopkeeper's invoice items.
exports.deleteAll = asyncHandler(async (req, res) => {
    await Bill.deleteMany({ shopkeeper: req.shopkeeper.id });
    res.json({ success: 'All Deleted' });
});
