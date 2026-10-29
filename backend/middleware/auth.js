const jwt = require('jsonwebtoken');
const { Shopkeeper } = require('../model/shopkeeper');
const asyncHandler = require('../utils/asyncHandler');

const unauthorized = (res, message = 'Please log in to continue.') =>
    res.status(401).json({ message });

// Verifies "Authorization: Bearer <jwt>", confirms the shopkeeper still
// exists, and exposes req.shopkeeper for tenant-scoped queries.
exports.protect = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return unauthorized(res);
    }

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256']
        });
    } catch (error) {
        const message =
            error.name === 'TokenExpiredError'
                ? 'Your session has expired. Please log in again.'
                : 'Invalid authentication token.';
        return unauthorized(res, message);
    }

    if (!payload || payload.type !== 'shopkeeper' || !payload.sub) {
        return unauthorized(res, 'Invalid authentication token.');
    }

    const shopkeeper = await Shopkeeper.findById(payload.sub);
    if (!shopkeeper) {
        return unauthorized(res, 'Account no longer exists.');
    }

    req.shopkeeper = {
        id: shopkeeper._id.toString(),
        name: shopkeeper.name,
        shopName: shopkeeper.shopName
    };
    return next();
});
