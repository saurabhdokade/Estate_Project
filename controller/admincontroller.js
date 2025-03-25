const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/adminModel.js");
const Users = require("../model/customerModel.js")
const Agent = require('../model/agentModel');
const Builder = require('../model/builderModel');
const Property = require('../model/propertyModel');
const Lead = require("../model/enquiryModel");
const Subscription = require('../model/subscriptionModel');
const Visit = require('../model/visitModel');
const Complaint = require("../model/complaintModel.js")
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const otpGenerator = require('otp-generator');
const client = new twilio(process.env.TWILIO_ACCOUNT_SID , process.env.TWILIO_AUTH_TOKEN);

// const client = new twilio(process.env.TWILIO_ACCOUNT_SID || "AC7bb54231c103cfbc47c1392ef09054ee", process.env.TWILIO_AUTH_TOKEN || "403414025177e98738163ee945c25142");

exports.registeradmin = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, confirmPassword, phone, role } = req.body;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  if (phone && !phoneRegex.test(phone)) {
    return res.status(400).json({ message: "Invalid phone number format. Please include a valid country code." });
  }

  let user = await User.findOne({ where: { phone } });

  const otp = crypto.randomInt(100000, 999999);
  const otpExpire = Date.now() + 10 * 60 * 1000;

  const message = `Your OTP for registration is ${otp}. It will expire in 10 minutes.`;

  if (user) {
    if (user.otpExpire > Date.now()) {
      return res.status(400).json({ message: "OTP is still valid. Please check your phone." });
    }

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER ,
        to: phone,
      });
    } catch (error) {
      if (error.code === 21608) {
        console.error("Twilio Error: Unverified number.");
      } else {
        console.error("Twilio Error:", error.message);
      }
    }

    return res.status(200).json({ success: true, message: "New OTP sent to your phone." });
  }

  const userRole = role || "admin";

  user = await User.create({ name, email, password, confirmPassword, phone, role: userRole, status: "active" });

  user.otp = otp;
  user.otpExpire = otpExpire;
  await user.save();

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER || "+1234567890",
      to: phone,
    });
  } catch (error) {
    if (error.code === 21608) {
      console.error("Twilio Error: Unverified number.");
    } else {
      console.error("Twilio Error:", error.message);
    }
  }

  res.status(201).json({ user, message: "User registered successfully. OTP sent to your phone." });
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
exports.verifyOTP = catchAsyncErrors(async (req, res) => {
    try {
      const { phone, otp } = req.body;
  
      // Find user
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // Check if OTP matches
      if (user.otp !== otp) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
  
      // Check if OTP is expired
      if (user.otpExpire < Date.now()) {
        return res.status(400).json({ success: false, message: "OTP has expired" });
      }
  
      // Mark user as verified
      user.isVerified = true;
      user.otp = null;
      user.otpExpire = null;
      await user.save();
  
      res.status(200).json({
        success: true,
        message: "User verified successfully.",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });


// Login User
exports.loginadmin = catchAsyncErrors(async (req, res, next) => {
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


// Logout admin
exports.logoutadmin = catchAsyncErrors(async (req, res, next) => {
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
exports.forgotPasswordadmin = catchAsyncErrors(async (req, res, next) => {
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
exports.resetPasswordadmin = catchAsyncErrors(async (req, res, next) => {
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
    const { name, email, role, status } = req.query;

    // Build a dynamic filter object
    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' }; // Case-insensitive partial match
    if (email) filter.email = { $regex: email, $options: 'i' }; // Case-insensitive partial match
    if (role) filter.role = role; // Exact match for role
    if (status) filter.status = status; // Exact match for status

    // Fetch users with or without filters
    const users = await User.find(filter);

    res.status(200).json({
        success: true,
        users: users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            registrationDate: user.registrationDate,
            activityLogs: user.activityLogs,
        })),
    });
});


exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
    const { name, email, role, status } = req.query;

    // Build a dynamic filter object
    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' }; // Case-insensitive partial match
    if (email) filter.email = { $regex: email, $options: 'i' }; // Case-insensitive partial match
    if (role) filter.role = role; // Exact match for role
    if (status) filter.status = status; // Exact match for status

    // Fetch users with or without filters
    const users = await Users.find(filter);

    res.status(200).json({
        success: true,
        users: users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            registrationDate: user.registrationDate,
            activityLogs: user.activityLogs,
        })),
    });
});
// -------------------------- Update User Details (Admin Only) --------------------------
exports.updateadminDetails = catchAsyncErrors(async (req, res, next) => {
    const { name, email, phone, companyName, locality, specialization, experience, specializationType } = req.body;

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

    // Update admin Profile details
    if (companyName) user.companyName = companyName;
    if (locality) user.locality = locality;
    if (specialization) user.specialization = specialization;
    if (experience) user.experience = experience;
    if (specializationType) user.specializationType = specializationType;

    // Save the updated user
    await user.save();

    res.status(200).json({
        success: true,
        message: "admin profile updated successfully!",
        user,
    });
});


// -------------------------- Delete User (Admin Only) --------------------------
// exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
//     const user = await User.findById(req.params.id);

//     if (!user) {
//         return next(new ErrorHander("User not found", 404));
//     }

//     await user.deleteOne();

//     res.status(200).json({
//         success: true,
//         message: "User deleted successfully!",
//     });
// });

// -------------------------- Update User Details (Admin Only) --------------------------
exports.updateUserDetails = catchAsyncErrors(async (req, res, next) => {
    const {name, email, phone } = req.body;

    // Validate role if provided
   
    // Find user by ID
    const user = await Users.findById(req.params.id);
    if (!user) {
        return next(new ErrorHander("User not found", 404));
    }

    // Update fields if provided in the request body
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    if (req.file) {
        user.userProfile = req.file.path;
      }
    // Save the updated user
    await user.save();

    res.status(200).json({
        success: true,
        message: "User details updated successfully!",
        user,
    });
});

// -------------------------- Delete User (Admin Only) --------------------------
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
    const user = await Users.findById(req.params.id);

    if (!user) {
        return next(new ErrorHander("User not found", 404));
    }

    await user.deleteOne();

    res.status(200).json({
        success: true,
        message: "User deleted successfully!",
    });
});


// ✅ Reject Agent or Builder (Only Admin)
exports.rejectAgentOrBuilder = catchAsyncErrors(async (req, res, next) => {
    const userId = req.params.id;
  
    // Check in Agent Model
    let user = await Agent.findById(userId);
  
    // If not found in Agent, check in Builder
    if (!user) {
      user = await Builder.findById(userId);
    }
  
    // If neither Agent nor Builder found
    if (!user) {
      return next(new ErrorHander('User not found', 404));
    }
  
    // ✅ Update Status to Rejected
    user.status = 'rejected';
    await user.save();
  
    res.status(200).json({
      success: true,
      message: `${user.role} Rejected Successfully`,
    });
  });

exports.getAllAgentAndBuilder = catchAsyncErrors(async (req, res, next) => {
    const agents = await Agent.find();
    const builders = await Builder.find();
  
    res.status(200).json({
      success: true,
      agents,
      builders,
    });
  });

exports.getAgentDetails = catchAsyncErrors(async (req, res, next) => {
    const agent = await Agent.findById(req.params.id);
  
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }
  
    res.status(200).json({
      success: true,
      agent,
    });
  });
  
  // ✅ Get Single Builder Details
exports.getBuilderDetails = catchAsyncErrors(async (req, res, next) => {
    const builder = await Builder.findById(req.params.id);
  
    if (!builder) {
      return res.status(404).json({
        success: false,
        message: "Builder not found",
      });
    }
  
    res.status(200).json({
      success: true,
      builder,
    });
});

// ✅ Reject Property
exports.rejectProperty = catchAsyncErrors(async (req, res, next) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return next(new ErrorHander("Property not found", 404));
  }

  property.status = "rejected";
  await property.save();

  res.status(200).json({
    success: true,
    message: "Property rejected successfully",
  });
});

// ✅ Verify Property
exports.verifyProperty = catchAsyncErrors(async (req, res, next) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return next(new ErrorHander("Property not found", 404));
  }

  property.status = "Verified";
  await property.save();

  res.status(200).json({
    success: true,
    message: "Property verified successfully",
  });
});

exports.getAllSubscriptions = async (req, res, next) => {
    const subscriptions = await Subscription.find()
      .populate('userId', 'name role') // Populate user name and role
      .sort({ createdAt: -1 });
  
    res.status(200).json({
      success: true,
      subscriptions,
    });
};

exports.getSubscriptionById = catchAsyncErrors(async (req, res, next) => {
    const subscription = await Subscription.findById(req.params.id).populate('userId', 'name role');
  
    if (!subscription) {
      return next(new ErrorHander('Subscription not found', 404));
    }
  
    res.status(200).json({
      success: true,
      subscription,
    });
  });


//enquiry
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
    const leads = await Lead.find()
      .populate('userId', 'name')  // ✅ User Name and Role
      .populate('propertyId', 'title location'); // ✅ Property Title and Location
  
    res.status(200).json({
      success: true,
      leads,
    });
  });

//visiters
exports.getAllVisits = catchAsyncErrors(async (req, res, next) => {
    const visits = await Visit.find()
      .populate('userId', 'name email role')  // Show user details
      .populate('propertyId', 'name location price'); // Show property details
  
    res.status(200).json({
      success: true,
      totalVisitors: visits.length,
      visits,
    });
  });
  

//property aproved
// ✅ Approve Property (Admin Only)
exports.approveProperty = catchAsyncErrors(async (req, res, next) => {
  const { propertyId } = req.params;

  // ✅ Check if the user is an admin
  if (req.user.role !== "admin") {
    return next(new ErrorHander("Access Denied! Admins Only.", 403));
  }

  // ✅ Find and update the property
  const property = await Property.findByIdAndUpdate(
    propertyId,
    { isApproved: true, approvedBy: req.user._id },
    { new: true, runValidators: true }
  );

  if (!property) {
    return next(new ErrorHander("Property Not Found!", 404));
  }

  res.status(200).json({
    success: true,
    message: "Property Approved Successfully!",
    property,
  });
});

// ✅ Add Comment to Property (Admin Only)
exports.commentOnProperty = catchAsyncErrors(async (req, res, next) => {
  const { propertyId } = req.params;
  const { adminComments } = req.body;

  // ✅ Check if the user is an admin
  if (req.user.role !== "admin") {
    return next(new ErrorHander("Access Denied! Admins Only.", 403));
  }

  // ✅ Find and update the property
  const property = await Property.findByIdAndUpdate(
    propertyId,
    { adminComments },
    { new: true, runValidators: true }
  );

  if (!property) {
    return next(new ErrorHander("Property Not Found!", 404));
  }

  res.status(200).json({
    success: true,
    message: "Comment Added Successfully!",
    property,
  });
});

// 📌 Get All Complaints
exports.getComplaints = catchAsyncErrors(async (req, res, next) => {
    const complaints = await Complaint.find();
    res.status(200).json({ success: true, complaints });
});

// 📌 Mark Complaint as Resolved
exports.resolveComplaint = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
        return next(new ErrorHander("Complaint not found", 404));
    }

    complaint.status = "Resolved";
    await complaint.save();

    // Send resolution email
    await sendEmail({
        email: complaint.email,
        subject: "Complaint Resolved",
        message: `Dear ${complaint.name}, your complaint has been resolved.`,
    });

    res.status(200).json({
        success: true,
        message: "Complaint marked as resolved."
    });
});

// 📌 Delete Complaint
exports.deleteComplaint = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
        return next(new ErrorHander("Complaint not found", 404));
    }

    await complaint.deleteOne();
    res.status(200).json({ success: true, message: "Complaint deleted successfully." });
});

exports.getComplaintById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const complaint = await Complaint.findById(id); // Find complaint by ID
  if (!complaint) {
      return next(new ErrorHander("Complaint not found" ,404));
  }

  res.status(200).json({ success: true, complaint });
});
