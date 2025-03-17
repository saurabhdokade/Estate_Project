const express = require('express');
const { 
  createSubscription,
  cancelSubscription,
  getAllPlans, 
  getAllSubscriptions, 
  getSubscriptionById, 
  updateSubscription, 
  deleteSubscription 
} = require('../controller/subscriptionController');
const { isAuthenticatedBuilder, isAuthenticatedAgentOrBuilder } = require('../middlewares/auth');

const router = express.Router();

router.post('/plan/create', isAuthenticatedAgentOrBuilder, createSubscription);
router.put('/plan/cancel', isAuthenticatedAgentOrBuilder, cancelSubscription);
router.get('/plans/all', getAllPlans);
router.get('/plan/all', getAllSubscriptions);
router.get('/:id', getSubscriptionById);
router.put('/:id', isAuthenticatedBuilder, updateSubscription);
router.delete('/:id', isAuthenticatedBuilder, deleteSubscription);

module.exports = router;
