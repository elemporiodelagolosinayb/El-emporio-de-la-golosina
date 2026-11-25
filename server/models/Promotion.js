import { Schema, model } from 'mongoose';

const imageSchema = new Schema({ url: String, public_id: String }, { _id: false });

/** Ocasiones disponibles (clave → etiqueta) */
const OCCASIONS = {
  general: 'Promoción común',
  navidad: 'Navidad',
  dia_del_nino: 'Día del Niño',
  dia_de_la_madre: 'Día de la Madre',
  dia_del_padre: 'Día del Padre',
  pascuas: 'Pascuas',
  halloween: 'Halloween',
  san_valentin: 'San Valentín',
  black_friday: 'Black Friday',
  hot_sale: 'Hot Sale',
  otra: 'Otra fecha especial',
};

const SCOPES = ['all', 'categories', 'products'];

/**
 * Promoción = descuento en % que se aplica solo a los productos alcanzados
 * (toda la tienda, algunas categorías o algunos productos) entre startDate y endDate.
 */
const promotionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    occasion: { type: String, enum: Object.keys(OCCASIONS), default: 'general' },
    occasionName: { type: String, default: '', trim: true }, // solo si occasion === 'otra'
    scope: { type: String, enum: SCOPES, default: 'all' },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    startDate: { type: Date, required: true }, // fecha y hora (Argentina)
    endDate: { type: Date, required: true },
    active: { type: Boolean, default: true }, // "Publicada"
    // Solo para el cartel (informativo): lo que se cobra es el descuento %
    price: { type: Number, default: null },
    regularPrice: { type: Number, default: null },
    showInPopup: { type: Boolean, default: true },
    image: { type: imageSchema, default: null },
  },
  { timestamps: true }
);

promotionSchema.index({ active: 1, startDate: 1, endDate: 1 });

/** Etiqueta de la ocasión ('' para promos comunes) */
promotionSchema.statics.occasionLabel = (p) => {
  if (!p?.occasion || p.occasion === 'general') return '';
  if (p.occasion === 'otra') return p.occasionName || '';
  return OCCASIONS[p.occasion] || '';
};

export default model('Promotion', promotionSchema);
export { OCCASIONS };
export { SCOPES };
