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


exports.registerbuilder = async (req, res, next) => {
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
    user.role = "builder";
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
