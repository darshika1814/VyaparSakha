
const model = require('../model/transaction');
const Transaction = model.Transaction;

const messages = {
    invalidAmount: 'Invalid Alount',
    invalidType: 'Please choose correct type.',
    invalidDescription: 'Invalid Description',
    insufficientBalance: (balance) =>
        `Insufficient Balance! Current Balance: ₹${balance.toLocaleString('en-IN')}`,
    notFound: 'transaction not found',
    serverError: 'Server error.'
};

// Calculate a user's credit, debit and balance.
async function getBalanceSummary(userId, excludeTransactionId = null) {
    const query = { user: userId };

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

    return {
        credit,
        debit,
        balance: credit - debit
    };
}

// Validate an amount.
function isValidAmount(amount) {
    return (
        amount !== undefined &&
        amount !== null &&
        amount !== '' &&
        Number.isFinite(Number(amount)) &&
        Number(amount) > 0
    );
}

// Get all transactions for the authenticated user.
exports.getAlltransaction = async (req, res) => {
    try {
        const transactions = await Transaction.find({
            user: req.user.id
        });

        return res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return res.status(500).json({
            message: messages.serverError
        });
    }
};

// Get one transaction belonging to the authenticated user.
exports.getTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!transaction) {
            return res.status(404).json({
                message: messages.notFound
            });
        }

        return res.json(transaction);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return res.status(500).json({
            message: messages.serverError
        });
    }
};

// Create a transaction with balance validation.
exports.createTransaction = async (req, res) => {
    try {
        const { amount, description, type, img } = req.body;

        if (!isValidAmount(amount)) {
            return res.status(400).json({
                message: messages.invalidAmount
            });
        }

        if (!['credit', 'debit'].includes(type)) {
            return res.status(400).json({
                message: messages.invalidType
            });
        }

        if (
            typeof description !== 'string' ||
            !description.trim()
        ) {
            return res.status(400).json({
                message: messages.invalidDescription
            });
        }

        const transactionAmount = Number(amount);
        const summary = await getBalanceSummary(req.user.id);

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

        const transaction = new Transaction({
            user: req.user.id,
            amount: transactionAmount,
            description: description.trim(),
            type,
            images: Array.isArray(img) ? img : []
        });

        await transaction.save();

        return res.status(201).json({
            message: 'Transaction Added Successfully. ',
            transaction,
            balance: newBalance
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        return res.status(500).json({
            message: messages.serverError
        });
    }
};

// Update a transaction with the same balance rules.
exports.upadateTransaction = async (req, res) => {
    try {
        const { amount, description, type, date } = req.body;
        const transactionId = req.params.id;

        // Find the existing transaction owned by this user.
        const existingTransaction = await Transaction.findOne({
            _id: transactionId,
            user: req.user.id
        });

        if (!existingTransaction) {
            return res.status(404).json({
                message: messages.notFound
            });
        }

        const newAmount =
            amount !== undefined
                ? amount
                : existingTransaction.amount;

        const newType =
            type !== undefined
                ? type
                : existingTransaction.type;

        if (!isValidAmount(newAmount)) {
            return res.status(400).json({
                message: messages.invalidAmount
            });
        }

        if (!['credit', 'debit'].includes(newType)) {
            return res.status(400).json({
                message: messages.invalidType
            });
        }

        if (description !== undefined) {
            if (
                typeof description !== 'string' ||
                !description.trim()
            ) {
                return res.status(400).json({
                    message: messages.invalidDescription
                });
            }
        }

        let parsedDate;

        if (date !== undefined) {
            parsedDate = new Date(date);

            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    message: 'कृपया सही तारीख दर्ज करें।'
                });
            }
        }

        // Calculate the balance without the old transaction.
        const summary = await getBalanceSummary(
            req.user.id,
            transactionId
        );

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

        // Apply the validated updates.
        existingTransaction.amount = transactionAmount;
        existingTransaction.type = newType;

        if (description !== undefined) {
            existingTransaction.description = description.trim();
        }

        if (parsedDate !== undefined) {
            existingTransaction.date = parsedDate;
        }

        await existingTransaction.save();

        return res.json({
            message: 'Transaction Updated successfully.',
            transaction: existingTransaction,
            balance: newBalance
        });
    } catch (error) {
        console.error('Error updating transaction:', error);
        return res.status(500).json({
            message: messages.serverError
        });
    }
};

// Get a user's transactions and balance summary.
exports.getTransactionbyUser = async (req, res) => {
    try {
        const transactions = await Transaction.find({
            user: req.user.id
        });

        const summary = await getBalanceSummary(req.user.id);

        return res.json({
            credit: summary.credit,
            debit: summary.debit,
            balance: summary.balance,
            transactions
        });
    } catch (error) {
        console.error('Error fetching user transactions:', error);
        return res.status(500).json({
            message: messages.serverError
        });
    }
};

// Delete a transaction belonging to the authenticated user.
exports.deleteTransactionbyUser = async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });

        if (!transaction) {
            return res.status(404).json({
                message: messages.notFound
            });
        }

        return res.json({
            success: 'Transaction deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return res.status(500).json({
            message: messages.serverError
        });
    }
};
