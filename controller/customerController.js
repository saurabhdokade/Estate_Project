const ErrorHander = require("../utils/errorhandler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const User = require("../model/customerModel");
const sendToken = require("../utils/jwtToken");
const sendEmail = require("../utils/sendEmail");
const UserActivity = require("../model/UserActivity");
const Notification = require("../model/NotificationsModel");
const AppSettings = require("../model/appSettingsModel");
const Privacy = require("../model/PrivacyModel");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
// const twilio = require('twilio');
const { OAuth2Client } = require("google-auth-library"); // Import OAuth2Client
const clientt = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "772146215356-vofbc6i2a4i2jm6b05gsqc0joku37b1i.apps.googleusercontent.com");
require("dotenv").config();

exports.registerUser = async (req, res, next) => {
  try {
    const { phone, name, email, isAgent, agreedToTerms } = req.body;

    let user = await User.findOne({ phone });

    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "Phone not verified. Please verify OTP first." });
    }

    if (user.name && user.email) {
      return res.status(400).json({ message: "User already exists. Account creation is a one-time process." });
    }

    user.name = name;
    user.email = email;
    user.role = isAgent ? "agent" : "user";
    user.agreedToTerms = agreedToTerms;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
    });
  } catch (error) {
    console.error("❌ Error registering user:", error);
    return res.status(500).json({ success: false, message: "Failed to register user. Please try again." });
  }
};


const twilio = require("twilio");
const client = new twilio(
  "AC7bb54231c103cfbc47c1392ef09054ee", "e165af85f29b468f47b7b9dc70778f11"
);

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

  if (user.otpExpire < Date.now()) {
    return next(new ErrorHander("OTP has expired", 400));
  }

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
// const admin = require("../firebase");

// exports.sendOTP = async (req, res) => {
//   try {
//     const { phone } = req.body;

//     if (!phone) {
//       return res.status(400).json({ success: false, message: "Phone number is required" });
//     }

//     // 🔹 Firebase Phone Authentication
//     const session = await admin.auth().createSessionCookie(phone, { expiresIn: 600000 }); // 10 minutes

//     return res.status(200).json({ success: true, message: "OTP sent via Firebase", session });

//   } catch (error) {
//     console.error("❌ Firebase OTP Error:", error);
//     return res.status(500).json({ success: false, message: "Failed to send OTP" });
//   }
// };
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { phone, otp } = req.body;

//     if (!phone || !otp) {
//       return res.status(400).json({ success: false, message: "Phone and OTP are required" });
//     }

//     // 🔹 Verify OTP with Firebase
//     const decodedToken = await admin.auth().verifyIdToken(otp);

//     if (!decodedToken.phone_number || decodedToken.phone_number !== phone) {
//       return res.status(400).json({ success: false, message: "Invalid OTP" });
//     }

//     return res.status(200).json({ success: true, message: "OTP verified successfully" });

//   } catch (error) {
//     console.error("❌ Firebase OTP Verification Error:", error);
//     return res.status(500).json({ success: false, message: "Failed to verify OTP" });
//   }
// };


// Logout Agent
exports.logout = catchAsyncErrors(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
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
  const { name, email, phone, locality } = req.body;

  // Find user by ID
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ErrorHander("User not found", 404));
  }

  // Update fields if provided in the request body
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (locality) user.locality = locality;


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
