const Property = require('../model/propertyModel');
const Subscription = require('../model/subscriptionModel');
const catchAsyncError = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorhandler');

// Create Property with Subscription Limit Check
exports.createProperty = catchAsyncError(async (req, res, next) => {
  const { propertyType, location, flatType, roomDetails, areaDetails, priceDetails, additionalDetails, propertyStatus, propertyAge, amenities, nearbyFacilities, agentDetails, propertyVisibility, allowDirectMessages, allowDirectCalls } = req.body;

  // Validation Check
  if (!propertyType || !location || !flatType || !roomDetails || !areaDetails || !priceDetails || !propertyStatus || !propertyAge || !amenities || !nearbyFacilities || !agentDetails) {
    return next(new ErrorHandler('All fields are required', 400));
  }

  // ✅ Check Active Subscription of Agent/Builder
  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: 'Active'
  });

  if (!subscription) {
    return res.status(403).json({
      success: false,
      message: "No Active Subscription Found"
    });
  }

  // ✅ Count Total Properties Added by the User
  const totalProperties = await Property.countDocuments({ userId: req.user._id });

  // ✅ Check Property Limit Based on Plan
  if (totalProperties >= subscription.propertyLimit) {
    return res.status(403).json({
      success: false,
      message: `You have reached the property limit of ${subscription.propertyLimit} for your ${subscription.planName} Plan.`
    });
  }

  // ✅ Handle Property Image
  let propertyImages = req.file ? req.file.path : '';

  // ✅ Create Property
  const property = await Property.create({
    userId: req.user._id,  // Fetch Authenticated User ID
    propertyType,
    location,
    flatType,
    roomDetails,
    areaDetails,
    priceDetails,
    additionalDetails,
    propertyStatus,
    propertyAge,
    amenities,
    nearbyFacilities,
    agentDetails,
    propertyVisibility,
    allowDirectMessages,
    allowDirectCalls,
    propertyImages
  });

  res.status(201).json({
    success: true,
    message: "Property Added Successfully",
    property
  });
});

// API to handle property images only
exports.uploadPropertyImages = catchAsyncError(async (req, res, next) => {
    const { propertyId } = req.params;
  
    if (!propertyId) {
      return next(new ErrorHandler('Property ID is required', 400));
    }
  
    let propertyImages = [];
    if (req.files) {
      propertyImages = req.files.map(file => file.path); // Store file paths in an array
    }
  
    const property = await Property.findById(propertyId);
  
    if (!property) {
      return next(new ErrorHandler('Property not found', 404));
    }
  
    property.propertyImages = propertyImages;
    await property.save();
  
    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      property
    });
});
exports.getPropertyDetails = catchAsyncError(async (req, res, next) => {
    const property = await Property.findById(req.params.id);

    if (!property) {
        return next(new ErrorHandler("Property not found", 404));
    }

    res.status(200).json({
        success: true,
        property
    });
});

exports.getAllProperties = catchAsyncError(async (req, res, next) => {
  const properties = await Property.find();

  if (!properties || properties.length === 0) {
      return next(new ErrorHandler("No properties found", 404));
  }

  res.status(200).json({
      success: true,
      properties
  });
});
