import { Schema, model } from 'mongoose';
import { normalizeText } from '../utils/text.js';

const imageSchema = new Schema({ url: String, public_id: String }, { _id: false });

const supplierSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, unique: true },
    slug: { type: String, required: true, unique: true },
    logo: { type: imageSchema, default: null },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

supplierSchema.pre('validate', function setNormalized(next) {
  if (this.isModified('name')) this.normalizedName = normalizeText(this.name);
  next();
});

export default model('Supplier', supplierSchema);
