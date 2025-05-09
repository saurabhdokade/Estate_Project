const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/builderModel");
const Settings = require("../model/settingsModel");
const HelpSupport = require("../model/HelpSupport");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const otpGenerator = require('otp-generator');
const client = new twilio(process.env.TWILIO_ACCOUNT_SID , process.env.TWILIO_AUTH_TOKEN);

// const client = new twilio(process.env.TWILIO_ACCOUNT_SID || "AC7bb54231c103cfbc47c1392ef09054ee", process.env.TWILIO_AUTH_TOKEN || "403414025177e98738163ee945c25142");

exports.registerbuilder = catchAsyncErrors(async (req, res, next) => {
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
        from: process.env.TWILIO_PHONE_NUMBER,
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

  const userRole = role || "builder";

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
exports.loginbuilder = catchAsyncErrors(async (req, res, next) => {
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


// Forgot Password
exports.forgotPasswordbuilder = catchAsyncErrors(async (req, res, next) => {
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
exports.resetPasswordbuilder = catchAsyncErrors(async (req, res, next) => {
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
    const users = await User.find(filter).populate("propertyId").select("name")

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
exports.updatebuilderDetails = catchAsyncErrors(async (req, res, next) => {
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

    // Update builder Profile details
    if (companyName) user.companyName = companyName;
    if (locality) user.locality = locality;
    if (specialization) user.specialization = specialization;
    if (experience) user.experience = experience;
    if (specializationType) user.specializationType = specializationType;

    // Save the updated user
    await user.save();

    res.status(200).json({
        success: true,
        message: "builder profile updated successfully!",
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


//settings and perfernce


// Get user settings
exports.getUserSettings = catchAsyncErrors(async (req, res, next) => {
    const settings = await Settings.findOne({ userId: req.user.id });

    if (!settings) {
        return res.status(404).json({ success: false, message: "Settings not found" });
    }

    res.status(200).json({ success: true, settings });
});

// Update user settings
exports.updateUserSettings = catchAsyncErrors(async (req, res, next) => {
    let settings = await Settings.findOne({ userId: req.user.id });

    if (!settings) {
        settings = new Settings({ userId: req.user.id, ...req.body });
    } else {
        settings.notifications = req.body.notifications ?? settings.notifications;
        settings.privacy = req.body.privacy ?? settings.privacy;
        settings.language = req.body.language ?? settings.language;
    }

    await settings.save();

    res.status(200).json({ success: true, message: "Settings updated", settings });
});

//help and contact support 

// ✅ Get all FAQs
exports.getFAQs = catchAsyncErrors(async (req, res) => {
  const faqs = await HelpSupport.find({ category: "FAQ" });
  res.status(200).json({ success: true, faqs });
});

// ✅ Submit a Support Request
exports.contactSupport = catchAsyncErrors(async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ success: false, message: "Question is required" });

  const supportRequest = await HelpSupport.create({
    userId: req.user.id,
    category: "Support",
    question,
  });

  res.status(201).json({ success: true, message: "Support request submitted", supportRequest });
});

// ✅ Get User’s Support Requests
exports.getSupportRequests = catchAsyncErrors(async (req, res) => {
  const requests = await HelpSupport.find({ userId: req.user.id, category: "Support" });
  res.status(200).json({ success: true, requests });
});
