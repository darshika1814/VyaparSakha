const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { Shopkeeper } = require('../model/shopkeeper');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = 12;

// Used to keep login timing similar when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

function signToken(shopkeeper) {
    return jwt.sign(
        { type: 'shopkeeper' },
        process.env.JWT_SECRET,
        {
            subject: shopkeeper._id.toString(),
            algorithm: 'HS256',
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );
}

function validationFailed(req, res) {
    const errors = validationResult(req);
    if (errors.isEmpty()) return false;
    res.status(400).json({
        message: errors.array()[0].msg,
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
    return true;
}

exports.register = asyncHandler(async (req, res) => {
    if (validationFailed(req, res)) return;

    const { name, shopName, email, password, mobileno, address, gstin } = req.body;

    const existing = await Shopkeeper.findOne({ email });
    if (existing) {
        return res
            .status(409)
            .json({ message: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    let shopkeeper;
    try {
        shopkeeper = await Shopkeeper.create({
            name,
            shopName,
            email,
            password: hashed,
            mobileno,
            address,
            gstin
        });
    } catch (error) {
        // Two simultaneous sign-ups with the same email.
        if (error.code === 11000) {
            return res
                .status(409)
                .json({ message: 'An account with this email already exists.' });
        }
        throw error;
    }

    return res.status(201).json({
        token: signToken(shopkeeper),
        shopkeeper: shopkeeper.toPublic()
    });
});

exports.login = asyncHandler(async (req, res) => {
    if (validationFailed(req, res)) return;

    const { email, password } = req.body;

    const shopkeeper = await Shopkeeper.findOne({ email }).select('+password');
    const hash = shopkeeper ? shopkeeper.password : DUMMY_HASH;
    const ok = await bcrypt.compare(password, hash);

    if (!shopkeeper || !ok) {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({
        token: signToken(shopkeeper),
        shopkeeper: shopkeeper.toPublic()
    });
});

exports.me = asyncHandler(async (req, res) => {
    const shopkeeper = await Shopkeeper.findById(req.shopkeeper.id);
    if (!shopkeeper) {
        return res.status(401).json({ message: 'Account no longer exists.' });
    }
    return res.json({ shopkeeper: shopkeeper.toPublic() });
});
