const Property = require('../model/propertyModel');
const Subscription = require('../model/subscriptionModel');
const UserActivity = require("../model/UserActivity");
const catchAsyncError = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorhandler');
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
// exports.createProperty = catchAsyncError(async (req, res, next) => {
//   const {
//     propertyType,
//     location,
//     flatType,
//     roomDetails,
//     areaDetails,
//     priceDetails,
//     transactionType, 
//     expectedPrice, 
//     rentPerMonth, 
//     additionalDetails,
//     propertyStatus,
//     propertyAge,
//     amenities,
//     nearbyFacilities,
//     agentDetails,
//     propertyVisibility,
//     allowDirectMessages,
//     allowDirectCalls
//   } = req.body;

//   // ✅ Validation Check
//   if (
//     !propertyType || !location || !flatType || !roomDetails || !areaDetails || 
//     !priceDetails || !propertyStatus || !propertyAge || !amenities || 
//     !nearbyFacilities || !agentDetails || !transactionType
//   ) {
//     return next(new ErrorHandler('All fields are required', 400));
//   }

//   // ✅ Check Active Subscription of Agent/Builder
//   const subscription = await Subscription.findOne({
//     userId: req.user._id,
//     status: 'Active'
//   });

//   if (!subscription) {
//     return res.status(403).json({
//       success: false,
//       message: "No Active Subscription Found"
//     });
//   }

//   // ✅ Count Total Properties Added by the User
//   const totalProperties = await Property.countDocuments({ userId: req.user._id });

//   // ✅ Check Property Limit Based on Plan
//   if (totalProperties >= subscription.propertyLimit) {
//     return res.status(403).json({
//       success: false,
//       message: `You have reached the property limit of ${subscription.propertyLimit} for your ${subscription.planName} Plan.`
//     });
//   }

//   // ✅ Validate `expectedPrice` and `rentPerMonth` based on `transactionType`
//   if (transactionType === "Buy" && !expectedPrice) {
//     return next(new ErrorHandler('Expected Price is required for Buy transactions', 400));
//   }

//   if (transactionType === "Rent/PG" && !rentPerMonth) {
//     return next(new ErrorHandler('Rent Per Month is required for Rent/PG transactions', 400));
//   }

//   // ✅ Handle Property Image Upload
//   let propertyImages = req.file ? req.file.path : '';

//   // ✅ Create Property
//   const property = await Property.create({
//     userId: req.user._id,  // Fetch Authenticated User ID
//     propertyType,
//     location,
//     flatType,
//     roomDetails,
//     areaDetails,
//     priceDetails: {
//       transactionType,
//       expectedPrice: transactionType === "Buy" ? expectedPrice : null,
//       rentPerMonth: transactionType === "Rent/PG" ? rentPerMonth : null,
//       priceNegotiable: priceDetails.priceNegotiable || false
//     },
//     additionalDetails,
//     propertyStatus,
//     propertyAge,
//     amenities,
//     nearbyFacilities,
//     agentDetails,
//     propertyVisibility,
//     allowDirectMessages,
//     allowDirectCalls,
//     propertyImages
//   });

//   res.status(201).json({
//     success: true,
//     message: "Property Added Successfully",
//     property
//   });
// });


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
  const userId = req.user.id; // Get logged-in user ID
  const propertyId = req.params.id; // Get property ID from URL

  const property = await Property.findById(propertyId);
  if (!property) {
      return next(new ErrorHandler("Property not found", 404));
  }

  // 📌 Find or Create User Activity Record
  let userActivity = await UserActivity.findOne({ userId });
  if (!userActivity) {
      userActivity = new UserActivity({
          userId,
          recentlyViewed: [],
          savedProperties: [],
          contactedProperties: []
      });
  }

  // 📌 Remove Existing Entry If It Exists (Avoid Duplicates)
  userActivity.recentlyViewed = userActivity.recentlyViewed.filter(
      (item) => item.propertyId.toString() !== propertyId
  );

  // 📌 Add to Recently Viewed List (With Timestamp)
  userActivity.recentlyViewed.unshift({ propertyId, viewedAt: new Date() });

  // 📌 Keep Only Last 10 Viewed Properties
  if (userActivity.recentlyViewed.length > 10) {
      userActivity.recentlyViewed.pop();
  }

  await userActivity.save();

  res.status(200).json({
      success: true,
      message: "Property details retrieved",
      property,
      recentlyViewed: userActivity.recentlyViewed
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

// Fetch properties based on location
exports.getPropertiesByLocation = catchAsyncError(async (req, res, next) => {
  const { city, area, pincode } = req.query;

  // Build the query object dynamically
  let query = {};
  if (city) query["location.city"] = city;
  if (area) query["location.area"] = area;
  if (pincode) query["location.pincode"] = pincode;

  const properties = await Property.find(query);

  if (!properties.length) {
    return next(new ErrorHandler("No properties found for the given location", 404));
  }

  res.status(200).json({
    success: true,
    properties
  });
});

exports.filterProperties = catchAsyncError(async (req, res, next) => {
  const { 
      city, 
      propertyType, 
      // minPrice, 
      // maxPrice, 
      propertyStatus, 
      flatType, 
      balcony, 
      verified 
  } = req.query;

  let filter = {};

  // ✅ City is inside location object
  if (city) filter["location.city"] = city;
  
  // ✅ Property Type
  if (propertyType) filter.propertyType = propertyType;

  // // ✅ Price is inside priceDetails.expectedPrice
  // if (minPrice && maxPrice) {
  //     filter["priceDetails.expectedPrice"] = { $gte: Number(minPrice), $lte: Number(maxPrice) };
  // } else if (minPrice) {
  //     filter["priceDetails.expectedPrice"] = { $gte: Number(minPrice) };
  // } else if (maxPrice) {
  //     filter["priceDetails.expectedPrice"] = { $lte: Number(maxPrice) };
  // }

  // ✅ Property Status
  if (propertyStatus) filter.propertyStatus = propertyStatus;

  // ✅ Flat Type
  if (flatType) filter.flatType = flatType;

  // ✅ Balcony (Modify if stored differently)
  if (balcony !== undefined) filter["roomDetails.balconies"] = Number(balcony);

  // ✅ Verified Status (Modify if stored differently)
  if (verified !== undefined) filter.status = verified === "true" ? "Verified" : "Pending";

  try {
      const properties = await Property.find(filter);

      res.status(200).json({
          success: true,
          count: properties.length,
          properties
      });
  } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ success: false, message: "Server Error" });
  }
});


exports.filterPropertiesByBudget = catchAsyncError(async (req, res, next) => {
  let { minPrice, maxPrice } = req.query;

  let filter = {};

  // Convert price from crores to actual value
  if (minPrice) minPrice = Number(minPrice) * 10000000; // 1 Crore = 10,000,000
  if (maxPrice) maxPrice = Number(maxPrice) * 10000000; 

  // Handle "100+ Crores" (means no upper limit)
  if (maxPrice && maxPrice >= 1000000000) {
      filter["priceDetails.expectedPrice"] = { $gte: minPrice };
  } else if (minPrice && maxPrice) {
      filter["priceDetails.expectedPrice"] = { $gte: minPrice, $lte: maxPrice };
  } else if (minPrice) {
      filter["priceDetails.expectedPrice"] = { $gte: minPrice };
  } else if (maxPrice) {
      filter["priceDetails.expectedPrice"] = { $lte: maxPrice };
  }

  try {
      const properties = await Property.find(filter);

      res.status(200).json({
          success: true,
          count: properties.length,
          properties
      });
  } catch (error) {
      console.error("Error fetching properties by budget:", error);
      res.status(500).json({ success: false, message: "Server Error" });
  }
});


exports.getVerifiedProperties = catchAsyncError(async (req, res, next) => {
    const properties = await Property.find({ status: "Verified" });

    res.status(200).json({
        success: true,
        count: properties.length,
        properties,
    });
});

