const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const transRouter = require('./routes/transaction');
const cityRouter = require('./routes/city');
const imageRouter = require('./routes/image');
const billRouter = require('./routes/bill');
const smsrouter = require('./routes/sms');

const app = express();

// Comma separated list of allowed frontend origins; open if unset (dev).
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));
app.use(cors({ origin: allowedOrigins }));

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Public routes.
app.use('/auth', authRouter.router);

// Everything below requires a valid shopkeeper JWT (enforced in each router).
app.use('/user', userRouter.router);
app.use('/trans', transRouter.router);
app.use('/city', cityRouter.router);
app.use('/uploads', imageRouter.router);
app.use('/bill', billRouter.router);
app.use('/sms', smsrouter.router);

app.use((req, res) => {
    res.status(404).json({ message: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON body.' });
    }
    if (err.name === 'CastError' || err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Invalid request data.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
});

module.exports = app;
