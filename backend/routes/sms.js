const twilio = require('twilio');
const express = require('express');
const { protect } = require('../middleware/auth');
const transController = require('../controller/transaction');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

let client;
function getClient() {
    if (!client) {
        client = twilio(
            process.env.TWILIO_ACCOUNTSID,
            process.env.TWILIO_AUTHTOKEN
        );
    }
    return client;
}

// The recipient and amount are taken from the database, never from the
// request, so a shopkeeper can only text their own customers.
router.post('/send-sms', asyncHandler(async (req, res) => {
    const customer = await transController.findOwnedCustomer(
        req.shopkeeper.id,
        req.body.customerId
    );
    if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const { balance } = await transController.getBalanceSummary(
        req.shopkeeper.id,
        customer._id
    );

    try {
        const message = await getClient().messages.create({
            body: `Hi, This is a gentle remainder that you have to pay a sum of Rs. ${balance} to ${req.shopkeeper.shopName} as your left out balance`,
            from: process.env.TWILIO_NUMBER,
            to: `+91${customer.mobileno}`
        });
        res.status(200).json({ success: true, sid: message.sid, message: 'Reminder SMS sent successfully.' });
    } catch (err) {
        console.error('Error sending SMS:', err);
        res.status(500).json({ success: false, message: 'Failed to send SMS' });
    }
}));

exports.router = router;
