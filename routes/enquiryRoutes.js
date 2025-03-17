const express = require('express');
const router = express.Router();
const { createLead,getLeadsByProperty } = require('../controller/enquiryController');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.post('/create/:propertyId', isAuthenticatedUser, createLead);
router.post("/all" , getLeadsByProperty )
module.exports = router;
