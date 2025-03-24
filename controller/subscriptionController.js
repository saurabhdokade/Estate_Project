const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const Subscription = require('../model/subscriptionModel');
const ErrorHander = require("../utils/errorhandler")
// Create Subscription
// exports.createSubscription = catchAsyncErrors(async (req, res, next) => {
//   const { planName, price, description } = req.body;

//   const subscription = await Subscription.create({
//     planName,
//     price,
//     description,
//   });

//   res.status(201).json({
//     success: true,
//     message: 'Subscription Plan Created Successfully',
//     subscription
//   });
// });


// Create Subscription Plan
// exports.createSubscription = catchAsyncErrors(async (req, res, next) => {
//   const { planName, price } = req.body;

//   let propertyLimit;

//   // Set Property Limit Based on Plan
//   if (planName === 'Basic') propertyLimit = 10;
//   if (planName === 'Standard') propertyLimit = 50;
//   if (planName === 'Premium') propertyLimit = 100;

//   const subscription = await Subscription.create({
//     userId: req.user._id,  // Automatically fetch Agent/Builder ID
//     planName,
//     price,
//     propertyLimit,
//     expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days validity
//   });

//   res.status(201).json({
//     success: true,
//     message: 'Subscription Plan Created Successfully',
//     subscription
//   });
// });
exports.createSubscription = catchAsyncErrors(async (req, res, next) => {
    const { price } = req.body;
  
    let planName;
    let propertyLimit;
  
    // 🎯 Auto Set Plan Name and Property Limit Based on Price
    switch (price) {
      case 99:
        planName = 'Basic';
        propertyLimit = 10;
        break;
      case 299:
        planName = 'Standard';
        propertyLimit = 50;
        break;
      case 499:
        planName = 'Premium';
        propertyLimit = 100;
        break;
      default:
        return next(new ErrorHander('Invalid Subscription Plan. Please select a valid plan (99, 299, 499)', 400));
    }
  
    // ✅ Proper Handling for User (Agent or Builder) Authentication
    // const userId = req.agent?._id || req.builder?._id;
    const userId = req.user?._id;

  
    if (!userId) {
      return next(new ErrorHander('Unauthorized Access. Please login as Agent or Builder', 401));
    }
  
    // ✅ Check if User Already Has an Active Subscription
    const existingSubscription = await Subscription.findOne({ userId, status: 'Active' });
  
    if (existingSubscription) {
      return next(new ErrorHander('You already have an active subscription', 400));
    }
  
    // ✅ Create Subscription Plan
    const subscription = await Subscription.create({
      userId,
      planName,
      price,
      propertyLimit,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 Days Validity
    });
  
    res.status(201).json({
      success: true,
      message: 'Subscription Plan Created Successfully',
      subscription
    });
});

  // ✅ Cancel Subscription Controller
exports.cancelSubscription = catchAsyncErrors(async (req, res, next) => {
    const userId = req.user._id;
  
    // ✅ Check if User has an Active Subscription
    const subscription = await Subscription.findOne({ userId, status: 'Active' });
  
    if (!subscription) {
      return next(new ErrorHander('No Active Subscription Found', 404));
    }
  
    // ✅ Cancel Subscription (Change Status to Expired)
    subscription.status = 'Expired';
    await subscription.save();
  
    res.status(200).json({
      success: true,
      message: 'Subscription Canceled Successfully'
    });
  });

// Get All Subscription Plans
exports.getAllSubscriptions = catchAsyncErrors(async (req, res, next) => {
  const subscriptions = await Subscription.find();

  res.status(200).json({
    success: true,
    subscriptions
  });
});

// Get Single Subscription Plan
exports.getSubscriptionById = catchAsyncErrors(async (req, res, next) => {
  const subscription = await Subscription.findById(req.params.id);

  if (!subscription) {
    return next(new ErrorHander('Subscription not found', 404));
  }

  res.status(200).json({
    success: true,
    subscription
  });
});

// Update Subscription Plan
exports.updateSubscription = catchAsyncErrors(async (req, res, next) => {
  const subscription = await Subscription.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: 'Subscription Plan Updated Successfully',
    subscription
  });
});

// Delete Subscription Plan
exports.deleteSubscription = catchAsyncErrors(async (req, res, next) => {
  const subscription = await Subscription.findById(req.params.id);

  if (!subscription) {
    return next(new ErrorHander('Subscription not found', 404));
  }

  await subscription.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Subscription Plan Deleted Successfully'
  });
});


exports.getAllPlans = catchAsyncErrors(async (req, res, next) => {
    const plans = [
      {
        planName: 'Basic',
        price: 99,
        propertyLimit: 10,
        validity: '30 Days'
      },
      {
        planName: 'Standard',
        price: 299,
        propertyLimit: 50,
        validity: '30 Days'
      },
      {
        planName: 'Premium',
        price: 499,
        propertyLimit: 100,
        validity: '30 Days'
      }
    ];
  
    res.status(200).json({
      success: true,
      message: 'All Subscription Plans Fetched Successfully',
      plans
    });
  });
  
