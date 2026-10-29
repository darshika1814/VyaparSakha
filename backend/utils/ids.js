const mongoose = require('mongoose');

// isValidObjectId also accepts any 12-char string; require a real 24-hex id.
exports.isValidId = (value) =>
    typeof value === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(value) &&
    mongoose.isValidObjectId(value);
