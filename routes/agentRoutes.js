const express = require("express");
const {
  registerAgent,
  loginAgent,
  logoutAgent,
  forgotPasswordAgent,
  resetPasswordAgent,
  getAllUser,
  updateAgentDetails,
  deleteUser,
  verifyOTP,
  verifyRegister,
  sendOTP,
  resendOTP
} = require("../controller/agentController");

const { isAuthenticatedUser } = require("../middlewares/auth");
const { apiLimiter, authLimiter } = require("../middlewares/rateLimiter");
const multer = require('multer');
const path = require('path');
const upload = require("../utils/multer");
// Import validation functions
// const { authorizeRoles } = require("../middlewares/auth");

const router = express.Router();
router.route("/signup-agent").post(registerAgent);
router.route("/agent/login").post(loginAgent);
router.route("/agent/logout").get(logoutAgent);
router.route("/verify").post(verifyOTP);
router.route("/verify-agent").post(verifyRegister)
router.route("/resend").post(resendOTP)
router.route("/password/forgot").post(forgotPasswordAgent);
router.route("/password/reset/:token").put(resetPasswordAgent);
router.route("/agent/agent-users").get(isAuthenticatedUser, apiLimiter, getAllUser); // List all users
router.route("/agent/:id").put(isAuthenticatedUser,apiLimiter, upload.single("userProfile"),updateAgentDetails) // Update user role
router.route("/users/:id").delete(isAuthenticatedUser, apiLimiter, deleteUser); // Delete user

module.exports = router;