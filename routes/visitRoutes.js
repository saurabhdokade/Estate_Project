const express = require('express');
const router = express.Router();
const { scheduleVisit, getUserVisits, getVisitsByProperty } = require('../controller/visitController');
const { isAuthenticatedUser } = require('../middlewares/auth');
// const {isAuthenticatedUser} = require('../middlewares/auth');

// 📍 Schedule Visit
router.route('/visit/:propertyId/schedule').post(isAuthenticatedUser, scheduleVisit);

// ✅ Fixed: Use `.get()` instead of `.post()`
router.route('/my-visits').get(isAuthenticatedUser, getUserVisits);

// 📍 Get All Visits for a Specific Property
router.route('/:propertyId/visits').get(isAuthenticatedUser, getVisitsByProperty);

module.exports = router;
