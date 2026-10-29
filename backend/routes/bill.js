const express = require('express');
const billController = require('../controller/bill');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
    .get('/getproduct',billController.getAllProduct)
    .put('/updateproduct/:id',billController.updateProduct)
    .delete('/deleteproduct/:id',billController.deleteProduct)
    .delete('/deleteAll',billController.deleteAll)
    .post('/addproduct',billController.addProduct);

exports.router = router;
