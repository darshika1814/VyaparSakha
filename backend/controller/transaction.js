const { Transaction } = require('../model/transaction');
const { User } = require('../model/user');
const asyncHandler = require('../utils/asyncHandler');
const { isValidId } = require('../utils/ids');
const mongoose = require('mongoose');
const { fyStartYearOf, fyRange, fyLabel, parseFy } = require('../utils/financialYear');

const messages = {
    invalidAmount: 'Invalid Amount',
    invalidType: 'Please choose correct type.',
    invalidDescription: 'Invalid Description',
    invalidDate: 'Please enter a valid date.',
    insufficientBalance: (balance) =>
        `Insufficient Balance! Current Balance: ₹${balance.toLocaleString('en-IN')}`,
    notFound: 'transaction not found',
    invalidYear: 'Invalid financial year.',
    closedYear: 'This transaction belongs to a closed financial year and can no longer be changed.',
    outsideYear: 'The date must fall in the current financial year (from 1 April).',
    customerNotFound: 'Customer not found.'
};

// Find a customer, but only if it belongs to the logged-in shopkeeper.
async function findOwnedCustomer(shopkeeperId, customerId) {
    if (!isValidId(String(customerId || ''))) return null;
    return User.findOne({ _id: customerId, shopkeeper: shopkeeperId });
}

// Calculate a customer's credit, debit and balance for one financial year
// (the current one unless told otherwise). Everything starts again at 0
// on 1 April; older years are kept and can still be viewed.
async function getBalanceSummary(
    shopkeeperId,
    customerId,
    excludeTransactionId = null,
    fyYear = fyStartYearOf()
) {
    const { start, end } = fyRange(fyYear);
    const query = {
        shopkeeper: shopkeeperId,
        user: customerId,
        date: { $gte: start, $lt: end }
    };

    // When updating, don't count the old transaction.
    if (excludeTransactionId) {
        query._id = { $ne: excludeTransactionId };
    }

    const transactions = await Transaction.find(query);

    let credit = 0;
    let debit = 0;

    for (const transaction of transactions) {
        if (transaction.type === 'credit') {
            credit += transaction.amount;
        } else if (transaction.type === 'debit') {
            debit += transaction.amount;
        }
    }

    return { credit, debit, balance: credit - debit };
}
exports.getBalanceSummary = getBalanceSummary;
exports.findOwnedCustomer = findOwnedCustomer;

function isValidAmount(amount) {
    return (
        amount !== undefined &&
        amount !== null &&
        amount !== '' &&
        Number.isFinite(Number(amount)) &&
        Number(amount) > 0
    );
}

// Bill images must be Cloudinary URLs inside this shopkeeper's own folder.
function validImages(images, shopkeeperId) {
    return (
        Array.isArray(images) &&
        images.every(
            (url) =>
                typeof url === 'string' &&
                url.startsWith('https://res.cloudinary.com/') &&
                url.includes(`/Bills/${shopkeeperId}/`)
        )
    );
}

// All of the shopkeeper's transactions (optionally for one customer).
exports.getAlltransaction = asyncHandler(async (req, res) => {
    const query = { shopkeeper: req.shopkeeper.id };

    if (req.query.customerId !== undefined) {
        if (!isValidId(String(req.query.customerId))) {
            return res.status(400).json({ message: messages.customerNotFound });
        }
        query.user = String(req.query.customerId);
    }

    res.json(await Transaction.find(query));
});

exports.getTransaction = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(404).json({ message: messages.notFound });
    }

    const transaction = await Transaction.findOne({
        _id: req.params.id,
        shopkeeper: req.shopkeeper.id
    });

    if (!transaction) {
        return res.status(404).json({ message: messages.notFound });
    }
    res.json(transaction);
});

exports.createTransaction = asyncHandler(async (req, res) => {
    const { amount, description, type, img, customerId } = req.body;
    const shopkeeperId = req.shopkeeper.id;

    const customer = await findOwnedCustomer(shopkeeperId, customerId);
    if (!customer) {
        return res.status(404).json({ message: messages.customerNotFound });
    }

    if (!isValidAmount(amount)) {
        return res.status(400).json({ message: messages.invalidAmount });
    }
    if (!['credit', 'debit'].includes(type)) {
        return res.status(400).json({ message: messages.invalidType });
    }
    if (typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ message: messages.invalidDescription });
    }

    const images = img === undefined ? [] : img;
    if (!validImages(images, shopkeeperId)) {
        return res.status(400).json({ message: 'Invalid bill image.' });
    }

    const transactionAmount = Number(amount);
    const summary = await getBalanceSummary(shopkeeperId, customer._id);

    let newBalance = summary.balance;

    if (type === 'credit') {
        newBalance += transactionAmount;
    } else {
        if (transactionAmount > summary.balance) {
            return res.status(400).json({
                message: messages.insufficientBalance(summary.balance)
            });
        }
        newBalance -= transactionAmount;
    }

    const transaction = await Transaction.create({
        shopkeeper: shopkeeperId,
        user: customer._id,
        amount: transactionAmount,
        description: description.trim(),
        type,
        images
    });

    res.status(201).json({
        message: 'Transaction Added Successfully. ',
        transaction,
        balance: newBalance
    });
});

exports.upadateTransaction = asyncHandler(async (req, res) => {
    const { amount, description, type, date } = req.body;
    const shopkeeperId = req.shopkeeper.id;

    if (!isValidId(req.params.id)) {
        return res.status(404).json({ message: messages.notFound });
    }

    const existing = await Transaction.findOne({
        _id: req.params.id,
        shopkeeper: shopkeeperId
    });
    if (!existing) {
        return res.status(404).json({ message: messages.notFound });
    }

    // Closed financial years are frozen so their reports never change.
    const currentFy = fyStartYearOf();
    if (fyStartYearOf(existing.date) !== currentFy) {
        return res.status(403).json({ message: messages.closedYear });
    }

    const newAmount = amount !== undefined ? amount : existing.amount;
    const newType = type !== undefined ? type : existing.type;

    if (!isValidAmount(newAmount)) {
        return res.status(400).json({ message: messages.invalidAmount });
    }
    if (!['credit', 'debit'].includes(newType)) {
        return res.status(400).json({ message: messages.invalidType });
    }
    if (
        description !== undefined &&
        (typeof description !== 'string' || !description.trim())
    ) {
        return res.status(400).json({ message: messages.invalidDescription });
    }

    let parsedDate;
    if (date !== undefined) {
        parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: messages.invalidDate });
        }
    }

    if (parsedDate !== undefined && fyStartYearOf(parsedDate) !== currentFy) {
        return res.status(400).json({ message: messages.outsideYear });
    }

    // Balance without the old version of this transaction.
    const summary = await getBalanceSummary(shopkeeperId, existing.user, existing._id);

    const transactionAmount = Number(newAmount);
    let newBalance = summary.balance;

    if (newType === 'credit') {
        newBalance += transactionAmount;
    } else {
        if (transactionAmount > summary.balance) {
            return res.status(400).json({
                message: messages.insufficientBalance(summary.balance)
            });
        }
        newBalance -= transactionAmount;
    }

    existing.amount = transactionAmount;
    existing.type = newType;
    if (description !== undefined) existing.description = description.trim();
    if (parsedDate !== undefined) existing.date = parsedDate;

    await existing.save();

    res.json({
        message: 'Transaction Updated successfully.',
        transaction: existing,
        balance: newBalance
    });
});

// One customer's transactions and balance for a financial year
// (current by default, or ?fy=2025 for 2025-26).
exports.getTransactionbyUser = asyncHandler(async (req, res) => {
    const currentFy = fyStartYearOf();
    const fy = parseFy(req.query.fy, currentFy, currentFy);
    if (fy === null) {
        return res.status(400).json({ message: messages.invalidYear });
    }

    const customer = await findOwnedCustomer(req.shopkeeper.id, req.query.customerId);
    if (!customer) {
        return res.status(404).json({ message: messages.customerNotFound });
    }

    const { start, end } = fyRange(fy);
    const transactions = await Transaction.find({
        shopkeeper: req.shopkeeper.id,
        user: customer._id,
        date: { $gte: start, $lt: end }
    });
    const summary = await getBalanceSummary(req.shopkeeper.id, customer._id, null, fy);

    res.json({
        credit: summary.credit,
        debit: summary.debit,
        balance: summary.balance,
        transactions,
        fy,
        financialYear: fyLabel(fy),
        currentFy,
        readOnly: fy !== currentFy
    });
});

// Report of every customer's credit, debit and balance for a financial
// year. Defaults to the previous (just closed) year.
exports.getYearlyReport = asyncHandler(async (req, res) => {
    const currentFy = fyStartYearOf();
    const fy = parseFy(req.query.fy, currentFy - 1, currentFy);
    if (fy === null) {
        return res.status(400).json({ message: messages.invalidYear });
    }

    const { start, end } = fyRange(fy);
    const rows = await Transaction.aggregate([
        {
            $match: {
                shopkeeper: new mongoose.Types.ObjectId(req.shopkeeper.id),
                date: { $gte: start, $lt: end }
            }
        },
        {
            $group: {
                _id: { user: '$user', type: '$type' },
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    // Fold the (customer, type) groups into one row per customer.
    const perCustomer = new Map();
    for (const row of rows) {
        const key = row._id.user.toString();
        const entry = perCustomer.get(key) || { _id: row._id.user, credit: 0, debit: 0, count: 0 };
        if (row._id.type === 'credit') entry.credit += row.total;
        else if (row._id.type === 'debit') entry.debit += row.total;
        entry.count += row.count;
        perCustomer.set(key, entry);
    }
    const grouped = [...perCustomer.values()];

    const customers = await User.find({
        shopkeeper: req.shopkeeper.id,
        _id: { $in: grouped.map((row) => row._id) }
    });
    const byId = new Map(customers.map((c) => [c._id.toString(), c]));

    const list = grouped
        .filter((row) => byId.has(row._id.toString()))
        .map((row) => {
            const customer = byId.get(row._id.toString());
            return {
                customerId: customer._id,
                name: customer.name,
                mobileno: customer.mobileno,
                address: customer.address,
                credit: row.credit,
                debit: row.debit,
                balance: row.credit - row.debit,
                transactions: row.count
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const credit = list.reduce((sum, row) => sum + row.credit, 0);
    const debit = list.reduce((sum, row) => sum + row.debit, 0);

    res.json({
        fy,
        financialYear: fyLabel(fy),
        currentFy,
        from: start,
        to: new Date(end.getTime() - 1),
        totals: { credit, debit, balance: credit - debit },
        customers: list
    });
});

exports.deleteTransactionbyUser = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(404).json({ message: messages.notFound });
    }

    const transaction = await Transaction.findOne({
        _id: req.params.id,
        shopkeeper: req.shopkeeper.id
    });

    if (!transaction) {
        return res.status(404).json({ message: messages.notFound });
    }
    if (fyStartYearOf(transaction.date) !== fyStartYearOf()) {
        return res.status(403).json({ message: messages.closedYear });
    }

    await Transaction.deleteOne({ _id: transaction._id, shopkeeper: req.shopkeeper.id });
    res.json({ success: 'Transaction deleted successfully.' });
});
