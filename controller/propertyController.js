const Property = require('../model/propertyModel');
const Subscription = require('../model/subscriptionModel');
const UserActivity = require("../model/UserActivity");
const catchAsyncError = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorhandler');
const Notification = require("../model/notificationModel"); // Import Notification Model
const User = require("../model/customerModel")
require("dotenv").config();

exports.createProperty = catchAsyncError(async (req, res, next) => {
  const { 
    propertyName, propertyType, location, flatType, roomDetails, areaDetails, priceDetails, 
    additionalDetails,overview, propertyStatus, propertyAge, amenities, nearbyFacilities, 
    agentDetails, propertyVisibility, allowDirectMessages, allowDirectCalls 
  } = req.body;

  // Validation Check
  if (!overview || !propertyName || !propertyType || !location || !flatType || !roomDetails || !areaDetails || !priceDetails || !propertyStatus || !propertyAge || !amenities || !nearbyFacilities || !agentDetails) {
    return next(new ErrorHandler('All fields are required', 400));
  }

  // ✅ Check Active Subscription of Agent/Builder
  const subscription = await Subscription.findOne({
    userId: req.user._id,
    status: 'Active'
  });

  // if (!subscription) {
  //   return res.status(403).json({
  //     success: false,
  //     message: "No Active Subscription Found"
  //   });
  // }

  // ✅ Count Total Properties Added by the User
  const totalProperties = await Property.countDocuments({ userId: req.user._id });

  // ✅ Check Property Limit Based on Plan
  // if (totalProperties >= subscription.propertyLimit) {
  //   return res.status(403).json({
  //     success: false,
  //     message: `You have reached the property limit of ${subscription.propertyLimit} for your ${subscription.planName} Plan.`
  //   });
  // }

  // ✅ Handle Property Image
  let propertyImages = req.file ? req.file.path : '';

  // ✅ Create Property
  const property = await Property.create({
    userId: req.user._id,  // Fetch Authenticated User ID
    propertyName,
    propertyType,
    overview,
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

  // ✅ Send Notifications to All Users
  const users = await User.find({}, "_id"); // Fetch all users
  const notifications = users.map(user => ({
    userId: user._id,
    message: `New property listed: ${propertyType} in ${location.city}`,
    propertyId: property._id, // 🔥 Include property ID in the notification
    createdAt: new Date(),
  }));

  await Notification.insertMany(notifications); // Save notifications to DB

  res.status(201).json({
    success: true,
    message: "Property Added Successfully & Users Notified",
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
// });l


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

// Edit Property API
// exports.editProperty = catchAsyncError(async (req, res, next) => {
//   const { propertyId } = req.params;
//   const updates = req.body;

//   // Validate Property ID
//   const property = await Property.findById(propertyId);
//   if (!property) {
//     return next(new ErrorHandler("Property not found", 404));
//   }

  
//   if (req.file) {
//     property.propertyImages = req.file.path;
//   }

//   // Ensure the user owns the property
//   if (property.userId.toString() !== req.user._id.toString()) {
//     return res.status(403).json({
//       success: false,
//       message: "Unauthorized to edit this property",
//     });
//   }

//   // Update Property Details
//   Object.assign(property, updates);
//   await property.save();

//   res.status(200).json({
//     success: true,
//     message: "Property updated successfully",
//     property,
//   });
// });

exports.editProperty = catchAsyncError(async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Check if property exists
    let property = await Property.findById(propertyId);
    if (!property) {
      return next (new ErrorHandler("Property not found",404 ));
    }

    // Handle propertyImages update (if new images are uploaded)
    if (req.files && req.files.length > 0) {
      const uploadedImages = req.files.map(file => file.path);
      req.body.propertyImages = uploadedImages; // Add to request body
    }

    // Update the property
    property = await Property.findByIdAndUpdate(propertyId, req.body, { new: true });

    res.status(200).json({
      success: true,
      message: "Property updated successfully",
      property
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Share Property API
// exports.shareProperty = catchAsyncError(async (req, res, next) => {
//   const { propertyId } = req.params;

//   // Validate Property ID
//   const property = await Property.findById(propertyId);
//   if (!property) {
//     return next(new ErrorHandler("Property not found", 404));
//   }
//   FRONTEND_URL = "https://marge-real-estate-project.web.app/"
//   // Generate Shareable Link
//   const shareableLink = `${process.env.FRONTEND_URL}/property/${propertyId}`;

//   res.status(200).json({
//     success: true,
//     message: "Shareable link generated successfully",
//     shareableLink,
//     platforms: ["WhatsApp", "Gmail", "Instagram", "Telegram", "Snapchat"],
//   });
// });

exports.shareProperty = catchAsyncError(async (req, res, next) => {
  const { propertyId } = req.params;

  // Validate Property ID
  const property = await Property.findById(propertyId);
  if (!property) {
    return next(new ErrorHandler("Property not found", 404));
  }

  // 🔹 Define your frontend property link
  const frontendUrl = "https://marge-real-estate-project.web.app";
  const shareableLink = `${frontendUrl}/api/v1/property/${propertyId}`;

  // 🔹 Generate sharing links for different platforms
  const shareLinks = {
    WhatsApp: `https://wa.me/?text=${encodeURIComponent(shareableLink)}`,
    Gmail: `mailto:?subject=Check%20out%20this%20property&body=${encodeURIComponent(shareableLink)}`,
    Instagram: shareableLink, // Instagram doesn't allow direct API sharing
    Telegram: `https://t.me/share/url?url=${encodeURIComponent(shareableLink)}`,
    Snapchat: shareableLink, // Snapchat requires deep links in mobile apps
  };

  res.status(200).json({
    success: true,
    message: "Shareable link generated successfully",
    shareableLink,
    platforms: Object.keys(shareLinks),
    shareLinks,
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
exports.getPropertyImages = catchAsyncError(async (req, res, next) => {
  const { propertyId } = req.params;

  // Fetch property by ID and select only propertyImages field
  const property = await Property.findById(propertyId).select("propertyImages");

  if (!property) {
      return next(new ErrorHandler("Property not found", 404));
  }

  if (!property.propertyImages || property.propertyImages.length === 0) {
      return next(new ErrorHandler("No images found for this property", 404));
  }

  res.status(200).json({
      success: true,
      images: property.propertyImages,  // Use propertyImages
  });
});

exports.getAllPropertyImages = catchAsyncError(async (req, res, next) => {
  // Fetch all properties and select only propertyImages field
  const properties = await Property.find().select("propertyImages");

  if (!properties || properties.length === 0) {
      return next(new ErrorHandler("No properties found", 404));
  }

  // Extract only the images from each property
  const allImages = properties
      .map(property => property.propertyImages)
      .filter(images => images && images.length > 0) // Remove properties without images
      .flat(); // Flatten the array

  if (allImages.length === 0) {
      return next(new ErrorHandler("No images found for any properties", 404));
  }

  res.status(200).json({
      success: true,
      images: allImages, // Return all images in a single array
  });
});

exports.getAllPropertyImagesWithIds = catchAsyncError(async (req, res, next) => {
  // Fetch all properties and select only _id and propertyImages fields
  const properties = await Property.find().select("_id propertyImages");

  if (!properties || properties.length === 0) {
      return next(new ErrorHandler("No properties found", 404));
  }

  // Format the response to include property ID with its images
  const propertyImagesData = properties
      .filter(property => property.propertyImages && property.propertyImages.length > 0) // Remove properties without images
      .map(property => ({
          propertyId: property._id,
          images: property.propertyImages
      }));

  if (propertyImagesData.length === 0) {
      return next(new ErrorHandler("No images found for any properties", 404));
  }

  res.status(200).json({
      success: true,
      properties: propertyImagesData // Return array of property IDs with images
  });
});



// Fetch properties based on location
// exports.getPropertiesByLocation = catchAsyncError(async (req, res, next) => {
//   const { city, area, pincode } = req.query;

//   // Build the query object dynamically
//   let query = {};
//   if (city) query["location.city"] = city;
//   if (area) query["location.area"] = area;
//   if (pincode) query["location.pincode"] = pincode;

//   const properties = await Property.find(query);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found for the given location", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties
//   });
// });

// exports.getPropertiesByLocation = catchAsyncError(async (req, res, next) => {
//   const { city, area, pincode } = req.query;

//   let query = {};

//   if (city) query["location.city"] = { $regex: city, $options: "i" };
//   if (area) query["location.area"] = { $regex: area, $options: "i" };
//   if (pincode) query["location.pincode"] = { $regex: pincode, $options: "i" };

//   const properties = await Property.find(query);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found for the given location", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties
//   });
// });
// exports.getPropertiesByLocation = catchAsyncError(async (req, res, next) => {
//   const { query } = req.query; 

//   if (!query || query.trim() === "") {
//     return next(new ErrorHandler("Please provide a valid search query", 400));
//   }

//   let searchCondition = {
//     $or: [
//       { "location.city": { $regex: query, $options: "i" } },      
//       { "location.area": { $regex: query, $options: "i" } },      
//       { "location.pincode": { $regex: query, $options: "i" } }    
//     ]
//   };

//   const properties = await Property.find(searchCondition);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found for the given query", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties
//   });
// });


// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   let filterConditions = {}; // Initialize filter conditions

//   const { 
//     query, 
//     propertyType, 
//     transactionType, 
//     city, 
//     area, 
//     pincode, 
//     flatType, 
//     bedrooms, 
//     bathrooms, 
//     balconies, 
//     minPrice, 
//     maxPrice, 
//     status, 
//     propertyStatus, 
//     propertyAge, 
//     amenities, 
//     nearbyFacilities 
//   } = req.query;

//   // Search by query (city, area, pincode)
//   if (query && query.trim() !== "") {
//     filterConditions.$or = [
//       { "location.city": { $regex: query, $options: "i" } },
//       { "location.area": { $regex: query, $options: "i" } },
//       { "location.pincode": { $regex: query, $options: "i" } }
//     ];
//   }

//   // Filter by exact values
//   if (propertyType) filterConditions.propertyType = propertyType;
//   if (transactionType) filterConditions["priceDetails.transactionType"] = transactionType;
//   if (city) filterConditions["location.city"] = city;
//   if (area) filterConditions["location.area"] = area;
//   if (pincode) filterConditions["location.pincode"] = pincode;
//   if (flatType) filterConditions.flatType = flatType;
//   if (status) filterConditions.status = status;
//   if (propertyStatus) filterConditions.propertyStatus = propertyStatus;
//   if (propertyAge) filterConditions.propertyAge = propertyAge;

//   // Filter by number values (bedrooms, bathrooms, balconies)
//   if (bedrooms) filterConditions["roomDetails.bedrooms"] = parseInt(bedrooms);
//   if (bathrooms) filterConditions["roomDetails.bathrooms"] = parseInt(bathrooms);
//   if (balconies) filterConditions["roomDetails.balconies"] = parseInt(balconies);

//   // Price range filter
//   if (minPrice || maxPrice) {
//     filterConditions["priceDetails.expectedPrice"] = {};
//     if (minPrice) filterConditions["priceDetails.expectedPrice"].$gte = parseFloat(minPrice);
//     if (maxPrice) filterConditions["priceDetails.expectedPrice"].$lte = parseFloat(maxPrice);
//   }

//   // Filter by amenities (array match)
//   if (amenities) {
//     filterConditions.amenities = { $all: amenities.split(",") }; 
//   }

//   // Filter by nearby facilities (array match)
//   if (nearbyFacilities) {
//     filterConditions.nearbyFacilities = { $all: nearbyFacilities.split(",") }; 
//   }

//   // Fetch properties based on filters
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });

// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   let filterConditions = {}; // Initialize filter conditions

//   const { query, propertyType, transactionType, city, area, pincode, flatType, bedrooms, bathrooms, balconies, status, propertyStatus, propertyAge, amenities, nearbyFacilities } = req.query;

//   // Handle multiple search values in `query` parameter
//   if (query && query.trim() !== "") {
//     const searchTerms = query.split(",").map(term => term.trim()); // Convert to array

//     filterConditions.$or = searchTerms.map(term => ({
//       $or: [
//         { "location.city": { $regex: term, $options: "i" } },
//         { "location.area": { $regex: term, $options: "i" } },
//         { "location.pincode": { $regex: term, $options: "i" } },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }
//       ]
//     }));
//   }

//   // Filter by exact values
//   if (propertyType) filterConditions.propertyType = propertyType;
//   if (transactionType) filterConditions["priceDetails.transactionType"] = transactionType;
//   if (city) filterConditions["location.city"] = city;
//   if (area) filterConditions["location.area"] = area;
//   if (pincode) filterConditions["location.pincode"] = pincode;
//   if (flatType) filterConditions.flatType = flatType;
//   if (status) filterConditions.status = status;
//   if (propertyStatus) filterConditions.propertyStatus = propertyStatus;
//   if (propertyAge) filterConditions.propertyAge = propertyAge;

//   // Filter by number values (bedrooms, bathrooms, balconies)
//   if (bedrooms) filterConditions["roomDetails.bedrooms"] = parseInt(bedrooms);
//   if (bathrooms) filterConditions["roomDetails.bathrooms"] = parseInt(bathrooms);
//   if (balconies) filterConditions["roomDetails.balconies"] = parseInt(balconies);

//   // Filter by amenities (array match)
//   if (amenities) {
//     filterConditions.amenities = { $all: amenities.split(",") };
//   }

//   // Filter by nearby facilities (array match)
//   if (nearbyFacilities) {
//     filterConditions.nearbyFacilities = { $all: nearbyFacilities.split(",") };
//   }

//   // Fetch properties based on filters
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });


// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   let filterConditions = {}; // Initialize filter conditions

//   // Extract multiple filters from query parameters
//   const { 
//     query, propertyType, transactionType, city, area, pincode, 
//     flatType, bedrooms, bathrooms, balconies, status, propertyStatus, 
//     propertyAge, amenities, nearbyFacilities 
//   } = req.query;

//   // 🔹 Handle multiple search values in `query` parameter
//   if (query) {
//     const searchTerms = query.split(",").map(term => term.trim()); // Convert to array
//     filterConditions.$or = searchTerms.map(term => ({
//       $or: [
//         { "location.city": { $regex: term, $options: "i" } },
//         { "location.area": { $regex: term, $options: "i" } },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }
//       ]
//     }));
//   }

//   // 🔹 Filter by exact values
//   if (propertyType) filterConditions.propertyType = propertyType;
//   if (transactionType) filterConditions["priceDetails.transactionType"] = transactionType;
//   if (city) filterConditions["location.city"] = city;
//   if (area) filterConditions["location.area"] = area;
//   if (pincode) filterConditions["location.pincode"] = pincode;
//   if (flatType) filterConditions.flatType = flatType;
//   if (status) filterConditions.status = status;
//   if (propertyStatus) filterConditions.propertyStatus = propertyStatus;
//   if (propertyAge) filterConditions.propertyAge = propertyAge;

//   // 🔹 Filter by number values (bedrooms, bathrooms, balconies)
//   if (bedrooms) filterConditions["roomDetails.bedrooms"] = parseInt(bedrooms);
//   if (bathrooms) filterConditions["roomDetails.bathrooms"] = parseInt(bathrooms);
//   if (balconies) filterConditions["roomDetails.balconies"] = parseInt(balconies);

//   // 🔹 Filter by amenities (array match)
//   if (amenities) {
//     filterConditions.amenities = { $all: amenities.split(",") };
//   }

//   // 🔹 Filter by nearby facilities (array match)
//   if (nearbyFacilities) {
//     filterConditions.nearbyFacilities = { $all: nearbyFacilities.split(",") };
//   }

//   // 🔹 Fetch properties based on filters
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });

// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   let filterConditions = {}; // Initialize filter conditions

//   const { 
//     query, propertyType, transactionType, city, area, pincode, 
//     flatType, bedrooms, bathrooms, balconies, status, propertyStatus, 
//     propertyAge, amenities, nearbyFacilities 
//   } = req.query;

//   // 🔹 Split the query into search terms
//   const searchTerms = query ? query.split(",").map(term => term.trim()) : [];

//   // 🔹 Ensure City is matched first (avoid Mumbai being returned when searching for Pune)
//   if (city || searchTerms.length) {
//     filterConditions["location.city"] = {
//       $regex: city || searchTerms[0], // First search term should be city
//       $options: "i"
//     };
//   }

//   // 🔹 Handle multiple search values in `query` parameter
//   if (searchTerms.length > 1) {
//     filterConditions.$or = searchTerms.slice(1).map(term => ({
//       $or: [
//         { "location.area": { $regex: term, $options: "i" } },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }
//       ]
//     }));
//   }

//   // 🔹 Filter by exact values
//   if (propertyType) filterConditions.propertyType = propertyType;
//   if (transactionType) filterConditions["priceDetails.transactionType"] = transactionType;
//   if (area) filterConditions["location.area"] = area;
//   if (pincode) filterConditions["location.pincode"] = pincode;
//   if (flatType) filterConditions.flatType = flatType;
//   if (status) filterConditions.status = status;
//   if (propertyStatus) filterConditions.propertyStatus = propertyStatus;
//   if (propertyAge) filterConditions.propertyAge = propertyAge;

//   // 🔹 Filter by number values (bedrooms, bathrooms, balconies)
//   if (bedrooms) filterConditions["roomDetails.bedrooms"] = parseInt(bedrooms);
//   if (bathrooms) filterConditions["roomDetails.bathrooms"] = parseInt(bathrooms);
//   if (balconies) filterConditions["roomDetails.balconies"] = parseInt(balconies);

//   // 🔹 Filter by amenities (array match)
//   if (amenities) {
//     filterConditions.amenities = { $all: amenities.split(",") };
//   }

//   // 🔹 Filter by nearby facilities (array match)
//   if (nearbyFacilities) {
//     filterConditions.nearbyFacilities = { $all: nearbyFacilities.split(",") };
//   }

//   // 🔹 Fetch properties based on filters
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });


// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   let filterConditions = {}; // Initialize filter conditions

//   const { 
//     query, propertyType, transactionType, city, area, pincode, 
//     flatType, bedrooms, bathrooms, balconies, status, propertyStatus, 
//     propertyAge, amenities, nearbyFacilities 
//   } = req.query;

//   // 🔹 Split the query into search terms
//   const searchTerms = query ? query.split(",").map(term => term.trim()) : [];

//   // 🔹 Ensure City is Matched First
//   if (city || searchTerms.length) {
//     filterConditions["location.city"] = {
//       $regex: city || searchTerms[0], // First search term should be city
//       $options: "i"
//     };
//   }

//   // 🔹 Handle multiple search values in `query`
//   searchTerms.forEach(term => {
//     if (term.match(/\d+BHK/i)) { 
//       // Extract numeric value from "3BHK"
//       filterConditions["roomDetails.bedrooms"] = parseInt(term);
//     } else {
//       if (!filterConditions.$or) filterConditions.$or = [];
//       filterConditions.$or.push(
//         { "location.area": { $regex: term, $options: "i" } },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }
//       );
//     }
//   });

//   // 🔹 Filter by exact values
//   if (propertyType) filterConditions.propertyType = propertyType;
//   if (transactionType) filterConditions["priceDetails.transactionType"] = transactionType;
//   if (area) filterConditions["location.area"] = area;
//   if (pincode) filterConditions["location.pincode"] = pincode;
//   if (flatType) filterConditions.flatType = flatType;
//   if (status) filterConditions.status = status;
//   if (propertyStatus) filterConditions.propertyStatus = propertyStatus;
//   if (propertyAge) filterConditions.propertyAge = propertyAge;

//   // 🔹 Ensure exact match for numeric filters
//   if (bedrooms) filterConditions["roomDetails.bedrooms"] = parseInt(bedrooms);
//   if (bathrooms) filterConditions["roomDetails.bathrooms"] = parseInt(bathrooms);
//   if (balconies) filterConditions["roomDetails.balconies"] = parseInt(balconies);

//   // 🔹 Filter by amenities (array match)
//   if (amenities) {
//     filterConditions.amenities = { $all: amenities.split(",") };
//   }

//   // 🔹 Filter by nearby facilities (array match)
//   if (nearbyFacilities) {
//     filterConditions.nearbyFacilities = { $all: nearbyFacilities.split(",") };
//   }

//   // 🔹 Fetch properties based on filters
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });

// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   let filterConditions = {};

//   const {
//     query, propertyType, transactionType, city, area, pincode,
//     flatType, bedrooms, bathrooms, balconies, status, propertyStatus,
//     propertyAge, amenities, nearbyFacilities
//   } = req.query;

//   // 🔹 Split the query into search terms
//   const searchTerms = query ? query.split(",").map(term => term.trim()) : [];

//   // 🔹 Combine location-based filtering
//   if (city || searchTerms.length) {
//     filterConditions["location.city"] = {
//       $regex: city || searchTerms[0],
//       $options: "i"
//     };
//   }
//   if (area) filterConditions["location.area"] = { $regex: area, $options: "i" };
//   if (pincode) filterConditions["location.pincode"] = pincode;

//   // 🔹 Apply search terms to relevant fields
//   searchTerms.forEach(term => {
//     if (/\d+BHK/i.test(term)) {
//       filterConditions["roomDetails.bedrooms"] = parseInt(term);
//     } else {
//       filterConditions.$or = filterConditions.$or || [];
//       filterConditions.$or.push(
//         { "location.area": { $regex: term, $options: "i" } },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }
//       );
//     }
//   });

//   // 🔹 Apply exact value filters
//   Object.assign(filterConditions, {
//     ...(propertyType && { propertyType }),
//     ...(transactionType && { "priceDetails.transactionType": transactionType }),
//     ...(flatType && { flatType }),
//     ...(status && { status }),
//     ...(propertyStatus && { propertyStatus }),
//     ...(propertyAge && { propertyAge })
//   });

//   // 🔹 Numeric filters
//   ["bedrooms", "bathrooms", "balconies"].forEach(field => {
//     if (req.query[field]) {
//       filterConditions[`roomDetails.${field}`] = parseInt(req.query[field]);
//     }
//   });

//   // 🔹 Array filters (amenities & nearbyFacilities)
//   if (amenities) filterConditions.amenities = { $all: amenities.split(",") };
//   if (nearbyFacilities) filterConditions.nearbyFacilities = { $all: nearbyFacilities.split(",") };

//   // 🔹 Fetch filtered properties
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });
// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   const { search } = req.query; // Single search query
  
//   if (!search) {
//     return next(new ErrorHandler("Please provide a search term", 400));
//   }

//   const normalizeInput = (input) => input.toLowerCase().replace(/\s/g, "");

//   const searchTerms = search.split(",").map(term => normalizeInput(term));

//   let filterConditions = {
//     $or: searchTerms.map(term => ({
//       $or: [
//         { "location.city": { $regex: term, $options: "i" } },
//         { "location.area": { $regex: term, $options: "i" } },
//         { "location.pincode": { $regex: term, $options: "i" } },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }
//       ]
//     }))
//   };

//   // 🔹 Fetch properties based on filters
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });
// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   const { search } = req.query; // Single search query
  
//   if (!search) {
//     return next(new ErrorHandler("Please provide a search term", 400));
//   }

//   const normalizeInput = (input) => input.toLowerCase().trim().replace(/\s+/g, " ");

//   const searchTerms = search.split(",").map(term => normalizeInput(term));

//   let filterConditions = {
//     $and: searchTerms.map(term => {
//       if (term.match(/^\d{6}$/)) { // If it's a pincode (6-digit number)
//         return { "location.pincode": term };
//       } else if (term.match(/\dbhk/i)) { // If it's a flatType (1BHK, 2BHK, etc.)
//         return { "flatType": { $regex: `^${term}$`, $options: "i" } };
//       } else if (["pending", "verified", "rejected"].includes(term.toLowerCase())) { // If it's status
//         return { "status": { $regex: `^${term}$`, $options: "i" } };
//       } else if (["ready to move", "under construction"].includes(term.toLowerCase())) { // If it's propertyStatus
//         return { "propertyStatus": { $regex: `^${term}$`, $options: "i" } };
//       } else { // General location search
//         return {
//           $or: [
//             { "location.city": { $regex: term, $options: "i" } },
//             { "location.area": { $regex: term, $options: "i" } }
//           ]
//         };
//       }
//     })
//   };

//   // 🔹 Fetch properties based on filters
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });


// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   const { search } = req.query; 

//   if (!search) {
//     return next(new ErrorHandler("Please provide a search term", 400));
//   }

//   const normalizeInput = (input) => input.toLowerCase().trim();

//   const searchTerms = search.split(",").map(term => normalizeInput(term));

//   let filterConditions = {
//     $or: searchTerms.map(term => ({
//       $or: [
//         { "location.city": { $regex: term, $options: "i" } },
//         { "location.area": { $regex: term, $options: "i" } },
//         { "location.pincode": term },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }  // Fix applied here
//       ]
//     }))
//   };

//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });
// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   const { query } = req.query;

//   if (!search) {
//     return next(new ErrorHandler("Please provide a search term", 400));
//   }

//   const normalizeInput = (input) => input.toLowerCase().trim();

//   // 🔹 Split search terms based on spaces
//   const searchTerms = search.split(" ").map(term => normalizeInput(term));

//   let filterConditions = {
//     $and: searchTerms.map(term => ({
//       $or: [
//         { "location.city": { $regex: term, $options: "i" } },
//         { "location.area": { $regex: term, $options: "i" } },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }
//       ]
//     }))
//   };

//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });

// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   const { query } = req.query;  // Get search query

//   if (!query) {
//     return next(new ErrorHandler("Please provide a search term", 400));
//   }

//   // 🔹 Normalize and split search query
//   const searchTerms = query.toLowerCase().trim().split(" ");

//   let filterConditions = {
//     $and: searchTerms.map(term => ({
//       $or: [
//         { "location.city": { $regex: term, $options: "i" } },
//         { "location.area": { $regex: term, $options: "i" } },
//         { "flatType": { $regex: term, $options: "i" } },
//         { "status": { $regex: term, $options: "i" } },
//         { "propertyStatus": { $regex: term, $options: "i" } }
//       ]
//     }))
//   };

//   // 🔹 Fetch properties based on search conditions
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });


// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   const { query, minPrice, maxPrice } = req.query; // Get search query and budget range

//   if (!query) {
//     return next(new ErrorHandler("Please provide a search term", 400));
//   }

//   // 🔹 Normalize and split search query
//   const searchTerms = query.toLowerCase().trim().split(" ");

//   let filterConditions = {
//     $and: [
//       ...searchTerms.map(term => ({
//         $or: [
//           { "location.city": { $regex: term, $options: "i" } },
//           { "location.area": { $regex: term, $options: "i" } },
//           { "flatType": { $regex: term, $options: "i" } },
//           { "status": { $regex: term, $options: "i" } },
//           { "propertyStatus": { $regex: term, $options: "i" } }
//         ]
//       }))
//     ]
//   };

//   // 🔹 Add Budget Filtering (if minPrice or maxPrice is provided)
//   if (minPrice || maxPrice) {
//     filterConditions.$and.push({
//       "priceDetails.expectedPrice": {
//         ...(minPrice ? { $gte: Number(minPrice) } : {}),
//         ...(maxPrice ? { $lte: Number(maxPrice) } : {})
//       }
//     });
//   }

//   // 🔹 Fetch properties based on search conditions
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found with the given filters", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });

// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   const { query, minPrice, maxPrice } = req.query; // Get search query and budget range

//   if (!query) {
//     return next(new ErrorHandler("Please provide a search term", 400));
//   }

//   // 🔹 Normalize and split search query
//   const searchTerms = query.toLowerCase().trim().split(" ");

//   let filterConditions = {
//     $and: [
//       ...searchTerms.map(term => ({
//         $or: [
//           { "location.city": { $regex: term, $options: "i" } },
//           { "location.area": { $regex: term, $options: "i" } },
//           { "flatType": { $regex: term, $options: "i" } },
//           { "status": { $regex: term, $options: "i" } },
//           { "propertyStatus": { $regex: term, $options: "i" } }
//         ]
//       }))
//     ]
//   };

//   // ✅ Ensure minPrice and maxPrice are valid numbers
//   const min = Number(minPrice);
//   const max = Number(maxPrice);

//   // ✅ Apply flexible price filtering (prices between minPrice and maxPrice)
//   if (!isNaN(min) && !isNaN(max)) {
//     filterConditions.$and.push({
//       "priceDetails.expectedPrice": { $gte: min, $lte: max }
//     });
//   }

//   // 🔹 Fetch properties based on search conditions
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found within the given price range", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });

// exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
//   const { query, minPrice, maxPrice } = req.query;

//   if (!query) {
//     return next(new ErrorHandler("Please provide a search term", 400));
//   }

//   // Normalize and split search query
//   const searchTerms = query.toLowerCase().trim().split(" ");

//   let filterConditions = {
//     $and: [
//       ...searchTerms.map(term => ({
//         $or: [
//           { "location.city": { $regex: term, $options: "i" } },
//           { "location.area": { $regex: term, $options: "i" } },
//           { "flatType": { $regex: term, $options: "i" } },
//           { "status": { $regex: term, $options: "i" } },
//           { "propertyStatus": { $regex: term, $options: "i" } }
//         ]
//       }))
//     ]
//   };

//   // ✅ Ensure minPrice and maxPrice are numbers
//   const min = Number(minPrice);
//   const max = Number(maxPrice);

//   if (!isNaN(min) && !isNaN(max)) {
//     filterConditions.$and.push({
//       "priceDetails.expectedPrice": { $gte: min, $lte: max }
//     });
//   }

//   console.log("Filter Conditions:", JSON.stringify(filterConditions, null, 2)); // 🔹 Debugging

//   // Fetch properties based on conditions
//   const properties = await Property.find(filterConditions);

//   if (!properties.length) {
//     return next(new ErrorHandler("No properties found within the given price range", 404));
//   }

//   res.status(200).json({
//     success: true,
//     properties,
//   });
// });








exports.getFilteredProperties = catchAsyncError(async (req, res, next) => {
  const { query, flatType, status, propertyStatus, minPrice, maxPrice } = req.query;

  let filterConditions = {};

  // 🔹 Search Query Filter
  if (query) {
    const searchTerms = query.toLowerCase().trim().split(" ");
    filterConditions.$or = searchTerms.map((term) => ({
      $or: [
        { "location.city": { $regex: term, $options: "i" } },
        { "location.area": { $regex: term, $options: "i" } },
        { "flatType": { $regex: term, $options: "i" } },
        { "status": { $regex: term, $options: "i" } },
        { "propertyStatus": { $regex: term, $options: "i" } }
      ]
    }));
  }

  // 🔹 BHK Filters (flatType)
  if (flatType) {
    filterConditions.flatType = { $in: flatType.split(",") };
  }

  // 🔹 Status Filters
  if (status) {
    filterConditions.status = { $in: status.split(",") };
  }

  // 🔹 Property Status Filters
  if (propertyStatus) {
    filterConditions.propertyStatus = { $in: propertyStatus.split(",") };
  }

  // 🔹 Price Range Filters (minPrice and maxPrice) → Correct Field `priceDetails.expectedPrice`
  let priceFilter = {};
  if (minPrice) priceFilter.$gte = parseFloat(minPrice);  // Convert to Number
  if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);

  if (Object.keys(priceFilter).length > 0) {
    filterConditions["priceDetails.expectedPrice"] = priceFilter;
  }

  // 🔹 Debugging: Log filter conditions
  console.log("Applied Filters:", JSON.stringify(filterConditions, null, 2));

  try {
    const properties = await Property.find(filterConditions);

    if (!properties.length) {
      return res.status(200).json({
        success: true,
        properties: [],
        message: "No properties found within the specified price range."
      });
    }

    res.status(200).json({
      success: true,
      properties,
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return next(new ErrorHandler("Server Error", 500));
  }
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

exports.getPropertiesByCity = catchAsyncError(async (req, res, next) => {
  const { city } = req.params;

  if (!city) {
      return next(new ErrorHandler("Please provide a city name", 400));
  }

  const regex = new RegExp(city, "i"); // Case-insensitive regex search

  const properties = await Property.find({ "location.city": regex });

  if (!properties.length) {
      return next(new ErrorHandler("No properties found for this city", 404));
  }

  res.status(200).json({
      success: true,
      properties
  });
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

