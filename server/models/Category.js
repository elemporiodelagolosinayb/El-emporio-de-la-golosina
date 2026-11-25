import { Schema, model } from 'mongoose';
import { normalizeText } from '../utils/text.js';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, unique: true },
    slug: { type: String, required: true, unique: true },
    icon: { type: String, default: '' }, // emoji opcional
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.pre('validate', function setNormalized(next) {
  if (this.isModified('name')) this.normalizedName = normalizeText(this.name);
  next();
});

categorySchema.index({ order: 1 });

export default model('Category', categorySchema);
