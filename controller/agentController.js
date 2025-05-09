const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/agentModel");
const Property = require("../model/propertyModel");
const Visit = require("../model/visitModel")
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const otpGenerator = require('otp-generator');
const client = new twilio(process.env.TWILIO_ACCOUNT_SID , process.env.TWILIO_AUTH_TOKEN );

// const client = new twilio(process.env.TWILIO_ACCOUNT_SID || "AC7bb54231c103cfbc47c1392ef09054ee", process.env.TWILIO_AUTH_TOKEN || "403414025177e98738163ee945c25142");

exports.registerAgent = catchAsyncErrors(async (req, res, next) => {
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

  const userRole = role || "agent";

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
    const { name, email, role, status } = req.query;

    // Build a dynamic filter object
    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' }; // Case-insensitive partial match
    if (email) filter.email = { $regex: email, $options: 'i' }; // Case-insensitive partial match
    if (role) filter.role = role; // Exact match for role
    if (status) filter.status = status; // Exact match for status

    // Fetch users with or without filters
    const users = await User.find(filter).populate("propertyId","location")

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

// -------------------------- Update User Details (Admin Only) --------------------------
exports.updateAgentDetails = catchAsyncErrors(async (req, res, next) => {
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

    // Update Agent Profile details
    if (companyName) user.companyName = companyName;
    if (locality) user.locality = locality;
    if (specialization) user.specialization = specialization;
    if (experience) user.experience = experience;
    if (specializationType) user.specializationType = specializationType;

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

exports.confirmVisit = catchAsyncErrors(async (req, res, next) => {
  const { visitId } = req.params;

  const visit = await Visit.findByIdAndUpdate(
    visitId,
    { status: "Confirmed" },
    { new: true }
  );

  if (!visit) {
    return next(new ErrorHander("Visit not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Visit confirmed successfully",
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

