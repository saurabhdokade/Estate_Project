const express = require("express");
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getAllUser,
  updateUserDetails,
  deleteUser,
  getRecentlyViewed,
  verifyOTP,
  getSavedProperties,
  addRecentlyViewed,
  getContactedProperties,
  removeSavedProperty,
  addContactedProperty,
  googleLogin,
  facebookLogin,
  addSavedProperty,
  getUserActivity,
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
// Google Login
router.post("/google-login", googleLogin);

// Facebook Login
router.post("/facebook-login", facebookLogin);
router.route("/verify").post(verifyOTP);
router.route("/send-otp").post(sendOTP)
router.route("/password/forgot").post(forgotPassword);
router.route("/password/reset/:token").put(resetPassword);
router.route("/users").get(isAuthenticatedUser, apiLimiter, getAllUser); // List all users
router.route("/users/:id").put(isAuthenticatedUser,apiLimiter, upload.single("userProfile"),updateUserDetails) // Update user role
router.route("/users/:id").delete(isAuthenticatedUser, apiLimiter, deleteUser); // Delete user

//properties activities user
// Fetch activity separately
router.get("/recently-viewed", isAuthenticatedUser, getRecentlyViewed);
router.get("/saved", isAuthenticatedUser, getSavedProperties);
router.get("/contacted", isAuthenticatedUser, getContactedProperties);

// Modify activity
router.get("/getallactvies",isAuthenticatedUser,getUserActivity)
router.post("/recently-viewed", isAuthenticatedUser, addRecentlyViewed);
router.post("/saved", isAuthenticatedUser, addSavedProperty);
router.delete("/saved", isAuthenticatedUser, removeSavedProperty);
router.post("/contacted", isAuthenticatedUser, addContactedProperty);
// router.route("/user/:id").get(isAuthenticatedUser, apiLimiter, getUsers)

module.exports = router;