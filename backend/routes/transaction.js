const express = require('express');
const transController = require('../controller/transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Every transaction route requires a logged-in shopkeeper.
router.use(protect);

router
    .get('/',transController.getAlltransaction)
    .get('/gettrans/:id',transController.getTransaction)
    .put('/updatetransaction/:id',transController.upadateTransaction)
    .post('/createTransaction',transController.createTransaction)
    .get('/report',transController.getYearlyReport)
    .get('/getbyUser',transController.getTransactionbyUser)
    .delete('/deletetrans/:id',transController.deleteTransactionbyUser);

exports.router = router;
