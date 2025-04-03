const express = require('express');
const router = express.Router();
const {createProperty,getAllProperties,getPropertyDetails,getPropertyImages,editProperty,shareProperty,getFilteredProperties,getAllPropertyImagesWithIds,filterPropertiesByBudget,getVerifiedProperties, uploadPropertyImages,getPropertiesByLocation,getAllPropertyImages,filterProperties,getPropertiesByCity} = require('../controller/propertyController');
const upload = require('../utils/multer');
const { isAuthenticatedAgent, isAuthenticatedUser, isAuthenticatedBuilder,isAuthenticatedAgentOrBuilder,authorizeRolesAgent } = require('../middlewares/auth');

// Create Property
router.post('/create',upload.array("propertyImages",5),isAuthenticatedAgentOrBuilder,createProperty);
router.post('/upload/:propertyId', upload.array('propertyImages',5), isAuthenticatedAgent,uploadPropertyImages);


// Get All Properties
router.get('/property/all',getAllProperties);
router.get("/properties/:propertyId/images", getPropertyImages);
// router.get("/properties/images", getAllPropertyImages);
router.get("/properties/images", getAllPropertyImagesWithIds);
// Edit Property Route
router.put("/property/edit/:propertyId", upload.array('propertyImages',5),isAuthenticatedAgentOrBuilder,editProperty);

// Share Property Route
router.get("/share/:propertyId", shareProperty);

// Get Property by ID
router.get('/property/:id',getPropertyDetails);

router.get("/properties/search",getFilteredProperties);

router.get("/properties/filter", filterProperties);
router.get("/properties/budget", filterPropertiesByBudget);
router.get("/properties/verified", getVerifiedProperties);
router.get("/properties/:city", getPropertiesByCity);

module.exports = router;
// properties/budget