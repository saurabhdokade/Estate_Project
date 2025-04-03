const express = require("express");
const {
  registerAgent,
  loginAgent,
  logoutAgent,
  forgotPasswordAgent,
  resetPasswordAgent,
  getAllUser,
  updateAgentDetails,
  getAgentDetails,
  getAgentProperties,
  getNotifications,
  updateNotifications,
  getPrivacySettings,
  updatePrivacySettings,
  getAppSettings,
  updateAppSettings,
  setPaymentMethod,
  getPaymentMethod,
  getPropertyStatusCount,
  deleteUser,
  // verifyOTP,
  verifyRegister,
  sendOTP,
  verifyOTP,
  resendOTP,
  confirmVisit,
  rescheduleVisit
} = require("../controller/agentController");

const { isAuthenticatedAgent,isAuthenticatedAgentOrBuilder } = require("../middlewares/auth");
const { apiLimiter, authLimiter } = require("../middlewares/rateLimiter");
const multer = require('multer');
const path = require('path');
const upload = require("../utils/multer");
// Import validation functions
// const { authorizeRoles } = require("../middlewares/auth");

const router = express.Router();
router.route("/signup-agent").post(registerAgent);
router.route("/agent/verify").post(verifyOTP);
router.route("/agent/send-otp").post(sendOTP)
router.route("/agent/login").post(loginAgent);
router.route("/agent/logout").get(logoutAgent);
// router.route("/verify").post(verifyOTP);
router.route("/verify-agent").post(verifyRegister)
router.route("/resend").post(resendOTP)
router.route("/password/forgot").post(forgotPasswordAgent);
router.route("/password/reset/:token").put(resetPasswordAgent);
router.route("/agent/agent-users").get(apiLimiter, getAllUser); 
router.route("/agent/:agentId").get(getAgentDetails);
router.route("/agent/:agentId/properties").get(getAgentProperties);
router.route("/agent/:agentId/property-status").get(getPropertyStatusCount);


router.route("/agent/:id").put(isAuthenticatedAgent,apiLimiter, upload.single("userProfile"),updateAgentDetails) // Update user role
router.route("/users/:id").delete(isAuthenticatedAgent, apiLimiter, deleteUser); // Delete user


//visit
router.put("/confirm/:visitId", confirmVisit);
router.put("/reschedule/:visitId", rescheduleVisit);


//Agent settings and prefernc 
// Notification 
router.get("/getsettings", isAuthenticatedAgent, getNotifications);
router.put("/update/settings", isAuthenticatedAgent, updateNotifications);
//privacy settings
router.get("/getprivacy", isAuthenticatedAgent, getPrivacySettings);
router.put("/update/privacy", isAuthenticatedAgent, updatePrivacySettings);
//app settings 
router.get("/notification", isAuthenticatedAgent, getAppSettings);
router.put("/update/notification", isAuthenticatedAgent, updateAppSettings);
//payment settings
router.post('/set/payment',isAuthenticatedAgentOrBuilder,setPaymentMethod);
router.get('/get/payment', isAuthenticatedAgentOrBuilder,getPaymentMethod);
module.exports = router;