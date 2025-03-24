const express = require('express');
const router = express.Router();
const {createProperty,getAllProperties,getPropertyDetails, uploadPropertyImages} = require('../controller/propertyController');
const upload = require('../utils/multer');
const { isAuthenticatedAgent, isAuthenticatedUser, isAuthenticatedBuilder,isAuthenticatedAgentOrBuilder,authorizeRolesAgent } = require('../middlewares/auth');

// Create Property
router.post('/create',upload.array("propertyImages",5),isAuthenticatedAgentOrBuilder,createProperty);
router.post('/upload/:propertyId', upload.array('propertyImages',5), isAuthenticatedAgent,uploadPropertyImages);


// Get All Properties
router.get('/property/all', isAuthenticatedUser,getAllProperties);

// Get Property by ID
router.get('/property/:id', getPropertyDetails);

module.exports = router;
