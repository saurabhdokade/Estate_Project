const express = require("express");
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getAllUser,
  updateUserDetails,
  deleteUser,
  verifyOTP,
  sendOTP
} = require("../controller/customerController");

const { isAuthenticatedUser } = require("../middlewares/auth");
const { apiLimiter, authLimiter } = require("../middlewares/rateLimiter");
const multer = require('multer');
const path = require('path');
const upload = require("../utils/multer");
// Import validation functions
// const { authorizeRoles } = require("../middlewares/auth");

const router = express.Router();
router.route("/signup").post(registerUser);
// router.route("/google").post(googleLogin)
router.route("/login").post(loginUser);
router.route("/verify").post(verifyOTP);
router.route("/send-otp").post(sendOTP)
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset/:token").put(resetPassword);
router.route("/users").get(isAuthenticatedUser, apiLimiter, getAllUser); // List all users
router.route("/users/:id").put(isAuthenticatedUser,apiLimiter, upload.single("userProfile"),updateUserDetails) // Update user role
router.route("/users/:id").delete(isAuthenticatedUser, apiLimiter, deleteUser); // Delete user
// router.route("/user/:id").get(isAuthenticatedUser, apiLimiter, getUsers)
// Update user preferences
module.exports = router;