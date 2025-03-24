const Lead = require("../model/enquiryModel");
const ErrorHandler = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

// Create Lead
exports.createLead = catchAsyncErrors(async (req, res, next) => {
    const { propertyId } = req.params; // Fetch Property ID from params
    const userId = req.user.id; // Fetch logged-in user ID
  
    const { reasonToBuy, isPropertyDealer, name, phoneNumber, email, message, termsAccepted } = req.body;
  
    if (!termsAccepted) {
      return next(new ErrorHandler("You must accept Terms & Conditions", 400));
    }
  
    const lead = await Lead.create({
      userId, 
      propertyId,
      reasonToBuy,
      isPropertyDealer,
      name,
      phoneNumber,
      email,
      message,
      termsAccepted,
    });
  
    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      lead,
    });
  });
  
  // Get All Leads by Property ID
 exports.getLeadsByProperty = catchAsyncErrors(async (req, res, next) => {
    const { propertyId } = req.params;
  
    const leads = await Lead.find({ propertyId });
    res.status(200).json({
      success: true,
      leads,
    });
  });

// 🎯 Get All Leads API
exports.getAllLeads = catchAsyncErrors(async (req, res, next) => {
  const leads = await Lead.find().populate('userId', 'name role').populate('propertyId', 'title location');

  res.status(200).json({
    success: true,
    leads,
  });
});

