const Visit = require('../model/visitModel');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHander = require('../utils/errorhandler');

// 📍 Schedule Visit
// exports.scheduleVisit = catchAsyncErrors(async (req, res, next) => {
//   const { propertyId } = req.params;
//   const { visitDate, message, shareWithDealer } = req.body;

//   const visit = await Visit.create({
//     userId: req.user.id,  // Authenticated User
//     propertyId,
//     visitDate,
//     message,
//     shareWithDealer
//   });

//   res.status(201).json({
//     success: true,
//     message: "Visit scheduled successfully!",
//     visit
//   });
// });
exports.scheduleVisit = catchAsyncErrors(async (req, res, next) => {
  const { propertyId } = req.params;
  const { visitDate, visitTime, message, shareWithDealer } = req.body;

  if (!visitTime) {
    return res.status(400).json({
      success: false,
      message: "Visit time is required!"
    });
  }

  const visit = await Visit.create({
    userId: req.user.id,  // Authenticated User
    propertyId,
    visitDate,
    visitTime,  // Added visitTime field
    message,
    shareWithDealer
  });

  res.status(201).json({
    success: true,
    message: "Visit scheduled successfully!",
    visit
  });
});


// 📍 Get All Visits of a Specific User
exports.getUserVisits = catchAsyncErrors(async (req, res, next) => {
  const visits = await Visit.find({ userId: req.user.id }).populate('propertyId', 'name location price');

  if (!visits) {
    return next(new ErrorHander("No visits found", 404));
  }

  res.status(200).json({
    success: true,
    visits
  });
});


// 📍 Get All Visits for a Specific Property
exports.getVisitsByProperty = catchAsyncErrors(async (req, res, next) => {
  const { propertyId } = req.params;

  const visits = await Visit.find({ propertyId }).populate('userId', 'name email');

  if (!visits) {
    return next(new ErrorHander("No visits scheduled for this property", 404));
  }

  res.status(200).json({
    success: true,
    visits
  });
});
