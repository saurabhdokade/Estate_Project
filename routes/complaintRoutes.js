const express = require('express');
const router = express.Router();
const {
    createComplaint,
} = require('../controller/complaintController');
const { isAuthenticatedUser } = require('../middlewares/auth');

// Define Routes
router.post('/compalint/create', isAuthenticatedUser, createComplaint); // Create a new complaint


module.exports = router;
