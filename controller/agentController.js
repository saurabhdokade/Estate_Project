const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/agentModel");
const Property = require("../model/propertyModel");
const Visit = require("../model/visitModel")
const Notification = require("../model/NotificationsAgentModel.js");
const AppSettings = require("../model/AppSettingsAgentModel.js");
const NotificationVisit = require("../model/notificationModel.js")
const Privacy = require("../model/PrivacyAgentModel.js");
const PaymentSetting = require('../model/paymentSettingModel.js');
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
const twilio = require("twilio");
const client = new twilio(
  "AC7bb54231c103cfbc47c1392ef09054ee", "e165af85f29b468f47b7b9dc70778f11"
);

exports.registerAgent = async (req, res, next) => {
  try {
    const { phone, name, email, agreedToTerms } = req.body;

    let user = await User.findOne({ phone });

    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "Phone not verified. Please verify OTP first." });
    }

    if (user.name && user.email) {
      return res.status(400).json({ message: "User already exists. Account creation is a one-time process." });
    }

    user.name = name;
    user.email = email;
    user.role = "agent";
    user.agreedToTerms = agreedToTerms;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Agent account created successfully.",
    });
  } catch (error) {
    console.error("❌ Error registering agent:", error);
    return res.status(500).json({ success: false, message: "Failed to register agent. Please try again." });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    let user = await User.findOne({ phone });

    // Generate 6-digit OTP and set expiry (10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    let message = "OTP sent successfully.";

    if (!user) {
      // New user → Register
      user = new User({ phone, otp, otpExpire, isVerified: false });
      await user.save();
      message = "OTP sent for registration.";
    } else {
      // Existing user → Login
      user.otp = otp;
      user.otpExpire = otpExpire;
      await user.save();
      message = "OTP sent for login.";
    }

    // **Log OTP for testing**
    console.log(`OTP for ${phone}: ${otp}`);

    // **Try sending OTP via Twilio, but don't fail the API if Twilio fails**
    try {
      await client.messages.create({
        body: `Your OTP is ${otp}. It expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER || "+13612667244",
        to: phone,
      });
    } catch (twilioError) {
      console.error("⚠ Twilio Error:", twilioError);
      message += " (SMS sending failed, but OTP is generated.)";
    }

    // **Always return success response**
    return res.status(200).json({ success: true, message });

  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
  }
};

exports.verifyOTP = catchAsyncErrors(async (req, res, next) => {
  const { otp } = req.body;

  if (!otp) {
    return next(new ErrorHander("OTP is required", 400));
  }

  const user = await User.findOne({ otp });

  if (!user) {
    return next(new ErrorHander("Invalid OTP", 404));
  }

  // ✅ Check if OTP is expired
  if (user.otpExpire < Date.now()) {
    return next(new ErrorHander("OTP has expired", 400));
  }

  // ✅ Mark user as verified & remove OTP details
  user.isVerified = true;
  user.otp = null;
  user.otpExpire = null;
  await user.save();

  // ✅ Generate JWT token
  const token = jwt.sign(
    { userId: user._id, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // ✅ Store token in HTTP-Only Cookie (More Secure)
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const message = user.name && user.email
    ? "OTP verified successfully"
    : "OTP verified. Please complete registration.";

  return res.status(200).json({ success: true, message, token });
});
// Verify OTP
// Verify OTP
exports.verifyRegister = catchAsyncErrors(async (req, res, next) => {
  const { phone, otp } = req.body;

  const user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (user.otp !== otp) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  if (user.otpExpire < Date.now()) {
    return res.status(400).json({ success: false, message: "OTP has expired" });
  }

  user.isVerified = true;
  user.otp = null;
  user.otpExpire = null;
  await user.save();

  res.status(200).json({ success: true, message: "User verified successfully." });
});




exports.resendOTP = catchAsyncErrors(async (req, res, next) => {
  const { phone } = req.body;

  // Find user by phone number
  const user = await User.findOne({ phone });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Generate 6-digit numeric OTP manually
  const newOTP = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number

  // Save OTP and expiration time (10 minutes)
  user.otp = newOTP;
  user.otpExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  // Send OTP to user's phone (Optional: use Twilio or any SMS service)
  // sendOtpToPhone(newOTP, user.phone);

  res.status(200).json({
    success: true,
    message: "OTP sent successfully",
    otp: newOTP // For testing purposes only
  });
});



// Verify OTP
// exports.verifyOTP = catchAsyncErrors(async (req, res) => {
//     try {
//       const { phone, otp } = req.body;

//       // Find user
//       const user = await User.findOne({ phone });
//       if (!user) {
//         return res.status(404).json({ success: false, message: "User not found" });
//       }

//       // Check if OTP matches
//       if (user.otp !== otp) {
//         return res.status(400).json({ success: false, message: "Invalid OTP" });
//       }

//       // Check if OTP is expired
//       if (user.otpExpire < Date.now()) {
//         return res.status(400).json({ success: false, message: "OTP has expired" });
//       }

//       // Mark user as verified
//       user.isVerified = true;
//       user.otp = null;
//       user.otpExpire = null;
//       await user.save();

//       res.status(200).json({
//         success: true,
//         message: "User verified successfully.",
//       });
//     } catch (error) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   });


// Login User
exports.loginAgent = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHander("Please enter email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHander("Invalid email or password", 401));
  }
  sendToken(user, 200, res);
});


// Logout Agent
exports.logoutAgent = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// Forgot Password
exports.forgotPasswordAgent = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorHander("User not found", 404));
  }

  // Get ResetPassword Token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetToken}`;

  const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it.`;
  try {
    await sendEmail({
      email: user.email,
      subject: `Password Recovery`,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });
    return next(new ErrorHander(error.message, 500));
  }
});

// Reset Password
exports.resetPasswordAgent = catchAsyncErrors(async (req, res, next) => {
  // Creating token hash
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHander("Reset Password Token is invalid or has been expired", 400));
  }

  // Validate new password and confirm password
  if (req.body.password !== req.body.confirmPassword) {
    return next(new ErrorHander("Passwords do not match", 400));
  }

  // Check password strength (optional security check)
  // const passwordStrength = /^(?=.[A-Za-z])(?=.\d)[A-Za-z\d@$!%*?&]{6,}$/;
  // if (!passwordStrength.test(req.body.password)) {
  //   return next(new ErrorHander("Password must be at least 6 characters long and contain at least one letter and one number.", 400));
  // }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  sendToken(user, 200, res); // Assuming you have sendToken function for sending JWT token
});

// Get all users (admin) with optional filtering
exports.getAllUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, role, status, locality } = req.query;

  // Build a dynamic filter object
  const filter = {};
  if (name) filter.name = { $regex: name, $options: 'i' }; // Case-insensitive partial match
  if (email) filter.email = { $regex: email, $options: 'i' }; // Case-insensitive partial match
  if (role) filter.role = role; // Exact match for role
  if (status) filter.status = status; // Exact match for status
  if (locality) filter.locality = locality;

  // Fetch users with or without filters
  const users = await User.find(filter).populate("propertyId", "location")

  res.status(200).json({
    success: true,
    users: users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      locality: user.locality,
      status: user.status,
      registrationDate: user.registrationDate,
      activityLogs: user.activityLogs,
    })),
  });
});

// Get details of an agent with properties
exports.getAgentDetails = catchAsyncErrors(async (req, res, next) => {
  const { agentId } = req.params;

  // Find the agent
  const agent = await User.findById(agentId);

  if (!agent) {
    return res.status(404).json({ success: false, message: "Agent not found" });
  }

  // Find properties associated with this agent
  const properties = await Property.find({ userId: agentId }).select("propertyType location priceDetails.expectedPrice");

  res.status(200).json({
    success: true,
    agent: {
      id: agent._id,
      name: agent.name,
      email: agent.email,
      phoneNumber: agent.phoneNumber, // Ensure correct field names
      agencyName: agent.agencyName,
      experience: agent.experience,
      operatingAreas: agent.operatingAreas,
      about: agent.about,
      status: agent.status,
      isVerified: agent.isVerified,
      registrationDate: agent.createdAt, // Use createdAt from timestamps
      profileImage: agent.profileImage,
      properties, // List of associated properties
    },
  });
});

exports.getAgentProperties = catchAsyncErrors(async (req, res, next) => {
  const { agentId } = req.params;

  // Fetch properties listed by the given agent
  const properties = await Property.find({ userId: agentId });

  if (!properties.length) {
    return res.status(404).json({ success: false, message: "No properties found for this agent" });
  }

  res.status(200).json({
    success: true,
    count: properties.length,
    properties
  });
});

// Get property status count for graph
const mongoose = require("mongoose");

exports.getPropertyStatusCount = catchAsyncErrors(async (req, res, next) => {
  let { agentId } = req.params;

  // Check if agentId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(agentId)) {
    return res.status(400).json({ success: false, message: "Invalid agent ID format" });
  }

  // Convert to ObjectId if valid
  agentId = new mongoose.Types.ObjectId(agentId);

  const statusCounts = await Property.aggregate([
    { $match: { userId: agentId } },
    { $group: { _id: "$propertyStatus", count: { $sum: 1 } } }
  ]);

  const formattedCounts = {
    "Just started": 0,
    "Under Construction": 0,
    "Ready to move": 0
  };

  statusCounts.forEach(({ _id, count }) => {
    formattedCounts[_id] = count;
  });

  const total = Object.values(formattedCounts).reduce((acc, curr) => acc + curr, 0);

  res.status(200).json({
    success: true,
    total,
    statusCounts: formattedCounts
  });
});
// exports.getPropertyStatusCount = catchAsyncErrors(async (req, res, next) => {
//   const { agentId } = req.params; // No need to convert to ObjectId

//   const statusCounts = await Property.aggregate([
//       { $match: { userId: agentId } },  // Directly match as a string
//       { $group: { _id: "$propertyStatus", count: { $sum: 1 } } }
//   ]);

//   const formattedCounts = {
//       "Just started": 0,
//       "Under Construction": 0,
//       "Ready to move": 0
//   };

//   statusCounts.forEach(({ _id, count }) => {
//       formattedCounts[_id] = count;
//   });

//   const total = Object.values(formattedCounts).reduce((acc, curr) => acc + curr, 0);

//   res.status(200).json({
//       success: true,
//       total,
//       statusCounts: formattedCounts
//   });
// });



// -------------------------- Update User Details (Admin Only) --------------------------
exports.updateAgentDetails = catchAsyncErrors(async (req, res, next) => {
  const { name, email, phone, companyName, locality, specialization, experience, specializationType, operatingAreas, about } = req.body;

  // Find user by ID
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ErrorHander("User not found", 404));
  }

  // Update basic user details
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;

  // Update profile picture if provided
  if (req.file) {
    user.userProfile = req.file.path; // File path for profile picture
  }

  // Update Agent Profile details
  if (companyName) user.companyName = companyName;
  if (locality) user.locality = locality;
  if (specialization) user.specialization = specialization;
  if (experience) user.experience = experience;
  if (specializationType) user.specializationType = specializationType;
  if (operatingAreas) user.operatingAreas = operatingAreas
  if (about) user.about = about
  // Save the updated user
  await user.save();

  res.status(200).json({
    success: true,
    message: "Agent profile updated successfully!",
    user,
  });
});


// -------------------------- Delete User (Admin Only) --------------------------
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHander("User not found", 404));
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "User deleted successfully!",
  });
});

//visite confirm

// exports.confirmVisit = catchAsyncErrors(async (req, res, next) => {
//   const { visitId } = req.params;

//   const visit = await Visit.findByIdAndUpdate(
//     visitId,
//     { status: "Confirmed" },
//     { new: true }
//   );

//   if (!visit) {
//     return next(new ErrorHander("Visit not found", 404));
//   }

//   res.status(200).json({
//     success: true,
//     message: "Visit confirmed successfully",
//     visit,
//   });
// });

exports.confirmVisit = catchAsyncErrors(async (req, res, next) => {
  const { visitId } = req.params;

  // ✅ Find and Update Visit Status
  const visit = await Visit.findByIdAndUpdate(
    visitId,
    { status: "Confirmed" },
    { new: true }
  );

  if (!visit) {
    return next(new ErrorHander("Visit not found", 404));
  }

  // ✅ Send Notification to User
  const notification = await NotificationVisit.create({
    userId: visit.userId, // User who booked the visit
    message: `Your visit for property ${visit.propertyId} has been confirmed.`,
    propertyId: visit.propertyId,
    createdAt: new Date(),
  });

  res.status(200).json({
    success: true,
    message: "Visit confirmed successfully & notification sent",
    visit,
  });
});

// ✅ Reschedule Visit API
exports.rescheduleVisit = catchAsyncErrors(async (req, res, next) => {
  const { visitId } = req.params;
  const { newVisitDate } = req.body;

  const visit = await Visit.findByIdAndUpdate(
    visitId,
    { visitDate: newVisitDate, status: "Rescheduled" },
    { new: true }
  );

  if (!visit) {
    return next(new ErrorHander("Visit not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Visit rescheduled successfully",
    visit,
  });
});


//user settings and perfernce 

// Get notification settings
exports.getNotifications = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const notifications = await Notification.findOne({ userId });

  if (!notifications) {
    return next(new ErrorHander("No notification settings found", 404));
  }

  res.status(200).json({ success: true, notifications });
});

// Update notification settings
exports.updateNotifications = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const updatedNotifications = await Notification.findOneAndUpdate(
    { userId },
    { $set: req.body },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, message: "Notifications updated", notifications: updatedNotifications });
});

// Get privacy settings
exports.getPrivacySettings = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const privacySettings = await Privacy.findOne({ userId });

  if (!privacySettings) {
    return next(new ErrorHander("Privacy settings not found", 404));
  }

  res.status(200).json({ success: true, privacySettings });
});

// Update privacy settings
exports.updatePrivacySettings = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const updatedPrivacy = await Privacy.findOneAndUpdate(
    { userId },
    { $set: req.body },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, message: "Privacy settings updated", privacySettings: updatedPrivacy });
});

// Get app settings
exports.getAppSettings = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const appSettings = await AppSettings.findOne({ userId });

  if (!appSettings) {
    return next(new ErrorHander("App settings not found", 404));
  }

  res.status(200).json({ success: true, appSettings });
});

// Update app settings
exports.updateAppSettings = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const updatedAppSettings = await AppSettings.findOneAndUpdate(
    { userId },
    { $set: req.body },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, message: "App settings updated", appSettings: updatedAppSettings });
});


// Create or Update Payment Setting
exports.setPaymentMethod = catchAsyncErrors(async (req, res, next) => {
  const { preferredPaymentMethod } = req.body;
  const userId = req.user.id; // Assuming authentication middleware sets req.user

  if (!['UPI', 'Credit/Debit', 'Net Banking'].includes(preferredPaymentMethod)) {
    return next(new ErrorHander('Invalid payment method', 400));
  }

  let paymentSetting = await PaymentSetting.findOne({ userId });

  if (paymentSetting) {
    // Update existing setting
    paymentSetting.preferredPaymentMethod = preferredPaymentMethod;
  } else {
    // Create new setting
    paymentSetting = new PaymentSetting({ userId, preferredPaymentMethod });
  }

  await paymentSetting.save();
  res.status(200).json({ message: 'Payment method saved successfully', paymentSetting });
});

// Get User's Payment Setting
exports.getPaymentMethod = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const paymentSetting = await PaymentSetting.findOne({ userId });

  if (!paymentSetting) {
    return next(new ErrorHander('No payment method found', 404));
  }

  res.status(200).json({ paymentSetting });
});
