const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Define the User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"],
    maxLength: [30, "Name cannot exceed 30 characters"],
    minLength: [4, "Name should have more than 4 characters"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
    validate: [validator.isEmail, "Please enter a valid email address"],
    lowercase: true,
    index: true,
  },
  phone: {
    type: String,
    required: false,
    unique: true,
    match: [/^\+?[1-9]\d{1,14}$/, "Please provide a valid phone number with a country code (e.g., +1234567890)"],
    maxlength: [15, "Phone number cannot be longer than 15 characters"],
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [8, "Password should be greater than 8 characters"],
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "agent", "builder"],
    default: "user",
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended","rejected"],
    default: "active",
  },
  companyName: {
    type: String,
    default: null,
  },
  locality: {
    type: String,
    default: null,
  },
  specialization: {
    type: String,
    enum: ['Residential', 'Commercial', 'Rental', 'Other'],
    required: false,
  },
  experience: {
    type: Number,
    default: 0, // Years of experience
  },
  specializationType: {
    type: String,
    enum: ['Basic', 'Premium'],
    required: false,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  userProfile: {
    type: String,
    default:
      "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
  },
  otp: {
    type: String,
  },
  otpExpire: { // Fix spelling to match controller's property
    type: Date,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpire: {
    type: Date,
  },
  verificationCode: {
    type: Number,
  },
  verificationCodeExpire: {
    type: Date,
  },
  notificationPreference: {
    type: Boolean,
    default: true, 
  },
  propertyId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: false,  
    }

}, { timestamps: true });

// Remove duplicate pre-save hook
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    // if (this.password !== this.confirmPassword) {
    //   throw new Error("Password and confirm password do not match");
    // }

    // Hash the password
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (this.role === "Admin" && !this.mfaSecret) {
    throw new Error("Admin users must have an MFA secret");
  }

  if (this.role !== "Admin") {
    this.mfaSecret = undefined;
  }

  next();
});
// Compare password method for login
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate Reset Password Token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes expiration
  return resetToken;
};

userSchema.methods.generateVerificationCode = function () {
  const generateRandomFiveDigitNumber = () => {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return parseInt(firstDigit + remainingDigits);
  };

  const verificationCode = generateRandomFiveDigitNumber();
  this.verificationCode = verificationCode;
  this.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes expiration

  return verificationCode;
};

module.exports = mongoose.model("Builder", userSchema);