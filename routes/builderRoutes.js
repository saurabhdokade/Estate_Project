const express = require("express");
const {
  registerbuilder,
  loginbuilder,
  forgotPasswordbuilder,
  resetPasswordbuilder,
  getAllUser,
  updatebuilderDetails,
  deleteUser,
  verifyOTP,
  verifyRegister,
  sendOTP,
  resendOTP
} = require("../controller/BuilderController");

const { isAuthenticatedUser } = require("../middlewares/auth");
const { apiLimiter, authLimiter } = require("../middlewares/rateLimiter");
const multer = require('multer');
const path = require('path');
const upload = require("../utils/multer");
// Import validation functions
// const { authorizeRoles } = require("../middlewares/auth");

const router = express.Router();
router.route("/signup-builder").post(registerbuilder);
router.route("/builder-login").post(loginbuilder);
router.route("/builder-verify").post(verifyOTP);
router.route("/verify-builder").post(verifyRegister)
router.route("/builder-resend").post(resendOTP)
router.route("/builder/password/forgot").post(forgotPasswordbuilder);
router.route("/password/reset/:token").put(resetPasswordbuilder);
router.route("/builder/builder-users").get(isAuthenticatedUser, apiLimiter, getAllUser); // List all users
router.route("/builder/:id").put(isAuthenticatedUser,apiLimiter, upload.single("userProfile"),updatebuilderDetails) // Update user role
router.route("/users/:id").delete(isAuthenticatedUser, apiLimiter, deleteUser); // Delete user

module.exports = router;