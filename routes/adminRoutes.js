const express = require("express");
const {
  registeradmin,
  loginadmin,
  logoutadmin,
  forgotPasswordadmin,
  resetPasswordadmin,
  getAgentDetails,
  rejectProperty,
  verifyProperty,
  getBuilderDetails,
  getAllAgentAndBuilder,
  rejectAgentOrBuilder,
  getAllSubscriptions,
  getSubscriptionById,
  getAllLeads,
  getLeadsByProperty,
  getAllVisits,
  getAllUser,
  getAllUsers,
  updateadminDetails,
  updateUserDetails,
  deleteUser,
  verifyOTP,
  verifyRegister,
  sendOTP,
  resendOTP
} = require("../controller/adminController");

const { isAuthenticatedUser,isAuthenticatedAdmin } = require("../middlewares/auth");
const { apiLimiter, authLimiter } = require("../middlewares/rateLimiter");
const multer = require('multer');
const path = require('path');
const upload = require("../utils/multer");
const { getAllProperties } = require("../controller/propertyController");
// Import validation functions
// const { authorizeRoles } = require("../middlewares/auth");

const router = express.Router();
router.route("/signup-admin").post(registeradmin);
router.route("/admin-login").post(loginadmin);
router.route("/admin/logout").get(logoutadmin);
router.route("/verify").post(verifyOTP);
router.route("/verify-admin").post(verifyRegister)
router.route("/resend").post(resendOTP)
router.route("/password/forgot").post(forgotPasswordadmin);
router.route("/password/reset/:token").put(resetPasswordadmin);
router.route("/admin/admin-users").get(isAuthenticatedUser, apiLimiter, getAllUser); // List all users
router.route("/admin/users").get(isAuthenticatedUser, apiLimiter, getAllUsers); // List all users
router.route("/admin/:id").put(isAuthenticatedUser,apiLimiter, upload.single("userProfile"),updateadminDetails) // Update user role
// router.route("/users/:id").delete(isAuthenticatedUser, apiLimiter, deleteUser); // Delete user
router.route("/admin/users/:id").put(isAuthenticatedUser,apiLimiter, upload.single("userProfile"),updateUserDetails) // Update user role
router.route('/reject/:id').put(isAuthenticatedAdmin, rejectAgentOrBuilder);
router.get('/admin/getAllAgentBuilder', isAuthenticatedAdmin, getAllAgentAndBuilder);
router.get('/admin/agent/:id', isAuthenticatedAdmin, getAgentDetails);
router.get('/admin/builder/:id', isAuthenticatedAdmin, getBuilderDetails);
router.route("/admin/users/:id").delete(isAuthenticatedUser, apiLimiter, deleteUser);
//property
router.put('/property/reject/:id', isAuthenticatedAdmin,rejectProperty);
router.put('/property/verify/:id', isAuthenticatedAdmin,verifyProperty);
router.get('/property/all', isAuthenticatedUser,getAllProperties);

//plan
router.get('/admin/getAllSubscriptions', getAllSubscriptions);
router.get('/admin/plan/:id', getSubscriptionById);

//enquiry
router.get('/admin/getAllLeads', isAuthenticatedAdmin,getAllLeads);
router.get('/lead/:id',getLeadsByProperty)

//visiters
router.get('/visiters/getall', isAuthenticatedAdmin, getAllVisits);


module.exports = router;