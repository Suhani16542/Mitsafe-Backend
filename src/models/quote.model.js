import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    service: {
      type: String,
      required: [true, 'Service selection is required'],
      trim: true,
    },
    budget: {
      type: String,
      trim: true,
      default: '',
    },
    timeline: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      required: [true, 'Project details/message is required'],
      trim: true,
      maxlength: [3000, 'Message cannot exceed 3000 characters'],
    },
    sourcePage: {
      type: String,
      trim: true,
      default: '/',
    },
    requestType: {
      type: String,
      enum: ['quote', 'consultation'],
      default: 'quote',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual & pre-save aliasing support for frontend compatibility (e.g. name -> fullName, company -> companyName)
quoteSchema.pre('validate', function (next) {
  if (!this.fullName && this._name) {
    this.fullName = this._name;
  }
  if (!this.companyName && this._company) {
    this.companyName = this._company;
  }
  next();
});

const Quote = mongoose.model('Quote', quoteSchema);

export default Quote;
