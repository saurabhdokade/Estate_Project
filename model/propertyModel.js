const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  propertyName: {
    type: String,
    required: true,
    trim: true
  },
  overview: { type: String, required: true },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent', 
        required: true
    },
  propertyType: {
    type: String,
    enum: [
      'Flat / Apartment',
      'Plot / Land',
      'Independent House / Villa',
      'Independent / Builder Floor',
      '1RK / Studio Apartment',
      'Farmhouse',
      'Serviced Apartment',
      'Other'
    ],
    required: true
  },
  // transactionType: {
  //   type: String,
  //   enum: ["Buy", "Rent/PG"],
  //   required: true
  // },
  propertyImages: {
    type: [String],
    default:[]
    //   "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
  },
  location: {
    city: {
      type: String,
      required: true
    },
    area: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    }
  },
  flatType: {
    type: String,
    enum: ['1BHK', '2BHK', '3BHK', '4BHK', 'Other'],
    required: true
  },
  roomDetails: {
    bedrooms: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true
    },
    bathrooms: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true
    },
    balconies: {
      type: Number,
      enum: [0, 1, 2, 3],
      required: true
    }
  },
  areaDetails: {
    carpetArea: {
      type: Number,
      required: true
    }
  },
  priceDetails: {
    expectedPrice: {
      type: Number,
      required: true
    },
    pricePerSqFt: {
      type: Number,
      required: true
    },    
    transactionType: {
      type: String,
      enum: ["Buy", "Rent/PG"],
      required: true,
    },
    expectedPrice: { type: Number, required: function() { return this.transactionType === "Buy"; } },
    rentPerMonth: { type: Number, required: function() { return this.transactionType === "Rent/PG"; } },
    priceNegotiable: {
      type: Boolean,
      default: false
    }
  },
  additionalDetails: {
    type: String
  },
  propertyStatus: {
    type: String,
    enum: ['Ready to move', 'Under construction',"Just started"],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Verified', 'rejected'],
    default: 'Pending',
  },
  propertyAge: {
    type: String,
    enum: ['1', '2', '3', '4', 'More than 4'],
    required: true
  },
  amenities: {
    type: [String],
    required: true
  },
  nearbyFacilities: {
    type: [String],
    required: true
  },
  agentDetails: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ // Email validation
    },
    phoneNumber: {
      type: String,
      required: true
    }
  },
  propertyVisibility: {
    public: {
      type: Boolean,
      default: false
    },
    private: {
      type: Boolean,
      default: false
    },
    featuredListing: {
      type: Boolean,
      default: false
    }
  },
  allowDirectMessages: {
    type: Boolean,
    default: false
  },
  allowDirectCalls: {
    type: Boolean,
    default: false
  },
  isApproved: { type: Boolean, default: false }, // Admin approval
  adminComments: { type: String }, // Admin comments
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin ID
}, {
  timestamps: true
});

const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
