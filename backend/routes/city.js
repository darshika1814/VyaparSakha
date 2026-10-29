const express = require('express');
const cityController = require('../controller/city');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
    .get('/',cityController.getCity)
    .delete('/deletecity/:id',cityController.deleteCity)
    .post('/addcity',cityController.addCity);

exports.router = router;
