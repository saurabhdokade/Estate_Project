const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/customerModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const client = new twilio(process.env.TWILIO_ACCOUNT_SID || "AC7bb54231c103cfbc47c1392ef09054ee", process.env.TWILIO_AUTH_TOKEN || "403414025177e98738163ee945c25142");
// Register User
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, confirmPassword, phone,  } = req.body;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (phone && !phoneRegex.test(phone)) {
    return res.status(400).json({ message: "Invalid phone number format. Please include a valid country code." });
  }

  let user = await User.findOne({ where: { email } });
  if (user) {
    if (user.otpExpire > Date.now()) {
      return res.status(400).json({ message: "OTP is still valid. Please check your email." });
    }

    const otp = crypto.randomInt(100000, 999999);
    const otpExpire = Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    const message = `Your new OTP for registration is ${otp}. It will expire in 10 minutes.`;
    await sendEmail({
      email: user.email,
      subject: "OTP for User Registration - Resend",
      message,
    });

    return res.status(200).json({
      success: true,
      message: "New OTP sent to your email.",
    });
  }

  user = await User.create({
    name,
    email,
    password,
    confirmPassword,
    phone,
    status: "active",
  });

  const otp = crypto.randomInt(100000, 999999);
  const otpExpire = Date.now() + 10 * 60 * 1000;

  user.otp = otp;
  user.otpExpire = otpExpire;
  await user.save();

  const message = `Your OTP for registration is ${otp}. It will expire in 10 minutes.`;
  await sendEmail({
    email: user.email,
    subject: "OTP for User Registration",
    message,
  });
  
  res.status(201).json({
    user,
    message: "User registered successfully. OTP sent to your email.",
  });
});


// Send OTP
exports.sendOTP = catchAsyncErrors(async (req, res) => {
    try {
      const { identifier } = req.body;
  
      const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpire = Date.now() + 5 * 60 * 1000;
  
      user.otp = otp;
      user.otpExpire = otpExpire;
      await user.save();
  
      if (user.email === identifier) {
        await sendEmail({
          email: user.email,
          subject: "Your OTP Code",
          message: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
        });
      } else if (user.phone === identifier) {
        await client.messages.create({
          body: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER || "+13612667244",
          to: user.phone,
        });
      }
  
      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });
    } catch (error) {
        console.log(error)
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  
  // Verify OTP
  exports.verifyOTP = catchAsyncErrors(async (req, res) => {
    try {
      const { identifier, otp } = req.body; // identifier can be email or phone
  
      // Find user
      const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
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
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
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
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
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
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
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

// -------------------------- Update User Details (Admin Only) --------------------------
exports.updateUserDetails = catchAsyncErrors(async (req, res, next) => {
    const {name, email, phone } = req.body;

    // Validate role if provided
   
    // Find user by ID
    const user = await User.findById(req.params.id);
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