const Lead = require("../model/enquiryModel");
const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const sendMail = require("../utils/sendEmail");
const Property = require("../model/propertyModel"); // Property model

// Create Lead
// exports.createLead = catchAsyncErrors(async (req, res, next) => {
//     const { propertyId } = req.params; // Fetch Property ID from params
//     const userId = req.user.id; // Fetch logged-in user ID
  
//     const { reasonToBuy, isPropertyDealer, name, phoneNumber, email, message, termsAccepted } = req.body;
  
//     if (!termsAccepted) {
//       return next(new ErrorHander("You must accept Terms & Conditions", 400));
//     }
  
//     const lead = await Lead.create({
//       userId, 
//       propertyId,
//       reasonToBuy,
//       isPropertyDealer,
//       name,
//       phoneNumber,
//       email,
//       message,
//       termsAccepted,
//     });
  
//     res.status(201).json({
//       success: true,
//       message: "Lead created successfully",
//       lead,
//     });
//   });

exports.createLead = catchAsyncErrors(async (req, res, next) => {
  const { propertyId } = req.params; 
  const userId = req.user.id; 

  const { reasonToBuy, isPropertyDealer, name, phoneNumber, email, message, termsAccepted } = req.body;

  if (!termsAccepted) {
      return next(new ErrorHander("You must accept Terms & Conditions", 400));
  }

  // Fetch property details and populate agent (userId)
  const property = await Property.findById(propertyId).populate("userId");
  if (!property) {
      return next(new ErrorHander("Property not found", 404));
  }

  const agentEmail = property.userId.email; 

  // Directly create the lead without checking for duplicate emails
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

  // Send email to agent
  const emailSubject = "New Lead Received for Your Property";
  const emailText = `Hello ${property.userId.name}, 

You have received a new lead for your property. Here are the details:

- Name: ${name}
- Phone: ${phoneNumber}
- Email: ${email}
- Message: ${message}

Please contact the lead as soon as possible.

Best Regards, 
Your Company Name`;

  await sendMail({
      email: agentEmail,
      subject: emailSubject,
      message: emailText,
  });

  res.status(201).json({
      success: true,
      message: "Lead created successfully, Email sent to agent",
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

