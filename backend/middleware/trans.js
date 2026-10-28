const jwt = require('jsonwebtoken');
require('dotenv').config();

const fetchUser = (req, res, next) => {
    const token = req.header('auth-token');

    if (!token) {
        return res.status(401).json({
            message: 'Please authenticate using a valid token.'
        });
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);

        if (!data.user || !data.user.id) {
            return res.status(401).json({
                message: 'Invalid authentication token.'
            });
        }

        req.user = data.user;
        return next();

    } catch (error) {
        return res.status(401).json({
            message: 'Please authenticate using a valid token.'
        });
    }
};

exports.fetchUser = fetchUser;