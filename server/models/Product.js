import { Schema, model } from 'mongoose';

const imageSchema = new Schema({ url: String, public_id: String }, { _id: false });

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // slug del nombre normalizado (sin tildes, minúsculas): clave para Excel y fotos
    normalizedName: { type: String, required: true, index: true },
    code: { type: String, trim: true, default: undefined },
    slug: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null, index: true },
    price: { type: Number, required: true, min: 0 },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: { validator: Number.isInteger, message: 'El stock debe ser un entero' },
    },
    image: { type: imageSchema, default: null },
    description: { type: String, default: '', trim: true },
    featured: { type: Boolean, default: false }, // "destacados" del home
    active: { type: Boolean, default: true, index: true },
    // Marca interna "para revisar" (nunca se expone en la API pública)
    needsReview: { type: Boolean, default: false, index: true },
    reviewNote: { type: String, trim: true, maxlength: 200, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

// code único solo cuando existe
productSchema.index({ code: 1 }, { unique: true, sparse: true });
productSchema.index({ name: 'text' });
productSchema.index({ active: 1, category: 1, supplier: 1 });

export default model('Product', productSchema);
