const mongoose = require('mongoose');

const paymentSettingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    preferredPaymentMethod: {
        type: String,
        enum: ['UPI', 'Credit/Debit', 'Net Banking'],
        required: true
    }
}, { timestamps: true });

const PaymentSetting = mongoose.model('PaymentSetting', paymentSettingSchema);

module.exports = PaymentSetting;
