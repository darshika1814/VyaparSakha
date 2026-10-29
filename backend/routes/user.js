const express = require('express');
const userController = require('../controller/user');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
    .get('/',userController.getAlluser)
    .get('/searchuser',userController.searchUser)
    .post('/createUser',userController.createUser)
    .delete('/deleteUser/:id',userController.deleteUser)
    .get('/getbycity',userController.getUserbyCity);

exports.router = router;
