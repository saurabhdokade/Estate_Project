const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/customerModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const UserActivity = require("../model/UserActivity");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const { OAuth2Client } = require("google-auth-library"); // Import OAuth2Client
const clientt = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "772146215356-vofbc6i2a4i2jm6b05gsqc0joku37b1i.apps.googleusercontent.com");
const client = new twilio(process.env.TWILIO_ACCOUNT_SID , process.env.TWILIO_AUTH_TOKEN );
require("dotenv").config();

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
    const { email, phone } = req.body;

    // Validate input
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: "Email or phone number is required" });
    }

    // Find user by email or phone
    const user = await User.findOne({ $or: [{ email }, { phone }] });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes

    // Update user with OTP
    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    // Send OTP via Email or SMS
    if (email) {
      await sendEmail({
        email: user.email,
        subject: "Your OTP Code",
        message: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
      });
    } else if (phone) {
      await client.messages.create({
        body: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone,
      });
    }

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error in sendOTP:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Verify OTP
exports.verifyOTP = catchAsyncErrors(async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    // Validate input
    if (!otp || (!email && !phone)) {
      return res.status(400).json({ success: false, message: "OTP and email or phone are required" });
    }

    // Find user
    const user = await User.findOne({ $or: [{ email }, { phone }] });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    // Mark user as verified and clear OTP fields
    user.isVerified = true;
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    res.status(200).json({ success: true, message: "User verified successfully." });
  } catch (error) {
    console.error("Error in verifyOTP:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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


exports.googleLogin = catchAsyncErrors(async (req, res, next) => {
  const { tokenId } = req.body;

  if (!tokenId) {
    return next(new ErrorHander("Google token is required", 400));
  }

  const ticket = await clientt.verifyIdToken({
    idToken: tokenId,
    audience: process.env.GOOGLE_CLIENT_ID, // Ensure this is set in .env
  });

  const { email, name, picture, sub: googleId } = ticket.getPayload();

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      avatar: picture,
    });
  }

  sendToken(user, 200, res);
});


exports.facebookLogin = catchAsyncErrors(async (req, res, next) => {
  const { accessToken, userID } = req.body;

  if (!accessToken || !userID) {
    return next(new ErrorHander("Facebook token is required", 400));
  }

  const url = `https://graph.facebook.com/v12.0/${userID}?fields=id,name,email,picture&access_token=${accessToken}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.email) {
    return next(new ErrorHander("Facebook login failed", 400));
  }

  let user = await User.findOne({ email: data.email });

  if (!user) {
    user = await User.create({
      name: data.name,
      email: data.email,
      facebookId: data.id,
      avatar: data.picture.data.url,
    });
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


// Get user activity (Recently Viewed, Saved, Contacted)
exports.getUserActivity = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id; // Fetch logged-in user's ID
    const activity = await UserActivity.findOne({ userId })
        .populate("recentlyViewed.propertyId savedProperties.propertyId contactedProperties.propertyId");

    if (!activity) {
        return next(new ErrorHandler("No activity found", 404));
    }

    res.status(200).json({ success: true, activity });
});

// Add a property to Recently Viewed
exports.addRecentlyViewed = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { propertyId } = req.body;

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
        activity = new UserActivity({ userId, recentlyViewed: [] });
    }

    // Add property to recently viewed list (limit to 10 items)
    activity.recentlyViewed.unshift({ propertyId });
    if (activity.recentlyViewed.length > 10) activity.recentlyViewed.pop();

    await activity.save();
    res.status(200).json({ success: true, message: "Added to recently viewed" });
});

// Add a property to Saved Properties
exports.addSavedProperty = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { propertyId } = req.body;

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
        activity = new UserActivity({ userId, savedProperties: [] });
    }

    const alreadySaved = activity.savedProperties.some(p => p.propertyId.toString() === propertyId);
    if (alreadySaved) {
        return next(new ErrorHandler("Property already saved", 400));
    }

    activity.savedProperties.push({ propertyId });
    await activity.save();
    res.status(200).json({ success: true, message: "Property saved" });
});

// Remove a property from Saved Properties
exports.removeSavedProperty = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { propertyId } = req.body;

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
        return next(new ErrorHandler("Activity not found", 404));
    }

    activity.savedProperties = activity.savedProperties.filter(p => p.propertyId.toString() !== propertyId);
    await activity.save();
    res.status(200).json({ success: true, message: "Property removed from saved list" });
});
// Add a property to Contacted Properties
exports.addContactedProperty = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user.id;
    const { propertyId } = req.body;

    let activity = await UserActivity.findOne({ userId });
    if (!activity) {
        activity = new UserActivity({ userId, contactedProperties: [] });
    }

    activity.contactedProperties.push({ propertyId });
    await activity.save();
    res.status(200).json({ success: true, message: "Property added to contacted list" });
});
// Get Recently Viewed Properties
exports.getRecentlyViewed = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const activity = await UserActivity.findOne({ userId })
      .populate("recentlyViewed.propertyId");

  if (!activity || !activity.recentlyViewed.length) {
      return next(new ErrorHandler("No recently viewed properties found", 404));
  }

  res.status(200).json({ success: true, recentlyViewed: activity.recentlyViewed });
});

// Get Saved Properties
exports.getSavedProperties = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const activity = await UserActivity.findOne({ userId })
      .populate("savedProperties.propertyId");

  if (!activity || !activity.savedProperties.length) {
      return next(new ErrorHandler("No saved properties found", 404));
  }

  res.status(200).json({ success: true, savedProperties: activity.savedProperties });
});

// Get Contacted Properties
exports.getContactedProperties = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const activity = await UserActivity.findOne({ userId })
      .populate("contactedProperties.propertyId");

  if (!activity || !activity.contactedProperties.length) {
      return next(new ErrorHandler("No contacted properties found", 404));
  }

  res.status(200).json({ success: true, contactedProperties: activity.contactedProperties });
});